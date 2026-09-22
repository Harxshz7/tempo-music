import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { usePlayerStore, Track } from '../store/playerStore';
import { showToast } from './toast';
import { offlineService } from './offlineService';
import { usePlayCountStore } from '../store/playCountStore';
import { useSettingsStore } from '../store/settingsStore';
import subsonic from '../api/subsonic';

class AudioService {
  private player: AudioPlayer | null = null;
  private currentLoadedTrackId: string | null = null;
  private isAudioConfigured = false;
  private statusSubscription: any = null;
  private hasScrobbled = false;
  private hasRecordedPlay = false;

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

  async loadTrack(track: Track | null, isPlaying: boolean): Promise<void> {
    await this.configureAudioIfNeeded();

    if (!track || !track.streamUrl) {
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

    await this.unloadTrack();
    this.currentLoadedTrackId = track.id;
    this.hasScrobbled = false;
    this.hasRecordedPlay = false;

    if (track.duration) {
      usePlayerStore.getState().setDurationMillis(track.duration * 1000);
    }

    try {
      const restoredPositionMillis = usePlayerStore.getState().positionMillis;
      const initialPositionSeconds = restoredPositionMillis > 0 ? restoredPositionMillis / 1000 : 0;

      // Determine bitRate preference & offline file URL
      const bitrate = useSettingsStore.getState().audioBitrate;
      const rawStreamUrl = subsonic.getStreamUrl(track.id, bitrate);
      const playableUri = await offlineService.getAudioPlaybackUrl(track.id, rawStreamUrl);

      const player = createAudioPlayer(
        { uri: playableUri },
        { updateInterval: 500 }
      );

      this.player = player;

      // Configure lock screen metadata for MediaSession / Now Playing Center
      try {
        player.setActiveForLockScreen(true, {
          title: track.title,
          artist: track.artist,
          albumTitle: track.album || 'Tempo Music',
          artworkUrl: track.coverArtUrl,
        });
      } catch (err) {
        // Fallback for web / unsupported lockscreen platforms
      }

      // Status listener
      this.statusSubscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!status) return;

        const setPositionMillis = usePlayerStore.getState().setPositionMillis;
        const setDurationMillis = usePlayerStore.getState().setDurationMillis;
        const playNext = usePlayerStore.getState().playNext;

        if (status.currentTime !== undefined) {
          setPositionMillis(Math.floor(status.currentTime * 1000));
        }
        if (status.duration && status.duration > 0) {
          setDurationMillis(Math.floor(status.duration * 1000));
        }

        const currentTime = status.currentTime || 0;
        const duration = status.duration || 0;

        // Record local play count after 30 seconds
        if (!this.hasRecordedPlay && (currentTime >= 30 || (duration > 0 && currentTime >= duration - 0.5))) {
          this.hasRecordedPlay = true;
          usePlayCountStore.getState().recordPlay(track.id);
        }

        // Handle Subsonic Scrobbling if enabled (50% played or finished)
        if (!this.hasScrobbled && duration > 0 && currentTime >= duration * 0.5) {
          this.hasScrobbled = true;
          if (useSettingsStore.getState().subsonicScrobbleEnabled) {
            subsonic.scrobble(track.id).catch(() => {});
          }
        }

        // Check if track just finished
        if (status.currentTime && status.duration && status.duration > 0) {
          if (status.currentTime >= status.duration - 0.3 && !status.playing) {
            playNext();
          }
        }
      });

      if (initialPositionSeconds > 0) {
        player.seekTo(initialPositionSeconds);
      }

      if (isPlaying) {
        player.play();
      }
    } catch (err: any) {
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

  async unloadTrack(): Promise<void> {
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
