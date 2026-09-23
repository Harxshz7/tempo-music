# Contributing to Tempo Music

Thank you for your interest in contributing to **Tempo Music**! This document provides technical setup instructions, development workflows, coding standards, and troubleshooting guides for developers joining the project.

---

## 🏗️ Architecture & Overview

Before writing code, please review the architecture documentation in [`working.md`](file:///c:/Users/harxs/OneDrive/Desktop/tempo-music/working.md). It covers core systems, Subsonic API integration, state management with Zustand, audio engine lifecycle, and concrete data flows.

---

## 🚀 Dev Environment Setup

### Prerequisites
* **Node.js**: v18.x or v20.x LTS
* **Package Manager**: `npm` (v9+)
* **Expo CLI**: Integrated in Expo SDK 57 (`npx expo`)
* **iOS / Android Emulators** or a physical device with Expo Go / Custom Dev Client

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
   * Press `i` to open iOS Simulator.
   * Press `a` to open Android Emulator.
   * Press `w` to launch Web preview.

> **Note on Custom Dev Client**: Because Tempo uses Expo SDK 57 `expo-audio` for background playback and native audio APIs, full native audio testing on physical devices requires an Expo Custom Dev Client build (`npx expo run:android` or `npx expo run:ios`).

---

## 🧪 Testing & Verification

Always verify your changes before opening a pull request.

* **Run Unit Tests**:
  ```bash
  npm test
  ```
  Runs Jest unit tests for the Subsonic API client, Zustand state stores, and utility modules.

* **Run Type Check**:
  ```bash
  npm run typecheck
  ```
  Runs TypeScript type checking without emitting files.

* **Run Linter**:
  ```bash
  npm run lint
  ```

---

## 🌿 Branching & PR Conventions

* **Branch Naming**:
  * `feature/feature-name` (e.g. `feature/equalizer-preset-ui`)
  * `fix/bug-description` (e.g. `fix/queue-index-out-of-bounds`)
  * `docs/topic-name` (e.g. `docs/troubleshooting-cors`)
* **Commit Messages**:
  * Follow conventional commits (e.g. `feat: add playlist reorder modal`, `fix: handle 401 auth token expiration`).
* **PR Process**:
  1. Ensure `npm test` and `npm run typecheck` pass with zero errors.
  2. Provide a clear summary of changes and visual screenshots/recordings for UI modifications.

---

## 🎨 Code Style & Design System

* **Styling**: NativeWind v4 (TailwindCSS) utility classes.
* **Aesthetic**: **Neo-Brutalism**. Use components from [`src/components/ui/`](file:///c:/Users/harxs/OneDrive/Desktop/tempo-music/src/components/ui) (`NeoButton`, `NeoCard`, `NeoInput`, `NeoBadge`, `HardShadow`).
  * High-contrast black borders (`border-2 border-black` / `border-4 border-black`).
  * Hard offset drop shadows (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`).
  * Palette: Cream `#FFFDF5` background, Yellow `#FFE600`, Coral `#FF6B6B`, Violet `#9D4EDD`.
  * Typography: Always use `SpaceGrotesk` font family via `NeoText`.
* **Accessibility**: Always include `accessibilityRole`, `accessibilityLabel`, and `accessibilityHint` on custom interactive components and icons.

---

## 🔧 Troubleshooting Guide

### 1. CORS Errors on Self-Hosted Subsonic Servers (Web)
* **Symptom**: Network requests to `http(s)://your-server.com/rest/*` fail with CORS policy errors when testing on web (`npm run web`).
* **Fix**: Configure your Subsonic/Navidrome server proxy (Nginx, Caddy, Traefik) to add CORS header `Access-Control-Allow-Origin: *` or test on native iOS/Android targets where browser CORS policies do not apply.

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

Build profiles are defined in [`eas.json`](file:///c:/Users/harxs/OneDrive/Desktop/tempo-music/eas.json). See the EAS Build documentation for trigger details.
