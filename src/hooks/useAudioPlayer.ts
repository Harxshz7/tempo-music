import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';

export function useAudioPlayer() {
  const { currentTrack, isPlaying, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    audioService.configureAudioIfNeeded();
  }, []);

  useEffect(() => {
    // Read the checkpoint imperatively: `resumePositionMillis` must not become an
    // effect dependency, or the track would reload on every position commit.
    const state = usePlayerStore.getState();
    audioService.loadTrack(state.currentTrack, state.isPlaying, state.resumePositionMillis);

    return () => {
      // Persist the final position on unmount and on track change.
      const current = usePlayerStore.getState();
      current.commitResumePosition(current.positionMillis);
    };
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
    // Checkpoint so a restart resumes here rather than at 0 or at the last frame.
    const state = usePlayerStore.getState();
    state.commitResumePosition(state.positionMillis);
    setIsPlaying(false);
  };

  const seek = async (millis: number) => {
    await audioService.seek(millis);
  };

  return { play, pause, seek };
}
