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
  SafeAreaView,
} from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { ArrowUpDown, Star, Clock, Flame, AlignLeft } from 'lucide-react-native';

import subsonic from '../api/subsonic';
import { useResponsive } from '../hooks/useResponsive';
import type { Artist, Album, Playlist, AlbumListType } from '../types';
import { NeoText, NeoCard, NeoButton, NeoSkeleton } from '../components/ui';
import AlbumGridItem from '../components/AlbumGridItem';
import { triggerHaptic } from '../utils/haptics';
import { usePlayCountStore } from '../store/playCountStore';

type Tab = 'Albums' | 'Artists' | 'Playlists';
type AlbumSortOption = 'alphabeticalByName' | 'newest' | 'mostPlayed' | 'starred';

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

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const { numColumns, containerClass, isDesktop } = useResponsive();

  const [activeTab, setActiveTab] = useState<Tab>('Albums');
  const [albumSort, setAlbumSort] = useState<AlbumSortOption>('alphabeticalByName');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumOffset, setAlbumOffset] = useState(0);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const isFetchingMoreRef = useRef(false);

  const [artistsSections, setArtistsSections] = useState<{ title: string; data: Artist[] }[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const getAlbumPlayCount = usePlayCountStore((state) => state.getAlbumPlayCount);

  const loadAlbums = async (refresh = false, sortMode: AlbumSortOption = albumSort) => {
    if (isFetchingMoreRef.current && !refresh) return;
    isFetchingMoreRef.current = true;

    if (refresh) {
      setAlbumOffset(0);
      setHasMoreAlbums(true);
    }
    const offset = refresh ? 0 : albumOffset;
    const limit = 50;

    try {
      let data: Album[] = [];
      if (sortMode === 'mostPlayed') {
        // Fetch albums and sort using local play counts combined with server counts
        data = (await subsonic.getAlbumList2('frequent', limit, offset)) ?? [];
        data.sort((a, b) => {
          const countA = (getAlbumPlayCount(a.id) || 0) + (a.playCount || 0);
          const countB = (getAlbumPlayCount(b.id) || 0) + (b.playCount || 0);
          return countB - countA;
        });
      } else {
        const typeParam: AlbumListType =
          sortMode === 'newest'
            ? 'newest'
            : sortMode === 'starred'
            ? 'starred'
            : 'alphabeticalByName';
        data = (await subsonic.getAlbumList2(typeParam, limit, offset)) ?? [];
      }

      if (data.length < limit) setHasMoreAlbums(false);
      setAlbums((prev) => (refresh ? data : [...prev, ...data]));
      setAlbumOffset(offset + limit);
    } catch (e: any) {
      throw new Error(e?.message ?? 'Failed to load albums');
    } finally {
      isFetchingMoreRef.current = false;
    }
  };

  const loadArtists = async () => {
    try {
      const data = await subsonic.getArtists();
      const sections = (data?.index ?? []).map((idx) => ({
        title: idx.name,
        data: idx.artist ?? [],
      }));
      setArtistsSections(sections);
    } catch (e: any) {
      throw new Error(e?.message ?? 'Failed to load artists');
    }
  };

  const loadPlaylists = async () => {
    try {
      const data = (await subsonic.getPlaylists()) ?? [];
      setPlaylists(data);
    } catch (e: any) {
      throw new Error(e?.message ?? 'Failed to load playlists');
    }
  };

  const loadData = useCallback(
    async (refresh = false, sortMode: AlbumSortOption = albumSort) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        if (activeTab === 'Albums') await loadAlbums(refresh, sortMode);
        else if (activeTab === 'Artists') await loadArtists();
        else if (activeTab === 'Playlists') await loadPlaylists();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, albumOffset, albumSort]
  );

  // Refetch when tab changes
  useEffect(() => {
    loadData(true);
  }, [activeTab]);

  const handleSortChange = (newSort: AlbumSortOption) => {
    triggerHaptic();
    setAlbumSort(newSort);
    setShowSortMenu(false);
    loadData(true, newSort);
  };

  const handleEndReached = () => {
    if (activeTab === 'Albums' && hasMoreAlbums && !isLoading && !isRefreshing && !isFetchingMoreRef.current) {
      loadData(false);
    }
  };

  const renderSortMenu = () => {
    const options: { key: AlbumSortOption; label: string; icon: any }[] = [
      { key: 'alphabeticalByName', label: 'A-Z', icon: AlignLeft },
      { key: 'newest', label: 'Recently Added', icon: Clock },
      { key: 'mostPlayed', label: 'Most Played', icon: Flame },
      { key: 'starred', label: 'Starred', icon: Star },
    ];

    return (
      <View className="px-4 mb-3 flex-row items-center justify-between z-20">
        <Pressable
          onPress={() => {
            triggerHaptic();
            setShowSortMenu(!showSortMenu);
          }}
          className="flex-row items-center gap-2 bg-white border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:opacity-75"
        >
          <ArrowUpDown color="black" size={16} />
          <NeoText variant="caption" className="font-black text-xs uppercase">
            SORT:{' '}
            {options.find((o) => o.key === albumSort)?.label || 'A-Z'}
          </NeoText>
        </Pressable>

        {showSortMenu && (
          <View className="absolute top-10 left-4 bg-white border-4 border-black p-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-30 min-w-[180px]">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = albumSort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => handleSortChange(opt.key)}
                  className={`flex-row items-center p-2 mb-1 border-2 border-black ${
                    isSelected ? 'bg-neo-secondary' : 'bg-white active:bg-neo-bg'
                  }`}
                >
                  <Icon color="black" size={16} />
                  <NeoText variant="caption" className="font-black text-xs uppercase ml-2">
                    {opt.label}
                  </NeoText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Renderers
  const renderAlbum = ({ item, index }: { item: Album; index: number }) => (
    <AlbumGridItem album={item} index={index} numColumns={numColumns} showArtistName={true} />
  );

  const renderArtist = ({ item }: { item: Artist }) => (
    <Pressable onPress={() => navigation.navigate('ArtistDetail', { artistId: item.id })} className="px-4 mb-3">
      <View className="bg-white border-2 border-black p-3 flex-row items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <View className="flex-1">
          <NeoText variant="body" className="font-bold uppercase text-base tracking-tight">
            {item.name}
          </NeoText>
          <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5 uppercase">
            {item.albumCount ?? 0} album{item.albumCount !== 1 ? 's' : ''}
          </NeoText>
        </View>
      </View>
    </Pressable>
  );

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <Pressable
      onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id })}
      className="px-4 mb-3"
    >
      <View className="bg-white border-2 border-black p-2 flex-row items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <View className="w-11 h-11 border-2 border-black bg-neo-muted mr-3">
          <View className="w-full h-full bg-neo-secondary items-center justify-center">
            <NeoText variant="caption" className="font-black text-xs text-white">
              PL
            </NeoText>
          </View>
        </View>
        <View className="flex-1">
          <NeoText variant="body" className="font-bold uppercase text-base tracking-tight">
            {item.name}
          </NeoText>
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
      {[1, 2, 3, 4, 5, 6, 7, 8].map((key) => (
        <View key={key} style={{ width: `${100 / numColumns}%` }} className="p-2">
          <View className="bg-white border-4 border-black p-2 aspect-square">
            <View className="w-full h-full border-4 border-black overflow-hidden">
              <NeoSkeleton />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <HalftoneBackground />
      <View className={`flex-1 ${containerClass}`}>
        {/* Header */}
        <View className="px-4 pt-6 pb-4">
          <View className="-rotate-1 self-start mb-4">
            <NeoText
              className="font-space-grotesk-black text-4xl uppercase tracking-tighter"
              style={
                Platform.OS === 'web'
                  ? ({
                      color: 'transparent',
                      WebkitTextStrokeWidth: '1.5px',
                      WebkitTextStrokeColor: 'black',
                    } as any)
                  : { color: 'black' }
              }
            >
              Library
            </NeoText>
          </View>

          {/* Segmented Control */}
          <View className="flex-row border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {(['Albums', 'Artists', 'Playlists'] as Tab[]).map((tab, idx) => (
              <Pressable
                key={tab}
                onPress={() => {
                  triggerHaptic();
                  setActiveTab(tab);
                }}
                className={`flex-1 py-3 items-center justify-center min-h-[44px] ${activeTab === tab ? 'bg-neo-secondary' : 'bg-white'} ${idx !== 0 ? 'border-l-4 border-black' : ''}`}
              >
                <NeoText variant="caption" className={`font-black uppercase tracking-widest ${activeTab === tab ? 'text-white' : 'text-black'}`}>
                  {tab}
                </NeoText>
              </Pressable>
            ))}
          </View>
        </View>

        {activeTab === 'Albums' && renderSortMenu()}

        {/* Error State */}
        {error && !isLoading && (
          <View className="px-4 mb-4">
            <View className="bg-neo-accent border-4 border-black p-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <NeoText variant="body" className="font-bold text-center mb-4">
                {error}
              </NeoText>
              <NeoButton label="RETRY" onPress={() => loadData(true)} />
            </View>
          </View>
        )}

        {/* Empty State */}
        {!isLoading &&
          !error &&
          ((activeTab === 'Albums' && albums.length === 0) ||
            (activeTab === 'Artists' && artistsSections.length === 0) ||
            (activeTab === 'Playlists' && playlists.length === 0)) && (
            <View className="flex-1 items-center justify-center px-6 pb-20">
              <NeoCard className="items-center p-8 bg-white border-4 border-black rotate-1">
                <NeoText variant="h3" className="font-black uppercase mb-2 text-center">
                  NO {activeTab.toUpperCase()} FOUND
                </NeoText>
                <NeoText variant="caption" className="font-bold opacity-70 text-center">
                  Check your Subsonic library
                </NeoText>
              </NeoCard>
            </View>
          )}

        {/* Loading Skeletons */}
        {isLoading &&
        (activeTab === 'Albums'
          ? albums.length === 0
          : activeTab === 'Artists'
          ? artistsSections.length === 0
          : playlists.length === 0)
          ? renderSkeletons()
          : null}

        {/* Lists */}
        {!isLoading && activeTab === 'Albums' && albums.length > 0 && (
          <FlatList
            key={`albums-${numColumns}`}
            data={albums}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            renderItem={renderAlbum}
            removeClippedSubviews={Platform.OS !== 'web'}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            contentContainerStyle={{ paddingHorizontal: isDesktop ? 16 : 8, paddingBottom: 100 }}
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
            removeClippedSubviews={Platform.OS !== 'web'}
            renderSectionHeader={({ section: { title } }) => (
              <View className="px-4 py-2 bg-neo-bg mb-2">
                <View className="w-8 h-8 bg-neo-secondary border-2 border-black items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-3">
                  <NeoText variant="body" className="font-black text-white">
                    {title}
                  </NeoText>
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
            removeClippedSubviews={Platform.OS !== 'web'}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor="black" />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}


