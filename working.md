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
│  - settingsStore                 │ │  - notificationPlayer       │
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
* **Credentials Storage**: Active credentials (`serverUrl`, `username`, `password`, `token`, `salt`) are managed by [`authStore.ts`](./src/store/authStore.ts) and persisted to `AsyncStorage` (`tempo_auth_storage`).
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
  * `play(track)`: Resolves local offline file URI via [`offlineService.ts`](./src/services/offlineService.ts) if downloaded; otherwise builds remote `stream.view` URL via Subsonic API. Loads stream into `expo-audio` player, triggers `.play()`, and reports now-playing scrobble.
  * `pause()` / `resume()` / `seek(seconds)` / `stop()`: Directly controls the active player instance.
  * Status updates (position, duration, buffering, playback status) are emitted to [`playerStore.ts`](./src/store/playerStore.ts).
* **Background Playback & Lock Screen Controls**: Handled via [`notificationPlayer.ts`](./src/services/notificationPlayer.ts) using `expo-notifications` and background audio category configuration in `app.json`.

### 3. State Management & Persistence
* **Library**: [Zustand](./src/store) with `JSON.stringify` / `AsyncStorage` persistence adapters.
* **Stores**:
  * **[`authStore.ts`](./src/store/authStore.ts)**: Server URL, credentials, token, authentication status (`tempo_auth_storage`).
  * **[`playerStore.ts`](./src/store/playerStore.ts)**: Current track, queue array, queue index, play state (`isPlaying`), position/duration, volume, repeat mode (`off` | `one` | `all`), and shuffle mode (`tempo_player_storage`).
  * **[`starredStore.ts`](./src/store/starredStore.ts)**: Starred tracks, albums, and artists synced with Subsonic server (`tempo_starred_storage`).
  * **[`settingsStore.ts`](./src/store/settingsStore.ts)**: Max bitrate quality, transcode format, theme mode, cache size limit, offline-only mode (`tempo_settings_storage`).
  * **[`playCountStore.ts`](./src/store/playCountStore.ts)**: Local play counters per track ID (`tempo_playcount_storage`).

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

**Scenario: User taps a track in the Library screen to start playback**

```
1. [User Interaction]
   User taps track item in LibraryScreen.tsx -> TrackRow.tsx fires onPress(track)

2. [State Action]
   LibraryScreen calls playerStore.getState().playTrack(track, queue)

3. [Store Update]
   playerStore updates state:
     - currentTrack = track
     - queue = queue
     - queueIndex = selected index
     - isPlaying = true
   Persists queue & currentTrack to AsyncStorage ('tempo_player_storage')

4. [Audio Engine Invocation]
   playerStore calls audioService.play(track)

5. [Source Resolution]
   audioService checks offlineService.isTrackDownloaded(track.id):
     ├── IF downloaded: returns local URI ('file://.../downloaded_tracks/track_id.mp3')
     └── ELSE: calls subsonic.getStreamUrl(track.id, maxBitrate) -> returns HTTPS URL

6. [Playback Execution & Scrobble]
   audioService loads stream URI into expo-audio player and invokes .play()
   Calls subsonic.scrobble(track.id, submission=false) to report 'now playing' to Subsonic server

7. [UI Reactivity]
   Zustand subscriptions trigger re-renders:
     - NeoPlayerBar.tsx displays track metadata, play/pause state, progress bar
     - PlayerScreen.tsx updates album artwork, track title, artist, and full controls

8. [Completion & Next Track]
   When track position reaches 50% or 4 minutes, audioService calls subsonic.scrobble(track.id, submission=true)
   On track finish, audioService checks repeat/shuffle mode and triggers playerStore.nextTrack()
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

1. **Queue Reordering UI**: [`playerStore.ts`](./src/store/playerStore.ts) implements `reorderQueue(fromIndex, toIndex)`, but drag-and-drop reordering gesture UI in [`PlayerScreen.tsx`](./src/screens/PlayerScreen.tsx) is not yet wired.
2. **Equalizer & DSP**: [`settingsStore.ts`](./src/store/settingsStore.ts) contains an `equalizerPreset` state setting, but custom audio DSP processing is not implemented in [`audioService.ts`](./src/services/audioService.ts).
3. **Synced Lyrics**: `subsonic.getLyrics()` fetches plain-text lyrics from Subsonic; time-synced LRCLIB lyric parsing is not yet implemented.
4. **Debug Route**: [`src/screens/AudioSpikeScreen.tsx`](./src/screens/AudioSpikeScreen.tsx) remains registered in [`Navigation.tsx`](./src/components/Navigation.tsx#L18) (`// SPIKE-ONLY — remove before merge`).

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
