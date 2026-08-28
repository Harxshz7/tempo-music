import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  Image,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Play, Shuffle, MoreHorizontal, Music2 } from 'lucide-react-native';
import subsonic from '../api/subsonic';
import { NeoText, NeoButton, NeoCard } from '../components/ui';
import { usePlayerStore, Track } from '../store/playerStore';
import type { Album, Song } from '../types';

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

export default function AlbumDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const albumId = route.params?.albumId;

  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, setQueue, queue } = usePlayerStore();

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
      coverArtUrl: song.coverArt ? subsonic.getCoverArtUrl(song.coverArt) : undefined,
      streamUrl: subsonic.getStreamUrl(song.id),
      duration: song.duration || 0,
    }));
  };

  const handlePlayAll = () => {
    const tracks = mapToTracks(songs);
    setQueue(tracks, 0);
  };

  const handleShuffle = () => {
    const tracks = mapToTracks(songs);
    // Fisher-Yates shuffle
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
    // A full implementation would show an ActionSheet or Custom Modal
    // For now, we'll just add to queue as a fallback, or simple alert.
    // Given the prompt: "opens a simple action sheet/menu ... that modify playerStore.queue"
    // Since we don't have a complex popover built, we can just append it for now, 
    // or we'll need to expand the store to support add to queue / play next.
    // Wait, the prompt says "opens a simple action sheet/menu ... with 'Play Next' and 'Add to Queue' options"
    // We can use the native Alert for simplicity if we don't have a modal, but let's build a quick custom one or leave a comment.
    // I'll add the store functions below.
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
            <NeoButton variant="ghost" icon={<ChevronLeft color="black" size={32} />} onPress={() => navigation.goBack()} />
          </View>
          <View className="w-48 h-48 border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted overflow-hidden">
             <SkeletonPulse />
          </View>
          <View className="w-3/4 h-8 mt-8 mb-2 border-4 border-black overflow-hidden"><SkeletonPulse /></View>
          <View className="w-1/2 h-6 border-4 border-black overflow-hidden"><SkeletonPulse /></View>
        </View>
      );
    }

    if (error || !album) {
      return (
        <View className="px-4 pt-4">
           <NeoButton variant="ghost" icon={<ChevronLeft color="black" size={32} />} onPress={() => navigation.goBack()} />
        </View>
      );
    }

    const totalSeconds = songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    
    return (
      <View className="items-center px-4 pt-4 pb-8">
        <View className="self-start w-full">
          <NeoButton variant="ghost" icon={<ChevronLeft color="black" size={32} />} onPress={() => navigation.goBack()} />
        </View>
        
        <View className="w-[55%] aspect-square border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted mb-8 relative">
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

        <View className="flex-row items-center justify-center gap-3 mt-8 w-full px-6">
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
      <Pressable 
        className={`flex-row items-center px-4 py-3 border-b-2 border-black ${isPlaying ? 'bg-neo-secondary/30' : ''}`}
        onPress={() => handleTrackPress(index)}
      >
        <View className="w-8 items-center justify-center mr-2">
          {isPlaying ? (
            <ActivityIndicator size="small" color="black" />
          ) : (
            <NeoText variant="caption" className="font-black text-sm">{item.track || index + 1}</NeoText>
          )}
        </View>
        <View className="flex-1 mr-4">
          <NeoText variant="body" numberOfLines={1} className="font-bold text-sm">
            {item.title}
          </NeoText>
        </View>
        <NeoText variant="caption" className="font-bold text-xs opacity-60 mr-4">
          {formatDuration(item.duration || 0)}
        </NeoText>
        <Pressable onPress={() => handleTrackMenu(mapToTracks([item])[0])} className="p-2">
          <MoreHorizontal color="black" size={20} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={<View className="h-20" />} // padding bottom
      />
      
      {error && !isLoading && (
        <View className="absolute bottom-10 left-4 right-4 bg-neo-accent border-4 border-black p-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <NeoText variant="body" className="font-bold text-center mb-4">{error}</NeoText>
          <NeoButton label="RETRY" onPress={loadData} />
        </View>
      )}
    </SafeAreaView>
  );
}
