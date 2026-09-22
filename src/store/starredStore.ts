import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subsonic from '../api/subsonic';
import { showToast } from '../services/toast';

interface StarredState {
  starredSongIds: Record<string, boolean>;
  starredAlbumIds: Record<string, boolean>;
  starredArtistIds: Record<string, boolean>;

  isSongStarred: (id: string, serverStarred?: string) => boolean;
  isAlbumStarred: (id: string, serverStarred?: string) => boolean;
  isArtistStarred: (id: string, serverStarred?: string) => boolean;

  toggleStarSong: (id: string, currentStarred?: boolean) => Promise<boolean>;
  toggleStarAlbum: (id: string, currentStarred?: boolean) => Promise<boolean>;
  toggleStarArtist: (id: string, currentStarred?: boolean) => Promise<boolean>;
}

export const useStarredStore = create<StarredState>()(
  persist(
    (set, get) => ({
      starredSongIds: {},
      starredAlbumIds: {},
      starredArtistIds: {},

      isSongStarred: (id, serverStarred) => {
        const local = get().starredSongIds[id];
        if (local !== undefined) return local;
        return !!serverStarred;
      },

      isAlbumStarred: (id, serverStarred) => {
        const local = get().starredAlbumIds[id];
        if (local !== undefined) return local;
        return !!serverStarred;
      },

      isArtistStarred: (id, serverStarred) => {
        const local = get().starredArtistIds[id];
        if (local !== undefined) return local;
        return !!serverStarred;
      },

      toggleStarSong: async (id, currentStarred) => {
        const isCurrentlyStarred = currentStarred !== undefined ? currentStarred : get().isSongStarred(id);
        const nextState = !isCurrentlyStarred;

        // Optimistic update
        set((state) => ({
          starredSongIds: { ...state.starredSongIds, [id]: nextState },
        }));

        try {
          if (nextState) {
            await subsonic.star(id);
            showToast('Starred track', 'success');
          } else {
            await subsonic.unstar(id);
            showToast('Unstarred track', 'info');
          }
          return nextState;
        } catch (err: any) {
          // Rollback on failure
          set((state) => ({
            starredSongIds: { ...state.starredSongIds, [id]: isCurrentlyStarred },
          }));
          showToast(err?.message || 'Failed to update star', 'error');
          return isCurrentlyStarred;
        }
      },

      toggleStarAlbum: async (id, currentStarred) => {
        const isCurrentlyStarred = currentStarred !== undefined ? currentStarred : get().isAlbumStarred(id);
        const nextState = !isCurrentlyStarred;

        set((state) => ({
          starredAlbumIds: { ...state.starredAlbumIds, [id]: nextState },
        }));

        try {
          if (nextState) {
            await subsonic.star(undefined, id);
            showToast('Starred album', 'success');
          } else {
            await subsonic.unstar(undefined, id);
            showToast('Unstarred album', 'info');
          }
          return nextState;
        } catch (err: any) {
          set((state) => ({
            starredAlbumIds: { ...state.starredAlbumIds, [id]: isCurrentlyStarred },
          }));
          showToast(err?.message || 'Failed to update star', 'error');
          return isCurrentlyStarred;
        }
      },

      toggleStarArtist: async (id, currentStarred) => {
        const isCurrentlyStarred = currentStarred !== undefined ? currentStarred : get().isArtistStarred(id);
        const nextState = !isCurrentlyStarred;

        set((state) => ({
          starredArtistIds: { ...state.starredArtistIds, [id]: nextState },
        }));

        try {
          if (nextState) {
            await subsonic.star(undefined, undefined, id);
            showToast('Starred artist', 'success');
          } else {
            await subsonic.unstar(undefined, undefined, id);
            showToast('Unstarred artist', 'info');
          }
          return nextState;
        } catch (err: any) {
          set((state) => ({
            starredArtistIds: { ...state.starredArtistIds, [id]: isCurrentlyStarred },
          }));
          showToast(err?.message || 'Failed to update star', 'error');
          return isCurrentlyStarred;
        }
      },
    }),
    {
      name: 'tempo-starred-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
