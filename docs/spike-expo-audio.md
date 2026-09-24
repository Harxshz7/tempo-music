# Spike: expo-av → expo-audio Migration Evaluation

**Branch**: `spike/expo-audio-migration`
**Date**: 2026-09-21
**Author**: Tempo team
**Timebox**: 2–3 days (spike only — no production changes)
**Status**: ✅ Migration landed. This doc is kept as the historical record of the evaluation.
`expo-av`, `expo-notifications` and `expo-task-manager` have been removed, and
`src/services/notificationPlayer.ts` (the expo-notifications lock-screen workaround described
below) has been deleted — `expo-audio` handles the lock screen natively. The throwaway
`AudioSpikeScreen` test screen (section 8) has also been removed. The device test matrices in
section 9 are still unfilled.

---

## Executive Summary

`expo-audio` (SDK 57) is the actively-maintained successor to `expo-av` for audio playback. It provides **first-class** lock-screen controls, background playback via native foreground services, and a declarative hook-based API. This spike evaluates feasibility, breaking changes, and risk for a full migration.

**Recommendation: Migrate to expo-audio (full migration, not hybrid).**

Rationale:
- `expo-av` is deprecated — future SDK versions will drop it
- `expo-audio` natively solves the lock-screen/Now Playing limitations that are a permanent UX cap on expo-av
- The API surface is smaller and cleaner — migration is mechanical, not architectural
- Both packages coexist without native module conflicts during a gradual rollout

---

## 1. Feature Matrix

### expo-audio (SDK 57) vs expo-av — per platform, per feature

| Feature | Android expo-audio | iOS expo-audio | Web expo-audio | expo-av (current) |
|---|---|---|---|---|
| **Basic playback** | ✅ Works | ✅ Works | ✅ Works | ✅ Works |
| **Background playback** | ✅ Foreground service | ✅ UIBackgroundModes | ⚠️ Browser-dependent | ⚠️ Limited (stops ~3min without lock screen active) |
| **Lock screen controls** | ✅ MediaStyle notification (play/pause/next/prev/seek) | ✅ Now Playing Center + remote control events | ⚠️ MediaSession API (browser) | ❌ Not natively supported — requires workaround via expo-notifications |
| **Lock screen metadata** | ✅ Title, artist, album, artwork | ✅ Title, artist, album, artwork | ⚠️ Partial | ❌ Not supported |
| **Lock screen scrubbing** | ✅ Built-in seek bar | ✅ Built-in scrub bar | ❌ N/A | ❌ Not supported |
| **Seek accuracy** | ✅ seekTo(seconds) — sub-second precision | ✅ seekTo(seconds, toleranceBefore, toleranceAfter) | ✅ seekTo(seconds) | ✅ setPositionAsync(millis) |
| **Interruption handling** | ✅ interruptionMode: 'doNotMix' / 'duckOthers' / 'mixWithOthers' | ✅ Same | ⚠️ Browser-dependent | ✅ InterruptionModeAndroid / InterruptionModeIOS (separate enums) |
| **Survives app kill** | ✅ Foreground service keeps audio alive | ⚠️ System may terminate | ❌ N/A | ❌ No foreground service |
| **Gapless playback** | ✅ AudioPlaylist with 'all' loop | ✅ AudioPlaylist | ✅ AudioPlaylist | ❌ Manual queue management |
| **Playback rate** | ✅ 0.1–2.0x | ✅ 0.0–2.0x | ✅ Browser-dependent | ✅ rate property |
| **Audio sampling/viz** | ✅ useAudioSampleListener | ✅ useAudioSampleListener | ⚠️ Limited | ❌ Not supported |

### Legend
- ✅ Works / fully supported
- ⚠️ Partially works / platform-dependent
- ❌ Not supported / broken

---

## 2. API Mapping (expo-av → expo-audio)

