# Session Intent Contract

**Created:** 2026-08-05
**Project:** Supe Pines (`/home/adamjroder/projects/supe-pines`, branch `main`)
**Command:** `/octo:plan`

## Job statement

Take Supe Pines from "structurally complete but thin" to a finished, shippable
state where a full round can be played to completion **in both hotseat and
online**, card plays are animated in the existing visual language, the Stakeout
idle clicker is meaningfully fleshed out, and the instructions teach the game
through concrete gameplay examples.

## Captured answers

| Question | Answer |
|---|---|
| Finish line | **Hotseat + online parity** — the online path reaches the same completeness as local |
| Animation ambition | **Extend the existing CSS vocabulary** (`sceneCardDeal`, `sceneSlotGlow`, `handFocus`, `hero-flip`) consistently to every card event |
| Idle clicker | **Deeper but still disconnected** — more unlocks/tiers/passive accrual/prose, never touches game state |
| Constraints | Preserve design bible + a11y; delegate implementation per role policy |
| Knowledge level | Expert (project owner; PRD already authored) |

## Success criteria

1. A first-time group can complete a full case — setup → 3 acts → act closes →
   buried secrets → dossier/debrief → export — with no dead ends, in hotseat.
2. The same journey completes online with two clients, with no privacy leak of
   private hands or Secrets.
3. Every card event (deal, play, buy-in, trade, hero turn, tone tally, secret
   reveal, act close, dossier entry) has a visible, reduced-motion-safe
   animation drawn from the existing keyframe vocabulary.
4. The Stakeout overlay has depth: tiered unlocks, passive accrual, expanded
   milestone prose — and still provably cannot affect `State.G`.
5. "How the Case Is Run" teaches by worked example: a walkthrough of one real
   scene end-to-end, not only rule statements.
6. Existing `node --test` suite plus new tests pass; art/data/manifest gates pass.

## Boundaries — do not decide, do not do

- **No new visual direction.** `docs/design-bible.md` is authoritative: palette,
  hard-edged card surfaces, typography, ornament language.
- **No dependencies, no build step.** Plain ES modules served from GitHub Pages.
- **No a11y regression.** `prefers-reduced-motion`, 320px, keyboard order, focus
  return, non-color status cues, labels, alt/fallback text.
- **No scope creep into P2/non-goals** from `docs/PRD.md` §3: no campaign system,
  no accounts/progression, no analytics, no completing all 132 art slots.
- **Workers do not decide** product scope, architecture, visual direction, or
  GitHub labels/assignees/milestones. Claude architects, reviews, synthesizes.
- **Online production enablement stays gated** behind PRD R3 (Anonymous Auth,
  published rules, authorized Pages origin, two-client privacy/sync evidence).
  Parity work can proceed against the emulator without flipping that gate.

## Context

- Repo is an existing public game, not greenfield. `main` is clean.
- The core loop already reaches the end structurally: `startAct` → scenes →
  `afterSceneFlow` → `renderCloseIntro` → `beginClose` → `advanceAct` → act 4 →
  `viewChronicle`. Online mirrors this in `js/ui/online.js` + `js/sync/liveActions.js`.
- Known thin spots found during planning:
  - `js/data/epilogue.js` is 6 questions and nothing else; there is no distinct
    finale/debrief *screen* — act 4 dumps straight into the Dossier.
  - Animation exists only for scene-slot deal-in, hand focus, milestone rows,
    chronicle entries, gallery faces. Hero turn, tone tally, secret reveal, trade,
    and act close have no motion.
  - `js/ui/idle.js` is 93 lines: 3 unlocks, 8 milestones, one click handler.
  - `showRules()` has 4 `.rules-example` blocks but no end-to-end walkthrough.
  - `js/ui/online.js` is 1073 lines and duplicates local render logic — the main
    parity risk is drift between the two implementations.
