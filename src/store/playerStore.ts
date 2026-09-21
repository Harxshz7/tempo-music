import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverArtUrl?: string;
  streamUrl?: string;
  duration: number;
}

export type RepeatMode = 'off' | 'one' | 'all';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  originalQueue: Track[];
  
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (millis: number) => void;
  setPositionMillis: (millis: number) => void;
  setDurationMillis: (millis: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      queue: [],
      queueIndex: 0,
      shuffle: false,
      repeat: 'off',
      originalQueue: [],

      playTrack: (track) => set({ currentTrack: track, isPlaying: true, positionMillis: 0 }),
      
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      
      seekTo: (millis) => set({ positionMillis: millis }),
      
      setPositionMillis: (millis) => set({ positionMillis: millis }),
      
      setDurationMillis: (millis) => set({ durationMillis: millis }),
      
      playNext: () => {
        const { queue, queueIndex, repeat, currentTrack } = get();
        if (queue.length === 0) return;

        if (repeat === 'one' && currentTrack) {
          set({ positionMillis: 0, isPlaying: true });
          return;
        }

        if (queueIndex < queue.length - 1) {
          const nextIndex = queueIndex + 1;
          set({ currentTrack: queue[nextIndex], queueIndex: nextIndex, positionMillis: 0, isPlaying: true });
        } else if (repeat === 'all' && queue.length > 0) {
          set({ currentTrack: queue[0], queueIndex: 0, positionMillis: 0, isPlaying: true });
        }
      },
      
      playPrevious: () => {
        const { queue, queueIndex } = get();
        if (queue.length > 0 && queueIndex > 0) {
          const prevIndex = queueIndex - 1;
          set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, positionMillis: 0, isPlaying: true });
        } else if (queue.length > 0 && queueIndex === 0) {
          set({ positionMillis: 0 });
        }
      },
      
      setQueue: (tracks, startIndex = 0) => set({ 
        queue: tracks, 
        queueIndex: startIndex,
        currentTrack: tracks[startIndex] || null,
        positionMillis: 0,
        isPlaying: true,
        originalQueue: [],
        shuffle: false
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
            set({ queue: [], queueIndex: 0, currentTrack: null, isPlaying: false, positionMillis: 0 });
            return;
          }
          newIndex = Math.min(queueIndex, newQueue.length - 1);
          set({ currentTrack: newQueue[newIndex], positionMillis: 0 });
        }

        set({ queue: newQueue, queueIndex: newIndex });
      },

      reorderQueue: (fromIndex, toIndex) => {
        const { queue, queueIndex, currentTrack } = get();
        if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) return;

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
          shuffle: false,
          originalQueue: [],
        });
      },
    }),
    {
      name: 'tempo-player-state',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version !== 2) {
          return {
            queue: [],
            queueIndex: 0,
            currentTrack: null,
            positionMillis: 0,
            isPlaying: false,
            shuffle: false,
            repeat: 'off',
            originalQueue: [],
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        queue: state.queue,
        queueIndex: state.queueIndex,
        currentTrack: state.currentTrack,
        positionMillis: state.positionMillis,
        isPlaying: false,
        shuffle: state.shuffle,
        repeat: state.repeat,
        originalQueue: state.originalQueue,
      }),
    }
  )
);