| expo-av (current code) | expo-audio (replacement) | Notes |
|---|---|---|
| `Audio.Sound.createAsync(source, status, callback)` | `useAudioPlayer(source, options)` hook | Hook manages lifecycle; no manual unload needed |
| `sound.playAsync()` | `player.play()` | Sync (no await needed) |
| `sound.pauseAsync()` | `player.pause()` | Sync |
| `sound.setPositionAsync(millis)` | `player.seekTo(seconds)` | **Breaking: milliseconds → seconds** |
| `sound.getStatusAsync()` | `useAudioPlayerStatus(player)` | Reactive hook instead of imperative call |
| `status.positionMillis` | `status.currentTime` | **Breaking: millis → seconds** |
| `status.durationMillis` | `status.duration` | **Breaking: millis → seconds** |
| `status.isPlaying` | `status.playing` | Field name change |
| `status.isLoaded` | `status.isLoaded` | Same |
| `status.isBuffering` | `status.isBuffering` | Same |
| `status.didJustFinish` | Listen for `playbackStatusUpdate` event or use `AudioPlaylist` | No direct equivalent — playlist handles auto-advance |
| `Audio.setAudioModeAsync({...})` | `setAudioModeAsync({...})` from expo-audio | Different property names (see below) |
| `InterruptionModeIOS.DoNotMix` | `interruptionMode: 'doNotMix'` | String enum instead of numeric |
| `InterruptionModeAndroid.DoNotMix` | `interruptionMode: 'doNotMix'` | Unified cross-platform |
| `staysActiveInBackground: true` | `shouldPlayInBackground: true` | Property rename |
| `playsInSilentModeIOS: true` | `playsInSilentMode: true` | Now cross-platform |
| `sound.unloadAsync()` | `player.remove()` or let hook auto-release | Hook auto-releases on unmount |
| N/A (notification workaround) | `player.setActiveForLockScreen(true, metadata)` | **New capability** — native lock screen |
| N/A | `player.replace(newSource)` | Hot-swap source without creating new player |
| N/A | `useAudioPlaylist({ sources, loop })` | **New capability** — native gapless playlist |

---

## 3. Dev Client Requirements

### Is a custom dev client required?

**Yes, for native features.** While the expo-audio docs list "Included in Expo Go" as a supported platform, background playback and lock-screen controls rely on:
- **Android**: A foreground service (`AudioControlsService`) registered in AndroidManifest.xml via the config plugin
- **iOS**: `UIBackgroundModes: ["audio"]` capability

These native modifications are **not available in Expo Go**. Basic playback may work in Expo Go, but the key features being evaluated (background audio, lock screen) require a custom dev client.

### Setup commands

```bash
# Option A: Local build (requires Android Studio / Xcode)
npx expo run:android   # Builds and installs on connected device/emulator
npx expo run:ios       # Builds and installs on simulator/device

# Option B: EAS Build (cloud, no local toolchain needed)
npx eas build --platform android --profile development
npx eas build --platform ios --profile development
# Then install the resulting .apk / .ipa on your device
```

### EAS config (already present in project)

The existing `eas.json` has a `development` profile with `developmentClient: true` — this is sufficient for expo-audio testing. No changes needed.

### Time cost estimates

| Setup path | Estimated time | Prerequisites |
|---|---|---|
| Local Android (`npx expo run:android`) | ~10-15 min (first build) | Android Studio + SDK 34+ installed |
| Local iOS (`npx expo run:ios`) | ~15-20 min (first build) | Xcode 16+ installed |
| EAS Build (Android) | ~10-20 min (queue + build) | EAS account configured |
| EAS Build (iOS) | ~15-30 min (queue + build) | Apple Developer account + provisioning |
| From scratch (no toolchain) | ~1-2 hours | Installing Android Studio/Xcode from zero |

---

## 4. Native Module Conflict Analysis

### expo-av + expo-audio coexistence

**No conflicts detected.** Both packages installed side by side without:
- npm dependency version conflicts
- Metro bundler resolution errors
- Native module registration clashes

This is expected because:
- `expo-audio` is a separate native module (`expo.modules.audio`) from `expo-av` (`expo.modules.av`)
- They use different native class names and don't share registration keys
- The Expo SDK is designed for gradual migration — both are supported in SDK 57

### Safe migration path

Both can coexist during migration. The recommended approach:
1. Keep `expo-av` for the production player code
2. Build new player service using `expo-audio`
3. Swap at the `useAudioPlayer` hook level (one commit)
4. Remove `expo-av` dependency after confirming parity

