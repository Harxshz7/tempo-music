import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';

export function useAudioPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying 
  } = usePlayerStore();

  useEffect(() => {
    audioService.configureAudioIfNeeded();
  }, []);

  useEffect(() => {
    audioService.loadTrack(currentTrack, isPlaying);
  }, [currentTrack?.id]);

  useEffect(() => {
    audioService.setPlaybackState(currentTrack, isPlaying);
  }, [isPlaying, currentTrack]);

  // Handle app foregrounding/backgrounding position sync
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        audioService.syncStatusOnForeground(isPlaying);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isPlaying]);

  const play = async () => {
    setIsPlaying(true);
  };

  const pause = async () => {
    setIsPlaying(false);
  };

  const seek = async (millis: number) => {
    await audioService.seek(millis);
  };

  return { play, pause, seek };
}
