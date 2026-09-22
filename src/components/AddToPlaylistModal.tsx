import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Plus, ListMusic, Check } from 'lucide-react-native';
import { NeoText, NeoCard, NeoButton } from './ui';
import subsonic from '../api/subsonic';
import type { Playlist, Song } from '../types';
import { showToast } from '../services/toast';
import { triggerHaptic } from '../utils/haptics';
import CreatePlaylistModal from './CreatePlaylistModal';

interface AddToPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  songsToAdd?: Song[]; // Songs to add (could be single track or album tracks)
}

export default function AddToPlaylistModal({
  visible,
  onClose,
  songsToAdd = [],
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentUser = subsonic.getConfig()?.username;

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const data = await subsonic.getPlaylists();
      // Filter owned playlists or public editable playlists
      const owned = data.filter((p) => !p.owner || p.owner === currentUser);
      setPlaylists(owned);
    } catch {
      setPlaylists([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadPlaylists();
    }
  }, [visible]);

  const handleSelectPlaylist = async (playlist: Playlist) => {
    if (!songsToAdd.length || addingToId) return;
    setAddingToId(playlist.id);
    triggerHaptic();

    try {
      const songIds = songsToAdd.map((s) => s.id);
      await subsonic.addSongsToPlaylist(playlist.id, songIds);
      showToast(`Added to "${playlist.name}"`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to add to playlist', 'error');
    } finally {
      setAddingToId(null);
    }
  };

  return (
    <>
      <Modal visible={visible && !showCreateModal} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable className="flex-1 justify-center items-center bg-black/60 px-4" onPress={onClose}>
          <Pressable className="w-full max-w-md max-h-[80%]" onPress={(e) => e.stopPropagation()}>
            <NeoCard className="p-6 bg-neo-bg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
              <View className="flex-row items-center justify-between mb-4 border-b-4 border-black pb-3">
                <NeoText variant="h2" className="font-black uppercase text-xl">
                  ADD TO PLAYLIST
                </NeoText>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setShowCreateModal(true);
                  }}
                  className="bg-neo-secondary border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-row items-center gap-1 active:opacity-75"
                >
                  <Plus color="black" size={16} />
                  <NeoText variant="caption" className="font-black text-xs uppercase">
                    NEW
                  </NeoText>
                </Pressable>
              </View>

              <NeoText variant="caption" className="font-bold opacity-60 mb-3">
                Select a playlist for {songsToAdd.length} track{songsToAdd.length !== 1 ? 's' : ''}:
              </NeoText>

              {isLoading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color="black" />
                </View>
              ) : playlists.length === 0 ? (
                <View className="py-8 items-center">
                  <NeoText className="font-bold text-center opacity-70 mb-4">
                    NO EDITABLE PLAYLISTS FOUND
                  </NeoText>
                  <NeoButton
                    label="CREATE NEW PLAYLIST"
                    variant="primary"
                    onPress={() => setShowCreateModal(true)}
                  />
                </View>
              ) : (
                <FlatList
                  data={playlists}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelectPlaylist(item)}
                      className="bg-white border-2 border-black p-3 mb-2 flex-row items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:bg-neo-secondary/20"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-8 h-8 border-2 border-black bg-neo-muted items-center justify-center mr-3">
                          <ListMusic color="black" size={16} />
                        </View>
                        <View className="flex-1">
                          <NeoText variant="body" numberOfLines={1} className="font-black uppercase text-sm">
                            {item.name}
                          </NeoText>
                          <NeoText variant="caption" className="font-bold text-xs opacity-60">
                            {item.songCount ?? 0} tracks
                          </NeoText>
                        </View>
                      </View>
                      {addingToId === item.id ? (
                        <ActivityIndicator size="small" color="black" />
                      ) : (
                        <Plus color="black" size={20} />
                      )}
                    </Pressable>
                  )}
                />
              )}

              <View className="mt-4 pt-3 border-t-2 border-black/20">
                <NeoButton label="CANCEL" variant="ghost" onPress={onClose} />
              </View>
            </NeoCard>
          </Pressable>
        </Pressable>
      </Modal>

      <CreatePlaylistModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialSongIds={songsToAdd.map((s) => s.id)}
        onCreated={() => {
          setShowCreateModal(false);
          onClose();
        }}
      />
    </>
  );
}
