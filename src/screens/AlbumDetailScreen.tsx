import React, { useEffect, useState } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Play, Shuffle, MoreHorizontal, Music2, Star, HardDriveDownload, Plus } from 'lucide-react-native';
import subsonic from '../api/subsonic';
import { useResponsive } from '../hooks/useResponsive';
import { NeoText, NeoButton, NeoCard, NeoSkeleton } from '../components/ui';
import { usePlayerStore, Track } from '../store/playerStore';
import { TrackRow, AddToPlaylistModal } from '../components';
import type { Album, Song } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useStarredStore } from '../store/starredStore';
import { offlineService } from '../services/offlineService';

export default function AlbumDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const albumId = route.params?.albumId;
  const { containerClass, isDesktop } = useResponsive();

  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addToPlaylistSongs, setAddToPlaylistSongs] = useState<Song[]>([]);
  const [isAddToPlaylistVisible, setIsAddToPlaylistVisible] = useState(false);

  const { currentTrack, setQueue } = usePlayerStore();
  
  const isStarred = useStarredStore((state) => state.isAlbumStarred(albumId, album?.starred));
  const toggleStarAlbum = useStarredStore((state) => state.toggleStarAlbum);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subsonic.getAlbum(albumId);
      setAlbum(data.album);
      setSongs(data.song || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load album');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (albumId) {
      loadData();
    }
  }, [albumId]);

  const mapToTracks = (songsList: Song[]): Track[] => {
    return songsList.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist || album?.artist || 'Unknown',
      coverArtId: song.coverArt,
      duration: song.duration || 0,
      albumId: song.albumId,
      artistId: song.artistId,
    }));
  };

  const handlePlayAll = () => {
    const tracks = mapToTracks(songs);
    setQueue(tracks, 0);
  };

  const handleShuffle = () => {
    const tracks = mapToTracks(songs);
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQueue(shuffled, 0);
  };

  const handleTrackPress = (index: number) => {
    const tracks = mapToTracks(songs);
    setQueue(tracks, index);
  };

  const handleTrackMenu = (track: Track) => {
    const song = songs.find((s) => s.id === track.id);
    if (!song) return;

    Alert.alert('Track Options', track.title, [
      {
        text: 'Add to Playlist',
        onPress: () => {
          setAddToPlaylistSongs([song]);
          setIsAddToPlaylistVisible(true);
        },
      },
      {
        text: 'Download Track',
        onPress: () => offlineService.downloadTrack(song),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleHeaderMenu = () => {
    Alert.alert('Album Options', album?.name, [
      {
        text: isStarred ? 'Unstar Album' : 'Star Album',
        onPress: () => toggleStarAlbum(albumId, isStarred),
      },
      {
        text: 'Download Full Album',
        onPress: () => offlineService.downloadAlbum(albumId),
      },
      {
        text: 'Add Album to Playlist',
        onPress: () => {
          setAddToPlaylistSongs(songs);
          setIsAddToPlaylistVisible(true);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderHeader = () => {
    if (isLoading) {
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

    if (error || !album) {
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

    const totalSeconds = songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    
    return (
      <View className="items-center px-4 pt-4 pb-8">
        <View className="flex-row items-center justify-between w-full">
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

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                triggerHaptic();
                toggleStarAlbum(albumId, isStarred);
              }}
              className="w-11 h-11 items-center justify-center active:opacity-60"
            >
              <Star
                color="black"
                size={26}
                fill={isStarred ? '#FFD93D' : 'transparent'}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                handleHeaderMenu();
              }}
              className="w-11 h-11 items-center justify-center -mr-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreHorizontal color="black" size={28} />
            </Pressable>
          </View>
        </View>
        
        <View className="w-48 sm:w-60 aspect-square border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted mb-8 relative">
           {album.coverArt ? (
             <Image source={{ uri: subsonic.getCoverArtUrl(album.coverArt) }} className="w-full h-full" />
           ) : (
             <View className="w-full h-full items-center justify-center bg-gray-200">
                <Music2 color="black" size={48} opacity={0.5} />
             </View>
           )}
        </View>
        
        <NeoText variant="h2" numberOfLines={2} className="font-black uppercase text-2xl tracking-tight text-center px-4">
          {album.name}
        </NeoText>
        
        <Pressable onPress={() => navigation.navigate('ArtistDetail', { artistId: album.artistId })}>
          <NeoText variant="body" className="font-bold uppercase text-base opacity-70 text-center mt-1">
            {album.artist}
          </NeoText>
        </Pressable>
        
        <View className="flex-row items-center mt-3 opacity-60">
          <NeoText variant="caption" className="font-bold text-xs">{album.year || 'Unknown'}</NeoText>
          <NeoText variant="caption" className="font-bold text-xs mx-2">•</NeoText>
          <NeoText variant="caption" className="font-bold text-xs">{album.songCount || songs.length} tracks</NeoText>
          <NeoText variant="caption" className="font-bold text-xs mx-2">•</NeoText>
          <NeoText variant="caption" className="font-bold text-xs">{formatDuration(totalSeconds)}</NeoText>
        </View>

        <View className="flex-row items-center justify-center gap-3 mt-8 w-full max-w-md px-6">
          <NeoButton 
            label="PLAY ALL" 
            variant="primary" 
            className="flex-1 h-12"
            icon={<Play color="black" size={20} fill="black" />}
            onPress={handlePlayAll}
          />
          <NeoButton 
            label="SHUFFLE" 
            variant="secondary" 
            className="flex-1 h-12"
            icon={<Shuffle color="black" size={20} />}
            onPress={handleShuffle}
          />
        </View>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: Song, index: number }) => {
    const isPlaying = currentTrack?.id === item.id;
    return (
      <TrackRow 
        song={item} 
        index={index} 
        isPlaying={isPlaying} 
        onPress={() => handleTrackPress(index)}
        onMenuPress={handleTrackMenu}
        fallbackArtist={album?.artist}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <View className={`flex-1 ${containerClass}`}>
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={<View className="h-20" />}
          contentContainerStyle={{ paddingHorizontal: isDesktop ? 16 : 0 }}
        />
        
        {error && !isLoading && (
          <View className="absolute bottom-10 left-4 right-4 bg-neo-accent border-4 border-black p-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <NeoText variant="body" className="font-bold text-center mb-4">{error}</NeoText>
            <NeoButton label="RETRY" onPress={loadData} />
          </View>
        )}

        <AddToPlaylistModal
          visible={isAddToPlaylistVisible}
          onClose={() => setIsAddToPlaylistVisible(false)}
          songsToAdd={addToPlaylistSongs}
        />
      </View>
    </SafeAreaView>
  );
}


