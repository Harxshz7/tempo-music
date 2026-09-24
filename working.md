# How Tempo Works

Technical architecture documentation for developers working on the **Tempo Music** codebase.

For end-user features and setup instructions, see [`README.md`](./README.md).

---

## What is Tempo

Tempo is a cross-platform mobile and web music streaming client built with React Native and Expo, designed specifically for self-hosted music servers that support the **Subsonic REST API** (such as Navidrome, Airsonic, Funkwhale, or native Subsonic servers). It provides a full-featured music player with offline caching, search, star/favorite synchronization, custom playlist management, and a custom **neo-brutalist UI design system**.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      UI / View Layer                             │
│  Navigation (Tabs / Stack / DesktopSidebar)                      │
│  Screens (Library, Search, Player, Album, Artist, Settings)      │
│  Components & Neo-Brutalist UI Primitives (/src/components/ui)   │
└─────────────────┬──────────────────────────────┬─────────────────┘
                  │                              │
                  ▼                              ▼
┌──────────────────────────────────┐ ┌─────────────────────────────┐
│       Zustand State Stores       │ │       Service Layer         │
│  - authStore                     │ │  - audioService (expo-audio)│
│  - playerStore                   │ │  - offlineService           │
│  - starredStore                  │ │  - cacheService             │
│  - settingsStore                 │ │  - audioBridge              │
│  - playCountStore                │ └──────────────┬──────────────┘
└─────────────────┬────────────────┘                │
                  │ AsyncStored                     │ HTTP Stream / File URI
                  ▼                                 ▼
┌──────────────────────────────────┐ ┌─────────────────────────────┐
│     Subsonic REST API Client     │ │   Device Audio & Storage    │
│  (/src/api/subsonic.ts)          │ │  - Native Audio Hardware    │
│  MD5 Salt Authentication         │ │  - FileSystem Downloads     │
└─────────────────┬────────────────┘ └─────────────────────────────┘
                  │ HTTPS
                  ▼
