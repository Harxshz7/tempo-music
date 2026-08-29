import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from 'expo-av';
import { updateNotificationPlayer, setupNotificationPlayer } from '../services/notificationPlayer';
import { usePlayerStore } from '../store/playerStore';

// Module-level reference to ensure a single audio instance across multiple component mounts (e.g., PlayerScreen and NeoPlayerBar)
let globalSound: Audio.Sound | null = null;
let currentLoadedTrackId: string | null = null;
let isAudioConfigured = false;

export function useAudioPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying, 
    setPositionMillis, 
    setDurationMillis, 
    playNext 
  } = usePlayerStore();

  useEffect(() => {
    if (!isAudioConfigured) {
      isAudioConfigured = true;
      // Configure audio session
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      }).catch(() => {});
      
      // Set up Android Media Style Notification Categories
      setupNotificationPlayer();
    }
  }, []);

  useEffect(() => {
    loadTrack();
  }, [currentTrack?.id]);

  useEffect(() => {
    if (globalSound) {
      if (isPlaying) {
        globalSound.playAsync().catch(() => {});
      } else {
        globalSound.pauseAsync().catch(() => {});
      }
    }
    updateNotificationPlayer(currentTrack, isPlaying);
  }, [isPlaying, currentTrack]);

  // Handle app foregrounding/backgrounding position sync
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && globalSound) {
        try {
          const status = await globalSound.getStatusAsync();
          if (status.isLoaded) {
            setPositionMillis(status.positionMillis);
            if (status.durationMillis) {
              setDurationMillis(status.durationMillis);
            }
            if (status.isPlaying !== isPlaying) {
              setIsPlaying(status.isPlaying);
            }
          }
        } catch {
          // Reconcile silently on foreground
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isPlaying, setPositionMillis, setDurationMillis, setIsPlaying]);

  const loadTrack = async () => {
    if (!currentTrack || !currentTrack.streamUrl) {
      await unloadTrack();
      return;
    }

    if (currentLoadedTrackId === currentTrack.id && globalSound) {
      return;
    }

    await unloadTrack();
    currentLoadedTrackId = currentTrack.id;

    if (currentTrack.duration) {
      setDurationMillis(currentTrack.duration * 1000);
    }

    try {
      const restoredPosition = usePlayerStore.getState().positionMillis;
      const initialPosition = restoredPosition > 0 ? restoredPosition : 0;

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: currentTrack.streamUrl },
        { 
          shouldPlay: isPlaying,
          positionMillis: initialPosition,
          progressUpdateIntervalMillis: 500,
        },
        onPlaybackStatusUpdate
      );

      globalSound = sound;

      if (initialPosition > 0 && status.isLoaded && status.positionMillis !== initialPosition) {
        await sound.setPositionAsync(initialPosition).catch(() => {});
      }
    } catch {
      // Guard against loading a stale/invalid streamUrl on restore (fail silently)
      currentLoadedTrackId = null;
      usePlayerStore.setState({
        currentTrack: null,
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
      });
    }
  };

  const unloadTrack = async () => {
    if (globalSound) {
      try {
        await globalSound.unloadAsync();
      } catch {
        // Ignore error during unload
      }
      globalSound = null;
      currentLoadedTrackId = null;
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPositionMillis(status.positionMillis);
      if (status.durationMillis) {
        setDurationMillis(status.durationMillis);
      }
      if (status.didJustFinish) {
        playNext();
      }
    }
  };

  const play = async () => {
    setIsPlaying(true);
  };

  const pause = async () => {
    setIsPlaying(false);
  };

  const seek = async (millis: number) => {
    if (globalSound) {
      try {
        await globalSound.setPositionAsync(millis);
      } catch {}
      setPositionMillis(millis);
    }
  };

  return { play, pause, seek };
}
