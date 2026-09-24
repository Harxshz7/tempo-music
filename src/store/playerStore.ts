import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type PersistStorage,
} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { replayCurrentTrack, stopPlayback } from '../services/audioBridge';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  /**
   * Subsonic cover art id. The (credential-bearing) URL is derived on demand via
   * `coverArtUrlFor()` and deliberately never stored on the track.
   */
  coverArtId?: string;
  duration: number;
  /** Carried for local play-count attribution when the track came from a Song. */
  albumId?: string;
  artistId?: string;
}

export type RepeatMode = 'off' | 'one' | 'all';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  /**
   * Runtime-only playback cursor in millis. NOT persisted — see
   * `resumePositionMillis`. Excluded from `partialize` so that the ~2 writes per
   * second it generates don't serialize the whole queue to disk.
   */
  positionMillis: number;
  durationMillis: number;
  /**
   * Persisted playback checkpoint in millis, written only on pause, track change
   * and unmount. This is what `loadTrack` resumes from after a restart.
   */
  resumePositionMillis: number;
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  originalQueue: Track[];

  playTrack: (track: Track, index?: number) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (millis: number) => void;
  setPositionMillis: (millis: number) => void;
  setDurationMillis: (millis: number) => void;
  commitResumePosition: (millis: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
}

/**
 * AsyncStorage adapter that skips writes when the serialized snapshot is
 * unchanged. Without this the persist middleware writes on every state change,
 * so the playback cursor (updated ~2x/second) would rewrite the entire queue to
 * disk continuously even though `partialize` produces an identical payload.
 */
function createDedupedJSONStorage<S>(): PersistStorage<S> {
  const base = createJSONStorage<S>(() => AsyncStorage)!;
  let lastSerialized: string | null = null;

  return {
    getItem: async (name) => {
      const value = await base.getItem(name);
      if (value != null) {
        lastSerialized = JSON.stringify(value);
      }
      return value;
    },
    setItem: async (name, value) => {
      const serialized = JSON.stringify(value);
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      await base.setItem(name, value);
    },
    removeItem: async (name) => {
      lastSerialized = null;
      await base.removeItem(name);
    },
  };
}

