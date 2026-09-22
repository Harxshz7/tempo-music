import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlayCountState {
  songPlayCounts: Record<string, number>;
  albumPlayCounts: Record<string, number>;
  artistPlayCounts: Record<string, number>;

  recordPlay: (songId: string, albumId?: string, artistId?: string) => void;
  getSongPlayCount: (songId: string) => number;
  getAlbumPlayCount: (albumId: string) => number;
  getArtistPlayCount: (artistId: string) => number;
  clearPlayCounts: () => void;
}

export const usePlayCountStore = create<PlayCountState>()(
  persist(
    (set, get) => ({
      songPlayCounts: {},
      albumPlayCounts: {},
      artistPlayCounts: {},

      recordPlay: (songId, albumId, artistId) => {
        set((state) => {
          const songCounts = { ...state.songPlayCounts };
          songCounts[songId] = (songCounts[songId] || 0) + 1;

          const albumCounts = { ...state.albumPlayCounts };
          if (albumId) {
            albumCounts[albumId] = (albumCounts[albumId] || 0) + 1;
          }

          const artistCounts = { ...state.artistPlayCounts };
          if (artistId) {
            artistCounts[artistId] = (artistCounts[artistId] || 0) + 1;
          }

          return {
            songPlayCounts: songCounts,
            albumPlayCounts: albumCounts,
            artistPlayCounts: artistCounts,
          };
        });
      },

      getSongPlayCount: (songId) => get().songPlayCounts[songId] || 0,
      getAlbumPlayCount: (albumId) => get().albumPlayCounts[albumId] || 0,
      getArtistPlayCount: (artistId) => get().artistPlayCounts[artistId] || 0,

      clearPlayCounts: () => set({ songPlayCounts: {}, albumPlayCounts: {}, artistPlayCounts: {} }),
    }),
    {
      name: 'tempo-play-counts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
