import { usePlayerStore, Track } from '../src/store/playerStore';
import { replayCurrentTrack, stopPlayback } from '../src/services/audioBridge';

// The store talks to the audio engine only through this bridge; mocking it lets
// us assert that the store actually asks for playback to restart/stop.
jest.mock('../src/services/audioBridge', () => ({
  replayCurrentTrack: jest.fn(),
  stopPlayback: jest.fn(),
}));

const sampleTracks: Track[] = [
  { id: '1', title: 'Track 1', artist: 'Artist A', duration: 180 },
  { id: '2', title: 'Track 2', artist: 'Artist B', duration: 210 },
  { id: '3', title: 'Track 3', artist: 'Artist C', duration: 240 },
];

describe('usePlayerStore State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.getState().clearQueue();
    jest.clearAllMocks();
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

  describe('repeat-one', () => {
    it('restarts the engine instead of waiting for effects to re-fire', () => {
      usePlayerStore.getState().setQueue(sampleTracks, 0);
      usePlayerStore.getState().toggleRepeat(); // off -> all
      usePlayerStore.getState().toggleRepeat(); // all -> one

      usePlayerStore.getState().playNext();

      // Track and play state are unchanged, so the only thing that can restart
      // playback is this explicit call.
      expect(usePlayerStore.getState().currentTrack?.id).toBe('1');
      expect(usePlayerStore.getState().isPlaying).toBe(true);
      expect(replayCurrentTrack).toHaveBeenCalledTimes(1);
    });

    it('does not advance the queue index', () => {
      usePlayerStore.getState().setQueue(sampleTracks, 1);
      usePlayerStore.getState().toggleRepeat();
      usePlayerStore.getState().toggleRepeat();

      usePlayerStore.getState().playNext();

      expect(usePlayerStore.getState().queueIndex).toBe(1);
    });
  });

  describe('playTrack', () => {
    it('updates the queue cursor when an explicit index is given (Up Next rows)', () => {
      usePlayerStore.getState().setQueue(sampleTracks, 0);

      usePlayerStore.getState().playTrack(sampleTracks[2], 2);

      const state = usePlayerStore.getState();
      expect(state.currentTrack?.id).toBe('3');
      expect(state.queueIndex).toBe(2);
      expect(state.isPlaying).toBe(true);
    });

    it('leaves the cursor alone when no index is given', () => {
      usePlayerStore.getState().setQueue(sampleTracks, 1);

      usePlayerStore.getState().playTrack(sampleTracks[2]);

      expect(usePlayerStore.getState().queueIndex).toBe(1);
    });
  });

  describe('position model', () => {
    it('keeps the playback cursor out of the persisted checkpoint', () => {
      usePlayerStore.getState().setQueue(sampleTracks, 0);

      // The engine ticks the cursor ~2x/second; that must not touch the
      // checkpoint we persist, or every tick would write the queue to disk.
      usePlayerStore.getState().setPositionMillis(12_345);
      expect(usePlayerStore.getState().positionMillis).toBe(12_345);
      expect(usePlayerStore.getState().resumePositionMillis).toBe(0);

      usePlayerStore.getState().commitResumePosition(12_345);
      expect(usePlayerStore.getState().resumePositionMillis).toBe(12_345);
    });

    it('resets the checkpoint when the track changes', () => {
      usePlayerStore.getState().setQueue(sampleTracks, 0);
      usePlayerStore.getState().commitResumePosition(9_000);

      usePlayerStore.getState().playNext();

      expect(usePlayerStore.getState().resumePositionMillis).toBe(0);
    });
  });

  describe('teardown', () => {
    it('clearQueue explicitly silences playback', () => {
      usePlayerStore.getState().setQueue(sampleTracks, 0);

      usePlayerStore.getState().clearQueue();

      const state = usePlayerStore.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.queue).toEqual([]);
      expect(state.isPlaying).toBe(false);
      expect(state.resumePositionMillis).toBe(0);
      expect(stopPlayback).toHaveBeenCalledTimes(1);
    });

    it('stops playback when the last queue entry is removed', () => {
      usePlayerStore.getState().setQueue([sampleTracks[0]], 0);

      usePlayerStore.getState().removeFromQueue(0);

      expect(usePlayerStore.getState().currentTrack).toBeNull();
      expect(stopPlayback).toHaveBeenCalledTimes(1);
    });
  });
});