┌──────────────────────────────────┐
│ Subsonic / Navidrome Media Server│
└──────────────────────────────────┘
```

---

## Core Systems

### 1. Subsonic API Client
* **Key File**: [`src/api/subsonic.ts`](./src/api/subsonic.ts)
* **Auth Protocol**: Implements Subsonic REST API token authentication using `u` (username), `t` (token), `s` (salt), `v` (`1.16.1`), and `c` (`TempoMusic`).
  * Token formula: `t = md5(password + salt)`.
  * `salt` is a randomly generated 6-character hex string generated per auth request.
* **Credentials Storage**: [`authStore.ts`](./src/store/authStore.ts) derives `token` = `md5(password + salt)` and hands `serverUrl`, `username`, `token` and `salt` to the Subsonic client, which persists them to `AsyncStorage` under `tempo_server_config`. The **password itself is never stored**. The token/salt pair is replayable and is also embedded in stream and cover-art URLs, so HTTPS matters.
* **Endpoints Implemented**:
  * `ping.view`: Server connectivity & auth validation.
  * `getIndexes.view` / `getArtists.view` / `getArtist.view` / `getAlbum.view`: Music library browsing.
  * `search3.view`: Multi-entity search across tracks, albums, and artists.
  * `getPlaylists.view` / `getPlaylist.view` / `createPlaylist.view` / `updatePlaylist.view` / `deletePlaylist.view`: Custom playlist management.
  * `star.view` / `unstar.view` / `getStarred2.view`: Favorites synchronization.
  * `stream.view`: Audio streaming URL construction (with bitrate limiting).
  * `getCoverArt.view`: Cover image fetching.
  * `scrobble.view`: Now-playing notification and play-count submission.
  * `getLyrics.view`: Plain-text lyrics retrieval.

### 2. Audio Service & Playback Engine
* **Key File**: [`src/services/audioService.ts`](./src/services/audioService.ts)
* **Engine**: Built on Expo SDK 57 `expo-audio` API (`AudioPlayer` / `createAudioPlayer`).
* **Playback Lifecycle**:
  * `loadTrack(track, isPlaying, resumePositionMillis)`: Resolves a local offline file URI via [`offlineService.ts`](./src/services/offlineService.ts) when the track is downloaded, otherwise derives a `stream.view` URL from the track id at play time (stream URLs are never stored on tracks). Creates an `expo-audio` player, applies the resume position, and plays. A monotonically increasing load token discards stale in-flight loads so rapid track switches can't leave two players running.
  * `replayCurrent()` / `unloadTrack()`: Restart-from-zero (repeat-one) and full teardown. The Zustand store reaches these through [`audioBridge.ts`](./src/services/audioBridge.ts) instead of importing the service, which would create a module cycle.
  * `pause()` / `resume()` / `seek(seconds)` / `stop()`: Directly controls the active player instance.
  * Status updates (position, duration, buffering, playback status) are emitted to [`playerStore.ts`](./src/store/playerStore.ts).
* **Background Playback & Lock Screen Controls**: Handled natively by `expo-audio` — `setAudioModeAsync({ shouldPlayInBackground: true })` plus `player.setActiveForLockScreen(...)` for MediaSession / Now Playing metadata. The config plugin in `app.json` enables background playback.

### 3. State Management & Persistence
* **Library**: [Zustand](./src/store) with `JSON.stringify` / `AsyncStorage` persistence adapters.
* **Stores**:
  * **[`authStore.ts`](./src/store/authStore.ts)**: Authentication status and the active server config. The config itself is persisted by the API client under `tempo_server_config`.
  * **[`playerStore.ts`](./src/store/playerStore.ts)**: Current track, queue, queue index, `isPlaying`, repeat (`off` | `one` | `all`) and shuffle, persisted under `tempo-player-state`. `positionMillis` is runtime-only; `resumePositionMillis` is the persisted checkpoint, written on pause / track change / unmount through a de-duplicating storage adapter so position ticks don't re-serialize the queue.
  * **[`starredStore.ts`](./src/store/starredStore.ts)**: Starred tracks, albums and artists with optimistic updates and rollback on failure, persisted under `tempo-starred-store`.
  * **[`settingsStore.ts`](./src/store/settingsStore.ts)**: Streaming bitrate, saved servers and the Subsonic scrobble toggle, persisted under `tempo-settings-store`.
  * **[`playCountStore.ts`](./src/store/playCountStore.ts)**: Local play counters per song/album/artist, persisted under `tempo-play-counts`.
  * **`useOfflineStore`** (exported from [`offlineService.ts`](./src/services/offlineService.ts)): Download records and their statuses, persisted under `tempo-offline-store`.

### 4. Navigation & Layout Structure
* **Key File**: [`src/components/Navigation.tsx`](./src/components/Navigation.tsx)
* **Auth Guard**: Evaluates `isAuthenticated` from `authStore`. Unauthenticated users see [`LoginScreen.tsx`](./src/screens/LoginScreen.tsx).
* **Responsive Shell**: Uses [`useResponsive.ts`](./src/hooks/useResponsive.ts) hook:
  * **Mobile**: Bottom Tab Navigator (`Library`, `Search`, `Playlists`, `Settings`).
  * **Desktop**: [`DesktopSidebar.tsx`](./src/navigation/DesktopSidebar.tsx) sidebar shell.
* **Stack Routes & Modals**: Detail screens (`AlbumDetailScreen`, `ArtistDetailScreen`, `PlaylistDetailScreen`) push onto `Stack.Navigator`. [`PlayerScreen.tsx`](./src/screens/PlayerScreen.tsx) opens as a bottom-up modal presentation.
* **Persistent Bar**: [`NeoPlayerBar.tsx`](./src/components/NeoPlayerBar.tsx) renders as an overlay above the tab bar on mobile or at the bottom on desktop whenever a track is loaded.

---

## End-to-End Data Flow Example

**Scenario: User taps a track on an album screen to start playback**

```
1. [User Interaction]
   User taps a row in AlbumDetailScreen / PlaylistDetailScreen / SearchScreen -> TrackRow fires onPress

2. [State Action]
   The screen maps Song[] -> Track[] and calls playerStore.setQueue(tracks, index).
   Rows inside "Up Next" call playerStore.playTrack(track, index) so the cursor moves too.

3. [Store Update]
   playerStore sets currentTrack, queue, queueIndex and isPlaying=true, and resets
   positionMillis + resumePositionMillis to 0. Zustand persist writes the queue to
   AsyncStorage ('tempo-player-state') through a de-duplicating storage adapter, so
   position ticks do not cause disk writes.

4. [Audio Engine Invocation]
   The mounted useAudioPlayer() hook reacts to the currentTrack id change and calls
   audioService.loadTrack(currentTrack, isPlaying, resumePositionMillis).
   The store never calls the audio service directly - it reaches it through
   audioBridge for repeat-one replay and queue teardown.

5. [Source Resolution]
   audioService asks offlineService.getAudioPlaybackUrl(track.id, remoteUrl):
     ├── IF downloaded: local file URI
     └── ELSE: subsonic.getStreamUrl(track.id, bitrate) -> HTTPS URL derived per play,
              so no credential-bearing URL is ever stored on a track

6. [Playback Execution]
   A load token guards the async path: if another track is selected mid-load, the
   stale load bails out and discards its player. The player is created, lock-screen
   metadata is set, the resume position is applied, and .play() is called.

7. [UI Reactivity]
   The playbackStatusUpdate listener writes position/duration into the store and
   reconciles isPlaying with the engine, keeping NeoPlayerBar, PlayerScreen and the
   scrubbers in sync (including after OS interruptions).

