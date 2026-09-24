import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { usePlayerStore, Track } from '../store/playerStore';
import { showToast } from './toast';
import { offlineService } from './offlineService';
import { usePlayCountStore } from '../store/playCountStore';
import { useSettingsStore } from '../store/settingsStore';
import subsonic from '../api/subsonic';
import { registerPlaybackControls } from './audioBridge';

class AudioService {
  private player: AudioPlayer | null = null;
  private currentLoadedTrackId: string | null = null;
  private isAudioConfigured = false;
  private statusSubscription: any = null;
  private hasScrobbled = false;
  private hasRecordedPlay = false;
  /**
   * Monotonic token for the most recent load request. An in-flight `loadTrack`
   * that finds its token stale bails out (removing any player it already built),
   * so fast track switches can't leave orphaned players playing over each other.
   */
  private loadToken = 0;
  /** Guards against platforms that emit `didJustFinish` on more than one update. */
  private hasHandledFinish = false;

  async configureAudioIfNeeded(): Promise<void> {
    if (this.isAudioConfigured) return;
    this.isAudioConfigured = true;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
    } catch (e: any) {
      console.warn('[AudioService] Audio mode config fallback:', e);
    }
  }

  /**
   * Load and optionally start a track.
   *
   * `resumePositionMillis` is supplied by the caller rather than read from the
   * store, so "start at 0" versus "resume where I left off" is always an explicit
   * decision instead of a side effect of the store resetting its cursor.
   */
  async loadTrack(
    track: Track | null,
    isPlaying: boolean,
    resumePositionMillis = 0
  ): Promise<void> {
    await this.configureAudioIfNeeded();

    if (!track) {
      await this.unloadTrack();
      return;
    }

    if (this.currentLoadedTrackId === track.id && this.player) {
      if (isPlaying && !this.player.playing) {
        this.player.play();
      } else if (!isPlaying && this.player.playing) {
        this.player.pause();
      }
      return;
    }

    // Invalidate any load still in flight, then claim the slot for this one.
    await this.unloadTrack();
    const token = ++this.loadToken;

    this.currentLoadedTrackId = track.id;
    this.hasScrobbled = false;
    this.hasRecordedPlay = false;
    this.hasHandledFinish = false;

    if (track.duration) {
      usePlayerStore.getState().setDurationMillis(track.duration * 1000);
    }

    try {
      const bitrate = useSettingsStore.getState().audioBitrate;
      // Derived here rather than stored on the track, so the credential-bearing
      // stream URL never reaches the persisted queue.
      const rawStreamUrl = subsonic.getStreamUrl(track.id, bitrate);
      const playableUri = await offlineService.getAudioPlaybackUrl(track.id, rawStreamUrl);

      if (token !== this.loadToken) return; // superseded while resolving the source

      const player = createAudioPlayer({ uri: playableUri }, { updateInterval: 500 });

      if (token !== this.loadToken) {
        // A newer load won the race; discard this player instead of leaking it.
        try {
          player.remove();
        } catch {}
        return;
      }

      this.player = player;

      // Configure lock screen metadata for MediaSession / Now Playing Center
      try {
        player.setActiveForLockScreen(true, {
          title: track.title,
          artist: track.artist,
          albumTitle: track.album || 'Tempo Music',
          artworkUrl: track.coverArtId ? subsonic.getCoverArtUrl(track.coverArtId) : undefined,
        });
      } catch (err) {
        // Fallback for web / unsupported lockscreen platforms
      }

      // Status listener
      this.statusSubscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!status) return;

        const setPositionMillis = usePlayerStore.getState().setPositionMillis;
        const setDurationMillis = usePlayerStore.getState().setDurationMillis;
        const setIsPlaying = usePlayerStore.getState().setIsPlaying;
        const playNext = usePlayerStore.getState().playNext;

        if (status.currentTime !== undefined) {
          setPositionMillis(Math.floor(status.currentTime * 1000));
        }
        if (status.duration && status.duration > 0) {
          setDurationMillis(Math.floor(status.duration * 1000));
        }

        const currentTime = status.currentTime || 0;
        const duration = status.duration || 0;

        // Reconcile the UI with the engine. Transient startup/buffering states
        // report `playing: false` before play() takes effect, so ignore those.
        if (
          status.isLoaded &&
          !status.isBuffering &&
          status.playing !== usePlayerStore.getState().isPlaying
        ) {
          setIsPlaying(status.playing);
        }

        // Record local play count after 30 seconds
        if (!this.hasRecordedPlay && (currentTime >= 30 || (duration > 0 && currentTime >= duration - 0.5))) {
          this.hasRecordedPlay = true;
          usePlayCountStore.getState().recordPlay(track.id, track.albumId, track.artistId);
        }

        // Handle Subsonic Scrobbling if enabled (50% played or finished)
        if (!this.hasScrobbled && duration > 0 && currentTime >= duration * 0.5) {
          this.hasScrobbled = true;
          if (useSettingsStore.getState().subsonicScrobbleEnabled) {
            subsonic.scrobble(track.id).catch(() => {});
          }
        }

        // Advance on the engine's explicit finish signal. The previous heuristic
        // (currentTime near duration while paused) never fired when duration was
        // unknown and could false-trigger on a pause close to the end.
        if (status.didJustFinish && !this.hasHandledFinish) {
          this.hasHandledFinish = true;
          playNext();
        }
      });

      if (resumePositionMillis > 0) {
        player.seekTo(resumePositionMillis / 1000);
      }

      if (isPlaying) {
        player.play();
      }
    } catch (err: any) {
      // Only surface/reset the error if this load is still the current one.
      if (token !== this.loadToken) return;
      this.currentLoadedTrackId = null;
      usePlayerStore.setState({
        currentTrack: null,
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
      });
      showToast(err?.message ? `Failed to load track: ${err.message}` : "Couldn't play track — check your connection", 'error');
    }
  }

  async setPlaybackState(track: Track | null, isPlaying: boolean): Promise<void> {
    if (this.player) {
      try {
        if (isPlaying) {
          this.player.play();
        } else {
          this.player.pause();
        }
      } catch {
        // Player state change error
      }
    }
  }

  /**
   * Restart the currently loaded track from the beginning. Used by repeat-one,
   * where the player is already parked at the end and React state hasn't changed.
   */
  async replayCurrent(): Promise<void> {
    if (!this.player) return;
    try {
      this.player.seekTo(0);
      this.player.play();
    } catch {
      // Ignore — the next status update will reconcile.
    }
    this.hasScrobbled = false;
    this.hasRecordedPlay = false;
    this.hasHandledFinish = false;
    usePlayerStore.getState().setPositionMillis(0);
    usePlayerStore.getState().setIsPlaying(true);
  }

  async unloadTrack(): Promise<void> {
    // Invalidate any in-flight load so it can't recreate a player after teardown.
    this.loadToken++;

    if (this.statusSubscription) {
      try {
        this.statusSubscription.remove();
      } catch {}
      this.statusSubscription = null;
    }

    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch {
        // Ignore error during cleanup
      }
      this.player = null;
      this.currentLoadedTrackId = null;
    }
  }

  async seek(millis: number): Promise<void> {
    if (this.player) {
      try {
        const seconds = Math.max(0, millis / 1000);
        this.player.seekTo(seconds);
      } catch (err: any) {
        showToast("Seek failed", 'error');
      }
      usePlayerStore.getState().setPositionMillis(millis);
    }
  }

  async syncStatusOnForeground(isPlaying: boolean): Promise<void> {
    if (!this.player) return;
    try {
      if (this.player.currentTime !== undefined) {
        usePlayerStore.getState().setPositionMillis(Math.floor(this.player.currentTime * 1000));
      }
      if (this.player.duration && this.player.duration > 0) {
        usePlayerStore.getState().setDurationMillis(Math.floor(this.player.duration * 1000));
      }
      if (this.player.playing !== isPlaying) {
        usePlayerStore.getState().setIsPlaying(this.player.playing);
      }
    } catch {
      // Reconcile silently on foreground
    }
  }
}

export const audioService = new AudioService();

// Let the store drive playback without importing this module (see audioBridge).
registerPlaybackControls({
  replay: () => {
    audioService.replayCurrent();
  },
  stop: () => {
    audioService.unloadTrack();
  },
});
