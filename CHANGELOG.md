# Changelog

All notable project changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); release dates use
`YYYY-MM-DD`.

## [Unreleased]

### Added

- Reproducible Playwright smoke execution for Chromium and WebKit.
- CI caching for pip downloads and Playwright browser binaries.
- Dependabot coverage for pip, npm, and GitHub Actions dependencies.
- Isolated Firebase Emulator Suite configuration and Firestore rules tests.
- Release scorecard and evidence-log template.

### Firebase production readiness — manual owner action required

Status recorded 2026-08-03. No production-console completion is inferred by
CI or by an agent:

- Anonymous Authentication: **Not verified**.
- Firestore rules published from `firestore.rules`: **Not verified**.
- GitHub Pages domain authorized in Firebase Authentication: **Not verified**.
- Firestore `rooms.expireAt` TTL policy: **Not verified**.
- Two-client production privacy/synchronization check: **Not verified**.

Complete these items in the [release checklist](docs/release-checklist.md) and
add a dated entry here when the project owner has verified them.