---

## 5. Migration Impact on Current Codebase

### Files requiring changes (Phase 2)

| File | Change type | Effort |
|---|---|---|
| `src/hooks/useAudioPlayer.ts` | **Rewrite** — replace expo-av singleton with expo-audio hook | High (core file) |
| `src/store/playerStore.ts` | **Modify** — change millis → seconds throughout, remove manual queue management if using AudioPlaylist | Medium |
| `src/services/notificationPlayer.ts` | **Delete** — expo-audio handles lock screen natively | Low |
| `src/components/NeoPlayerBar.tsx` | **Modify** — update time unit references (millis → seconds) | Low |
| `src/screens/PlayerScreen.tsx` | **Modify** — update time unit references | Low |
| `app.json` | **Already done** (config plugin added in this spike) | Done |
| `package.json` | **Remove** expo-av, expo-notifications (if only used for player), expo-task-manager | Low |

### Architectural concern: singleton pattern

Current `useAudioPlayer.ts` uses a module-level `globalSound` singleton to share one `Audio.Sound` across NeoPlayerBar and PlayerScreen. With `expo-audio`:

- **Option A (recommended)**: Use `createAudioPlayer()` at module scope, not the `useAudioPlayer` hook (which is component-scoped). This preserves the singleton pattern.
- **Option B**: Use `useAudioPlayer` in a top-level provider component and pass the player instance via context.
- **Option C**: Use `useAudioPlaylist` for built-in queue management with gapless playback.

Option A is the closest to current architecture. Option C is the most capable but requires rethinking queue management.

---

## 6. expo-av Ceiling Analysis (if staying)

If the decision were to stay on expo-av, these are the **permanent UX limitations**:

| Limitation | Severity | Workaround available? |
|---|---|---|
| No native lock screen controls | **Critical** — users expect this in a music player | Partial — current expo-notifications approach shows buttons but no scrub bar, no artwork, no proper MediaSession |
| No Now Playing Center metadata (iOS) | **High** — no title/artist on lock screen or Control Center | No clean workaround within expo-av |
| No lock screen seek/scrub bar | **High** — can't scrub from lock screen | No workaround |
| Background audio stops after ~3 min (Android) | **Critical** — without foreground service, Android kills background audio | Partial — expo-task-manager can help but adds complexity and battery drain |
| No gapless playback | **Medium** — audible gap between tracks | Can pre-load next track but gap remains |
| Deprecated / removed in future SDK | **Critical** — will require migration eventually regardless | None — eventual migration is inevitable |

**Verdict: expo-av is a permanent UX cap.** The notification-based workaround currently in `notificationPlayer.ts` is a hack that produces a subpar experience compared to native MediaSession/Now Playing integration. Staying on expo-av means accepting these limitations permanently or until a forced migration when expo-av is dropped.

---

## 7. Recommendation

### ✅ Full migration to expo-audio

**Not hybrid.** The APIs are different enough that maintaining two audio backends adds complexity without benefit. expo-av is deprecated and the migration is mechanical.

### Phase 2 Scope (if approved)

**Estimated effort: 2–3 days for a senior developer.**

#### Concrete unknowns/blockers to resolve in Phase 2

1. **Singleton vs hook architecture**: Need to decide between `createAudioPlayer()` (module-level singleton) vs `useAudioPlayer` (component-scoped). The singleton approach matches current architecture but the hook approach is officially recommended.

2. **Queue management migration**: Current `playerStore.ts` manages queue manually (array + index). `expo-audio`'s `AudioPlaylist` can replace this entirely, but it changes the data flow — the playlist owns the queue, not Zustand. Need to decide: keep Zustand queue or delegate to AudioPlaylist?

3. **Time unit migration (millis → seconds)**: Every reference to `positionMillis` and `durationMillis` in the store and UI components needs conversion. This is mechanical but error-prone — needs careful testing.

4. **Persisted player state**: Current playerStore persists queue and position to AsyncStorage via Zustand persist middleware. With expo-audio, need to verify that restoring position works with `seekTo(seconds)` on a freshly created player.

