# Supe Pines Release Verification & Rollback Checklist

This document is the definitive guide to verifying and releasing Supe Pines. It ensures that any deployment is stable, that both hotseat and online multiplayer work correctly, and that a clear recovery plan is ready if anything goes wrong.

Use this checklist prior to merging into `main`, after major content or engine updates, or when modifying Firebase/Firestore settings.

---

## Phase 1: Automated Verification (Local & CI)

Run these checks in order from your local repository root. Ensure your node environment is set to version 22 or higher and python is set to 3.12 or higher.

### 1. Game Data Validation
Verify that card data modules, Case/Hero compatibility, tones, scene hooks, unique titles, Secrets, Signals, and Act Closes are structurally valid.
- **Command:** `node scripts/validate-data.mjs`
- **Expected Outcome:** Zero exit code. Prints success message with no collection-specific errors.

### 2. Art Manifest & Prompt Checks
Ensure that card-art prompts and manifest match the actual files.
- **Commands:**
  ```bash
  node scripts/gen-prompts.mjs --check
  node scripts/gen-manifest.mjs --check
  ```
- **Expected Outcome:** Both commands exit with status `0`, indicating that generated prompts and `manifest.json` are in-sync with current game data.

### 3. Card Art Launch Gate Verification
Verify the card art launch criteria (exactly 6 completed files: 5 Comic Ink Cases and 1 Interpretive Expressionist Case, or all 144 files in `--strict` mode).
- **Command:** `node scripts/check-art.mjs`
- **Expected Outcome:** Confirm that either the text fallback mechanism is safely functioning or that the launch/strict criteria are met. Exit code must be `0`.

### 4. Node Regression Tests
Run the zero-dependency Node.js unit tests (covering dossier exporting, persistence, saving/resuming, and data rules).
- **Command:** `node --test test/*.test.mjs`
- **Expected Outcome:** All tests pass with zero failures.

### 5. Playwright Browser Smoke Test
Run the automated end-to-end browser smoke test which verifies key player flows (Case picker, solo setup, resume, Gallery controls, live Dossier, scene resolution, online connection fallback, and responsive layout).
- **Commands:**
  ```bash
  # Ensure Playwright dependencies are installed
  python3 -m pip install playwright
  playwright install chromium

  # Run the smoke test
  python3 scripts/smoke.py
  ```
- **Expected Outcome:** local webserver starts, Playwright Chromium client completes all scenarios, and the script exits with code `0`.

---

## Phase 2: Deployment & Remote Setup Manual Checks

These checks cover hosting on GitHub Pages and manual Firebase configuration when online multiplayer is in scope.

### 1. GitHub Pages Deployment Verification
After pushing to `main`, monitor the GitHub Actions tab.
- [ ] Go to `https://github.com/<owner>/supe-pines/actions` and confirm the `pages-build-deployment` workflow succeeded.
- [ ] Open the live URL (e.g., `https://<username>.github.io/supe-pines/`).
- [ ] Inspect the page's source or developer console (`F12`) to verify no `404` or `500` errors exist for static assets.

