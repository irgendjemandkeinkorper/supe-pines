# Implementation Plan: Supe Pines Gameplay and Recovery Pass

## Overview

Bring the comic-book game in line with the sister game's usability contract: inspectable in-game cards, reliable return navigation, recoverable online rooms, richer scene participation, optional tone assistance, portable save files, and the approved Good Day/Bad Day character treatment.

## Architecture Decisions

- Reuse the existing overlay/gallery renderer for in-game card inspection so card content and accessibility behavior stay consistent.
- Keep local and online state paths explicit. Local save/import serializes the local game state; online recovery uses a stable player identity and a room heartbeat/last-seen timestamp rather than deleting a room when a client leaves.
- Keep Bleakify optional and secret-safe: no Gemini key is committed or persisted. The UI supports a configured backend or a one-shot user-supplied key, with graceful fallback when unavailable.
- Preserve backward compatibility for existing saved rooms and save files by defaulting new fields when absent.
- Treat Good Day/Bad Day as presentation labels for both Hero and Villain sides; Villain Bad Day uses the supplied attachment/tenderness artwork and copy.

## Task List

### Phase 1: Foundation and card/navigation fixes

- [ ] Add focused tests for in-game card inspection, rules return navigation, side labels, multi-archetype selection, and two-card contributions.
- [ ] Add a shared inspect-card overlay for archetype/omen cards and wire gameplay cards to open it.
- [ ] Make Rules return to the active local/online game screen rather than the top-level hub.
- [ ] Apply Good Day/Bad Day labels and supplied character text/art mapping.
- [ ] Add collapsible Good Day/Bad Day background copy to Gallery detail views only.

### Checkpoint: Foundation

- [ ] Focused tests pass.
- [ ] Existing full test suite remains green.

### Phase 2: Scene participation and omen flow

- [ ] Allow archetype swapping during setup.
- [ ] Add local/online Lead, Follow, and Watch readiness states.
- [ ] Allow up to two archetypes in a scene and up to two played cards per scene.
- [ ] Add unanimous omen replacement voting, reshuffle the replaced omen into the deck, and draw a replacement.
- [ ] Draw fresh omen cards after resolution and return old cards to a shuffled omen deck.

### Phase 3: Online recovery and portable state

- [ ] Show room code in gameplay UI and add reconnect/rejoin controls.
- [ ] Persist room documents for at least one hour after all players leave; preserve host identity and allow host recovery.
- [ ] Add local JSON export/import with schema validation and safe size limits.

### Phase 4: Optional Bleakify assistance

- [ ] Add a shared optional Bleakify adapter for scene openings, omen additions, record summaries, and secret reveals.
- [ ] Ensure user text is bounded/escaped and API keys are never committed, logged, or stored in local saves.
- [ ] Add fallback copy and disabled/error states when no Gemini configuration is available.

### Checkpoint: Complete

- [ ] All requested flows are covered by tests and browser smoke checks.
- [ ] Manifest/art checks pass with the supplied Bad Day assets.
- [ ] Static checks and Pages deployment pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Firestore rules currently isolate private player documents | High | Extend only the room metadata/actions needed for reconnect and keep private hands/secrets private. |
| Static Pages cannot safely hold a Gemini secret | High | Use a configured proxy or one-shot key entry; never embed a project secret. |
| Existing rooms/saves lack new fields | Medium | Normalize missing fields on read and write additive migrations. |
| Supplied art bundle is large | Medium | Copy only approved character assets into the existing art paths; avoid duplicating front art. |

## Open Questions

- The exact Gemini deployment/proxy URL is not present in the repository. Implement the optional adapter contract and safe UI configuration without assuming a secret or endpoint.
