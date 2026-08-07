# Finale & Walkthrough Content Spec

**Status:** Authored content, ready to wire
**Owner:** Content authored by Claude per `.claude/session-plan.md` delegation map;
implementation (data slot, screen, validator, online mirror, export) by Codex.
**Covers:** WS-2 (endgame content) and WS-3 (worked walkthrough)

This document is the single source of authored prose for the Finale/Debrief beat
and the rules walkthrough. Implementation should copy this content verbatim into
the data files named below — it is written to the design bible's voice
(`docs/design-bible.md` §Voice) and should not be paraphrased.

---

## Part 1 — WS-2: the Finale data contract

### 1.1 Shape

Add a `finale` object to every entry in `js/data/cases.js`:

```js
finale: {
  // What the camera sees as the case closes. A door, not a script.
  opening: String,     // required, non-empty
  // The question the table answers together to end the case.
  question: String,    // required, non-empty
  // What Millhaven paid regardless of how it went. Named, concrete, local.
  cost: String,        // required, non-empty
  // The thread deliberately left hanging. Never resolved by the game.
  lingering: String    // required, non-empty
}
```

### 1.2 Validator assertions

The existing Case validator must fail with an actionable message when:

- `finale` is absent → `Case '<id>' has no finale block; a case cannot be closed without one.`
- any of the four fields is missing, not a string, or empty/whitespace →
  `Case '<id>' finale.<field> is missing or empty.`

Follow the existing validator's message style. Add one focused assertion per
PRD §6 ("one focused test or validator assertion for any new rule or invariant").

### 1.3 Screen behaviour

The Finale screen sits between the third Act Close and the Dossier —
`advanceAct()` in `js/ui/hub.js` currently jumps from `G.act>=3` straight to
`viewChronicle(false)`. It must instead route to the Finale, and the Finale's
own confirm advances to the Dossier.

The screen presents, in order:

1. **`finale.opening`** — as the camera direction, in the same register as a
   scene opening. Same textarea affordance as `#scene-opening`: the table may
   write what the camera sees, and it is recorded.
2. **The whole-case tone tally** — every tone counted across all three acts, not
   just the last one. `actToneCounts()` resets per act (`G.discardTones = []` in
   `startAct`), so the finale needs a running total accumulated across the case.
   Show it with `toneBadge` + count, text as well as colour.
3. **`finale.question`** — the question the table answers together. One shared
   textarea; this is the case's last authored beat.
4. **Unrevealed Secrets, acknowledged** — for every `player.secrets` entry with
   `used !== true`, name whose it was and print its question. They are *not*
   revealed as vignettes; they are named as roads not taken. Copy above the list:
   > **What stayed buried.** These were in play and never came to light. They
   > happened anyway, off-screen, to someone.
   When every Secret was revealed, replace the list with:
   > **Nothing stayed buried.** Every Secret in play came to light before the end.
5. **`finale.cost`** — stated plainly, not as a prompt. What the neighbourhood
   paid either way.
6. **The debrief** — `EPILOGUE_QUESTIONS` as a guided beat rather than a static
   block: one question at a time, with a "Next question" control and a visible
   position indicator (`3 of 6`), ending in a control that opens the Dossier.
   Keyboard-operable; the position indicator is text, not a progress bar alone.
7. **`finale.lingering`** — the last thing on screen before the Dossier opens.
   Set as a quiet closing line, not a panel heading.

Journal entry: push `{type:'finale', act:4, opening, answer, cost, lingering,
toneTotals, unrevealedSecrets, struck:false}` so the Dossier and the markdown
export both carry it. It must respect Strike like every other entry.

### 1.4 Online mirror

Add `liveAdvanceToFinale(code)` to `js/sync/liveActions.js`, mirroring
`liveAdvanceAfterClose`. The finale's shared textareas follow the same
draft/commit pattern the scene textareas already use. The unrevealed-Secrets
list is the one privacy-sensitive element on the screen: it may name **whose**
Secret went unrevealed and **what it asked**, because the case is over and the
Dossier records it — but it must be written by the same server-side action that
already owns Secret state, never assembled from another player's private hand.

### 1.5 Export

`js/chronicle/markdown.js` gains a `## The Finale` section carrying opening,
question and answer, tone totals, what stayed buried, cost, and lingering —
placed before `## Debrief Questions`.

