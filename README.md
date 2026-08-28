# Tempo Music

A free, open-source hybrid music app for iOS, Android, and Web, built with React Native + Expo. Stream your own library via any Subsonic/Navidrome-compatible server.

## Features

- Stream music from Subsonic/Navidrome-compatible servers
- Browse artists, albums, and playlists
- Full-text search across your library
- Token-based authentication (md5 password + salt)
- Cross-platform: iOS, Android, and Web

## Tech Stack

- **React Native + Expo** (SDK 57)
- **TypeScript**
- **Zustand** — lightweight state management
- **React Navigation** — native stack + bottom tabs
- **expo-av** — audio playback
- **Axios** — HTTP client
- **CryptoJS** — Subsonic token/salt authentication
- **AsyncStorage** — persist server credentials

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Subsonic-compatible server (Navidrome, Airsonic, etc.)

### Install

```bash
npm install
```

### Demo Login

If you don't have your own server yet, you can test the app using the public Navidrome demo:
- **Server URL:** `https://demo.navidrome.org`
- **Username:** `demo`
- **Password:** `demo`

### Start Development Server

We recommend starting the bundler and clearing the cache to avoid issues:
```bash
npx expo start -c
```

### Run (Web)

Press `w` in the terminal after starting the server, or run:
```bash
npm run web
```

### Run (Native)

Press `i` (iOS) or `a` (Android) in the terminal after starting the server, or run:
```bash
npm run ios
# or
npm run android
```

## Project Structure

```
src/
├── api/          # Subsonic REST API client
├── screens/      # App screens (Login, Library, Search, Playlists, Settings)
├── components/   # Reusable UI components
├── store/        # Zustand state management
├── hooks/        # Custom React hooks
├── utils/        # Utility functions
└── types/        # TypeScript type definitions
```

## API

The app communicates with any server implementing the [Subsonic REST API](http://www.subsonic.org/pages/api.jsp) v1.16.1:

- **Authentication**: Token-based (`md5(password + salt)`)
- **Transport**: HTTP(S) with JSON responses
- **Endpoints**: `ping`, `getArtists`, `getArtist`, `getAlbum`, `getAlbumList2`, `search3`, `getPlaylists`, `getPlaylist`, `getCoverArt`, `stream`

## License

MIT License

Copyright (c) 2026 Tempo Music Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
