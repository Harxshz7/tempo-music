import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  coverArtUrl?: string;
  streamUrl?: string;
  duration: number;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  queue: Track[];
  queueIndex: number;
  
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (millis: number) => void;
  setPositionMillis: (millis: number) => void;
  setDurationMillis: (millis: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  queue: [],
  queueIndex: 0,

  playTrack: (track) => set({ currentTrack: track, isPlaying: true, positionMillis: 0 }),
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  seekTo: (millis) => set({ positionMillis: millis }),
  
  setPositionMillis: (millis) => set({ positionMillis: millis }),
  
  setDurationMillis: (millis) => set({ durationMillis: millis }),
  
  playNext: () => {
    const { queue, queueIndex } = get();
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      set({ currentTrack: queue[nextIndex], queueIndex: nextIndex, positionMillis: 0, isPlaying: true });
    }
  },
  
  playPrevious: () => {
    const { queue, queueIndex } = get();
    if (queue.length > 0 && queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, positionMillis: 0, isPlaying: true });
    }
  },
  
  setQueue: (tracks, startIndex = 0) => set({ 
    queue: tracks, 
    queueIndex: startIndex,
    currentTrack: tracks[startIndex] || null,
    positionMillis: 0,
    isPlaying: true
  }),
}));
