# Supe Pines Product Requirements Document

**Status:** Execution-ready draft  
**Owner:** Product / architecture review by Claude; implementation coordination by Codex  
**Last reviewed:** 2026-08-03  
**Repository:** https://github.com/irgendjemandkeinkorper/supe-pines  
**Live build:** https://irgendjemandkeinkorper.github.io/supe-pines/

## 1. Product brief

Supe Pines is a browser-based, one-session, card-driven story game for 1–6
players. Players portray street-level superheroes protecting a neighborhood
when institutions fail it. Each Hero brings a limiting trauma or flaw; the
active Case and Threat expose those limits through shared authorship, clues,
scenes, tone resolution, and a final dossier.

The product succeeds when a group can start a case quickly, understand what to
do next without a facilitator, create a coherent neighborhood-scale mystery,
resolve the three-act arc, and finish with a satisfying record of what they
made together. Hotseat play is the baseline. Remote multiplayer is a supported
path once production Firebase readiness and privacy verification are complete.

## 2. Current state and evidence

The repository is an existing public game rather than a greenfield build.

- The main branch is clean and the public repository and GitHub Pages build
  already exist.
- The authored roster currently validates as 8 Cases, 15 Heroes, 144 Scenes,
  20 Signals, 10 Secrets, and 6 Act Closes.
- Prompt and manifest generation validates for 132 image slots across two art
  styles. Text-card fallbacks are an intentional launch behavior.
- The zero-dependency Node regression suite currently passes 20 tests.
- Existing open GitHub work already covers accessibility, UI states, online
  multiplayer, Firebase emulator strategy, modularization, CI, documentation,
  and release operations.
- The release checklist identifies remaining manual Firebase production setup,
  two-client remote verification, browser console verification, and rollback
  evidence as release concerns.

These facts are the baseline for prioritization; they are not claims that the
remote production path is signed off.

## 3. Goals

### MVP goals

1. Make the complete local/hotseat case flow reliably playable from first load
   through the finished dossier.
2. Make the next action, current state, and consequence legible at every major
   screen, including loading, empty, error, recovery, and narrow-screen states.
3. Preserve the design bible: neighborhood scale, people-first stakes, shared
   authorship, readable comic-panel surfaces, and no glossy franchise UI.
4. Make storyline data additive and testable so new Cases, scenes, Signals,
   Heroes, and Threats can be integrated without hidden engine coupling.
5. Make remote multiplayer safe to enable only after Firebase configuration,
   rules, privacy boundaries, and two-client synchronization are verified.
6. Establish a repeatable release path with CI evidence, dependency hygiene,
   deployment checks, and a documented rollback/containment path.

### Non-goals for this release

- A campaign system, persistent accounts, progression, unlocks, or analytics
  dashboards.
- A broad content expansion beyond what is needed to validate the existing
  eight-Case story spine.
- Completing all 132 art slots; intentional text fallbacks remain supported.
- A new visual direction, design-system rewrite, or unrelated engine rewrite.
- Treating remote multiplayer as production-ready before its explicit security
  and synchronization gates pass.

## 4. Target users and primary journey

### Primary user

A small group of friends who wants to play a complete, collaborative mystery in
one sitting in a browser, with little or no rules explanation from a dedicated
facilitator.

### Primary journey

1. Open the game and choose local or online play.
2. Configure players and choose an art language without losing readability.
3. Name the victim and answer the Hero setup questions.
4. Receive the Case, Threat, Signals, and initial scene state.
5. Read the active board, contribute or pass, reveal/resolve cards, and track
   the act progression.
6. Move through all three acts with clear ownership, tone, and consequence
   feedback.
7. Resolve the final Secret/debrief and export or review the completed dossier.
8. If online, recover cleanly from waiting, reconnect, invalid room, and
   permission failures without exposing private hands or Secrets.

### Definition of done

The MVP is ready for release when a first-time group can complete the primary
journey in a supported browser, hotseat regression and data checks pass, all
release-blocking accessibility and security issues are closed or explicitly
accepted, online play is either fully verified or clearly gated off, and the
release issue contains CI/deployment/rollback evidence.

## 5. Product requirements

### P0 — release-blocking

**R1. Deterministic game flow.** The engine must preserve valid turn order,
scene progression, Act Close resolution, Secret matching, resume behavior, and
finished dossier state across supported local flows.

**R2. Explicit state communication.** Every action surface must expose its
current state and next action in text. Loading, empty, error, recovery, waiting,
success, and destructive-action states must be distinguishable without color
alone.

