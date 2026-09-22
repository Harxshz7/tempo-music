import React, { useEffect, useState } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  Image,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Play, Shuffle, MoreHorizontal, ListMusic, ArrowUp, ArrowDown, HardDriveDownload, Lock } from 'lucide-react-native';
import subsonic from '../api/subsonic';
import { useResponsive } from '../hooks/useResponsive';
import { NeoText, NeoButton, NeoCard, NeoBadge, NeoInput, NeoSkeleton } from '../components/ui';
import { usePlayerStore, Track } from '../store/playerStore';
import { TrackRow, AddToPlaylistModal } from '../components';
import type { Playlist, Song } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { offlineService } from '../services/offlineService';
import { showToast } from '../services/toast';

export default function PlaylistDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const playlistId = route.params?.playlistId;
  const { containerClass, isDesktop } = useResponsive();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isReordering, setIsReordering] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [isAddToPlaylistVisible, setIsAddToPlaylistVisible] = useState(false);

  const { currentTrack, setQueue } = usePlayerStore();

  const currentUser = subsonic.getConfig()?.username;
  const isOwner = !playlist?.owner || playlist.owner === currentUser;

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

  const handleMoveTrack = async (fromIndex: number, toIndex: number) => {
    if (!isOwner || toIndex < 0 || toIndex >= songs.length) return;
    triggerHaptic();

    const updated = [...songs];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setSongs(updated);

    try {
      const songIds = updated.map((s) => s.id);
      await subsonic.replacePlaylistTracks(playlistId, playlist?.name || 'Playlist', songIds);
    } catch (err: any) {
      showToast('Failed to save playlist order', 'error');
      loadData(); // Revert on failure
    }
  };

  const handleRemoveTrack = async (index: number) => {
    try {
      await subsonic.updatePlaylist(playlistId, index);
      setSongs((prev) => {
        const newSongs = [...prev];
        newSongs.splice(index, 1);
        return newSongs;
      });
      if (playlist) {
        setPlaylist({
          ...playlist,
          songCount: (playlist.songCount || 1) - 1,
        });
      }
      showToast('Track removed', 'info');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove track');
    }
  };

  const handleTrackMenu = (track: Track, index: number) => {
    const song = songs[index];
    const options: import('react-native').AlertButton[] = [
      {
        text: 'Add to Another Playlist',
        onPress: () => {
          if (song) {
            setAddToPlaylistSong(song);
            setIsAddToPlaylistVisible(true);
          }
        },
      },
      {
        text: 'Download Track',
        onPress: () => {
          if (song) offlineService.downloadTrack(song);
        },
      },
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
      setPlaylist((prev) => (prev ? { ...prev, name: newName.trim() } : prev));
      showToast('Playlist renamed', 'success');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to rename playlist');
    }
  };

  const handleHeaderMenu = () => {
    const options: import('react-native').AlertButton[] = [
      {
        text: 'Download Offline Playlist',
        onPress: () => offlineService.downloadPlaylist(playlistId),
      },
    ];

    if (isOwner) {
      options.push({
        text: isReordering ? 'Done Reordering' : 'Reorder Tracks',
        onPress: () => setIsReordering(!isReordering),
      });
      options.push({
        text: 'Rename Playlist',
        onPress: () => {
          setNewName(playlist?.name || '');
          setIsRenameModalVisible(true);
        },
      });
      options.push({
        text: 'Delete Playlist',
        style: 'destructive',
        onPress: handleDeletePlaylist,
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Playlist Options', playlist?.name, options);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderCoverArt = () => {
    if ((playlist as any)?.coverArt) {
      return <Image source={{ uri: subsonic.getCoverArtUrl((playlist as any).coverArt) }} className="w-full h-full" />;
    }

    const covers = songs.map((s) => s.coverArt).filter(Boolean).slice(0, 4);
    if (covers.length === 4) {
      return (
        <View className="w-full h-full flex-row flex-wrap">
          {covers.map((coverId, i) => (
            <Image key={i} source={{ uri: subsonic.getCoverArtUrl(coverId!) }} className="w-1/2 h-1/2" />
          ))}
        </View>
      );
    }

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
          <View className="w-[55%] aspect-square border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted overflow-hidden">
            <NeoSkeleton />
          </View>
          <View className="w-3/4 h-8 mt-8 mb-2 border-4 border-black overflow-hidden">
            <NeoSkeleton />
          </View>
          <View className="w-1/2 h-6 border-4 border-black overflow-hidden">
            <NeoSkeleton />
          </View>
        </View>
      );
    }

    if (error || !playlist) {
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

    const totalSeconds = playlist.duration || songs.reduce((acc, song) => acc + (song.duration || 0), 0);

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

        <View className="w-48 sm:w-60 aspect-square border-4 border-black -rotate-1 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-neo-muted mb-8 mt-4 relative overflow-hidden">
          {renderCoverArt()}
        </View>

        <View className="flex-row items-center gap-2">
          <NeoText variant="h2" numberOfLines={2} className="font-black uppercase text-2xl tracking-tight text-center px-2">
            {playlist.name}
          </NeoText>
          {!isOwner && (
            <NeoBadge label="READ ONLY" variant="primary" className="bg-neo-bg" />
          )}
        </View>

        <View className="flex-row items-center mt-3 opacity-60">
          <NeoText variant="caption" className="font-bold text-xs">
            {playlist.songCount || songs.length} tracks
          </NeoText>
          <NeoText variant="caption" className="font-bold text-xs mx-2">
            •
          </NeoText>
          <NeoText variant="caption" className="font-bold text-xs">
            {formatDuration(totalSeconds)}
          </NeoText>
          {playlist.owner && (
            <>
              <NeoText variant="caption" className="font-bold text-xs mx-2">•</NeoText>
              <NeoText variant="caption" className="font-bold text-xs uppercase">by {playlist.owner}</NeoText>
            </>
          )}
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

  const renderItem = ({ item, index }: { item: Song; index: number }) => {
    const isPlaying = currentTrack?.id === item.id;
    return (
      <View className="flex-row items-center">
        {isReordering && (
          <View className="flex-row items-center pl-3 gap-1">
            <Pressable
              onPress={() => handleMoveTrack(index, index - 1)}
              disabled={index === 0}
              className={`w-8 h-8 items-center justify-center border-2 border-black ${index === 0 ? 'bg-gray-200 opacity-40' : 'bg-neo-secondary'}`}
            >
              <ArrowUp color="black" size={16} />
            </Pressable>
            <Pressable
              onPress={() => handleMoveTrack(index, index + 1)}
              disabled={index === songs.length - 1}
              className={`w-8 h-8 items-center justify-center border-2 border-black ${index === songs.length - 1 ? 'bg-gray-200 opacity-40' : 'bg-neo-secondary'}`}
            >
              <ArrowDown color="black" size={16} />
            </Pressable>
          </View>
        )}
        <View className="flex-1">
          <TrackRow
            song={item}
            index={index}
            isPlaying={isPlaying}
            onPress={() => handleTrackPress(index)}
            onMenuPress={(track) => handleTrackMenu(track, index)}
          />
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading || error || !playlist) return null;
    return (
      <View className="items-center justify-center py-10 px-6">
        <NeoText variant="h2" className="font-black uppercase text-xl mb-2 text-center">
          NO TRACKS YET
        </NeoText>
        <NeoText variant="body" className="font-bold opacity-60 text-center">
          Add songs from any album or search result
        </NeoText>
      </View>
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
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={<View className="h-[90px]" />}
          contentContainerStyle={{ paddingHorizontal: isDesktop ? 16 : 0 }}
        />

        {error && !isLoading && (
          <View className="absolute bottom-[90px] left-4 right-4 bg-neo-accent border-4 border-black p-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <NeoText variant="body" className="font-bold text-center mb-4">
              {error}
            </NeoText>
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
            <NeoCard className="w-full max-w-md p-6 bg-neo-bg">
              <NeoText variant="h3" className="font-black mb-4">
                Rename Playlist
              </NeoText>
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

        <AddToPlaylistModal
          visible={isAddToPlaylistVisible}
          onClose={() => setIsAddToPlaylistVisible(false)}
          songsToAdd={addToPlaylistSong ? [addToPlaylistSong] : []}
        />
      </View>
    </SafeAreaView>
  );
}