### 2. Firebase Console Infrastructure Checks
If online multiplayer is in scope or has been modified, open the [Firebase Console](https://console.firebase.google.com/) and verify:

- **Anonymous Authentication:**
  - [ ] Navigate to **Build → Authentication → Sign-in method**.
  - [ ] Confirm **Anonymous** provider status is **Enabled**.

- **Firestore Security Rules:**
  - [ ] Navigate to **Build → Firestore Database → Rules**.
  - [ ] Verify the current published rules match the contents of `firestore.rules` in the repository root.
  - [ ] Ensure that read/write access to `/rooms/{roomCode}/private/{uid}` is strictly restricted as specified (read is owner-only: `request.auth.uid == uid`).

- **Authorized Domains:**
  - [ ] Navigate to **Build → Authentication → Settings → Authorized domains**.
  - [ ] Verify that your deployed GitHub Pages domain (e.g., `<username>.github.io`) is listed. Without this, anonymous login will fail silently in production.

- **Firestore Room Expiry (TTL):**
  - [ ] Navigate to **Build → Firestore Database → Settings** (or the **TTL** tab, depending on the console layout).
  - [ ] Verify there is a TTL policy set on the `rooms` collection for the `expireAt` field to automatically clean up old, abandoned sessions.

### 3. Two-Client Remote Multiplayer Test
Verify real-time synchronization and privacy boundaries across two independent sessions:

- [ ] **Step 3.1: Open Client A**
  - Open a browser window in Normal mode to `https://<username>.github.io/supe-pines/`.
  - Click **Play Online** (or **Host Online Room**).
  - Verify Client A successfully connects, authenticates anonymously, and is assigned a unique Room Code (e.g., `SP-XXXX`).

- [ ] **Step 3.2: Open Client B**
  - Open a separate browser window in **Private/Incognito** mode (to ensure a distinct localStorage and Firebase Auth session) to the same URL.
  - Enter the Room Code generated by Client A and click **Join Online Room**.
  - Verify Client B successfully joins and appears in the room lobby.

- [ ] **Step 3.3: Verify Real-Time Sync**
  - Progress the game from the lobby to the setup phase.
  - Verify that state transitions made on Client A (e.g., assigning a Hero, naming the Threat, choosing a Case) reflect instantly on Client B.

- [ ] **Step 3.4: Verify Fog-of-War / Privacy Boundaries**
  - Deal the player hands (including Buried Secrets/private hand cards).
  - Open the browser's developer console (`F12`) and inspect the Firestore state / DOM.
  - Verify Client A **cannot** inspect or read Client B's private hand or Buried Secret, and vice-versa. (Ensure no leakage of private state in public DOM nodes).

---

## Phase 3: Evidence Required for Signoff

A release is considered fully signed off and ready for production only when the following evidence is documented in the release issue or pull request:

1. **Local/CI Test Logs:**
   - Link to a successful GitHub Actions run verifying that all automated data checks and Playwright smoke tests passed.
   - *OR* Copy-paste output of the comprehensive local validation command chain:
     ```bash
     node scripts/validate-data.mjs && node scripts/gen-prompts.mjs --check && node scripts/gen-manifest.mjs --check && node --test test/*.test.mjs && node scripts/check-art.mjs
     ```

2. **Console Verification Screenshot/Confirmation:**
   - A screenshot or explicit confirmation text that the production browser developer console (`F12`) shows `0` errors (no failed Firebase initialization, no missing asset 404s, and successful connection status).

3. **Multiplayer Sync Confirmation:**
   - Explicit confirmation that the two-client remote test (Phase 2, Step 3) was completed successfully, indicating state-sync latencies are sub-second and privacy boundaries are intact.

---

## Phase 4: Rollback & Containment Paths

If a release introduces severe bugs, data corruption, or exposes security vulnerabilities, execute the appropriate response path immediately.

### Path A: Static Deployment Rollback (GitHub Pages)
If a bad UI code change or corrupted asset manifest is published to GitHub Pages:

1. **Identify the Last Known Stable Commit:**
   - Find the SHA of the last working commit on the `main` branch.
2. **Revert or Force-Rollback:**
   - **Option A (Safe/Traceable):** Create a revert commit on your local branch and push:
     ```bash
     git revert <bad_commit_sha>
     git push origin main
     ```
   - **Option B (Immediate Force Rollback):** If direct branch management is allowed, force-push the stable commit to `main`:
     ```bash
     git checkout main
     git reset --hard <stable_commit_sha>
     git push origin main --force
     ```
3. **Monitor Redeployment:**
   - Navigate to the GitHub Repository Actions tab.
   - Confirm the rollback commit triggers the `pages-build-deployment` workflow and completes successfully.
   - Clear your browser cache and refresh the deployment site to confirm the app has restored to the stable state.

### Path B: Bad Firebase Rules Release Emergency Containment
If a Firestore security rules release exposes the database or contains a vulnerability that leaks player hands/secrets:

1. **Initiate Immediate Lockdown:**
   - Open the [Firebase Console](https://console.firebase.google.com/).
   - Navigate to **Build → Firestore Database → Rules**.
   - Overwrite the active rules with the following **Lockdown Ruleset** to completely block all external reads and writes:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if false;
         }
       }
     }
     ```
   - Click **Publish**. This takes effect globally within seconds and completely isolates the database from abuse while you diagnose the issue.

2. **Restore Stable Rules:**
   - Locate the historical stable rules (either from the `firestore.rules` file in git history or using the Firebase Console **Rules History** tab).
   - Paste the verified rules back into the console editor.
   - Click **Publish** to safely resume multiplayer operations.
