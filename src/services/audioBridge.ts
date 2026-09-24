/**
 * Decouples the Zustand player store from the expo-audio playback service.
 *
 * `audioService` imports the store (to push position/duration updates), so the
 * store cannot import `audioService` back without creating a module cycle.
 * Instead the service registers its controls here and the store calls through
 * this bridge. Until the audio module is loaded the handlers are absent, which
 * is safe: nothing can be playing before then.
 */
interface PlaybackControls {
  /** Restart the current track from position 0 (used by repeat-one). */
  replay: () => void;
  /** Tear down the active player and silence playback (used when the queue empties). */
  stop: () => void;
}

let controls: PlaybackControls | null = null;

export function registerPlaybackControls(next: PlaybackControls | null): void {
  controls = next;
}

export function replayCurrentTrack(): void {
  controls?.replay();
}

export function stopPlayback(): void {
  controls?.stop();
}
