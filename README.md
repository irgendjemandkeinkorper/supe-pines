# Supe Pines

A superhero re-imagining of the tabletop story game *Tall Pines* (design by Miles
Gaborit) — by way of its sibling project, [Bleakwood Vale](https://github.com/irgendjemandkeinkorper/bleakwood-vale),
a gothic murder-mystery re-skin of the same engine. Supe Pines is a one-session,
card-driven story game for 1–6 players about street-level superheroes — mystery
men and women, Daredevil/Jessica Jones/Defenders tier, not global-power heroics —
each carrying a limiting trauma or flaw that the case's Threat is built to exploit.
Runs entirely in the browser.

## Status

Hotseat (one browser tab, shared screen) and real-time remote multiplayer via
Firebase/Firestore (room codes, per-player privacy) both work — "Open the Case"
and "Play Online" on the title screen. Online multiplayer needs a Firebase
project of its own before it'll actually connect — see "Firebase setup" below.

**Content is a deliberately smaller starter set**, ported at the same structural
scale as Bleakwood Vale but with less total content, meant to be expanded over
time:

| | Supe Pines | (Bleakwood Vale, for reference) |
|---|---|---|
| Tones | 3 (Fury, Guilt, Dread) | 3 |
| Cases | 4 | 12 |
| Heroes | 8 (6 dealt per game) | 16 (6 dealt per game) |
| Setup questions | 32 (every Hero × every Case) | 192 |
| Scene cards | ~28/act (~84 total) | ~61/act (~183 total) |
| Signals | 16 | 44 |
| Secrets | 10 (mathematically exhaustive over 3 tones — can't be fewer) | 10 |
| Act Closes | 6 (2/act) | 6 |

Expanding any category later is additive — e.g. a 5th Case just needs one new
setup question per existing Hero (8 of them), not any code changes.

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

Until `js/sync/config.js` has real values, "Play Online" will fail to connect
— hotseat play is completely unaffected either way.

## Card art

Not generated yet, by design — Supe Pines shipped this pass with a deliberately
smaller content set and text-only cards, deferring art entirely. `js/ui/gallery.js`
(title screen + topbar "The Gallery") and every in-game card display already
support generated art at `art/images/<style>/<category>/<slug>.<ext>` (`style`
is `ink` or `poster`, `category` is `heroes`/`cases`/`signals`/`threats`) and
fall back to a plain text card when it doesn't exist — nothing needs to change
in the UI layer whenever art generation happens.

Bleakwood Vale's art pipeline (`generate.py`, `scripts/gen-prompts.mjs`,
`scripts/gen-manifest.mjs`) is a generic, manifest-driven Gemini image
generator that isn't ported into this repo yet — when you're ready to
generate Supe Pines art, copy those three files over from Bleakwood Vale and
adapt: the `--category` choices list, the sibling-vault default path, the
`PAGES_BASE` URL, and — the actual work — rewrite `gen-prompts.mjs`'s
hand-authored prompt-text dictionaries (currently keyed to Bleakwood Vale's
archetypes/hooks/omens/victims) for Supe Pines' Heroes/Cases/Signals/Threats
and its noir-comic-book style, in place of the original's gothic-painterly
and gothic-tarot styles.

## Deploying to GitHub Pages

Once this repo has a GitHub remote, enable Pages in the repo settings
(Settings → Pages → Deploy from a branch → `main` → `/ (root)`). No build
step is required since this is a static site.
