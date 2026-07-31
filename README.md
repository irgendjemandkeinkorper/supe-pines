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

Hotseat (one browser tab, shared screen) is ready on the public page. The code
for real-time remote multiplayer via Firebase/Firestore (room codes and
per-player privacy) is also complete, but it needs a dedicated Firebase project
before the public page can open remote rooms. Until then the title screen labels
online play as setup-required and gives players a useful explanation instead of
letting a sign-in attempt fail. See "Firebase setup" below.

The table UI includes a ready-to-lead turn board, full-card hand drawers, and a
three-slot scene tracker that keeps the opening card, buy-ins, lead Hero, and
live tone sources visible through resolution.

**Content is a deliberately smaller starter set**, ported at the same structural
scale as Bleakwood Vale but with less total content, meant to be expanded over
time:

| | Supe Pines | (Bleakwood Vale, for reference) |
|---|---|---|
| Tones | 3 (Fury, Guilt, Dread) | 3 |
| Cases | 4 | 12 |
| Heroes | 12 (6 dealt per game) | 16 (6 dealt per game) |
| Setup questions | 48 (every Hero × every Case) | 192 |
| Scene cards | 40/act (120 total) | 61/act (183 total) |
| Signals | 32 | 44 |
| Secrets | 10 (mathematically exhaustive over 3 tones — can't be fewer) | 10 |
| Act Closes | 6 (2/act) | 9 |

Expanding any category later is additive — e.g. a 5th Case just needs one new
setup question per existing Hero (12 of them), not any code changes.

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

1. Go to the [Firebase console](https://console.firebase.google.com) → **Add
   project** → give it a name (e.g. `supe-pines`) → Analytics is optional,
   fine to skip.
2. Register a **Web app** (the `</>` icon on the project overview page) — give
   it a nickname, skip "also set up Firebase Hosting" (this project uses
   GitHub Pages instead). Copy the `firebaseConfig` object it shows you into
   `js/sync/config.js`, replacing the `"REPLACE_ME"` placeholders — this file
   is safe to commit: it's a client identifier, not a secret. Access control
   lives entirely in `firestore.rules`, not in hiding this key.
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

Until `js/sync/config.js` has real values, the public page marks online play as
setup-required. Hotseat play is completely unaffected either way.

## Card art

The launch build includes four matching Comic Ink Case covers, visible in the
Case picker and Gallery. The Gallery supports the full image set at
`art/images/<style>/<category>/<slug>.<ext>` (`style` is `ink` or `poster`;
`category` is `heroes`, `cases`, `signals`, or `threats`) and falls back to
intentional text cards whenever an image is absent. Each Hero appears as one
two-sided card with an explicit Side I/Side II control; the caption and flip
condition follow the face being shown.

The Bleakwood Vale manifest pipeline is now fully adapted for Supe Pines. It
contains hand-authored art direction for all 12 Heroes (both sides), 4 Cases,
32 Signals, and 4 obscured Threats in two noir-comic styles — 128 image slots
total. Prompt coverage and manifest generation can be checked without Python,
credentials, or an API call:

```
node scripts/gen-prompts.mjs --check
node scripts/gen-manifest.mjs --check
node scripts/gen-prompts.mjs                 # writes art/IMAGE_PROMPTS.md
node scripts/gen-manifest.mjs --no-vault     # writes manifest.json
```

To generate images, create a virtual environment, install `google-genai` and
`Pillow` (with `python-dotenv` optional for `.env` loading), set
`GOOGLE_API_KEY`, then dry-run a small selection before making paid calls:

```
python3 -m venv .venv
.venv/bin/pip install google-genai Pillow python-dotenv
.venv/bin/python generate.py --dry-run --category cases --style ink --limit 2
.venv/bin/python generate.py --category cases --style ink --limit 2 --no-write-back
```

The default manifest records the public Pages URLs and the generator can write
them back into a sibling `../supe-pines-vault`. Use `--no-write-back` when no
vault is wanted; use `--help` on any of the three tools for all options.

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
