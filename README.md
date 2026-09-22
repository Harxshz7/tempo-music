# Tempo

**Your music, your server — an open-source Subsonic/Navidrome client for iOS, Android & Web.**

[![CI](https://github.com/Harxshz7/tempo-music/actions/workflows/ci.yml/badge.svg)](https://github.com/Harxshz7/tempo-music/actions/workflows/ci.yml)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-lightgrey)](#getting-started)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

> **Status:** early development (v0.1.0). Core playback and library browsing work end-to-end — see [Roadmap](#roadmap) for what's next. Expect changes between minor versions.

## About

Tempo is a free, open-source hybrid music app built with React Native + Expo. It's designed for **any Subsonic-compatible server** (API v1.16.1) — Navidrome, Airsonic, Ampache, Gonic and friends — and currently tested end-to-end against **Navidrome**; reports from users of other servers are welcome. No ads, no subscriptions, no lock-in: your music stays on your server, Tempo is just the player.

## Features

- **Cross-platform** — one codebase for iOS, Android, and Web, with a responsive layout that swaps the tab bar for a desktop sidebar on wide screens
- **Full library browsing** — albums (infinite scroll), artists (A–Z sections), playlists
- **Search** — debounced full-text search across artists, albums, and songs
- **Real queue management** — shuffle, repeat (off / all / one), reorder, remove — and a queue that **persists across app restarts**, resuming at your last position
- **Background playback** — keeps playing when the app is backgrounded, with lock-screen metadata and controls via `expo-audio`¹
- **Playlist management** — rename, delete, and remove tracks (as the playlist owner)
- **Disk-cached artwork** — now-playing artwork is stored on disk via `expo-file-system` for instant reloads
- **Neo-brutalist UI** — bold borders, hard shadows, haptic feedback; 100% open source, MIT licensed

¹ Implemented, but **not yet verified on physical devices** — see [Known Limitations](#known-limitations). Requires a custom dev client, not Expo Go.

## Screenshots

No polished captures yet — the shot list, resolutions, and file naming live in **[docs/screenshots/](docs/screenshots/README.md)**. PRs with captures are very welcome.

## Requirements

- **Node.js 22.13 or newer** (Expo SDK 57 minimum) + npm
- A Subsonic-compatible server supporting REST API **v1.16.1** — any recent [Navidrome](https://www.navidrome.org/) release qualifies
- For trying the UI: the **Expo Go** app, or just a browser
- For full audio features: a **custom dev client**, built locally (Android Studio / Xcode) or in the cloud via EAS Build — see [Development Setup](#development-setup)

## Getting Started

```bash
git clone https://github.com/Harxshz7/tempo-music.git
cd tempo-music
npm install
npx expo start
```

Then press `w` for web, `a` for Android emulator, `i` for iOS simulator — or scan the QR code with Expo Go on your phone.

On first launch, enter your server URL, username, and password to connect.

> **Note (SDK 57):** running in Expo Go now requires you to be signed in to the Expo CLI in your terminal **and** to the Expo Go app on your device — login on both ends is mandatory.

## Development Setup

Background audio and lock-screen controls require native modules that are **not available in Expo Go**. Basic playback and the entire UI work fine in Expo Go — you only need a dev client to test audio behavior:

```bash
# Local build (requires Android Studio / Xcode installed)
npx expo run:android          # Build & install on Android device/emulator
npx expo run:ios              # Build & install on iOS simulator/device

# Cloud build via EAS (no local toolchain needed)
npx eas build --platform android --profile development
npx eas build --platform ios --profile development
```

### Building for distribution

```bash
# Internal test build (Android APK — shareable directly)
npx eas build --platform android --profile preview

# Store release
npx eas build --platform all --profile production
```

### Scripts

```bash
npm run typecheck   # tsc --noEmit — CI runs this on every push/PR
npm run lint        # expo lint
```

## Project Structure

```
tempo-music/
├── App.tsx                    # Root: fonts, splash screen, session restore
├── src/
│   ├── api/subsonic.ts        # Subsonic REST client (token auth, all endpoints)
│   ├── store/                 # Zustand stores — auth + persisted player queue
│   ├── services/
│   │   ├── audioService.ts    # expo-audio playback engine (singleton)
│   │   ├── cacheService.ts    # disk cache for artwork
│   │   └── toast.ts           # global toast notifications
│   ├── hooks/                 # useAudioPlayer, useDebounce, useResponsive
│   ├── components/
│   │   ├── Navigation.tsx     # stack + tabs / desktop shell
│   │   ├── NeoPlayerBar.tsx   # docked mini player
│   │   └── ui/                # Neo-brutalist primitives (NeoButton, NeoCard, …)
│   ├── screens/               # Login, Library, Search, Player, detail screens
│   ├── navigation/            # DesktopSidebar (> 1024 px)
│   ├── types/                 # Subsonic API response types
│   └── utils/                 # haptics helper
├── docs/
│   ├── spike-expo-audio.md    # audio migration evaluation + device test matrices
│   └── screenshots/           # screenshot plan
└── .github/workflows/ci.yml   # typecheck on every push/PR
```

**Data flow:** screens call the `subsonic` API singleton → results map into `playerStore` (Zustand) → `useAudioPlayer` keeps the store and the `expo-audio` player in sync. Queue, playback position, and repeat/shuffle settings persist to AsyncStorage.

## Tech Stack

- **React Native 0.86** + **Expo SDK 57**
- **TypeScript** (strict mode)
- **NativeWind 4** — Tailwind CSS for React Native
- **Zustand 5** — state management with a persisted queue (AsyncStorage)
- **expo-audio** — playback, background audio, lock-screen / Now Playing metadata¹
- **expo-file-system** — disk caching for artwork
- **Subsonic REST API v1.16.1** — server communication (Navidrome, Airsonic, Ampache, Gonic, …)

## Security

Tempo talks directly to *your* server — there is no Tempo backend, no analytics, no telemetry, and your listening history never leaves your machine. That said, know how your credentials are handled:

- **Your password is never stored.** Login uses the Subsonic token scheme: each login generates a random salt and sends `MD5(password + salt)` as the token. Only the resulting server URL, username, token, and salt are saved — in device AsyncStorage.
- **Use HTTPS.** The saved token + salt pair is replayable: anyone who captures it can make API requests as you **until you change your password**. Over plain HTTP (including LAN traffic) capture is trivial; over HTTPS it's infeasible. If your server is HTTP-only on your LAN, be aware every stored credential pair stays valid indefinitely.
- **AsyncStorage is not encrypted at rest.** On a rooted/jailbroken or forensically examined device, the saved credentials can be extracted. Use a strong, unique server password to limit the blast radius.
- **Your server URL, username, and config are visible in Settings** — treat a shared/descended device accordingly, and use **Log Out** (Settings) to clear them.

## Known Limitations

- **Background audio and lock-screen controls require a custom dev client** — not available in Expo Go. Basic playback works in Expo Go.
- **Lock-screen / Now Playing behavior is implemented but not yet verified on physical devices.** The device test matrices in [docs/spike-expo-audio.md](docs/spike-expo-audio.md) are still empty — help testing is very welcome.
- **Web playback requires CORS on your server** — see [Troubleshooting](#troubleshooting) for the exact endpoints and fix.
- **Transitions aren't gapless** — the queue is managed in JavaScript; native gapless playback is on the [Roadmap](#roadmap).

## Troubleshooting

**"Could not reach server — check the URL"**
If your server is plain HTTP (typical for LAN Navidrome), enter the full address **including `http://`** — the app prepends `https://` when no protocol is given, which fails against HTTP-only servers.

**Login errors**

| Error | Meaning | Fix |
| --- | --- | --- |
| `error 40` | Wrong username or password | Re-check credentials |
| `error 41` | Server doesn't support token authentication | Server is too old — upgrade it |

**Android emulator can't reach my server**
`localhost` inside the emulator is the emulator itself. Use `http://10.0.2.2:<port>` to reach your development machine, or your machine's LAN IP.

**Artwork or streaming fails only on web (CORS)**
Your server must send CORS headers for `/rest/*` — at minimum `/rest/stream` and `/rest/getCoverArt`. Enable your server's CORS option (e.g. Navidrome's `EnableCORS = true`) or add the headers in your reverse proxy (nginx / Caddy / Traefik).

**No background audio / no lock screen controls**
You're running in Expo Go. Build a dev client — see [Development Setup](#development-setup).

## Roadmap

Help welcome on all items — please open an issue first:

- [ ] Physical-device verification of background audio & lock-screen controls (fill the matrices in [docs/spike-expo-audio.md](docs/spike-expo-audio.md))
- [ ] "Play Next" and "Add to Queue" actions from track menus (menus exist but are stubbed today)
- [ ] Gapless playback via `expo-audio`'s `useAudioPlaylist`
- [ ] Adding songs to playlists (rename / delete / remove-tracks already work)
- [ ] Extend disk caching to library grids (currently player-only)
- [ ] Drop the unused `expo-av` dependency to finish the `expo-audio` migration cleanup

## Contributing

Contributions are welcome! Please open an issue to discuss significant changes before submitting a PR.

Before submitting, make sure both pass locally:

```bash
npm run typecheck
npm run lint
```

CI runs the same checks on every push and PR. Keep new UI consistent with the existing Neo-brutalism design system — reuse the primitives in [`src/components/ui/`](src/components/ui/) rather than inventing new styles.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) — currently at **v0.1.0** (2026-09-21).

## License

MIT — see [LICENSE](./LICENSE).