8. [Completion & Next Track]
   A failure to load surfaces a toast. At 50% played a scrobble is submitted, but
   only when Subsonic scrobbling is enabled in Settings (off by default). When the
   engine reports didJustFinish, playerStore.playNext() runs: repeat-one re-seeks
   the current track, otherwise the queue advances (or wraps under repeat-all).
   On pause / track change / unmount the position is checkpointed to
   resumePositionMillis for the next launch.
```

---

## Design System

* **Location**: NativeWind / Tailwind config ([`global.css`](./global.css), [`tailwind.config.js`](./tailwind.config.js)) and UI primitives in [`src/components/ui/`](./src/components/ui).
* **Style Guidelines**: Neo-brutalist aesthetic using solid high-contrast borders (`border-2 border-black`), offset hard drop shadows (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`), vibrant accent colors (`#FFE600` yellow, `#FF6B6B` coral, `#FFFDF5` cream background), and `SpaceGrotesk` typography.
* **Core UI Primitives**:
  * [`HardShadow.tsx`](./src/components/ui/HardShadow.tsx): Container with solid offset shadow.
  * [`NeoButton.tsx`](./src/components/ui/NeoButton.tsx): Brutalist button with active press translation.
  * [`NeoCard.tsx`](./src/components/ui/NeoCard.tsx): Bordered card with hard shadow.
  * [`NeoInput.tsx`](./src/components/ui/NeoInput.tsx): Neo-brutalist text input field.
  * [`NeoCoverArt.tsx`](./src/components/ui/NeoCoverArt.tsx): Cover art display with fallback placeholders.
  * [`NeoBadge.tsx`](./src/components/ui/NeoBadge.tsx), [`NeoSwitch.tsx`](./src/components/ui/NeoSwitch.tsx), [`NeoSkeleton.tsx`](./src/components/ui/NeoSkeleton.tsx), [`NeoToast.tsx`](./src/components/ui/NeoToast.tsx).
* **Adding New Components**: Use existing `Neo*` primitives and `SpaceGrotesk` fonts. Avoid soft gradients or muted shadows; maintain solid 2px/3px black borders.

---

## Known Gaps / In-Progress Areas

Based strictly on code inspection of current source files:

1. **Queue reordering is button-based only**: `playerStore.reorderQueue(fromIndex, toIndex)` is wired to the up/down buttons in [`PlayerScreen.tsx`](./src/screens/PlayerScreen.tsx); drag-and-drop is not implemented.
2. **No gapless playback**: queued tracks advance in JavaScript when `expo-audio` reports `didJustFinish`, so there is an audible gap. `expo-audio`'s `AudioPlaylist` would have to own the queue to fix this.
3. **No lyrics support**: there is no `getLyrics` call in [`subsonic.ts`](./src/api/subsonic.ts) and no lyrics UI.
4. **Playlists are read-mostly**: rename, delete, remove-track and add-songs exist, but reordering rewrites the playlist via `createPlaylist` with the full track list.
5. **Two Settings toggles are display-only**: `Background Playback` and `Download Over Wi-Fi Only` are written to AsyncStorage under `pref_bgPlayback` / `pref_wifiOnly` in [`SettingsScreen.tsx`](./src/screens/SettingsScreen.tsx) and never read anywhere else. Wire them to behaviour or remove them — they currently mislead the user.
6. **Offline downloads have no lifecycle management**: no expiry, size cap or eviction; `removeAllDownloads` is the only cleanup path.

---

## Where Things Live

```
tempo-music/
├── App.tsx                    # Root component (font loading, auth restore, splash screen)
├── index.ts                   # Expo root entry point
├── global.css                 # Global CSS & NativeWind setup
├── tailwind.config.js         # Theme colors (#FFFDF5, #FFE600) & font families
├── app.json                   # Expo SDK configuration & background audio permissions
├── scripts/
│   └── generate-assets.js     # Script to generate vector/raster icon assets using Sharp
├── docs/
│   └── spike-expo-audio.md    # Technical spike notes on expo-audio migration
└── src/
    ├── api/                   # Subsonic REST API wrapper & authentication helpers
    ├── components/            # Reusable app components & neo-brutalist UI primitives
    ├── hooks/                 # Custom React hooks (useAudioPlayer, useDebounce, useResponsive)
    ├── navigation/            # Responsive navigation shell (DesktopSidebar)
    ├── screens/               # Screen views (Library, Search, Player, Album, Artist, etc.)
    ├── services/              # Singleton core services (audioService, offlineService, cache)
    ├── store/                 # Zustand global state stores with AsyncStorage persistence
    ├── types/                 # TypeScript interfaces (SubsonicTrack, Album, Artist, Playlist)
    └── utils/                 # Utilities (haptics.ts)
```
