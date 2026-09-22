import React, { useState } from 'react';
import { View, Modal, Pressable } from 'react-native';
import { NeoText, NeoCard, NeoInput, NeoButton, NeoSwitch } from './ui';
import subsonic from '../api/subsonic';
import { showToast } from '../services/toast';
import { triggerHaptic } from '../utils/haptics';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string) => void;
  initialSongIds?: string[];
}

export default function CreatePlaylistModal({
  visible,
  onClose,
  onCreated,
  initialSongIds,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const playlist = await subsonic.createPlaylist(name.trim(), initialSongIds);
      triggerHaptic();
      showToast(`Created playlist "${name.trim()}"`, 'success');
      setName('');
      onClose();
      if (onCreated && playlist?.id) {
        onCreated(playlist.id);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to create playlist', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-center items-center bg-black/60 px-4" onPress={onClose}>
        <Pressable className="w-full max-w-md" onPress={(e) => e.stopPropagation()}>
          <NeoCard className="p-6 bg-neo-bg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
            <NeoText variant="h2" className="font-black uppercase text-xl mb-4">
              NEW PLAYLIST
            </NeoText>

            <NeoInput
              value={name}
              onChangeText={setName}
              placeholder="PLAYLIST NAME"
              autoFocus
              onSubmitEditing={handleCreate}
            />

            <View className="flex-row items-center justify-between my-4 py-2 border-y-2 border-black/20">
              <NeoText className="font-bold text-sm">PUBLIC PLAYLIST</NeoText>
              <NeoSwitch value={isPublic} onValueChange={setIsPublic} />
            </View>

            <View className="flex-row justify-end mt-4 gap-3">
              <NeoButton label="CANCEL" variant="ghost" onPress={onClose} disabled={isCreating} />
              <NeoButton
                label={isCreating ? 'CREATING...' : 'CREATE'}
                variant="primary"
                onPress={handleCreate}
                disabled={isCreating || !name.trim()}
              />
            </View>
          </NeoCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
