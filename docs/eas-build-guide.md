# EAS Build & Release Deployment Guide

This document details how to trigger and manage builds for Tempo Music using **Expo Application Services (EAS Build)** for internal testing and store distribution.

---

## 📋 Build Profiles Overview ([`eas.json`](file:///c:/Users/harxs/OneDrive/Desktop/tempo-music/eas.json))

| Profile | Target Audience | Distribution | Output Format | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `development` | Core Developers | Internal | `.apk` (Android) / Ad-hoc `.ipa` | Testing with custom dev client |
| `development-simulator` | iOS Developers | Internal | iOS Simulator build | Fast local simulator testing |
| `preview` | QA / Beta Testers | Internal | Standalone `.apk` / TestFlight | Internal pre-release validation |
| `production` | App Stores | Store Distribution | `.aab` (Android) / Signed `.ipa` | Play Store & App Store submission |

---

## 🛠️ Step-by-Step Build Triggers

### 1. Prerequisites
Ensure EAS CLI is installed and logged in:
```bash
npm install -g eas-cli
eas login
eas project:init
```

---

### 🍏 iOS TestFlight Internal Build

To generate an iOS build and submit it to Apple TestFlight:

1. **Trigger Production/Preview EAS Build**:
   ```bash
   npx eas build --platform ios --profile production
   ```
2. **Submit to TestFlight**:
   * **Automatic Submission**:
     ```bash
     npx eas submit --platform ios --profile production
     ```
   * **Manual Submission**: Download the `.ipa` artifact from the Expo dashboard and upload via Transporter app or App Store Connect.

---

### 🤖 Android Play Store Internal Testing Build

To generate an Android App Bundle (`.aab`) and submit it to Google Play Console Internal Testing:

1. **Trigger Production EAS Build**:
   ```bash
   npx eas build --platform android --profile production
   ```
   * Output: Android App Bundle (`.aab`) with auto-incremented `versionCode`.

2. **Submit to Google Play Console Internal Track**:
   * **Automatic Submission**:
     ```bash
     npx eas submit --platform android --profile production
     ```
   * **Manual Submission**: Upload the `.aab` file to Google Play Console under **Testing -> Internal testing**.

---

## ⚡ Standalone APK for Fast Android Installation

For testing on physical Android devices without uploading to Google Play Console:

```bash
npx eas build --platform android --profile preview
```
* Generates a direct download `.apk` link that testers can install directly on their devices.
