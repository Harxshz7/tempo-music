import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  SectionList,
  RefreshControl,
  Image,
  Pressable,
  Animated,
  Platform,
  useWindowDimensions,
  SafeAreaView
} from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import subsonic from '../api/subsonic';
import type { Artist, Album, Playlist, ArtistIndex } from '../types';
import { NeoText, NeoCard, NeoButton } from '../components/ui';
import AlbumGridItem from '../components/AlbumGridItem';

type Tab = 'Albums' | 'Artists' | 'Playlists';

const HalftoneBackground = () => (
  <View className="absolute inset-0 opacity-10" pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="halftone_lib" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <Circle cx="3" cy="3" r="3" fill="#000" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#halftone_lib)" />
    </Svg>
  </View>
);

const SkeletonPulse = () => {
  const anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={{ opacity: anim }} className="bg-neo-muted w-full h-full" />
  );
};

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  
  const [activeTab, setActiveTab] = useState<Tab>('Albums');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumOffset, setAlbumOffset] = useState(0);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  
  const [artistsSections, setArtistsSections] = useState<{ title: string; data: Artist[] }[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Columns for albums grid
  const numColumns = width > 768 ? 4 : width > 480 ? 3 : 2;

  const loadAlbums = async (refresh = false) => {
    if (refresh) {
      setAlbumOffset(0);
      setHasMoreAlbums(true);
    }
    const offset = refresh ? 0 : albumOffset;
    const limit = 50;
    try {
      const data = await subsonic.getAlbumList2('alphabeticalByName', limit, offset);
      if (data.length < limit) setHasMoreAlbums(false);
      setAlbums(prev => refresh ? data : [...prev, ...data]);
      setAlbumOffset(offset + limit);
    } catch (e: any) {
      throw new Error(e?.message ?? 'Failed to load albums');
    }
  };

  const loadArtists = async () => {
    try {
      const data = await subsonic.getArtists();
      const sections = (data.index ?? []).map(idx => ({
        title: idx.name,
        data: idx.artist ?? []
      }));
      setArtistsSections(sections);
    } catch (e: any) {
      throw new Error(e?.message ?? 'Failed to load artists');
    }
  };

  const loadPlaylists = async () => {
    try {
      const data = await subsonic.getPlaylists();
      setPlaylists(data);
    } catch (e: any) {
      throw new Error(e?.message ?? 'Failed to load playlists');
    }
  };

  const loadData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      if (activeTab === 'Albums') await loadAlbums(refresh);
      else if (activeTab === 'Artists') await loadArtists();
      else if (activeTab === 'Playlists') await loadPlaylists();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, albumOffset]);

  // Refetch when tab changes
  useEffect(() => {
    loadData(true);
  }, [activeTab]);

  const handleEndReached = () => {
    if (activeTab === 'Albums' && hasMoreAlbums && !isLoading && !isRefreshing) {
      loadData(false); // load more
    }
  };

  // Renderers
  const renderAlbum = ({ item, index }: { item: Album, index: number }) => (
    <AlbumGridItem album={item} index={index} numColumns={numColumns} showArtistName={true} />
  );

  const renderArtist = ({ item }: { item: Artist }) => (
    <Pressable onPress={() => navigation.navigate('ArtistDetail', { artistId: item.id })} className="px-4 mb-3">
      <View className="bg-white border-2 border-black p-3 flex-row items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <View className="flex-1">
          <NeoText variant="body" className="font-bold uppercase text-base tracking-tight">{item.name}</NeoText>
          <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5 uppercase">
            {item.albumCount ?? 0} album{item.albumCount !== 1 ? 's' : ''}
          </NeoText>
        </View>
      </View>
    </Pressable>
  );

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <Pressable className="px-4 mb-3">
      <View className="bg-white border-2 border-black p-2 flex-row items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <View className="w-11 h-11 border-2 border-black bg-neo-muted mr-3">
            {/* Playlist usually doesn't have coverArtUrl out of the box in simple subsonic types, but we'll put a placeholder */}
            <View className="w-full h-full bg-neo-secondary items-center justify-center">
              <NeoText variant="caption" className="font-black text-xs text-white">PL</NeoText>
            </View>
        </View>
        <View className="flex-1">
          <NeoText variant="body" className="font-bold uppercase text-base tracking-tight">{item.name}</NeoText>
          <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5 uppercase">
            {item.songCount ?? 0} track{item.songCount !== 1 ? 's' : ''}
          </NeoText>
        </View>
      </View>
    </Pressable>
  );

  // Skeletons
  const renderSkeletons = () => (
    <View className="flex-row flex-wrap px-2 pt-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(key => (
        <View key={key} style={{ width: `${100 / numColumns}%` }} className="p-2">
          <View className="bg-white border-4 border-black p-2 aspect-square">
            <View className="w-full h-full border-4 border-black overflow-hidden">
               <SkeletonPulse />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <HalftoneBackground />
      
      {/* Header */}
      <View className="px-4 pt-6 pb-4">
        <View className="-rotate-1 self-start mb-4">
            <NeoText 
                className="font-space-grotesk-black text-4xl uppercase tracking-tighter"
                style={{
                  color: 'transparent',
                  WebkitTextStrokeWidth: '1.5px',
                  WebkitTextStrokeColor: 'black',
                  ...(Platform.OS !== 'web' ? { color: 'black' } : {})
                } as any}
            >
              Library
            </NeoText>
        </View>

        {/* Segmented Control */}
        <View className="flex-row border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {(['Albums', 'Artists', 'Playlists'] as Tab[]).map((tab, idx) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-3 items-center justify-center ${activeTab === tab ? 'bg-neo-secondary' : 'bg-white'} ${idx !== 0 ? 'border-l-4 border-black' : ''}`}
            >
              <NeoText variant="caption" className={`font-black uppercase tracking-widest ${activeTab === tab ? 'text-white' : 'text-black'}`}>
                {tab}
              </NeoText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Error State */}
      {error && !isLoading && (
        <View className="px-4 mb-4">
          <View className="bg-neo-accent border-4 border-black p-4 items-center">
            <NeoText variant="body" className="font-bold text-center mb-4">{error}</NeoText>
            <NeoButton label="RETRY" onPress={() => loadData(true)} />
          </View>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !error && (
        (activeTab === 'Albums' && albums.length === 0) ||
        (activeTab === 'Artists' && artistsSections.length === 0) ||
        (activeTab === 'Playlists' && playlists.length === 0)
      ) && (
        <View className="flex-1 items-center justify-center px-6 pb-20">
          <NeoCard className="items-center p-8 bg-white border-4 border-black rotate-1">
            <NeoText variant="h3" className="font-black uppercase mb-2 text-center">NO {activeTab.toUpperCase()} FOUND</NeoText>
            <NeoText variant="caption" className="font-bold opacity-70 text-center">Check your Navidrome library</NeoText>
          </NeoCard>
        </View>
      )}

      {/* Loading Skeletons */}
      {isLoading && (activeTab === 'Albums' ? albums.length === 0 : activeTab === 'Artists' ? artistsSections.length === 0 : playlists.length === 0) ? renderSkeletons() : null}

      {/* Lists */}
      {!isLoading && activeTab === 'Albums' && albums.length > 0 && (
        <FlatList
          key={`albums-${numColumns}`} // Force re-render if columns change
          data={albums}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={renderAlbum}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 100 }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor="black" />}
        />
      )}

      {!isLoading && activeTab === 'Artists' && artistsSections.length > 0 && (
        <SectionList
          sections={artistsSections}
          keyExtractor={(item) => item.id}
          renderItem={renderArtist}
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-4 py-2 bg-neo-bg mb-2">
              <View className="w-8 h-8 bg-neo-secondary border-2 border-black items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-3">
                <NeoText variant="body" className="font-black text-white">{title}</NeoText>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          stickySectionHeadersEnabled={true}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor="black" />}
        />
      )}

      {!isLoading && activeTab === 'Playlists' && playlists.length > 0 && (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaylist}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor="black" />}
        />
      )}

    </SafeAreaView>
  );
}
