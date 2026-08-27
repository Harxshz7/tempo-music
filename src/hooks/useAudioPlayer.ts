import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';

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
    });
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
  }, [isPlaying]);

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
