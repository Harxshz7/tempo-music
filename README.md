# Tempo

🎵 Your music, your server — an open-source Subsonic/Navidrome client for iOS, Android & Web.

<!-- [screenshot/banner image placeholder — add after screenshots are taken] -->

## About

Tempo is a free, open-source hybrid music app built with React Native + Expo. It streams your own music library through any Subsonic-compatible server (Navidrome, Airsonic, Ampache, Gonic, and others) — no ads, no subscriptions, no lock-in. Your music stays on your server; Tempo is just the player.

## Features

- Cross-platform: one codebase for iOS, Android, and Web
- Full library browsing: albums, artists, playlists
- Search across your entire library
- Background playback with lock-screen/notification controls (native)
- Persistent queue — resume where you left off after restart
- Distinctive Neo-brutalist UI — bold, high-contrast, unapologetically visible
- 100% open source, MIT licensed

## Screenshots

<!-- Add 3-4 screenshots here once available: Library, Player, Search, Login — arrange in a table or side-by-side via HTML img tags for README -->
> _Screenshots coming soon!_

## Requirements

- A running Subsonic-compatible music server (recommended: [Navidrome](https://www.navidrome.org/))
- Node.js 18+ and npm
- Expo CLI (`npx expo`)
- For native builds: Expo Go (quick testing) or a custom dev client (for background audio — see Known Limitations)

## Getting Started

```bash
git clone https://github.com/Harxshz7/tempo-music.git
cd tempo-music
npm install
npx expo start
```

Press `w` for web, `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go on your phone.

On first launch, enter your Subsonic/Navidrome server URL, username, and password to connect.

## Tech Stack

- React Native + Expo (SDK 57)
- TypeScript
- NativeWind (Tailwind CSS for React Native)
- Zustand (state management)
- expo-av (audio playback)
- Subsonic REST API (v1.16.1) for server communication

## Known Limitations

- Full background audio and lock-screen controls require a custom dev client (`npx expo run:android` / `npx expo run:ios`) — not available in Expo Go
- iOS lock-screen scrubbing/metadata is limited pending a possible future migration to `expo-audio`
- Web playback requires your Subsonic server to send proper CORS headers — see your server's reverse-proxy config if album art or streaming fails only on web

## Contributing

Contributions are welcome! Please open an issue to discuss significant changes before submitting a PR. Keep new UI consistent with the existing Neo-brutalism design system (see `/src/components/ui/` for primitives).

## License

MIT — see [LICENSE](./LICENSE) for details.
