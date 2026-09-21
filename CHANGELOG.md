# Changelog

All notable changes to Tempo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-21

### Added
- Subsonic / Navidrome authentication with token and salt hashing.
- Music library browsing (Albums, Artists, Playlists).
- Fullscreen and docked Mini Player bar with playback controls.
- Neo-brutalist custom design system (`NeoButton`, `NeoCard`, `NeoInput`, `NeoPlayerBar`, `NeoSwitch`, `NeoToast`).
- Extracted `audioService` layer for audio playback management.
- Standardized UI color palette across desktop and mobile views.
- Automatic TypeScript type checking workflow in CI (`.github/workflows/ci.yml`).
