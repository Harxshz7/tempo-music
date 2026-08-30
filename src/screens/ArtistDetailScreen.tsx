import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  Image,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Play, Shuffle } from 'lucide-react-native';
import subsonic from '../api/subsonic';
import { useResponsive } from '../hooks/useResponsive';
import { NeoText, NeoButton, NeoCard, NeoSkeleton } from '../components/ui';
import { usePlayerStore, Track } from '../store/playerStore';
import AlbumGridItem from '../components/AlbumGridItem';
import type { Artist, Album, Song } from '../types';
import { triggerHaptic } from '../utils/haptics';


export default function ArtistDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const artistId = route.params?.artistId;
  const { numColumns, containerClass, isDesktop } = useResponsive();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setQueue } = usePlayerStore();

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subsonic.getArtist(artistId);
      setArtist(data.artist);
      setAlbums(data.album || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load artist');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (artistId) {
      loadData();
    }
  }, [artistId]);

  const mapToTracks = (songsList: Song[], album: Album): Track[] => {
    return songsList.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist || artist?.name || 'Unknown',
      coverArtUrl: song.coverArt ? subsonic.getCoverArtUrl(song.coverArt) : (album.coverArt ? subsonic.getCoverArtUrl(album.coverArt) : undefined),
      streamUrl: subsonic.getStreamUrl(song.id),
      duration: song.duration || 0,
    }));
  };

  const fetchAllTracks = async (): Promise<Track[]> => {
    // For large discographies, fetching all albums can be slow, but this is the simplest way.
    let allTracks: Track[] = [];
    for (const album of albums) {
      try {
        const albumData = await subsonic.getAlbum(album.id);
        allTracks = [...allTracks, ...mapToTracks(albumData.song || [], album)];
      } catch (err) {
        console.error("Failed to load album tracks for play all", err);
      }
    }
    return allTracks;
  };

  const handlePlayAll = async () => {
    setIsLoading(true);
    const tracks = await fetchAllTracks();
    setIsLoading(false);
    if (tracks.length > 0) {
      setQueue(tracks, 0);
    }
  };

  const handleShuffle = async () => {
    setIsLoading(true);
    const tracks = await fetchAllTracks();
    setIsLoading(false);
    if (tracks.length > 0) {
      const shuffled = [...tracks];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQueue(shuffled, 0);
    }
  };

  const renderHeader = () => {
    if (isLoading && !artist) {
      return (
        <View className="items-center px-4 pt-4 pb-8">
          <View className="self-start mb-6">
            <Pressable 
              onPress={() => {
                triggerHaptic();
                navigation.goBack();
              }}
              className="w-11 h-11 items-center justify-center -ml-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft color="black" size={32} />
            </Pressable>
          </View>
          <View className="w-48 h-48 border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted overflow-hidden">
             <NeoSkeleton />
          </View>
          <View className="w-3/4 h-8 mt-8 mb-2 border-4 border-black overflow-hidden"><NeoSkeleton /></View>
          <View className="w-1/2 h-6 border-4 border-black overflow-hidden"><NeoSkeleton /></View>
        </View>
      );
    }

    if (error && !artist) {
      return (
        <View className="px-4 pt-4">
           <Pressable 
             onPress={() => {
               triggerHaptic();
               navigation.goBack();
             }}
             className="w-11 h-11 items-center justify-center -ml-2"
             hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
           >
             <ChevronLeft color="black" size={32} />
           </Pressable>
        </View>
      );
    }

    if (!artist) return null;

    const totalTracks = albums.reduce((acc, alb) => acc + (alb.songCount || 0), 0);
    const initial = artist.name ? artist.name.charAt(0).toUpperCase() : '?';

    return (
      <View className="items-center px-4 pt-4 pb-8">
        <View className="self-start w-full">
          <Pressable 
            onPress={() => {
              triggerHaptic();
              navigation.goBack();
            }}
            className="w-11 h-11 items-center justify-center -ml-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft color="black" size={32} />
          </Pressable>
        </View>
        
        <View className="w-44 sm:w-56 aspect-square border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted mb-8 relative justify-center items-center overflow-hidden">
           {artist.artistImageUrl ? (
             <Image source={{ uri: artist.artistImageUrl }} className="w-full h-full" />
           ) : (
             <NeoText className="font-black text-6xl">{initial}</NeoText>
           )}
        </View>
        
        <NeoText variant="h2" numberOfLines={2} className="font-black uppercase text-3xl tracking-tight text-center px-4">
          {artist.name}
        </NeoText>
        
        <View className="flex-row items-center mt-3 opacity-60">
          <NeoText variant="caption" className="font-bold text-xs">{albums.length} albums</NeoText>
          {totalTracks > 0 && (
            <>
              <NeoText variant="caption" className="font-bold text-xs mx-2">•</NeoText>
              <NeoText variant="caption" className="font-bold text-xs">{totalTracks} tracks</NeoText>
            </>
          )}
        </View>


        <View className="flex-row items-center justify-center gap-3 mt-8 w-full max-w-md px-6 mb-8">
          <NeoButton 
            label="PLAY ALL" 
            variant="primary" 
            className="flex-1 h-12"
            icon={<Play color="black" size={20} fill="black" />}
            onPress={handlePlayAll}
            disabled={albums.length === 0 || isLoading}
          />
          <NeoButton 
            label="SHUFFLE" 
            variant="secondary" 
            className="flex-1 h-12"
            icon={<Shuffle color="black" size={20} />}
            onPress={handleShuffle}
            disabled={albums.length === 0 || isLoading}
          />
        </View>

        {albums.length > 0 && (
          <View className="w-full border-b-4 border-black pb-2 mb-2 px-2">
             <NeoText className="font-black uppercase text-lg">ALBUMS</NeoText>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading || error || !artist) return null;
    return (
      <View className="flex-1 items-center justify-center px-6 py-20">
        <NeoCard className="items-center p-8 bg-white border-4 border-black rotate-1 w-full">
          <NeoText variant="h3" className="font-black uppercase mb-2 text-center">NO ALBUMS FOUND</NeoText>
        </NeoCard>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <View className={`flex-1 ${containerClass}`}>
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <AlbumGridItem album={item} index={index} numColumns={numColumns} showArtistName={false} />}
          numColumns={numColumns}
          key={`artist-albums-${numColumns}`}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingHorizontal: isDesktop ? 16 : 8, paddingBottom: 90 }}
        />
        
        {error && !isLoading && (
          <View className="absolute bottom-24 left-4 right-4 bg-neo-accent border-4 border-black p-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <NeoText variant="body" className="font-bold text-center mb-4">{error}</NeoText>
            <NeoButton label="RETRY" onPress={loadData} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