**R3. Safe online gate.** The online entry point must not imply availability
when Firebase is unconfigured or unverified. Production enablement requires
working Anonymous Auth, published rules, authorized GitHub Pages origin, and a
documented two-client privacy/sync check.

**R4. Accessibility baseline.** Primary controls, dialogs, cards, forms, focus
management, labels, keyboard operation, alt/fallback text, contrast, and
reduced-motion behavior must meet the design bible's interaction rules and be
tested in the browser smoke path.

**R5. Release evidence.** CI must run the deterministic data, generated-file,
unit/regression, art-gate, and browser checks needed for the release decision.

### P1 — high-value launch quality

**R6. Story spine integrity.** Every Case has the required setup, act hooks,
signals, closes, and finale/debrief coverage; validators fail with actionable
messages when content is incomplete or malformed.

**R7. Readable responsive board.** The hub, cards, scene tracker, drawers,
overlays, and online waiting states remain usable at 320px and on desktop,
without hiding required actions behind hover-only behavior.

**R8. Recovery and persistence.** Local save/resume and online reconnect or
failure states tell players what happened and what can be done next; no silent
loss of a completed local action is acceptable.

**R9. Maintainable boundaries.** High-change UI/sync modules and repeated
presentation styles have clear ownership and direct tests where current
coupling makes regressions likely.

### P2 — post-MVP or capacity-dependent

**R10. Expanded art coverage.** Add Hero and Threat art packs beyond the
intentional fallback target after the game loop and release path are stable.

**R11. Multi-engine confidence.** Add a second browser engine once the primary
smoke path is reproducible and fast enough for regular CI.

## 6. Story and content contract

Content must remain neighborhood-scale, concrete, collaborative, and safe for
shared authorship. Prompts should create openings for the table rather than
prescribe a script. New content must be data-driven and pass the existing
validator, prompt check, manifest check, and relevant regression tests.

For each new Case, the integration checklist is:

- one primary Threat referenced by villainId, plus exactly one additional
  Case-linked Threat (VILLAINS[].caseId);
- one setup question for every Hero;
- two Case-specific scene prompts per act, for six hooked scenes total;
- every scene hook must name a known Case and every scene tone must name a
  known tone;
- matching prompt and manifest entries when art is requested;
- fallback copy when an image is absent; and
- one focused test or validator assertion for any new rule or invariant.

The data validator reports these relationships with the Case, Hero, Threat,
and scene identifiers in each error. Prompt coverage and manifest generation
remain separate deterministic gates, while the final dossier/debrief contract
is represented by the required non-empty epilogue question set and the
existing Act III regression test.

## 7. UX and accessibility contract

The existing design bible is authoritative. Work must preserve its palette,
typography, hard-edged card surfaces, text hierarchy, and explicit interaction
language. Before sign-off, review:

- primary navigation and first-use setup;
- keyboard order, focus return, dialog semantics, and escape behavior;
- persistent card actions and non-color status cues;
- labels, error association, alt text, truncation, and readable fallbacks;
- 320px, desktop, reduced-motion, loading, empty, waiting, error, and recovery
  states; and
- clear confirmation or undo for Strike, Reset, Forfeit, Leave, and other
  irreversible actions.

## 8. Technical and operational contract

- Keep the browser build dependency-light and deterministic.
- Do not commit private Firebase credentials or expose private player state in
  public documents or DOM.
- Treat `firestore.rules`, Firebase configuration, GitHub Pages, and CI as one
  release surface with explicit verification.
- Keep generated prompts/manifests synchronized with authored data.
- Require a passing validation chain before merging release-bound changes.
- Record the last-known-good commit, deployment result, browser console state,
  and remote two-client result in the release issue.

## 9. Multi-AI orchestration model

Agents are specialists with bounded authority. Product scope, architecture,
visual direction, release decisions, and final synthesis remain human-reviewed
decisions. Each work item must have one owner, one acceptance contract, and a
GitHub issue or PR as its durable handoff.

| Workstream | Agent brief | Primary output | Do not decide |
|---|---|---|---|
| Infrastructure | CI, Firebase readiness, dependency hygiene, deployment, rollback | reproducible checks and operational evidence | product scope or UI direction |
| Storyline integration | data contract, Case/scene/Signal/Secret/Threat consistency | authored content and validator/test changes | architecture or visual redesign |
| UI design | design-bible-compliant interaction, responsive behavior, accessibility | screens, states, copy, browser evidence | new product direction |
| Release / everything else | QA matrix, docs, telemetry-free evidence, launch coordination | release issue, risk register, missing cross-cutting work | final release approval |

