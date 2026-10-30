# Online trust model

**Decided 2026-10-30 (#44): accept and document.** Online play trusts every
seated player, the same way a physical card game trusts the people at the
table. Supe Pines adds no server-side validation or rate limits.

## Why

- Rooms are private and invite-only. A stranger needs the room code to join,
  and nobody can join once the case is underway.
- Rooms are short-lived. Each one carries an expiry time for Firestore TTL
  to delete. Turning on the TTL policy in production is a #65 gate. Rooms
  are never listed publicly.
- Nothing is at stake: no accounts, scores, rankings, or purchases.
- Validating every write would need Cloud Functions (the paid Blaze plan) and
  a rewrite of the sync layer. That is out of scope for a beta.
- The game already relies on table trust. Players narrate freely and use
  Strike to veto each other.

## What the rules do enforce

| Boundary | Enforced by |
| --- | --- |
| Only signed-in (anonymous) users read or write rooms. | `firestore.rules` |
| Only seated players write to a room after the lobby. | `firestore.rules` (`uid in seats`) |
| Only the owner reads their private hand and Buried Secret. | `firestore.rules`, tested by `test/firestore-rules.test.mjs` and `scripts/online_smoke.py` |
| Clients can't delete rooms. | `firestore.rules` (`allow delete: if false`) |

## Accepted abuse cases

A seated player with a modified client could:

1. Change public game state, e.g. set their own `scenesLeft` to 99, skip an
   act, or edit the Dossier.
2. Overwrite another player's private hand or Secret. They still can't read
   it, so they write blind.
3. Spam writes to their own room, which degrades that room only.

None of these reveal another player's private cards, and none reach outside
the room.

## What would make us revisit this

- Rooms become public or matchmade, with strangers at one table.
- Scores, progression, or anything else of value is added.
- Firebase usage or billing shows write abuse.
- A report shows private hands or Secrets being read by someone other than
  their owner. This is a privacy break and triggers Path B in
  [`release-checklist.md`](release-checklist.md#path-b-bad-firebase-rules-release-emergency-containment).

## If abuse happens

1. A ruined room: start a new room, or use **Continue in Hotseat**.
2. Abuse across many rooms or a cost spike: follow Path B in the release
   checklist to lock Firestore down, then decide whether to add Cloud
   Function validation.