5. **`didJustFinish` equivalent**: Current auto-advance relies on `status.didJustFinish` in the playback status callback. expo-audio's `AudioPlayer` emits `playbackStatusUpdate` events but the docs don't explicitly mention a `didJustFinish` field. Need to test: does the status include a "finished" state? Or should we use `AudioPlaylist` which handles track advancement natively?

6. **Web parity**: expo-audio's web implementation uses the browser's `<audio>` element. Current expo-av web playback works. Need to verify no regressions on web, especially with Subsonic server CORS headers.

7. **expo-notifications removal**: `notificationPlayer.ts` uses expo-notifications for playback controls. After migration, expo-audio handles this natively. But if expo-notifications is used elsewhere in the app (e.g., future push notifications), it should remain as a dependency. If it's only used for the player, it can be removed.

#### Phase 2 task breakdown (estimated)

| Task | Est. hours |
|---|---|
| Create new `useAudioService.ts` using expo-audio `createAudioPlayer` | 3h |
| Migrate `playerStore.ts` (millis → seconds, optional AudioPlaylist) | 2h |
| Delete `notificationPlayer.ts` | 0.5h |
| Update `NeoPlayerBar.tsx` time references | 1h |
| Update `PlayerScreen.tsx` time references + lock screen metadata | 1.5h |
| Update `useAudioPlayer.ts` hook API (or replace) | 2h |
| Remove expo-av dependency + clean up imports | 0.5h |
| Testing: Android background + lock screen | 2h |
| Testing: iOS background + Now Playing | 2h |
| Testing: Web parity | 1h |
| Testing: Persist/restore player state | 1h |
| **Total** | **~16.5h (~2-3 days)** |

---

## 8. Test Screen

A throwaway test screen (`src/screens/AudioSpikeScreen.tsx`) is included on this branch. It exercises:

- `useAudioPlayer(url)` — basic playback from a stream URL
- `useAudioPlayerStatus(player)` — real-time status display
- `player.setActiveForLockScreen(true, metadata)` — lock screen controls
- `player.seekTo(seconds)` — seek accuracy testing with timing
- Interruption logging (status changes when other audio plays)

### How to test

```bash
# 1. Switch to spike branch
git checkout spike/expo-audio-migration

# 2. Install deps
npm install

# 3. Build dev client (expo-audio needs native modules)
npx expo run:android   # or npx expo run:ios

# 4. Navigate to the test screen
#    - On login screen: you'll need to add a temporary button, OR
#    - Log in first, then the screen is accessible via deep link or
#      by adding a nav button in Settings
```

### Manual test checklist

- [ ] Press Play → audio starts
- [ ] Lock device → audio continues playing
- [ ] Check lock screen → controls visible (play/pause/skip) with metadata
- [ ] Use lock screen play/pause → responds correctly
- [ ] Seek ±10s → position jumps accurately (check log output)
- [ ] Open another audio app → Tempo audio pauses (doNotMix mode)
- [ ] Return to Tempo → state is correct
- [ ] Kill app from recents → observe: does audio survive? (Android foreground service should keep it alive)
- [ ] Repeat key tests on iOS

---

## 9. Device Test Results

> **To be filled in after running the test screen on physical devices.**
> Run the test screen and fill in results below.

### Android

| Test | Result | Notes |
|---|---|---|
| Basic playback | ⬜ | |
| Background (screen lock) | ⬜ | |
| MediaStyle notification | ⬜ | |
| Lock screen play/pause | ⬜ | |
| Lock screen seek bar | ⬜ | |
| Lock screen metadata | ⬜ | |
| Survives app kill | ⬜ | |
| Seek accuracy | ⬜ | |
| Interruption (other app) | ⬜ | |

### iOS

| Test | Result | Notes |
|---|---|---|
| Basic playback | ⬜ | |
| Background (screen lock) | ⬜ | |
| Now Playing Center | ⬜ | |
| Control Center controls | ⬜ | |
| Lock screen scrubbing | ⬜ | |
| Lock screen metadata | ⬜ | |
| Seek accuracy | ⬜ | |
| Interruption (phone call) | ⬜ | |

### Web

| Test | Result | Notes |
|---|---|---|
| Basic playback | ⬜ | |
| Seek accuracy | ⬜ | |
