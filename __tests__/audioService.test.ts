import { createAudioPlayer } from 'expo-audio';
import { usePlayerStore, Track } from '../src/store/playerStore';
import { audioService } from '../src/services/audioService';
import { offlineService } from '../src/services/offlineService';
import subsonic from '../src/api/subsonic';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/offlineService', () => ({
  offlineService: { getAudioPlaybackUrl: jest.fn() },
}));

const mockCreateAudioPlayer = createAudioPlayer as jest.Mock;
const mockGetAudioPlaybackUrl = offlineService.getAudioPlaybackUrl as jest.Mock;

/** Captures the playback-status callback registered by the service. */
let statusListener: ((status: any) => void) | null = null;

function createFakePlayer() {
  const player: any = {
    playing: false,
    currentTime: 0,
    duration: 0,
    play: jest.fn(() => {
      player.playing = true;
    }),
    pause: jest.fn(() => {
      player.playing = false;
    }),
    seekTo: jest.fn(),
    remove: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    addListener: jest.fn((_event: string, cb: (status: any) => void) => {
      statusListener = cb;
      return { remove: jest.fn() };
    }),
  };
  return player;
}

const trackA: Track = { id: 'tr-a', title: 'A', artist: 'X', duration: 0 };
const trackB: Track = { id: 'tr-b', title: 'B', artist: 'Y', duration: 0 };

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(async () => {
  jest.clearAllMocks();
  statusListener = null;
  mockCreateAudioPlayer.mockImplementation(createFakePlayer);
  mockGetAudioPlaybackUrl.mockImplementation(async (_id: string, remote: string) => remote);

  await subsonic.saveConfig({
    serverUrl: 'https://music.example.com',
    username: 'u',
    token: 't',
    salt: 's',
  });

  usePlayerStore.getState().clearQueue();
  await flush();
});

describe('audioService auto-advance', () => {
  it('advances on didJustFinish even when the stream reports no duration', async () => {
    usePlayerStore.getState().setQueue([trackA, trackB], 0);
    // duration is 0 — a transcode or live stream. The old heuristic
    // (currentTime >= duration - 0.3) could never fire for this case.
    await audioService.loadTrack(trackA, true, 0);

    expect(statusListener).toBeTruthy();
    statusListener!({
      isLoaded: true,
      isBuffering: false,
      playing: false,
      currentTime: 0,
      duration: 0,
      didJustFinish: true,
    });

    expect(usePlayerStore.getState().currentTrack?.id).toBe('tr-b');
  });

  it('does not advance when the user pauses close to the end', async () => {
    usePlayerStore.getState().setQueue([trackA, trackB], 0);
    await audioService.loadTrack(trackA, true, 0);

    // 199.9 of 200 with playing:false — the old heuristic treated this as a
    // finished track and skipped to the next one.
    statusListener!({
      isLoaded: true,
      isBuffering: false,
      playing: false,
      currentTime: 199.9,
      duration: 200,
      didJustFinish: false,
    });

    expect(usePlayerStore.getState().currentTrack?.id).toBe('tr-a');
  });

  it('only advances once per finish signal', async () => {
    usePlayerStore.getState().setQueue([trackA, trackB], 0);
    await audioService.loadTrack(trackA, true, 0);

    const finish = {
      isLoaded: true,
      isBuffering: false,
      playing: false,
      currentTime: 1,
      duration: 1,
      didJustFinish: true,
    };
    statusListener!(finish);
    statusListener!(finish);

    expect(usePlayerStore.getState().queueIndex).toBe(1);
    expect(usePlayerStore.getState().currentTrack?.id).toBe('tr-b');
  });
});

describe('audioService play-state reconciliation', () => {
  it('mirrors real playback state into the store once loaded', async () => {
    usePlayerStore.getState().setQueue([trackA, trackB], 0);
    await audioService.loadTrack(trackA, true, 0);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    statusListener!({
      isLoaded: true,
      isBuffering: false,
      playing: false,
      currentTime: 5,
      duration: 200,
      didJustFinish: false,
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('ignores transient buffering so startup cannot pause the UI', async () => {
    usePlayerStore.getState().setQueue([trackA, trackB], 0);
    await audioService.loadTrack(trackA, true, 0);

    statusListener!({
      isLoaded: true,
      isBuffering: true,
      playing: false,
      currentTime: 0,
      duration: 200,
      didJustFinish: false,
    });

    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});

describe('audioService load race', () => {
  it('discards a superseded load so only one player is ever constructed', async () => {
    const slow: Track = { id: 'slow', title: 'S', artist: 'X', duration: 0 };
    const fast: Track = { id: 'fast', title: 'F', artist: 'Y', duration: 0 };

    let releaseSlow!: () => void;
    mockGetAudioPlaybackUrl.mockImplementation((id: string, remote: string) => {
      if (id === 'slow') {
        return new Promise<string>((resolve) => {
          releaseSlow = () => resolve(remote);
        });
      }
      return Promise.resolve(remote);
    });

    const first = audioService.loadTrack(slow, true, 0);
    await flush(); // let the first load reach the (pending) URL resolution

    const second = audioService.loadTrack(fast, true, 0);
    await second;

    releaseSlow();
    await first;

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ uri: expect.stringContaining('id=fast') }),
      expect.anything()
    );
  });
});

describe('audioService resume position', () => {
  it('seeks to the explicitly supplied resume position', async () => {
    await audioService.loadTrack(trackA, true, 30_000);

    const player = mockCreateAudioPlayer.mock.results[0].value;
    expect(player.seekTo).toHaveBeenCalledWith(30);
    expect(player.play).toHaveBeenCalled();
  });

  it('does not seek when the caller passes no resume position', async () => {
    await audioService.loadTrack(trackA, true, 0);

    const player = mockCreateAudioPlayer.mock.results[0].value;
    expect(player.seekTo).not.toHaveBeenCalled();
  });
});
