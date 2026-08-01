# Supe Pines

A superhero re-imagining of the tabletop story game *Tall Pines* (design by Miles
Gaborit) — by way of its sibling project, [Bleakwood Vale](https://github.com/irgendjemandkeinkorper/bleakwood-vale),
a gothic murder-mystery re-skin of the same engine. Supe Pines is a one-session,
card-driven story game for 1–6 players about street-level superheroes — mystery
men and women, Daredevil/Jessica Jones/Defenders tier, not global-power heroics —
each carrying a limiting trauma or flaw that the case's Threat is built to exploit.
Runs entirely in the browser.

**Play the current public build:**
[irgendjemandkeinkorper.github.io/supe-pines](https://irgendjemandkeinkorper.github.io/supe-pines/)

## Status

Hotseat (one browser tab, shared screen) and the real-time remote multiplayer
code are ready on the public page. Remote rooms use Firebase/Firestore for room
codes and per-player privacy; the remaining Firebase work is enabling Anonymous
Auth, publishing the included rules, and authorizing the GitHub Pages domain.
See "Firebase setup" below.

The table UI includes a ready-to-lead turn board, full-card hand drawers, and a
three-slot scene tracker that keeps the opening card, buy-ins, lead Hero, and
live tone sources visible through resolution.

The content roster now keeps the full eight-Case story spine while staying
short enough for a single sitting:

| | Supe Pines | (Bleakwood Vale, for reference) |
|---|---|---|
| Tones | 3 (Fury, Guilt, Dread) | 3 |
| Cases | 8 | 12 |
| Heroes | 12 (6 dealt per game) | 16 (6 dealt per game) |
| Setup questions | 96 (every Hero × every Case) | 192 |
| Scene cards | 48/act (144 total) | 61/act (183 total) |
| Signals | 32 | 44 |
| Secrets | 10 (mathematically exhaustive over 3 tones — can't be fewer) | 10 |
| Act Closes | 6 (2/act) | 9 |

Every Case owns two scenes in each act, layered over the shared scene deck.
Adding a future Case remains additive: it needs one setup question per Hero,
two scene prompts per act, and matching prompt/manifest entries.

## Running it locally

No build step. Serve the folder over HTTP (ES modules don't load from
`file://`) and open `index.html`:

```
python3 -m http.server 8080
# then visit http://localhost:8080/
```

## Project layout

```
index.html         screen markup, loads js/main.js as an ES module
css/style.css       all styling — a noir comic-book identity (halftone
                    texture, rooftop skyline, Bangers/Work Sans type,
                    hard-edged "comic panel" cards)
js/data/            card content: tones, cases, heroes, scenes, signals,
                    secrets, act closes, epilogue
js/engine/          state shape, pure rules helpers (tone counting, secret
                    matching, etc.)
js/ui/              screen rendering + the mutation functions triggered by
                    inline onclick handlers
js/ui/gallery.js     the in-app card-art Gallery (title screen + topbar)
js/chronicle/       Markdown export of the finished/in-progress Dossier
scripts/            zero-dependency data validation plus deterministic card-art
                    prompt and manifest generation
test/               zero-dependency Node regression tests
generate.py         optional Gemini image generation from manifest.json
```

`js/main.js` is the only file that reaches into `window` — it's the bridge
between ES module scoping and the inline `onclick="fn(...)"` attributes in
`index.html`. Everything else is normal module imports/exports.

### Terminology, if you're comparing against Bleakwood Vale's code

| Bleakwood Vale | Supe Pines |
|---|---|
| Hook / "Incident" | Case (`js/data/cases.js`, `CASES`) |
| Victim | Threat (`G.threat`, named at the end of setup instead of a victim) |
| Archetype | Hero (`js/data/heroes.js`, `HEROES`, `heroCard()`) |
| Omen | Signal (`js/data/signals.js`, `SIGNALS`, `signalCard()`) |
| "Hidden Sin" | "Buried Secret" (display label only — `secrets.js`/`SECRETS` unchanged) |
| Obsession / Guilt / Dread | Fury / Guilt / Dread |
| Chronicle / "The Record" | "The Dossier" (display label only — `js/chronicle/` internals unchanged) |

A handful of internal function/variable names (e.g. `archIdx`, `renderArchSetup`,
`chooseCase`) intentionally still carry the old naming underneath current UI
copy — renamed data/state fields and all player-facing text is what actually
matters for coherence; renaming every internal identifier to match added risk
without benefit and was deliberately skipped.

## Firebase setup (for remote multiplayer)

Remote multiplayer syncs game state through Firestore. These steps are
one-time, manual, and can't be done on your behalf — an AI agent can't create
cloud accounts for you. Supe Pines needs its **own** Firebase project — it must
not reuse Bleakwood Vale's, since Firestore has no per-game partitioning and
reusing a project would mix the two games' rooms together.

1. Open your `supe-pine` project in the [Firebase console](https://console.firebase.google.com).
2. Register a **Web app** (the `</>` icon on the project overview page) if you
   have not already — give
   it a nickname, skip "also set up Firebase Hosting" (this project uses
   GitHub Pages instead). Copy the `firebaseConfig` object it shows you into
   `js/sync/config.js`, replacing the `"REPLACE_ME"` placeholders — this file
   is safe to commit: it's a client identifier, not a secret. Access control
   lives entirely in `firestore.rules`, not in hiding this key.
   Do not use a service-account JSON file here; that would be a private server
   credential and must never ship in this static app.
3. **Build → Authentication → Sign-in method** → enable **Anonymous**.
4. **Build → Firestore Database → Create database** → choose **production
   mode** (not test mode — we ship our own rules instead of relying on the
   default 30-day-open test mode).
5. Open the **Rules** tab in Firestore, paste in the contents of
   `firestore.rules` from this repo, and **Publish**.
6. Optional but recommended: **Firestore → collection → TTL policies** → add
   a policy on the `expireAt` field for the `rooms` collection, so old/
   abandoned game rooms get cleaned up automatically without any code.
7. **Easy to miss:** under **Authentication → Settings → Authorized
   domains**, add your GitHub Pages domain (e.g. `<your-username>.github.io`).
   Anonymous sign-in works fine on `localhost` during development without
   this, which can mask the fact that it's silently blocked once deployed —
   don't skip this step.

The Web App config is now committed in `js/sync/config.js`. Hotseat play is
completely unaffected by any remaining Firebase console setup.

## Resume and verification

Local hotseat games autosave committed transitions in a versioned
`sp:save:v1` browser snapshot. Reloading the page exposes an explicit **Resume
saved Case** button; choosing a new Case clears the old snapshot. Online rooms
remain Firestore-authoritative and are never copied into local storage.

Run the zero-dependency checks before changing card data or engine rules:

```
node scripts/validate-data.mjs
node scripts/gen-prompts.mjs --check
node scripts/gen-manifest.mjs --check
node --test test/*.test.mjs
node scripts/check-art.mjs
```

The browser smoke suite uses Playwright as a development-only dependency. It
starts a local static server and covers the eight-Case picker, solo setup,
resume, two-sided Gallery controls, in-progress Dossier, first scene and
resolution, online fallback, and narrow-screen layout:

```
python3 -m pip install playwright
playwright install chromium
python3 scripts/smoke.py
```

GitHub Actions runs the same data and browser checks on pull requests and
`main`; the production site remains a dependency-free static GitHub Pages
build.

The visual and copy rules live in [`docs/design-bible.md`](docs/design-bible.md).

## Card art

The application's manifest defines 144 image slots, but the game is designed to gracefully degrade to beautifully styled text-only cards whenever an image is absent. **This text fallback is an accepted, intentional, and fully supported launch state.** This ensures the game remains completely readable, accessible, and playable even with partial art coverage.

### Numeric Launch Target
For the launch build, the agreed target of completed, shipped art is exactly **6/144** files, categorized as follows:

| Category | Visual Style | Launch Target | Shipped Files | Status |
|---|---|---|---|---|
| **Cases** | Comic Ink | 5 / 8 | `afterhours`, `casting`, `lastcall`, `renovation`, `toll` | Shipped |
| **Cases** | Interpretive Expressionist | 1 / 8 | `afterhours` | Shipped |
| **Heroes** | All Styles | 0 / 24 | None | Deferred |
| **Signals** | All Styles | 0 / 64 | None | Deferred |
| **Threats** | All Styles | 0 / 16 | None | Deferred |

The `scripts/check-art.mjs` script acts as our CI/CD gate. It strictly enforces that these 6 required assets are present and correct before any commit can be merged.

### Deferred Post-Launch Art Packs
The rest of the manifest's image slots represent a deferred pipeline of future art expansion packs. These will be generated and shipped in waves post-launch:
1. **Case Expansion Pack (Ink & Expressionist):** Completing the remaining 3 Cases in Comic Ink (`deadair`, `lastroute`, `openhouse`) and 7 Cases in Interpretive Expressionist.
2. **The Heroes Pack:** Authoring and shipping 24 card faces (front and turned sides for 12 heroes) in both Comic Ink and Interpretive Expressionist styles.
3. **The Signals Pack:** 64 total illustrations (32 unique signals in both styles).
4. **The Threats Pack:** 16 total illustrations (8 unique threats in both styles).

The Gallery supports the full image set at
`art/images/<style>/<category>/<slug>.<ext>` (`style` is `ink` or `expressionist`;
`category` is `heroes`, `cases`, `signals`, or `threats`) and falls back to
intentional text cards whenever an image is absent. Each Hero appears as one
two-sided card with an explicit Side I/Side II control; the caption and flip
condition follow the face being shown.

The Bleakwood Vale manifest pipeline is now fully adapted for Supe Pines. It
contains hand-authored art direction for all 12 Heroes (both sides), 8 Cases,
32 Signals, and 8 obscured Threats in two visual styles — 144 image slots
total. Comic Ink is the hard-edged street-level language; Interpretive
Expressionist is symbolic, painterly trading-card art that makes a Hero's
shortcoming, compromise, or downfall visible in the neighborhood. Prompt coverage and manifest generation can be
checked without Python,
credentials, or an API call:

```
node scripts/gen-prompts.mjs --check
node scripts/gen-manifest.mjs --check
node scripts/gen-prompts.mjs                 # writes art/IMAGE_PROMPTS.md
node scripts/gen-manifest.mjs --no-vault     # writes manifest.json
```

To generate images, create a virtual environment, install the pinned local
requirements, set `GOOGLE_API_KEY` in an untracked `.env`, then dry-run a small
selection before making paid calls:

```
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python generate.py --dry-run --category cases --style expressionist --limit 2
.venv/bin/python generate.py --category cases --style expressionist --limit 2 --no-write-back
```

The default manifest records the public Pages URLs and the generator can write
them back into a sibling `../supe-pines-vault`. Use `--no-write-back` when no
vault is wanted; the companion [Supe Pines Obsidian vault](https://github.com/irgendjemandkeinkorper/supe-pines-vault)
keeps the generated notes, templates, and entity index in a separate repo. Use
`--help` on any of the three tools for all options.

## Validating game content

Run the zero-dependency validator whenever a card data module changes:

```
node scripts/validate-data.mjs
```

It checks Case/Hero compatibility, tones, scene hooks, unique titles, Secrets,
Signals, and Act Close shape, and exits nonzero with collection-specific errors.

## Deploying to GitHub Pages

This repository is served directly from `main` at the public-build link above
(Settings → Pages → Deploy from a branch → `main` → `/ (root)`). No build step
is required; `.nojekyll` keeps the static tree untouched.
