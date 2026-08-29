import React, { useState, useEffect } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  Pressable,
  Image,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import subsonic from '../api/subsonic';
import { useResponsive } from '../hooks/useResponsive';
import { NeoText, NeoInput, NeoButton } from '../components/ui';
import { TrackRow, AlbumGridItem } from '../components';
import { useDebounce } from '../hooks/useDebounce';
import { usePlayerStore, Track } from '../store/playerStore';
import type { Artist, Album, Song } from '../types';

type SearchTab = 'ALL' | 'ARTISTS' | 'ALBUMS' | 'SONGS';

interface SearchState {
  artists: Artist[];
  albums: Album[];
  songs: Song[];
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { numColumns, containerClass, isDesktop, isTablet } = useResponsive();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const [results, setResults] = useState<SearchState>({ artists: [], albums: [], songs: [] });
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('ALL');
  const [hasSearched, setHasSearched] = useState(false);

  const { currentTrack, setQueue } = usePlayerStore();

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery.trim());
    } else {
      // Clear if empty or less than 2 chars
      setResults({ artists: [], albums: [], songs: [] });
      setHasSearched(false);
      setIsFetching(false);
    }
  }, [debouncedQuery]);

  const performSearch = async (text: string) => {
    setIsFetching(true);
    try {
      const res = await subsonic.search3(text, 50, 50, 50);
      setResults({
        artists: res.artist?.artist ?? [],
        albums: res.album?.album ?? [],
        songs: res.song?.song ?? [],
      });
      setHasSearched(true);
    } catch (e) {
      console.error(e);
      setResults({ artists: [], albums: [], songs: [] });
    } finally {
      setIsFetching(false);
    }
  };

  const mapToTracks = (songsList: Song[]): Track[] => {
    return songsList.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist || 'Unknown',
      coverArtUrl: song.coverArt ? subsonic.getCoverArtUrl(song.coverArt) : undefined,
      streamUrl: subsonic.getStreamUrl(song.id),
      duration: song.duration || 0,
    }));
  };

  const handleSongPress = (index: number, list: Song[]) => {
    const tracks = mapToTracks(list);
    setQueue(tracks, index);
  };

  const handleMenuPress = (track: Track) => {
    // Add to queue logic if needed
  };

  const renderTabs = () => {
    const tabs: { key: SearchTab; label: string }[] = [
      { key: 'ALL', label: 'ALL' },
      { key: 'ARTISTS', label: `ARTISTS (${results.artists.length})` },
      { key: 'ALBUMS', label: `ALBUMS (${results.albums.length})` },
      { key: 'SONGS', label: `SONGS (${results.songs.length})` },
    ];

    return (
      <View className="px-4 pb-4">
        <View className="flex-row border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {tabs.map((tab, idx) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 items-center justify-center ${activeTab === tab.key ? 'bg-neo-secondary' : 'bg-white'} ${idx !== 0 ? 'border-l-4 border-black' : ''}`}
            >
              <NeoText variant="caption" className={`font-black uppercase tracking-widest text-[10px] sm:text-xs ${activeTab === tab.key ? 'text-white' : 'text-black'}`}>
                {tab.label}
              </NeoText>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderArtistAvatar = (artist: Artist) => {
    const initial = artist.name ? artist.name.charAt(0).toUpperCase() : '?';
    return (
      <Pressable
        key={artist.id}
        onPress={() => navigation.navigate('ArtistDetail', { artistId: artist.id })}
        className="w-16 mr-4 items-center"
      >
        <View className="w-16 h-16 border-2 border-black -rotate-1 bg-neo-muted overflow-hidden items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {artist.artistImageUrl ? (
            <Image source={{ uri: artist.artistImageUrl }} className="w-full h-full" />
          ) : (
            <NeoText className="font-black text-2xl">{initial}</NeoText>
          )}
        </View>
        <NeoText variant="caption" numberOfLines={1} className="font-bold uppercase text-xs mt-2 text-center">
          {artist.name}
        </NeoText>
      </Pressable>
    );
  };

  const renderSectionHeader = (title: string, onSeeAll: () => void) => (
    <View className="flex-row justify-between items-end px-4 mb-3 mt-6">
      <View className="border-b-4 border-black pb-1">
        <NeoText className="font-black uppercase text-lg">{title}</NeoText>
      </View>
      <Pressable onPress={onSeeAll}>
        <NeoText variant="caption" className="font-bold text-neo-accent uppercase">See all</NeoText>
      </Pressable>
    </View>
  );

  const maxItemsShown = isDesktop ? 10 : isTablet ? 8 : 6;
  const maxSongsShown = isDesktop ? 10 : 5;

  const renderAllTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      {results.artists.length > 0 && (
        <View>
          {renderSectionHeader('ARTISTS', () => setActiveTab('ARTISTS'))}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isDesktop ? 24 : 16, paddingBottom: 8 }}>
            {results.artists.slice(0, maxItemsShown).map(renderArtistAvatar)}
          </ScrollView>
        </View>
      )}

      {results.albums.length > 0 && (
        <View>
          {renderSectionHeader('ALBUMS', () => setActiveTab('ALBUMS'))}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isDesktop ? 24 : 8, paddingBottom: 12 }}>
            {results.albums.slice(0, maxItemsShown).map((album, idx) => (
              <View style={{ width: 140 }} key={album.id}>
                <AlbumGridItem album={album} index={idx} numColumns={1} showArtistName={true} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {results.songs.length > 0 && (
        <View>
          {renderSectionHeader('SONGS', () => setActiveTab('SONGS'))}
          {results.songs.slice(0, maxSongsShown).map((song, idx) => (
            <TrackRow
              key={song.id}
              song={song}
              index={idx}
              isPlaying={currentTrack?.id === song.id}
              onPress={() => handleSongPress(idx, results.songs.slice(0, maxSongsShown))}
              onMenuPress={handleMenuPress}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderArtistsTab = () => (
    <FlatList
      data={results.artists}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={`artists-${numColumns}`}
      contentContainerStyle={{ paddingHorizontal: isDesktop ? 16 : 8, paddingBottom: 100 }}
      renderItem={({ item, index }) => {
        const rotation = index % 2 === 0 ? '-rotate-1' : 'rotate-1';
        const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
        return (
          <View style={{ width: `${100 / numColumns}%` }} className="p-2">
            <Pressable onPress={() => navigation.navigate('ArtistDetail', { artistId: item.id })}>
              <View className={`bg-white border-4 border-black p-3 ${rotation} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] items-center`}>
                <View className="w-20 h-20 border-2 border-black bg-neo-muted overflow-hidden items-center justify-center mb-2">
                  {item.artistImageUrl ? (
                    <Image source={{ uri: item.artistImageUrl }} className="w-full h-full" />
                  ) : (
                    <NeoText className="font-black text-4xl">{initial}</NeoText>
                  )}
                </View>
                <NeoText variant="body" numberOfLines={1} className="font-black uppercase text-sm text-center">
                  {item.name}
                </NeoText>
              </View>
            </Pressable>
          </View>
        );
      }}
    />
  );

  const renderAlbumsTab = () => (
    <FlatList
      data={results.albums}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={`albums-${numColumns}`}
      contentContainerStyle={{ paddingHorizontal: isDesktop ? 16 : 8, paddingBottom: 100 }}
      renderItem={({ item, index }) => (
        <AlbumGridItem album={item} index={index} numColumns={numColumns} showArtistName={true} />
      )}
    />
  );

  const renderSongsTab = () => (
    <FlatList
      data={results.songs}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: isDesktop ? 16 : 0 }}
      renderItem={({ item, index }) => (
        <TrackRow
          song={item}
          index={index}
          isPlaying={currentTrack?.id === item.id}
          onPress={() => handleSongPress(index, results.songs)}
          onMenuPress={handleMenuPress}
        />
      )}
    />
  );

  const totalResults = results.artists.length + results.albums.length + results.songs.length;
  const isIdle = !debouncedQuery.trim() || debouncedQuery.trim().length < 2;
  const isNoResults = hasSearched && totalResults === 0 && !isFetching;

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <View className={`flex-1 ${containerClass}`}>
        <View className="px-4 pt-6 pb-4">
          <NeoInput
            placeholder="SEARCH ARTISTS, ALBUMS, SONGS"
            value={query}
            onChangeText={setQuery}
            autoFocus={Platform.OS === 'web'}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim().length >= 2) {
                performSearch(query.trim());
              }
            }}
            leftIcon={<Search color="black" size={24} />}
            rightIcon={
              query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} className="p-2">
                  <X color="black" size={24} />
                </Pressable>
              ) : undefined
            }
          />
        </View>

        {!isIdle && renderTabs()}

        <View className="flex-1 relative">
          {isFetching && (
            <View className="absolute inset-0 bg-neo-bg/50 z-10 items-center pt-20">
              <View className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <ActivityIndicator size="large" color="black" />
              </View>
            </View>
          )}

          {isIdle ? (
            <View className="flex-1 items-center justify-center pb-32">
              <Search color="black" size={80} opacity={0.2} />
              <NeoText className="font-black uppercase text-xl mt-4 opacity-50 text-center px-8">
                SEARCH YOUR LIBRARY
              </NeoText>
            </View>
          ) : isNoResults ? (
            <View className="flex-1 items-center justify-center pb-32">
              <NeoText className="font-black uppercase text-2xl text-center px-4">
                NO RESULTS FOR '{debouncedQuery}'
              </NeoText>
              <NeoText className="font-bold opacity-60 mt-2">
                Try a different search
              </NeoText>
            </View>
          ) : (
            <>
              {activeTab === 'ALL' && renderAllTab()}
              {activeTab === 'ARTISTS' && renderArtistsTab()}
              {activeTab === 'ALBUMS' && renderAlbumsTab()}
              {activeTab === 'SONGS' && renderSongsTab()}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
