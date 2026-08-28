import { useEffect, useRef } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { updateNotificationPlayer, setupNotificationPlayer } from '../services/notificationPlayer';
import { usePlayerStore } from '../store/playerStore';

// Note: iOS lock-screen controls (MPRemoteCommandCenter/MPNowPlayingInfoCenter) 
// are not fully exposed by expo-av out of the box. 
// Full integration requires migrating to expo-audio or using a custom native module.

export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying, 
    setPositionMillis, 
    setDurationMillis, 
    playNext 
  } = usePlayerStore();

  useEffect(() => {
    // Configure audio session
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });
    
    // Set up Android Media Style Notification Categories
    setupNotificationPlayer();
    
    // Listen for audio interruptions (e.g., phone calls)
    // expo-av does not have a global interruption listener in JS in older versions, 
    // but relies on shouldDuckAndroid and interruptionMode. Wait, expo-av provides 
    // `setOnAudioSampleReceived` and audio focus features, but pausing on interrupt 
    // is partly handled natively if DoNotMix is set. 
    // We will ensure the notification player is synced whenever `isPlaying` changes.
  }, []);

  useEffect(() => {
    loadTrack();
    return () => {
      unloadTrack();
    };
  }, [currentTrack?.id]);

  useEffect(() => {
    if (soundRef.current) {
      if (isPlaying) {
        soundRef.current.playAsync();
      } else {
        soundRef.current.pauseAsync();
      }
    }
    updateNotificationPlayer(currentTrack, isPlaying);
  }, [isPlaying, currentTrack]);

  const loadTrack = async () => {
    if (!currentTrack || !currentTrack.streamUrl) return;
    
    await unloadTrack();
    
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: currentTrack.streamUrl },
        { shouldPlay: isPlaying },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
    } catch (e) {
      console.error("Error loading track", e);
    }
  };

  const unloadTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPositionMillis(status.positionMillis);
      if (status.durationMillis) {
        setDurationMillis(status.durationMillis);
      }
      if (status.didJustFinish) {
        playNext();
      }
    } else if (status.error) {
      console.error(`Playback Error: ${status.error}`);
    }
  };

  const play = async () => {
    setIsPlaying(true);
  };

  const pause = async () => {
    setIsPlaying(false);
  };

  const seek = async (millis: number) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(millis);
      setPositionMillis(millis);
    }
  };

  return { play, pause, seek };
}
