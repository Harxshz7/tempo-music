# Changelog

All notable changes to Tempo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-23

### Added
- Comprehensive developer architecture documentation ([`working.md`](file:///c:/Users/harxs/OneDrive/Desktop/tempo-music/working.md)), contribution guidelines ([`CONTRIBUTING.md`](file:///c:/Users/harxs/OneDrive/Desktop/tempo-music/CONTRIBUTING.md)), and EAS deployment guide ([`docs/eas-build-guide.md`](file:///c:/Users/harxs/OneDrive/Desktop/tempo-music/docs/eas-build-guide.md)).
- Jest unit testing framework setup with `ts-jest` and `AsyncStorage` mocks.
- Subsonic API client unit test suite (`__tests__/subsonic.test.ts`) covering token hashing, server config persistence, query builders, and error handling.
- `usePlayerStore` unit test suite (`__tests__/playerStore.test.ts`) covering queue navigation, shuffle/repeat modes, item removal, and reordering logic.
- Accessibility attributes (`accessibilityRole`, `accessibilityLabel`, `accessibilityHint`) across `NeoButton` and `TrackRow` components.
- Configured EAS Build profiles in `eas.json` for `development`, `development-simulator`, `preview`, and `production` builds.

### Changed
- Added `scratch/` pattern to `.gitignore` to prevent tracking temporary developer scratch files.

### Removed
- Cleaned up unreferenced boilerplate asset files (`assets/android-icon-*.png`).

## [0.1.0] - 2026-09-21

### Added
- Subsonic / Navidrome authentication with token and salt hashing.
- Music library browsing (Albums, Artists, Playlists).
- Fullscreen and docked Mini Player bar with playback controls.
- Neo-brutalist custom design system (`NeoButton`, `NeoCard`, `NeoInput`, `NeoPlayerBar`, `NeoSwitch`, `NeoToast`).
- Extracted `audioService` layer for audio playback management.
- Standardized UI color palette across desktop and mobile views.
- Automatic TypeScript type checking workflow in CI (`.github/workflows/ci.yml`).
