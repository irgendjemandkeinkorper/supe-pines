# MVP release scorecard and evidence log

This is the evidence worksheet for [issue #69](https://github.com/irgendjemandkeinkorper/supe-pines/issues/69).
Agents may fill in command and workflow evidence; the project owner must fill
in the final approver and release date.

## Automated evidence

- [ ] Data validation: `node scripts/validate-data.mjs` — link/run:
- [ ] Generated prompts: `node scripts/gen-prompts.mjs --check` — link/run:
- [ ] Generated manifest: `node scripts/gen-manifest.mjs --check` — link/run:
- [ ] Node regression tests: `node --test test/*.test.mjs` — link/run:
- [ ] Art gate: `node scripts/check-art.mjs` — link/run:
- [ ] Chromium smoke: `python scripts/smoke.py --engine chromium` — link/run:
- [ ] WebKit smoke: `python scripts/smoke.py --engine webkit` — link/run:
- [ ] Firestore rules emulator: `npm run test:rules` under `firebase emulators:exec` — link/run:

## Release decisions

- [ ] No open P0 issue remains.
- [ ] Every open P1 has an owner and explicit ship/defer decision.
- [ ] Keyboard/focus evidence linked.
- [ ] Status/live-region evidence linked.
- [ ] 320px responsive evidence linked.
- [ ] Reduced-motion evidence linked.
- [ ] Online play is verified with two-client privacy/sync evidence, **or** the
      product visibly gates online play off.
- [ ] Firebase Anonymous Auth, published rules, authorized domain, and TTL are
      verified in the console; see the dated status in `CHANGELOG.md`.
- [ ] GitHub Pages deployment evidence linked.
- [ ] Production console has zero known errors, with owner confirmation linked.
- [ ] Last-known-good commit: `________________`.
- [ ] Rollback/containment path reviewed in `docs/release-checklist.md`.

## Final approval

- Final approver: `________________`
- Release date: `________________`
- Release decision: `ship hotseat / ship online / defer`
- Notes and risks:
