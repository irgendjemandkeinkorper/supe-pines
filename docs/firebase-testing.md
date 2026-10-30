# Firebase isolated testing

Supe Pines uses the Firebase Emulator Suite for pull-request rules and remote
integration checks. It uses the reserved `demo-supe-pines` project ID from
[`.firebaserc`](../.firebaserc), so emulator tests cannot address the
production `supe-pine` project by accident.

## Prerequisites

- Node.js 22 (the repository's CI version)
- Java 11 or newer for the Firestore emulator
- npm

The first setup from a clean checkout is:

```bash
npm ci
```

No Firebase console account, API key, service-account file, or production
environment variable is required.

## Run the rules tests

Start the emulator, run the tests, and tear it down automatically:

```bash
npx firebase emulators:exec --only firestore "npm run test:rules"
```

The command loads `firestore.rules`, clears the emulator between tests, and
exits nonzero on a rules regression. It covers unauthenticated access, room
creation, the lobby join update, non-seated mutation rejection, owner-only
private reads, and the intentional seated-participant write trust model.

For an interactive local session, use two terminals:

```bash
npx firebase emulators:start --only firestore
npm run test:rules
```

The emulator UI is available at `http://127.0.0.1:4000`. Stop the process with
Ctrl-C; emulator data is local and disposable. Never point these tests at a
production project or add a production credential to CI.

## Production boundary

The emulator validates the checked-in rules contract only. It does not prove
that Anonymous Auth, authorized domains, TTL, deployed rules, or two-client
production synchronization are configured. Those remain manual release gates
tracked in [`CHANGELOG.md`](../CHANGELOG.md) and
[`docs/release-checklist.md`](release-checklist.md).

## Sync-layer unit tests (no emulator)

`test/live-sync.test.mjs` covers `js/sync/liveRoom.js` and
`js/sync/liveActions.js` directly: room create/join/reconnect, dealing,
scene start/contribute/resolve, scene forfeiture, Buried Secret claim and
reveal, and the idempotent act-close advance.

Mocking approach: `test/loader.mjs` is a Node module-resolution hook that
redirects every pinned `https://www.gstatic.com/firebasejs/...` import to
`test/fakes/firebase.mjs`, an in-memory Firestore/Auth stand-in. Its
transactions buffer writes and apply them only when the callback resolves,
and it rejects reads of another uid's `rooms/{code}/private/{uid}` doc, so
the tests also prove the sync layer never depends on reading another
player's private data. Tests switch the acting player with `__signInAs(uid)`.

These run in the normal `node --test test/*.test.mjs` pass with no network,
credentials, or Java. CI cost: about 0.15s. They complement, not replace, the
emulator suite above, which is the source of truth for `firestore.rules`.