const emptyPersistedState = {
  queue: [] as Track[],
  queueIndex: 0,
  currentTrack: null as Track | null,
  positionMillis: 0,
  durationMillis: 0,
  isPlaying: false,
  resumePositionMillis: 0,
  shuffle: false,
  repeat: 'off' as RepeatMode,
  originalQueue: [] as Track[],
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      resumePositionMillis: 0,
      queue: [],
      queueIndex: 0,
      shuffle: false,
      repeat: 'off',
      originalQueue: [],

      playTrack: (track, index) =>
        set((state) => ({
          currentTrack: track,
          isPlaying: true,
          positionMillis: 0,
          resumePositionMillis: 0,
          // Selecting a row in "Up Next" must move the queue cursor too, otherwise
          // that list keeps rendering from a stale index.
          queueIndex: index !== undefined ? index : state.queueIndex,
        })),

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      seekTo: (millis) => set({ positionMillis: millis }),

      setPositionMillis: (millis) => set({ positionMillis: millis }),

      setDurationMillis: (millis) => set({ durationMillis: millis }),

      commitResumePosition: (millis) => set({ resumePositionMillis: millis }),

      playNext: () => {
        const { queue, queueIndex, repeat, currentTrack } = get();
        if (queue.length === 0) return;

        if (repeat === 'one' && currentTrack) {
          set({ positionMillis: 0, resumePositionMillis: 0, isPlaying: true });
          // The player is parked at the end of the track and neither `isPlaying`
          // nor `currentTrack` changed, so the useAudioPlayer effects won't re-run.
          // Restart the engine directly.
          replayCurrentTrack();
          return;
        }

        if (queueIndex < queue.length - 1) {
          const nextIndex = queueIndex + 1;
          set({
            currentTrack: queue[nextIndex],
            queueIndex: nextIndex,
            positionMillis: 0,
            resumePositionMillis: 0,
            isPlaying: true,
          });
        } else if (repeat === 'all' && queue.length > 0) {
          set({
            currentTrack: queue[0],
            queueIndex: 0,
            positionMillis: 0,
            resumePositionMillis: 0,
            isPlaying: true,
          });
        }
      },

      playPrevious: () => {
        const { queue, queueIndex } = get();
        if (queue.length > 0 && queueIndex > 0) {
          const prevIndex = queueIndex - 1;
          set({
            currentTrack: queue[prevIndex],
            queueIndex: prevIndex,
            positionMillis: 0,
            resumePositionMillis: 0,
            isPlaying: true,
          });
        } else if (queue.length > 0 && queueIndex === 0) {
          set({ positionMillis: 0 });
        }
      },

      setQueue: (tracks, startIndex = 0) =>
        set({
          queue: tracks,
          queueIndex: startIndex,
          currentTrack: tracks[startIndex] || null,
          positionMillis: 0,
          resumePositionMillis: 0,
          isPlaying: true,
          originalQueue: [],
          shuffle: false,
        }),

      toggleShuffle: () => {
        const { shuffle, queue, queueIndex, currentTrack, originalQueue } = get();
        const nextShuffle = !shuffle;

        if (nextShuffle) {
          const unShuffled = originalQueue.length > 0 ? [...originalQueue] : [...queue];
          let shuffled = [...queue];

          if (currentTrack) {
            const rest = shuffled.filter((_, i) => i !== queueIndex);
            for (let i = rest.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [rest[i], rest[j]] = [rest[j], rest[i]];
            }
            shuffled = [currentTrack, ...rest];
          } else {
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
          }

          set({
            shuffle: true,
            originalQueue: unShuffled,
            queue: shuffled,
            queueIndex: currentTrack ? 0 : queueIndex,
          });
        } else {
          const restored = originalQueue.length > 0 ? originalQueue : queue;
          let newIndex = 0;
          if (currentTrack) {
            const idx = restored.findIndex((t) => t.id === currentTrack.id);
            newIndex = idx !== -1 ? idx : 0;
          }
          set({
            shuffle: false,
            queue: restored,
            queueIndex: newIndex,
            originalQueue: [],
          });
        }
      },

      toggleRepeat: () => {
        const { repeat } = get();
        const nextRepeat: RepeatMode =
          repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
        set({ repeat: nextRepeat });
      },

      removeFromQueue: (index) => {
        const { queue, queueIndex, currentTrack } = get();
        if (index < 0 || index >= queue.length) return;

        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = queueIndex;

        if (index < queueIndex) {
          newIndex = Math.max(0, queueIndex - 1);
        } else if (index === queueIndex) {
          if (newQueue.length === 0) {
            set({
              queue: [],
              queueIndex: 0,
              currentTrack: null,
              isPlaying: false,
              positionMillis: 0,
              resumePositionMillis: 0,
            });
            stopPlayback();
            return;
          }
          newIndex = Math.min(queueIndex, newQueue.length - 1);
          set({
            currentTrack: newQueue[newIndex],
            positionMillis: 0,
            resumePositionMillis: 0,
          });
        }

        set({ queue: newQueue, queueIndex: newIndex });
      },

      reorderQueue: (fromIndex, toIndex) => {
        const { queue, queueIndex, currentTrack } = get();
        if (
          fromIndex < 0 ||
          fromIndex >= queue.length ||
          toIndex < 0 ||
          toIndex >= queue.length
        )
          return;

        const newQueue = [...queue];
        const [movedItem] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, movedItem);

        let newIndex = queueIndex;
        if (currentTrack) {
          const idx = newQueue.findIndex((t) => t.id === currentTrack.id);
          if (idx !== -1) newIndex = idx;
        }

        set({ queue: newQueue, queueIndex: newIndex });
      },

      clearQueue: () => {
        set({
          queue: [],
          queueIndex: 0,
          currentTrack: null,
          isPlaying: false,
          positionMillis: 0,
          durationMillis: 0,
          resumePositionMillis: 0,
          shuffle: false,
          originalQueue: [],
        });
        // Silence audio explicitly rather than relying on the `loadTrack(null)`
        // side path, which only runs while a component using the hook is mounted.
        stopPlayback();
      },
    }),
    {
      name: 'tempo-player-state',
      storage: createDedupedJSONStorage<PlayerState>(),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        // v1/v2 queues stored `streamUrl`/`coverArtUrl`, which embedded the auth
        // token and salt. Resetting drops those leaked credentials; positions are
        // intentionally not carried over.
        if (version !== 3) {
          return emptyPersistedState;
        }
        return persistedState;
      },
      partialize: (state) => ({
        queue: state.queue,
        queueIndex: state.queueIndex,
        currentTrack: state.currentTrack,
        // `positionMillis` is runtime-only; only the committed checkpoint is stored.
        resumePositionMillis: state.resumePositionMillis,
        isPlaying: false,
        shuffle: state.shuffle,
        repeat: state.repeat,
        originalQueue: state.originalQueue,
      }),
    }
  )
);
