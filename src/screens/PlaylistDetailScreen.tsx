import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  Image,
  Pressable,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Play, Shuffle, MoreHorizontal, ListMusic } from 'lucide-react-native';
import subsonic from '../api/subsonic';
import { NeoText, NeoButton, NeoCard, NeoBadge, NeoInput } from '../components/ui';
import { usePlayerStore, Track } from '../store/playerStore';
import { TrackRow } from '../components';
import type { Playlist, Song } from '../types';

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

export default function PlaylistDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const playlistId = route.params?.playlistId;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const { currentTrack, setQueue } = usePlayerStore();

  const currentUser = subsonic.getConfig()?.username;
  const isOwner = playlist?.owner === currentUser;

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subsonic.getPlaylist(playlistId);
      setPlaylist(data.playlist);
      setSongs(data.entry || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (playlistId) {
      loadData();
    }
  }, [playlistId]);

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

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    const tracks = mapToTracks(songs);
    setQueue(tracks, 0);
  };

  const handleShuffle = () => {
    if (songs.length === 0) return;
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

  const handleRemoveTrack = async (index: number) => {
    try {
      await subsonic.updatePlaylist(playlistId, index);
      // Optimistically update
      setSongs((prev) => {
        const newSongs = [...prev];
        newSongs.splice(index, 1);
        return newSongs;
      });
      if (playlist) {
        setPlaylist({
           ...playlist,
           songCount: (playlist.songCount || 1) - 1
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove track');
    }
  };

  const handleTrackMenu = (track: Track, index: number) => {
    const options: import('react-native').AlertButton[] = [
      { text: 'Play Next', onPress: () => console.log('Play Next', track) },
      { text: 'Add to Queue', onPress: () => console.log('Add to Queue', track) },
    ];
    
    if (isOwner) {
      options.push({
        text: 'Remove from Playlist',
        style: 'destructive' as const,
        onPress: () => handleRemoveTrack(index),
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' as const });

    Alert.alert('Track Options', track.title, options);
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await subsonic.deletePlaylist(playlistId);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const handleRenamePlaylist = async () => {
    if (!newName.trim()) return;
    try {
      await subsonic.updatePlaylist(playlistId, undefined, newName.trim());
      setIsRenameModalVisible(false);
      setPlaylist(prev => prev ? { ...prev, name: newName.trim() } : prev);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to rename playlist');
    }
  };

  const handleHeaderMenu = () => {
    if (!isOwner) return;
    Alert.alert('Playlist Options', playlist?.name, [
      { text: 'Rename', onPress: () => {
          setNewName(playlist?.name || '');
          setIsRenameModalVisible(true);
      }},
      { text: 'Delete Playlist', style: 'destructive', onPress: handleDeletePlaylist },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderCoverArt = () => {
    // If playlist has a direct cover art
    if ((playlist as any)?.coverArt) {
      return <Image source={{ uri: subsonic.getCoverArtUrl((playlist as any).coverArt) }} className="w-full h-full" />;
    }

    // 2x2 collage of first 4 tracks
    const covers = songs.map(s => s.coverArt).filter(Boolean).slice(0, 4);
    if (covers.length === 4) {
      return (
        <View className="w-full h-full flex-row flex-wrap">
          {covers.map((coverId, i) => (
            <Image key={i} source={{ uri: subsonic.getCoverArtUrl(coverId!) }} className="w-1/2 h-1/2" />
          ))}
        </View>
      );
    }

    // Fallback placeholder
    return (
      <View className="w-full h-full items-center justify-center bg-gray-200">
        <ListMusic color="black" size={48} opacity={0.5} />
      </View>
    );
  };

  const renderHeader = () => {
    if (isLoading) {
      return (
        <View className="items-center px-4 pt-4 pb-8">
          <View className="self-start mb-6 w-full flex-row">
            <NeoButton variant="ghost" icon={<ChevronLeft color="black" size={32} />} onPress={() => navigation.goBack()} />
          </View>
          <View className="w-[55%] aspect-square border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted overflow-hidden">
             <SkeletonPulse />
          </View>
          <View className="w-3/4 h-8 mt-8 mb-2 border-4 border-black overflow-hidden"><SkeletonPulse /></View>
          <View className="w-1/2 h-6 border-4 border-black overflow-hidden"><SkeletonPulse /></View>
        </View>
      );
    }

    if (error || !playlist) {
      return (
        <View className="px-4 pt-4">
           <NeoButton variant="ghost" icon={<ChevronLeft color="black" size={32} />} onPress={() => navigation.goBack()} />
        </View>
      );
    }

    const totalSeconds = playlist.duration || songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    
    return (
      <View className="items-center px-4 pt-4 pb-8">
        <View className="flex-row items-center justify-between w-full">
          <NeoButton variant="ghost" icon={<ChevronLeft color="black" size={32} />} onPress={() => navigation.goBack()} />
          {isOwner && (
            <Pressable onPress={handleHeaderMenu} className="p-2">
              <MoreHorizontal color="black" size={28} />
            </Pressable>
          )}
        </View>
        
        <View className="w-[55%] aspect-square border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted mb-8 mt-4 relative overflow-hidden">
           {renderCoverArt()}
        </View>
        
        <NeoText variant="h2" numberOfLines={2} className="font-black uppercase text-2xl tracking-tight text-center px-4">
          {playlist.name}
        </NeoText>
        
        <View className="flex-row items-center mt-3 opacity-60">
          <NeoText variant="caption" className="font-bold text-xs">{playlist.songCount || songs.length} tracks</NeoText>
          <NeoText variant="caption" className="font-bold text-xs mx-2">•</NeoText>
          <NeoText variant="caption" className="font-bold text-xs">{formatDuration(totalSeconds)}</NeoText>
          {playlist.public !== undefined && (
            <>
              <NeoText variant="caption" className="font-bold text-xs mx-2">•</NeoText>
              <NeoBadge label={playlist.public ? 'Public' : 'Private'} variant={playlist.public ? 'secondary' : 'primary'} />
            </>
          )}
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
      <TrackRow 
        song={item} 
        index={index} 
        isPlaying={isPlaying} 
        onPress={() => handleTrackPress(index)}
        onMenuPress={(track) => handleTrackMenu(track, index)}
      />
    );
  };

  const renderEmpty = () => {
    if (isLoading || error || !playlist) return null;
    return (
      <View className="items-center justify-center py-10 px-6">
        <NeoText variant="h2" className="font-black uppercase text-xl mb-2 text-center">NO TRACKS YET</NeoText>
        <NeoText variant="body" className="font-bold opacity-60 text-center">Add songs from any album or search result</NeoText>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={<View className="h-[90px]" />}
      />
      
      {error && !isLoading && (
        <View className="absolute bottom-[90px] left-4 right-4 bg-neo-accent border-4 border-black p-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <NeoText variant="body" className="font-bold text-center mb-4">{error}</NeoText>
          <NeoButton label="RETRY" onPress={loadData} />
        </View>
      )}

      <Modal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <NeoCard className="w-full p-6 bg-neo-bg">
            <NeoText variant="h3" className="font-black mb-4">Rename Playlist</NeoText>
            <NeoInput 
              value={newName} 
              onChangeText={setNewName} 
              placeholder="Playlist Name" 
              autoFocus 
            />
            <View className="flex-row justify-end mt-6 gap-3">
              <NeoButton label="Cancel" variant="ghost" onPress={() => setIsRenameModalVisible(false)} />
              <NeoButton label="Save" variant="primary" onPress={handleRenamePlaylist} />
            </View>
          </NeoCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