---

## 2 — Authored finale content, all eight Cases

### `toll` — The Toll *(The Sophist)*

```js
finale: {
  opening: 'The collectors are gone from Ferrous Avenue, or they are not. Either way the shutters go up at six the way they always have. The camera finds the block at opening hour — who is unlocking, who is not, and which storefront still has its questions painted on the glass.',
  question: 'The Sophist wanted an answer to what a life is worth. What did Ferrous Avenue answer, and who had to say it out loud?',
  cost: 'Somebody on this block made a choice under his terms and will keep making it for years, in private, every time they pass the shop that stayed open.',
  lingering: 'The mascot heads came from Wonderland Pier. Nobody has been out to the pier to see what else is still in storage.'
}
```

### `casting` — Open Casting *(The Forge)*

```js
finale: {
  opening: 'The six-o’clock news needs a face for the ending. The camera finds the rooftop the copycats used, in daylight, with the gear still up there or already gone — and whoever came back for it.',
  question: 'Millhaven has decided what a hero looks like now. Who taught it that, and does the answer belong to you?',
  cost: 'Someone under a flashier mask was a person with a grievance before they were a headline. That grievance did not get solved by any of this.',
  lingering: 'The Forge sold to anyone with cash. Not every buyer has come out of the foundry yet.'
}
```

### `renovation` — The Renovation *(The Alderman)*

```js
finale: {
  opening: 'A room the Alderman designed, empty, with the lights doing what they were built to do to a person standing in them. The camera holds on it until somebody walks in — or until it is clear that nobody will.',
  question: 'Whitlock Street can be rebuilt or it can be remembered, and there may not be room for both. Which did you choose, and who was not asked?',
  cost: 'The tenants who signed away their leases smiling did not stop smiling. Some of them still think it was their idea.',
  lingering: 'Outside his buildings, in an old house or an unmanaged stand of trees, the Alderman came apart into something like grief. No one has explained why.'
}
```

### `lastcall` — Last Call *(Omen)*

```js
finale: {
  opening: 'The Anchor, after. Thirty years of nobody throwing a punch inside these doors, and the camera checks whether that is still true — the bar, the booths, whoever the bartender is still hiding.',
  question: 'Omen knew exactly one hour of everybody’s future. Did anyone on that list get to prove them wrong, and does it count if they were only ever going to be watched?',
  cost: 'Somebody in Millhaven now knows what they were going to do tomorrow. They have to get up in the morning carrying that.',
  lingering: 'Nobody remembers who decided that the Anchor was neutral ground. That is still true, the way gravity is true.'
}
```

### `afterhours` — After Hours *(Hemlock)*

```js
finale: {
  opening: 'The Saint Agnes night clinic with the lights still on, because the lights are always still on. The camera finds the waiting room and counts who is in it at four in the morning.',
  question: 'The compound severed pain and fear from the people who took it. Giving that back is not the same as healing them — so what did you actually hand back, and to whom?',
  cost: 'Every broken bone Hemlock’s people suffered went into her own nervous system. She kept paying it on purpose. Somebody at this table understood that better than they wanted to.',
  lingering: 'The clinic never asked who you were before it treated you. It still does not. That policy has not been revisited.'
}
```

### `deadair` — Dead Air *(The Broadcaster)*

```js
finale: {
  opening: 'The studio, with the board lit and nobody in the chair. The camera looks at the room where the record got changed, and at whatever the universe is still doing around it — the gravity, the shadows repeating.',
  question: 'The city trusted her more than it trusted City Hall. Where does Millhaven point its anger now, and who is going to tell it where?',
  cost: 'Somebody is legally guilty of a life they never lived, and the paperwork agrees. Undoing a record is slower than making one.',
  lingering: 'Old neighbours remembered different faces. Nobody has checked whether they have remembered their way back.'
}
```

### `lastroute` — The Last Route *(The Ferryman)*

```js
finale: {
  opening: 'The 9B pulls out of the depot at 12:14. The camera rides it, and counts the stops — eleven, or eight, or some number nobody at this table expected.',
  question: 'Everyone who paid the Ferryman is missing something they cannot name. Getting them home was the job; what did you decide about the toll?',
  cost: 'A mother’s face. A first kiss. The name of home. Somebody is walking around Millhaven with one of those gone and no idea it is missing.',
  lingering: 'The Ferryman forgot something to get this good at escape. Nobody found out what it was.'
}
```

