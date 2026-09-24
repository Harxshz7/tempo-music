# Maintainer Guide for Tempo Music

This document outlines the maintainer workflow, expectations, release process, and succession guidelines for **Tempo Music**. It serves as an operating manual for current and future co-maintainers.

---

## 🧭 Maintenance Philosophy

Tempo is an independent, community-driven open-source project. Our goals are:
1. **Stability over velocity**: Changes to the core audio engine (`expo-audio`) and Subsonic API communication must be rock-solid.
2. **Design integrity**: Maintain the bold, uncompromising Neo-Brutalist design language.
3. **Sustainable maintenance**: Protect maintainer energy. Maintenance is conducted on a **best-effort basis**. We do not promise instantaneous turnarounds.

---

## ⏱️ Response-Time Expectations

- **Issue Triage**: Best effort, typically within **3–7 business days**.
- **Pull Request Review**: Best effort, typically within **1–2 weeks**.
- **Urgent Fixes (Auth / Crash regressions)**: Prioritized as bandwidth allows.
- If a review takes longer than 2 weeks, pinging the PR politely is completely acceptable.

---

## 📥 Triage & Review Workflow

### Issue Triage
1. Apply the appropriate label (`bug`, `enhancement`, `question`, `needs-triage`).
2. If an issue is clear and suitable for external contributors, tag it `help-wanted` or `good-first-issue`.
3. If an issue lacks reproduction details or logs, request them and leave `needs-triage`. Close stale issues after 30 days of inactivity.

### PR Review Checklist
Before merging any PR, ensure:
- [ ] **CI passes**: `npm run typecheck`, `npm test`, and `npm run lint` all pass green.
- [ ] **Clean scope**: The PR addresses one concern. Scope creep should be redirected to follow-up PRs.
- [ ] **Visual verification**: Any UI changes must include screenshots or recordings in the PR description.
- [ ] **No regression in core services**: If `audioService.ts` or `subsonic.ts` were touched, verify playback against a real server or dev client.
- [ ] **Commit style**: Clean commit history or squash-merge with conventional commit message (`feat: ...`, `fix: ...`).

---

## 🚀 How Releases are Cut

Tempo follows [Semantic Versioning](https://semver.org/):

1. **Check main branch health**:
   Ensure CI is passing and all target PRs are merged.
2. **Bump version**:
   - Update `"version"` in `package.json` (e.g. `0.2.0` -> `0.3.0`).
   - Update `"expo.version"` in `app.json`.
3. **Update CHANGELOG.md**:
   - Move items from `[Unreleased]` into the new version header with today's date.
4. **Tag & Release on GitHub**:
   - Create a git tag: `vX.Y.Z` (e.g. `git tag -a v0.2.0 -m "Release v0.2.0"`).
   - Push tag and draft GitHub Release with changelog highlights.
5. **Trigger EAS Builds** (if distributing binaries):
   ```bash
   # Android preview APK
   npx eas build --platform android --profile preview

   # Production stores
   npx eas build --platform all --profile production
   ```

---

## 👥 Co-Maintainer Criteria & Succession

Tempo is actively seeking to expand maintainership into a small, trusted team. 

### Criteria for Inviting a Co-Maintainer:
1. **Sustained Quality Contributions**: Has submitted 3+ meaningful PRs (features, bug fixes, or test enhancements) that demonstrate thorough self-testing and clean code.
2. **Deep Domain Understanding**: Understands either:
   - The native audio engine (`expo-audio`, background audio, notification controls), OR
   - The Subsonic API protocol & offline sync architecture, OR
   - React Native performance & the Neo-Brutalist design tokens.
3. **Empathetic Communication**: Treats users and fellow contributors with patience and respect in issue discussions and code reviews.
4. **Reliability**: Consistently follows through on open PRs and issues without ghosting.

### Onboarding a New Co-Maintainer:
1. Discuss expectations privately.
2. Add to repository with `Triage` or `Write` permissions on GitHub.
3. Add to `.github/CODEOWNERS` for review notifications.
4. Introduce them in the README and GitHub community discussions.