Every agent handoff must state: objective, repository/branch, allowed files or
GitHub scope, deliverables, acceptance checks, risks, open questions, and the
recommended next action. Agents must not silently create duplicate issues or
change labels, assignees, milestones, architecture, or product scope.

## 10. 100-point work-item scoring framework

Score every proposed issue or PR before committing it to a milestone. Score
each dimension from 0 to its maximum. A score is a prioritization aid, not a
substitute for a P0 security, privacy, accessibility, or release blocker.

| Dimension | Points | Scoring question |
|---|---:|---|
| Player value and primary-journey impact | 20 | How directly does this improve starting, playing, resolving, or finishing a case? |
| Storyline/content integrity | 20 | Does it strengthen authorship, Case coherence, replayability, or data invariants? |
| UX, accessibility, and responsive quality | 20 | Does it make the next action clear and the game usable across input modes and sizes? |
| Technical reliability and maintainability | 15 | Does it prevent regressions, preserve deterministic state, or reduce risky coupling? |
| Infrastructure, security, and release confidence | 15 | Does it improve reproducibility, privacy, deployment, rollback, or operational evidence? |
| Art/content completeness | 5 | Does it improve the intended visual/readability contract without blocking fallback play? |
| Scope fit and ship-readiness | 5 | Is it small enough, testable, dependency-aware, and aligned with this MVP? |
| **Total** | **100** |  |

Interpretation:

- **85–100:** candidate for the active milestone; define the smallest slice and
  assign an owner.
- **70–84:** valuable; schedule after blockers or split if the issue is broad.
- **50–69:** only schedule with a clear dependency or learning objective.
- **0–49:** defer, close, or rewrite unless it is a mandatory blocker.

Suggested issue fields are `Priority`, `Score`, `Owner`, `Milestone`,
`Depends on`, `Acceptance criteria`, and `Evidence`. Re-score when evidence or
scope changes.

## 11. Milestone map

Use the existing phase milestones as the execution spine and the new MVP track
milestone as the cross-cutting release target. Milestones are outcome gates,
not activity buckets.

| Milestone | Outcome | Exit criteria |
|---|---|---|
| MVP Launch Track | One visible launch target spanning all workstreams | PRD accepted, P0/P1 list mapped, release issue contains evidence and explicit online decision |
| Phase 1: Triage, A11y & Critical UI Bugs | Safe, operable primary journey | blockers closed, keyboard/dialog/form/error paths verified |
| Phase 2: Design Debt & Component Consolidation | Maintainable presentation and sync boundaries | targeted refactors preserve tests and design tokens/ownership are documented |
| Phase 3: Interaction, State & Responsive Polish | Predictable feedback and narrow-screen play | state matrix and responsive/browser checks pass |
| Phase 4: Strategic Enhancements & Release Hardening | Reproducible, reviewable deployment | CI, Pages, Firebase decision, console check, two-client check, and rollback evidence recorded |

Dependencies generally flow Phase 1 → Phase 2/3 → Phase 4. Storyline changes
can proceed in parallel once the data contract is agreed; infrastructure work
should unblock verification before online claims are made.

## 12. Launch scorecard

At each review, report both the weighted work-item score and these release
signals:

1. Local complete-case browser flow passes.
2. Data, generated-file, regression, and art gates pass.
3. No open P0 issue; every open P1 has an explicit owner and release decision.
4. Keyboard, focus, labels, status text, and 320px checks have evidence.
5. Online play is either verified end-to-end with privacy evidence or visibly
   gated as unavailable.
6. GitHub Pages deployment and browser console are clean.
7. Rollback/containment steps identify the last known good release.

## 13. Decisions required

- Is the next public release hotseat-only until Firebase production setup is
  verified, or is remote multiplayer a launch requirement?
- Which browser/version matrix is supported for launch, beyond the current
  Chromium smoke path?
- Who owns final product acceptance, Firebase console changes, and release
  sign-off?
- What playtest evidence will be collected before calling the story spine
  coherent and the onboarding understandable?

## 14. Immediate execution order

1. Accept this PRD and the MVP Launch Track as the shared definition of done.
2. Close duplicate planning gaps by mapping existing issues to the milestone
   gates; create only the new cross-cutting issues listed in the launch plan.
3. Resolve Phase 1 accessibility/online-entry blockers, then validate the
   complete local browser flow.
4. Finish the Firebase/staging decision and remote privacy test before enabling
   production online play.
5. Run the release checklist and capture evidence in the release issue.
