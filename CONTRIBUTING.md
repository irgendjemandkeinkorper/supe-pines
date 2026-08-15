# Contributing to Supe Pines

Supe Pines is a dependency-light static game. Please keep production code
browser-native and run the documented checks before opening a pull request.

## Workflow

1. Pick or open an issue with a priority, dependencies, and testable acceptance
   criteria.
2. Use a branch named `jules-<issue-id>` for delegated work or
   `<short-slug>-<issue-id>` for other issue work.
3. Keep one logical change per pull request and link the issue in the PR body.
4. Run the local verification chain in the README, including Node tests and
   the Chromium smoke suite. Firebase rules tests use the disposable emulator
   described in [`docs/firebase-testing.md`](docs/firebase-testing.md).
5. PRs should leave `main` green; merge only after the required CI checks pass
   and the review conversation is resolved.

The repository's `jules` versus `Delegated-to-Jules` routing distinction is
documented in [`.github/labels.md`](.github/labels.md); use one label according
to that convention rather than adding another routing label.

For security reports, use the private process in [`SECURITY.md`](SECURITY.md).
