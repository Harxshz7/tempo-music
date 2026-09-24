# Contributing to Tempo Music

Thank you for your interest in contributing to **Tempo Music**! This document provides technical setup instructions, development workflows, coding standards, and troubleshooting guides for developers joining the project.

---

## 🏗️ Architecture & Overview

Before writing code, please review the architecture documentation in [`working.md`](./working.md). It covers core systems, Subsonic API integration, state management with Zustand, audio engine lifecycle, and concrete data flows.

---

## 🚀 Dev Environment Setup

### Prerequisites
* **Node.js**: `v20.x` or `v22.x` LTS (Expo SDK 57 / React 19 minimum)
* **Package Manager**: `npm` (v9+)
* **Expo CLI**: Integrated in Expo SDK 57 (`npx expo`)
* **iOS / Android Emulators** or a physical device with Expo Go / Custom Dev Client
* *(Optional)* **Docker**: If you do not already host a Subsonic/Navidrome server, running one locally with Docker takes under 60 seconds (see [Testing with a Local Server](#-testing-with-a-local-subsonic-server)).

### Step-by-step Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Harxshz7/tempo-music.git
   cd tempo-music
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```
   * Press `w` to launch Web preview in your browser (fastest way to inspect UI).
   * Press `i` to open iOS Simulator (macOS with Xcode).
   * Press `a` to open Android Emulator (Android Studio).
   * Scan the terminal QR code with the **Expo Go** app on your phone.

> **Note on Custom Dev Client vs Expo Go**: Basic playback, the entire UI, search, and library management work in Expo Go or Web. However, background playback and native lock-screen metadata rely on `expo-audio` native capabilities and require a Custom Dev Client build (`npx expo run:android` or `npx expo run:ios`).

---

## 🎧 Testing with a Local Subsonic Server

Tempo connects to any Subsonic-compatible server (API v1.16.1). If you don't already have one running, you can spin up a lightweight [Navidrome](https://www.navidrome.org/) container in one command:

```bash
# Run Navidrome on localhost:4533
docker run -d \
  --name tempo-navidrome \
  -p 4533:4533 \
  -v /path/to/your/music:/music:ro \
  -v navidrome-data:/data \
  deluan/navidrome:latest
```

1. Navigate to `http://localhost:4533` in your browser and create an admin user/password.
2. In Tempo:
   - **Web / iOS Simulator**: Server URL = `http://localhost:4533`
   - **Android Emulator**: Server URL = `http://10.0.2.2:4533` (Android emulator alias for host localhost)
   - **Physical Device**: Server URL = `http://<your-lan-ip>:4533`

---

## 🧪 Testing & Verification

Always verify your changes before opening a pull request. CI runs these checks automatically on all PRs:

* **Run Type Check**:
  ```bash
  npm run typecheck
  ```
  Runs TypeScript compiler (`tsc --noEmit`) in strict mode. Must pass with zero errors.

* **Run Unit Tests**:
  ```bash
  npm test
  ```
  Runs Jest unit tests for the Subsonic API client, Zustand state stores, and utility modules.

* **Run Linter**:
  ```bash
  npm run lint
  ```
  Runs ESLint rules tailored for Expo SDK 57 and React Native.

---

## 🌿 Branching & PR Conventions

* **Branch Naming**:
  * `feature/feature-name` (e.g. `feature/equalizer-preset-ui`)
  * `fix/bug-description` (e.g. `fix/queue-index-out-of-bounds`)
  * `docs/topic-name` (e.g. `docs/troubleshooting-cors`)
* **Commit Messages**:
  * Follow conventional commits (e.g. `feat: add playlist reorder modal`, `fix: handle 401 auth token expiration`).
* **Pull Request Checklist**:
  1. Ensure `npm run typecheck`, `npm test`, and `npm run lint` pass with zero errors.
  2. For visual/UI changes, attach screenshots or screen recordings (mobile and desktop widths).
  3. Reference any related issues (e.g. `Fixes #42`).
  4. Follow the PR template at `.github/PULL_REQUEST_TEMPLATE.md`.

---

## 🎨 Code Style & Design System

* **Styling**: NativeWind v4 (TailwindCSS) utility classes.
* **Aesthetic**: **Neo-Brutalism**. Use components from [`src/components/ui/`](./src/components/ui) (`NeoButton`, `NeoCard`, `NeoInput`, `NeoBadge`, `HardShadow`).
  * High-contrast black borders (`border-2 border-black` / `border-4 border-black`).
  * Hard offset drop shadows (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`).
  * Palette: Cream `#FFFDF5` background, Yellow `#FFE600`, Coral `#FF6B6B`, Violet `#9D4EDD`.
  * Typography: Always use `SpaceGrotesk` font family via `NeoText`.
* **Accessibility**: Always include `accessibilityRole`, `accessibilityLabel`, and `accessibilityHint` on custom interactive components and icons.

---

## 🏷️ Issue & Label Taxonomy

When contributing or triaging, Tempo uses the following labels:
* `good-first-issue`: Well-scoped tasks with clear context, ideal for first-time contributors.
* `help-wanted`: Features, bug fixes, or hardware verifications where community contribution is actively needed.
* `bug`: Confirmed bugs or regressions reproducible against a Subsonic server.
* `enhancement`: Feature additions or improvements to existing functionality.
* `needs-triage`: Newly submitted issues awaiting verification, reproduction steps, or maintainer categorization.
* `audio`: Changes touching `audioService`, `notificationPlayer`, or background playback.
* `ui-ux`: Changes touching the neo-brutalist component system or navigation layouts.

---

## 🔧 Troubleshooting Guide

### 1. CORS Errors on Self-Hosted Subsonic Servers (Web)
* **Symptom**: Network requests to `http(s)://your-server.com/rest/*` fail with CORS policy errors when testing on web (`npm run web`).
* **Fix**: Configure your Subsonic/Navidrome server reverse proxy (Nginx, Caddy, Traefik) to add CORS header `Access-Control-Allow-Origin: *` or test on native iOS/Android targets where browser CORS policies do not apply.

### 2. Background Audio & Lockscreen Controls
* **Symptom**: Playback pauses when app is minimized or lock screen turns off.
* **Fix**: Ensure background audio category is enabled. On iOS, `UIBackgroundModes: ["audio"]` is enabled in `app.json`. On physical devices, build via `npx expo run:android` or `npx expo run:ios` to link native background audio capabilities.

### 3. Native Module Resolution Failures (`expo-audio`)
* **Symptom**: `Error: Cannot find native module 'ExpoAudio'` when running in Expo Go.
* **Fix**: Expo Go may not contain custom native modules from specific SDK builds. Generate a development build using EAS:
  ```bash
  npx eas build --profile development --platform android
  ```

---

## 🚀 Build Configurations

Build profiles are defined in [`eas.json`](./eas.json). See the EAS Build documentation for trigger details.
