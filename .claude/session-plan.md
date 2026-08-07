# Session Plan — Supe Pines to Finished State

**Created:** 2026-08-05
**Intent Contract:** [.claude/session-intent.md](./session-intent.md)
**Repo:** `/home/adamjroder/projects/supe-pines` · branch `main` (clean)

## What You'll End Up With

A Supe Pines build where a group can sit down cold and play one complete case to
a satisfying end — **hotseat or online** — with:

- **A closed loop with a real ending.** A Finale/Debrief screen between the third
  Act Close and the Dossier, so act 4 stops dumping players into a document.
- **Motion on every card event**, built from the keyframes already in
  `css/style.css` — no new visual direction, no new dependencies, reduced-motion
  honored everywhere.
- **A Stakeout worth returning to** — tiered unlocks, passive accrual, deeper
  milestone prose — still provably firewalled from `State.G`.
- **Instructions that teach by example** — a worked end-to-end walkthrough of one
  scene alongside the existing rules, reachable from the title screen.
- **Online at parity** with hotseat, verified two-client against the emulator,
  with the production gate (PRD R3) left explicitly under human control.
- **Evidence**: extended `node --test` suite, data/art/manifest gates, a
  browser smoke path, and a 320px + keyboard + reduced-motion check.

## How We'll Get There

```
DISCOVER ██████ 15%
Audit the two implementations — enumerate every local↔online divergence,
every unanimated card event, every dead end between act 3 close and export.
→ /octo:discover  (Gemini: bounded audit; Claude: synthesis)

DEFINE ████████ 20%
Lock three contracts before any code: the shared render/animation contract that
kills local↔online drift, the endgame spec (Finale/Debrief), and the idle-game
depth spec with its firewall invariant.
→ /octo:define  (Claude owns; Codex reviews feasibility)

DEVELOP ████████████████ 40%
Four bounded Codex workstreams, sequenced by dependency.
→ /octo:develop

DELIVER ██████████ 25%
Two-client emulator run, browser smoke path, a11y matrix, test/gate evidence,
release-issue writeup. Online production gate stays a human decision.
→ /octo:deliver
```

### Phase Weights

| Phase | Weight | Why |
|---|---:|---|
| Discover | 15% | You're the expert and the PRD exists; the unknown is *divergence surface*, not the domain. |
| Define | 20% | Raised above default: online parity is the whole ask, and parity is won or lost in the shared-contract design, not in the edits. |
| Develop | 40% | Four workstreams across two implementations. |
| Deliver | 25% | Raised: parity claims are only real with two-client + a11y evidence. |

---

## Workstreams

### WS-1 — Shared render/animation contract  *(P0, blocks WS-2/WS-3)*

The parity risk isn't missing features; it's that `js/ui/online.js` (1073 lines)
re-implements what `js/ui/scene.js`, `js/ui/hub.js`, and `js/ui/resolve.js` do.
Any animation added twice will drift.

- Extract the card-event motion vocabulary into one module (`js/ui/motion.js`)
  with named events: `deal`, `play`, `buyIn`, `trade`, `heroTurn`, `toneTally`,
  `secretReveal`, `closeOpen`, `dossierEntry`.
- Every event maps to an existing keyframe family (`sceneCardDeal`,
  `sceneSlotGlow`, `sceneArrivalCallout`, `handFocus`, `hero-flip`, `msIn`,
  `chronIn`) — extending the language, not inventing one.
- Single `prefers-reduced-motion` check lives in the module. One place to audit.
- Replace the `setTimeout(…, 380)` / `setTimeout(…, 1400)` guesses in
  `js/ui/idle.js:88`, `js/ui/hub.js:146`, `js/ui/online.js:814` with the module's
  promise-returning API, so re-renders stop cancelling in-flight animations.
- Both local and online render paths call the same module.

**Acceptance:** every card event animates identically in hotseat and online; one
reduced-motion code path; no `setTimeout` animation coordination remains.

### WS-2 — Close the endgame  *(P0)*

`advanceAct()` at act 3 sets `G.act=4` and calls `viewChronicle(false)`. There is
no finale, no debrief moment, no sense of arrival — `EPILOGUE_QUESTIONS` only
appear as static text inside the Dossier.

- Add a Finale/Debrief screen between the last Act Close and the Dossier: the
  Threat's resolution, the tone tally across the whole case, unrevealed Secrets
  acknowledged, the debrief questions as an actual guided beat.
- Author the missing finale content per Case (`js/data/cases.js` is 66 lines —
  finale hooks need a data slot and a validator assertion, per PRD §6).
- Mirror the screen in the online path with a `liveAdvanceToFinale` action.
- Dossier export (`js/chronicle/markdown.js`) carries the finale.

**Acceptance:** hotseat and online both reach a Finale screen and then the
Dossier; export contains it; validator fails loudly on a Case missing finale data.

### WS-3 — Instructions that teach  *(P1)*

`showRules()` states rules well and has four `.rules-example` blocks, but a
first-timer still has to assemble the sequence themselves.

