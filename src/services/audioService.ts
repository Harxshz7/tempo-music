import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from 'expo-av';
import { updateNotificationPlayer, setupNotificationPlayer } from './notificationPlayer';
import { usePlayerStore } from '../store/playerStore';
import { showToast } from './toast';
import type { Track } from '../types';

class AudioService {
  private sound: Audio.Sound | null = null;
  private currentLoadedTrackId: string | null = null;
  private isAudioConfigured = false;

  async configureAudioIfNeeded(): Promise<void> {
    if (this.isAudioConfigured) return;
    this.isAudioConfigured = true;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      setupNotificationPlayer();
    } catch {
      // Audio config fallback
    }
  }

  async loadTrack(track: Track | null, isPlaying: boolean): Promise<void> {
    await this.configureAudioIfNeeded();

    if (!track || !track.streamUrl) {
      await this.unloadTrack();
      return;
    }

    if (this.currentLoadedTrackId === track.id && this.sound) {
      return;
    }

    await this.unloadTrack();
    this.currentLoadedTrackId = track.id;

    if (track.duration) {
      usePlayerStore.getState().setDurationMillis(track.duration * 1000);
    }

    try {
      const restoredPosition = usePlayerStore.getState().positionMillis;
      const initialPosition = restoredPosition > 0 ? restoredPosition : 0;

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: track.streamUrl },
        { 
          shouldPlay: isPlaying,
          positionMillis: initialPosition,
          progressUpdateIntervalMillis: 500,
        },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;

      if (initialPosition > 0 && status.isLoaded && status.positionMillis !== initialPosition) {
        await sound.setPositionAsync(initialPosition).catch(() => {});
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
    if (this.sound) {
      if (isPlaying) {
        await this.sound.playAsync().catch(() => {});
      } else {
        await this.sound.pauseAsync().catch(() => {});
      }
    }
    updateNotificationPlayer(track, isPlaying);
  }

  async unloadTrack(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch {
        // Ignore error during unload
      }
      this.sound = null;
      this.currentLoadedTrackId = null;
    }
  }

  async seek(millis: number): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.setPositionAsync(millis);
      } catch (err: any) {
        showToast("Seek failed", 'error');
      }
      usePlayerStore.getState().setPositionMillis(millis);
    }
  }

  async syncStatusOnForeground(isPlaying: boolean): Promise<void> {
    if (!this.sound) return;
    try {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        usePlayerStore.getState().setPositionMillis(status.positionMillis);
        if (status.durationMillis) {
          usePlayerStore.getState().setDurationMillis(status.durationMillis);
        }
        if (status.isPlaying !== isPlaying) {
          usePlayerStore.getState().setIsPlaying(status.isPlaying);
        }
      }
    } catch {
      // Reconcile silently on foreground
    }
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const { setPositionMillis, setDurationMillis, playNext } = usePlayerStore.getState();
      setPositionMillis(status.positionMillis);
      if (status.durationMillis) {
        setDurationMillis(status.durationMillis);
      }
      if (status.didJustFinish) {
        playNext();
      }
    }
  };
}

export const audioService = new AudioService();
