import { usePlayerStore, Track } from '../src/store/playerStore';

const sampleTracks: Track[] = [
  { id: '1', title: 'Track 1', artist: 'Artist A', duration: 180 },
  { id: '2', title: 'Track 2', artist: 'Artist B', duration: 210 },
  { id: '3', title: 'Track 3', artist: 'Artist C', duration: 240 },
];

describe('usePlayerStore State Management', () => {
  beforeEach(() => {
    usePlayerStore.getState().clearQueue();
  });

  it('sets queue and current track', () => {
    usePlayerStore.getState().setQueue(sampleTracks, 0);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(3);
    expect(state.currentTrack).toEqual(sampleTracks[0]);
    expect(state.queueIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
  });

  it('navigates next and previous tracks correctly', () => {
    usePlayerStore.getState().setQueue(sampleTracks, 0);

    // Play next
    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('2');

    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('3');

    // Play previous
    usePlayerStore.getState().playPrevious();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('2');
  });

  it('handles repeat modes (off, all, one)', () => {
    usePlayerStore.getState().setQueue(sampleTracks, 2); // At last track

    // Default repeat: 'off' -> next at end does not wrap
    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('3');

    // Toggle repeat to 'all' -> wraps to start
    usePlayerStore.getState().toggleRepeat(); // off -> all
    expect(usePlayerStore.getState().repeat).toBe('all');
    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('1');

    // Toggle repeat to 'one' -> stays on current track and resets position
    usePlayerStore.getState().toggleRepeat(); // all -> one
    expect(usePlayerStore.getState().repeat).toBe('one');
    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('1');
  });

  it('toggles shuffle mode preserving original queue', () => {
    usePlayerStore.getState().setQueue(sampleTracks, 0);
    expect(usePlayerStore.getState().shuffle).toBe(false);

    usePlayerStore.getState().toggleShuffle();
    expect(usePlayerStore.getState().shuffle).toBe(true);
    expect(usePlayerStore.getState().originalQueue).toEqual(sampleTracks);

    // Current track remains at top of shuffled queue
    expect(usePlayerStore.getState().currentTrack?.id).toBe('1');

    // Toggle off restores original queue
    usePlayerStore.getState().toggleShuffle();
    expect(usePlayerStore.getState().shuffle).toBe(false);
    expect(usePlayerStore.getState().queue).toEqual(sampleTracks);
  });

  it('removes item from queue', () => {
    usePlayerStore.getState().setQueue(sampleTracks, 1); // Track 2 active
    usePlayerStore.getState().removeFromQueue(0); // Remove Track 1

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(2);
    expect(state.currentTrack?.id).toBe('2');
    expect(state.queueIndex).toBe(0);
  });

  it('reorders items in queue', () => {
    usePlayerStore.getState().setQueue(sampleTracks, 0);
    usePlayerStore.getState().reorderQueue(0, 2); // Move Track 1 to end

    const state = usePlayerStore.getState();
    expect(state.queue[2].id).toBe('1');
    expect(state.queueIndex).toBe(2); // Queue index tracked
  });
});