- Add a worked walkthrough: one scene, start to finish — hand → card choice →
  lead Hero → opening → buy-in → end → hero turn check → tone count → secret
  trigger. Concrete named example, same voice as the existing examples.
- Wire it into the first-run primer path (`js/engine/firstrun.js`,
  `sceneAnatomyDiagramHTML()`) so it appears where confusion actually happens.
- Keep it one source of truth shared by title screen, case select, scene primer,
  and the online primer at `js/ui/online.js:878` — matching the existing comment
  contract in `js/ui/cards.js:56`.

**Acceptance:** a reader who has never played can state what happens next at
every screen; the walkthrough renders identically in all four entry points.

### WS-4 — Stakeout depth  *(P1)*

- Tiered unlocks beyond the current three; passive accrual while the overlay is
  open; expanded milestone prose in the existing register.
- Keep the module's stated firewall: no import of `State`, no read or write of
  game state. Add a test asserting `js/ui/idle.js` imports nothing from
  `js/engine/state.js` — the invariant becomes enforced, not just commented.
- a11y: the live-region count/milestone pattern already there must survive the
  richer content; focus restoration on unlock re-render must keep working.

**Acceptance:** measurably deeper loop; firewall test passes; overlay remains
keyboard-operable with correct focus return.

---

## Debate Checkpoints

🔸 **After Define — "Is `js/ui/motion.js` + a shared render contract the right
answer to online drift, or should `online.js` be decomposed against the local
modules first?"** This is the highest-leverage architectural fork in the plan.
1 round, adversarial. Getting it wrong means paying for every animation twice.

🔸 **After Develop — "Is the online path actually at parity, or only visually
similar?"** 1 round, collaborative, focused on privacy-of-hands and
reconnect/waiting states under PRD R3 and R8.

---

## Delegation Map

Per `/home/adamjroder/AI-ROLE-POLICY.md` and PRD §9. Claude owns architecture,
scope, acceptance criteria, and final synthesis throughout.

| Workstream | Owner | Boundary |
|---|---|---|
| Divergence audit (Discover) | Gemini | Report only. Does not propose architecture. |
| Contracts (Define) | Claude | Sole owner. |
| WS-1 motion module | Codex | Implements the agreed contract. Does not choose the visual language. |
| WS-2 endgame | Codex + Claude (content) | Codex builds screens/actions; narrative content is human/Claude-authored. |
| WS-3 instructions | Claude | Voice-critical; Claude drafts, Codex wires. |
| WS-4 idle depth | Codex | Firewall invariant is non-negotiable. |
| Tests / gates | Gemini | Generation and triage; Claude reviews. |
| Two-client + a11y evidence | Claude | Release evidence is not delegated. |

Each handoff states: objective, repo/branch, allowed file scope, deliverables,
acceptance checks, risks, open questions, do-not-decide boundary. Non-recursive.
Workers do not mutate GitHub labels, assignees, or milestones.

---

## Provider Availability

```
🔴 Codex CLI:        Available ✓
🟡 Gemini CLI:       Available ✓
🧭 Antigravity CLI:  Not installed ✗
🟤 OpenCode:         Not installed ✗
🟢 Copilot CLI:      Available ✓
🟠 Qwen CLI:         Not installed ✗
⚫ Ollama:           Available ✓
🔵 Claude:           Available ✓
🟣 Perplexity:       Not configured ✗
🟪 OpenRouter:       Configured ✓
```

---

## Risks

1. **`online.js` drift is the load-bearing risk.** 1073 lines duplicating local
   render logic. If WS-1 doesn't genuinely unify the render path, parity decays
   the moment anyone edits one side. This is what the post-Define debate is for.
2. **Animation on a re-render-the-whole-string architecture.** Screens rebuild
   via `innerHTML`, which cancels in-flight animations — the existing
   `setTimeout(renderIdlePanel, 380)` workaround is evidence of exactly this.
   The motion module must own render sequencing or the bug multiplies.
3. **Finale content is authoring work, not engineering work.** Eight Cases need
   finale hooks in the design bible's voice. This can silently become the long
   pole; it is not parallelizable by throwing agents at it.
4. **Online verification needs the Firebase emulator**, and PRD R3's production
   gate stays closed regardless of how good parity looks locally.

## Success Criteria

See [.claude/session-intent.md](./session-intent.md) — six criteria, from
"a first-time group completes a case" through "existing + new tests pass".

## Execution Commands

```bash
/octo:embrace "take Supe Pines to a finished state: complete playable round in hotseat and online, animated card plays, deeper Stakeout idle game, instructions with worked examples"
```

Or phase by phase:

- `/octo:discover` — divergence audit
- `/octo:define` — three contracts + debate checkpoint
- `/octo:develop` — WS-1 → WS-2 → WS-3/WS-4
- `/octo:deliver` — two-client, a11y matrix, release evidence

## Next Steps

1. Review this plan.
2. Adjust if needed (re-run `/octo:plan`).
3. Execute with `/octo:embrace` when ready.
