# Security Policy

## Supported release

Security fixes are made against the `main` branch and the latest public GitHub
Pages deployment. This project is a static browser game; it does not accept
server-side credentials or private service-account files.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's
[private vulnerability reporting form](https://github.com/irgendjemandkeinkorper/supe-pines/security/advisories/new),
if enabled for the repository. Do not open a public issue or include private
player data, credentials, or exploit details in a public comment. Include the
affected commit or URL, a concise reproduction, impact, and any safe
mitigation. If private reporting is unavailable, contact the repository owner
through the GitHub profile before publishing details.

We will acknowledge a report when practical, investigate it against the
current release, and coordinate disclosure after a fix or containment path is
available. There is no bug-bounty program or guaranteed response SLA.

## Firebase trust-model boundary

The Firestore rules intentionally allow a seated participant to write another
player's private document so a client can deal hands without a trusted server.
Reads remain owner-only. This is an accepted "trust the table" tradeoff, not a
claim that a malicious seated client cannot cheat. The exact rules and the
isolated emulator tests are in [`firestore.rules`](firestore.rules),
[`test/firestore-rules.test.mjs`](test/firestore-rules.test.mjs), and
[`docs/firebase-testing.md`](docs/firebase-testing.md).

Do not report that documented limitation as an undiscovered rules regression;
do report any unauthenticated access, cross-player reads, credential exposure,
or behavior that exceeds the published rules.
