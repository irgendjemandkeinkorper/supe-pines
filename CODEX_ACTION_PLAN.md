# Codex action plan — supe-pines (art maintenance)

Written 2026-10-02 by Claude (Fable 5.1) as architect. Executor: Codex CLI on **Sol 6.1** (pick it in the model picker). Nobody monitors sessions live. Every milestone ends in a PR for review.

## Read first

1. `CONTRIBUTING.md` (there is no `AGENTS.md` or `CLAUDE.md` yet).
2. `docs/design-bible.md`, section "Visual language".
3. `docs/PRD.md`, section 11.
4. `scripts/gen-prompts.mjs`, `scripts/gen-manifest.mjs`, `scripts/check-art.mjs`, `generate.py`.

## Goal

Maintenance of the 2D art pipeline, then the open issues Jules has not been given. **No 3D, no Meshy, no new art generated.** Budget: one session for P0–P4, more for P5.

## Status on 2026-10-02 (verify before relying on it)

- Static web/JS card game on GitHub Pages; Firebase for remote multiplayer only. A superhero re-skin of *Tall Pines*.
- Hotseat play is verified; Firebase production is not.
- Branch `wave0-esc-branch-protection`, clean, 10 commits ahead of `origin/main`. Check whether that work is already on `main` before branching.
- 441 images (266 png, 174 webp, 1 svg) in `art/images/{ink,expressionist}/{heroes,signals,threats,cases}`, all generated with Gemini via `generate.py`.
- The design bible calls the two styles "Bold Comic" and "Church Glass"; the folders are `ink` and `expressionist`.
- `scripts/check-art.mjs` enforces art targets for cases and signals only; heroes and threats are set to 0.
- No record of which images are approved versus draft, and no licence or provenance tracking.
- 20 open issues; 11 are delegated to Jules. Only #42 (alt text) touches art.
- Rights to the base game are unresolved.

## Decisions

| Decision | Answer | Source |
|---|---|---|
| Scope | Maintenance only. No 3D, no new art | Owner |
| Git | Commit, push, open PR; never merge | Owner |
| Style names | Change the docs to match the folder names, not the folders | Owner |
| Hero and threat art gate | Require full coverage in `check-art.mjs` | Owner |
| Non-art issues | Take every open issue not assigned to Jules | Owner |
| Duplicate png and webp | Ship webp only | Owner |

## Milestones

**P0 — `AGENTS.md`.** Add one that points to `CONTRIBUTING.md` and this plan. No new rules.

**P1 — Provenance.** Add a generated record of every image: path, style, generator and model (from `generate.py`), prompt source (`art/IMAGE_PROMPTS.md` entry), and approved or draft. Mark status as unknown where the repo does not say; do not guess.

**P2 — Style names.** Confirm from the UI code which folder is which style before editing anything. Then make `docs/design-bible.md` state the folder name beside each style name. Docs only.

**P3 — Art gate.** Set hero and threat targets in `scripts/check-art.mjs` to full coverage. If the check then fails because art is missing, report the list of gaps in the PR and leave the gate failing for the owner to decide; generate nothing.

**P4 — One format.** Confirm the manifest and the UI reference webp. If so, move the png files out of the shipped Pages artifact (keep them as sources) and document the convention. If anything references png, stop and report.

**P5 — Open issues not assigned to Jules.** List open issues with `gh` and exclude any labelled `jules` or `Delegated-to-Jules`; about nine remained on 2026-10-02. Work the "MVP Launch Track" milestone first, then by phase. One PR per issue, with the issue's own acceptance criteria. Firebase production was never verified: an issue that needs a production deploy or production data stops for the owner.

## Rules

1. Branch `codex/<topic>` from `main`; commit, push, open a PR. Never merge, never force-push, never change issue labels, milestones or assignees.
2. Do not take issues labelled for Jules.
3. Do not run `generate.py` or generate any image.
4. Do not decide art direction or scope. Touch Firebase configuration or rules only where a P5 issue requires it, test under the emulator (`npm run test:rules`), and never deploy.
5. Never commit `GOOGLE_API_KEY` or any credential.

## Verification

- `node scripts/validate-data.mjs`
- `node scripts/gen-prompts.mjs --check`
- `node scripts/gen-manifest.mjs --check`
- `node scripts/check-art.mjs`
- `node --test test/*.test.mjs` (excluding the rules test)
- `python scripts/smoke.py --engine chromium`

## Stop and ask

- A change would alter what the live site shows.
- The folder-to-style mapping is not clear from the code.

## Handoff

In each PR body: what changed, changed files, checks run with results, risks, open questions.