### `openhouse` — Open House *(The Alchemist)*

```js
finale: {
  opening: 'The Franklin centre in the morning, doors unlocked or not. The camera finds the gym floor, the phone chargers along the wall, and whoever showed up anyway.',
  question: 'Every adult who offered to help had an angle. Which of you was the exception, and does the Franklin centre know it yet?',
  cost: 'The city already called this an underused property. Whatever happened here goes in a file that somebody downtown will read as evidence.',
  lingering: 'The Alchemist’s bloodstream can still synthesize anything. They still have to live in a body that does that.'
}
```

---

## 3 — WS-3: the worked walkthrough

### 3.1 Single source of truth

Add `sceneWalkthroughHTML()` to `js/ui/cards.js`, beside the existing
`sceneAnatomyDiagramHTML()` and under the same contract as the comment at
`js/ui/cards.js:56` — one function, four consumers:

| Entry point | Where |
|---|---|
| Title screen / case select | `showRules()` in `js/ui/renderChronicle.js`, after *Anatomy of a Scene* |
| Scene primer (local) | `renderScenePick()` in `js/ui/scene.js` |
| Scene primer (online) | `renderOnlineScenePick()` in `js/ui/online.js` (~line 878) |
| "How to Play" button | `index.html:56` → already routes to `showRules()` |

In the two primers it should be collapsed behind the existing `.disclose`
`<details>` pattern so the primer does not become a wall of text before a
first scene; in `showRules()` it renders open.

Reuse `.rules-example` for the worked steps — no new visual language.

### 3.2 The walkthrough content

Voice note: this reuses the same cast as the existing `.rules-example` blocks in
`showRules()` (Alice, Bob, The Nightwatch, *Rooftop Standoff*, *A Dead Scanner
Channel*) so the examples read as one continuous illustration rather than four
unrelated ones.

> **One scene, start to finish.**
>
> **1. Alice has a hand.** Three scene cards: *Rooftop Standoff* (Guilt), *The
> Long Way Around* (Dread), *Someone Left the Door Open* (Fury). It is Act One
> and she has one scene to lead.
>
> **2. She picks the card.** *Rooftop Standoff* — Guilt. The prompt is a door,
> not a cage; she is not obliged to stage a standoff on a literal rooftop.
>
> **3. She picks the lead Hero.** The Nightwatch, currently Side I, whose
> face-up tone is Dread and whose condition reads *"turn when the Nightwatch
> lets someone walk away."*
>
> **4. She says what the camera sees.** *"Third floor fire escape on Ferrous,
> ten at night. The Nightwatch is already up there. The kid with the crowbar
> does not know that yet."* Then she narrates aloud — as director, as actor, or
> both. She casts Bob as the kid. Nobody owns any character.
>
> **5. Bob buys in.** He plays *A Dead Scanner Channel* from the signal row and
> describes the silence right before the call came in. That is two cards in the
> scene. One more storyteller could still buy in — three at most, counting
> Alice's.
>
> **6. Alice ends it.** She began the scene, so she decides when it is over. She
> writes what the Dossier should remember: who appeared, what was said, what was
> discovered.
>
> **7. The Heroes are checked.** Every Hero's face-up condition is read against
> what just happened. The Nightwatch let the kid walk away — so that card turns.
> Side II now, and its tone changes with it.
>
> **8. The tones are counted.** Alice's card was Guilt. Bob played a signal, not
> a scene card, so it adds no tone. The lead Hero's face at the end of the scene
> adds one more. The count goes to the act's running tally.
>
> **9. Something comes to light.** If those counted tones contain a storyteller's
> buried Secret, it unlocks *at once* — a bonus vignette told through three
> signals, before the next storyteller begins. If not, play returns to the table
> and whoever has the next idea begins a scene.
>
> That is one scene. An act is every storyteller's scene, then the Act Close.
> Three acts, then the case closes and the Dossier is yours.

### 3.3 Acceptance

- The walkthrough renders from `sceneWalkthroughHTML()` in all four entry
  points; there is exactly one copy of the prose in the codebase.
- Readable at 320px; no colour-only meaning; the `<details>` disclosure is
  keyboard-operable and its state does not trap focus.
- A reader who has never played can state what happens next at every screen.
