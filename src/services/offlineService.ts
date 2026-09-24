import {
  documentDirectory,
  getInfoAsync,
  downloadAsync,
  makeDirectoryAsync,
  deleteAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subsonic from '../api/subsonic';
import type { Song, Album, Playlist } from '../types';
import { showToast } from './toast';

const OFFLINE_AUDIO_DIR = `${documentDirectory || ''}offline_audio/`;

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'failed';

export interface DownloadItem {
  id: string; // trackId
  title: string;
  artist: string;
  album?: string;
  albumId?: string;
  /** Cover art id only — the credential-bearing URL is derived on demand. */
  coverArtId?: string;
  duration: number;
  localUri: string;
  status: DownloadStatus;
  progress: number;
  sizeBytes?: number;
}

interface OfflineStoreState {
  downloads: Record<string, DownloadItem>;
  setDownloadItem: (item: DownloadItem) => void;
  removeDownloadItem: (id: string) => void;
  clearAllDownloads: () => void;
}

export const useOfflineStore = create<OfflineStoreState>()(
  persist(
    (set) => ({
      downloads: {},
      setDownloadItem: (item) => set((state) => ({
        downloads: { ...state.downloads, [item.id]: item },
      })),
      removeDownloadItem: (id) => set((state) => {
        const next = { ...state.downloads };
        delete next[id];
        return { downloads: next };
      }),
      clearAllDownloads: () => set({ downloads: {} }),
    }),
    {
      name: 'tempo-offline-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

class OfflineService {
  private isDirChecked = false;

  private async ensureDir(): Promise<void> {
    if (this.isDirChecked || !documentDirectory) return;
    try {
      const info = await getInfoAsync(OFFLINE_AUDIO_DIR);
      if (!info.exists) {
        await makeDirectoryAsync(OFFLINE_AUDIO_DIR, { intermediates: true });
      }
      this.isDirChecked = true;
    } catch (e) {
      console.warn('[OfflineService] Failed to ensure offline directory:', e);
    }
  }

  /**
   * Return local audio URI if song is downloaded, otherwise remote stream URL
   */
  async getAudioPlaybackUrl(songId: string, remoteStreamUrl: string): Promise<string> {
    const item = useOfflineStore.getState().downloads[songId];
    if (item && item.status === 'done' && item.localUri) {
      try {
        const info = await getInfoAsync(item.localUri);
        if (info.exists) {
          return item.localUri;
        }
      } catch {
        // Fallback to remote if file read fails
      }
    }
    return remoteStreamUrl;
  }

  /**
   * Check if song is downloaded
   */
  isSongDownloaded(songId: string): boolean {
    const item = useOfflineStore.getState().downloads[songId];
    return item?.status === 'done';
  }

  /**
   * Download a single track
   */
  async downloadTrack(song: Song, albumArtId?: string): Promise<boolean> {
    await this.ensureDir();
    const store = useOfflineStore.getState();
    const existing = store.downloads[song.id];

    if (existing?.status === 'done') {
      showToast('Track already downloaded', 'info');
      return true;
    }

    const filename = `${song.id}.mp3`;
    const localUri = `${OFFLINE_AUDIO_DIR}${filename}`;
    const remoteUrl = subsonic.getStreamUrl(song.id);

    const downloadItem: DownloadItem = {
      id: song.id,
      title: song.title,
      artist: song.artist || 'Unknown',
      album: song.album,
      albumId: song.albumId,
      coverArtId: song.coverArt || albumArtId,
      duration: song.duration || 0,
      localUri,
      status: 'downloading',
      progress: 0,
    };

    store.setDownloadItem(downloadItem);

    try {
      const result = await downloadAsync(remoteUrl, localUri);
      if (result && result.status === 200) {
        const fileInfo = await getInfoAsync(localUri);
        store.setDownloadItem({
          ...downloadItem,
          status: 'done',
          progress: 1,
          sizeBytes: fileInfo.exists ? fileInfo.size : undefined,
        });
        showToast(`Downloaded "${song.title}"`, 'success');
        return true;
      } else {
        throw new Error(`Download HTTP status ${result?.status}`);
      }
    } catch (err: any) {
      store.setDownloadItem({
        ...downloadItem,
        status: 'failed',
        progress: 0,
      });
      showToast(`Failed to download "${song.title}"`, 'error');
      return false;
    }
  }

  /**
   * Download entire album
   */
  async downloadAlbum(albumId: string): Promise<void> {
    showToast('Starting album download...', 'info');
    try {
      const data = await subsonic.getAlbum(albumId);
      const songs = data.song || [];
      const coverArtId = data.album.coverArt;

      let count = 0;
      for (const song of songs) {
        const success = await this.downloadTrack(song, coverArtId);
        if (success) count++;
      }
      showToast(`Downloaded ${count}/${songs.length} album tracks`, 'success');
    } catch (err: any) {
      showToast('Failed to download album', 'error');
    }
  }

  /**
   * Download entire playlist
   */
  async downloadPlaylist(playlistId: string): Promise<void> {
    showToast('Starting playlist download...', 'info');
    try {
      const data = await subsonic.getPlaylist(playlistId);
      const songs = data.entry || [];
      
      let count = 0;
      for (const song of songs) {
        const success = await this.downloadTrack(song);
        if (success) count++;
      }
      showToast(`Downloaded ${count}/${songs.length} playlist tracks`, 'success');
    } catch (err: any) {
      showToast('Failed to download playlist', 'error');
    }
  }

  /**
   * Delete a downloaded track
   */
  async deleteDownloadedTrack(songId: string): Promise<void> {
    const store = useOfflineStore.getState();
    const item = store.downloads[songId];
    if (item?.localUri) {
      try {
        await deleteAsync(item.localUri, { idempotent: true });
      } catch {}
    }
    store.removeDownloadItem(songId);
    showToast('Removed offline track', 'info');
  }

  /**
   * Delete all offline downloaded content
   */
  async removeAllDownloads(): Promise<void> {
    const store = useOfflineStore.getState();
    if (!documentDirectory) return;
    try {
      await deleteAsync(OFFLINE_AUDIO_DIR, { idempotent: true });
      this.isDirChecked = false;
    } catch {}
    store.clearAllDownloads();
    showToast('Cleared all offline downloads', 'info');
  }

  /**
   * Calculate total size used by downloaded audio files in bytes
   */
  async getOfflineStorageSize(): Promise<number> {
    if (!documentDirectory) return 0;
    try {
      const info = await getInfoAsync(OFFLINE_AUDIO_DIR);
      if (!info.exists) return 0;
      let total = 0;
      const files = await readDirectoryAsync(OFFLINE_AUDIO_DIR);
      for (const file of files) {
        const fInfo = await getInfoAsync(OFFLINE_AUDIO_DIR + file);
        if (fInfo.exists && !fInfo.isDirectory) {
          total += fInfo.size || 0;
        }
      }
      return total;
    } catch {
      return 0;
    }
  }
}

export const offlineService = new OfflineService();
