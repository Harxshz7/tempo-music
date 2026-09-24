# Tempo Music Roadmap

This document outlines completed milestones, current priorities, and upcoming work for **Tempo Music**. It is intended to help contributors understand what has been built, what is actively in progress, and where community help is most needed.

---

## 🏆 Completed Milestones

### Phase 0: Foundations & Design System ✅
- [x] React Native 0.86 + Expo SDK 57 with TypeScript strict mode.
- [x] NativeWind v4 (TailwindCSS) setup with SpaceGrotesk typography.
- [x] Custom Neo-Brutalist UI component library (`NeoButton`, `NeoCard`, `NeoInput`, `NeoPlayerBar`, `NeoSwitch`, `NeoToast`).
- [x] Responsive layout shell switching between Bottom Tabs (mobile) and `DesktopSidebar` (>1024px).

### Phase 1: Subsonic API Client & Authentication ✅
- [x] Subsonic REST API v1.16.1 client with MD5 salt authentication.
- [x] Multi-server credential storage and session restoration via `AsyncStorage`.
- [x] API endpoints for library browsing, album/artist metadata, playlist CRUD, and search.
- [x] Server scrobble protocol (`nowPlaying` and submission scrobbles).

### Phase 2: Audio Engine & Playback Architecture ✅
- [x] Playback engine built on Expo SDK 57 `expo-audio`.
- [x] Global player state management via Zustand (`playerStore`).
- [x] Persistent playback queue surviving app restarts.
- [x] Lock-screen metadata and notification controls via `notificationPlayer.ts`.
- [x] Docked mini player (`NeoPlayerBar`) and fullscreen modal player (`PlayerScreen`).

### Phase 3: Library & Feature Completeness ✅
- [x] Infinite scrolling album grid with sorting (newest, alphabetical, frequent, random).
- [x] A–Z artist index and artist discography views.
- [x] Playlist creation, editing, track addition, and deletion.
- [x] Star / favorite synchronization for songs, albums, and artists (`starredStore`).
- [x] Debounced multi-entity search across artists, albums, and tracks.

### Phase 4: Offline Caching & Code Quality ✅
- [x] Disk caching for cover art via `expo-file-system` (`cacheService.ts`).
- [x] Local track downloading and offline playback resolution (`offlineService.ts`).
- [x] Comprehensive Jest unit test suite for Subsonic API and player store.
- [x] EAS Build profiles configured for development, preview, and production.
- [x] ESLint and strict TypeScript typechecking.

---

## 🚀 Community Roadmap & Up For Grabs (`help-wanted`)

The following initiatives are open for contribution. If you'd like to work on one, comment on the corresponding issue or open a discussion!

### 1. Physical Device Background Audio Verification 📱
* **Status**: `help-wanted`
* **Priority**: High
* **Details**: Background audio and lock screen controls are implemented using `expo-audio`, but need real-world verification on physical devices across Android versions (12–15) and iOS versions (16–18). Test matrices are documented in [`docs/spike-expo-audio.md`](./docs/spike-expo-audio.md).
* **Skills Needed**: Physical iOS/Android device + Expo Custom Dev Client.

### 2. Drag-and-Drop Queue Reordering Gesture UI 🔀
* **Status**: `help-wanted`
* **Priority**: High
* **Details**: `playerStore.ts` already provides `reorderQueue(fromIndex, toIndex)`, but the queue list in `PlayerScreen.tsx` currently only renders static rows. We need a fluid drag-and-drop gesture interaction using `react-native-gesture-handler` and `react-native-reanimated`.
* **Skills Needed**: React Native Reanimated, Gesture Handler.

### 3. Synced Lyrics Integration (LRCLIB / LRC) 🎤
* **Status**: `help-wanted`
* **Priority**: Medium
* **Details**: `subsonic.getLyrics()` currently returns plain text lyrics. We want to support synchronized, scrolling lyrics using timestamped LRC formats or fetching from [LRCLIB](https://lrclib.net/) when the server does not have embedded lyrics.
* **Skills Needed**: React Native UI animation, string parsing.

### 4. Equalizer & Audio DSP Presets 🎛️
* **Status**: `help-wanted`
* **Priority**: Medium
* **Details**: `settingsStore.ts` holds an `equalizerPreset` configuration state, but native audio frequency equalization is not yet wired to `expo-audio`.
* **Skills Needed**: Native audio DSP or Expo audio filter extensions.

### 5. Smart Batch Offline Download Manager 💾
* **Status**: `help-wanted`
* **Priority**: Medium
* **Details**: `offlineService.ts` currently downloads single tracks. We want the ability to download entire playlists or albums with a visual progress bar, storage management stats in Settings, and background download completion.
* **Skills Needed**: `expo-file-system`, Zustand state persistence.

### 6. Internationalization (i18n) 🌐
* **Status**: `help-wanted`
* **Priority**: Low
* **Details**: Setup an internationalization framework (e.g. `i18next` / `expo-localization`) and extract English strings so community members can contribute translations.
* **Skills Needed**: React Native i18n.

### 7. Sleep Timer ⏱️
* **Status**: `good-first-issue`
* **Priority**: Low
* **Details**: Add a sleep timer in the Player settings menu allowing playback to fade out or stop after 15, 30, 45, or 60 minutes or at the end of the current track.
* **Skills Needed**: Zustand, React Native timers.

---

## 💡 Proposing New Roadmap Items

Have an idea that isn't listed here? Please open a **Feature Request** using our [Issue Template](https://github.com/Harxshz7/tempo-music/issues/new?template=feature_request.yml) to discuss its architecture before starting implementation.
