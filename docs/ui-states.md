# UI States

Every loading, empty, error, offline, and success state uses
`stateBlockHTML()` from `js/ui/states.js`. One block has the same shape
everywhere: an eyebrow, a title, what happened, **Next:** what to do, and
recovery buttons. Each kind gets its own live-region role:

| Kind | Role | Use for |
| --- | --- | --- |
| `loading` | `status` + `aria-busy` | Waiting on the network or a check. Includes a spinner, which holds still under reduced motion. |
| `empty` | `status` | Nothing to show yet, and nothing has gone wrong. |
| `success` | `status` | A finished action whose result isn't otherwise visible. |
| `error` | `alert` | Something failed. Always offer retry, return, or leave. |
| `offline` | `alert` | A feature can't be used in this build or network. Always offer the local alternative. |

When the state renders inside an existing live region (the
`#online-error-container`), pass `live:false` so the alert isn't announced
twice.

## Inventory

| Flow | State | Kind | Recovery actions | Where |
| --- | --- | --- | --- | --- |
| Online | Firebase not configured | offline | Open the Case · Back | `online/connection.js` `renderOnlineMissingConfig` |
| Online | Verifying the switchboard | loading | Cancel | `online/connection.js` `renderOnlineVerificationLoading` |
| Online | Verification failed (auth, rules, network) | error | Retry Connection · Play Hotseat · Back | `online/connection.js` `renderOnlineVerificationFailed` |
| Online | Online module failed to load | error | Retry Connection · Play Hotseat · Back | `main.js` `renderOnlineUnavailable` |
| Online | Create, join, auth, or action failed; connection lost | error (in alert container) | Try Again / Reload / Retry · Continue in Hotseat · Leave · Dismiss | `online/errors.js` `showOnlineError` |
| Online | Waiting for host, a scene, or a Secret | status announcement | n/a | `online/router.js` via `announce()` |
| Hub / Dossier | No entries yet | empty | n/a (nothing to recover) | `renderChronicle.js` |
| Hub | Scene deck empty when trading | inline text | n/a | `cards.js` |
| Title | Autosave failed, or save corrupt/unreadable | alert notice | Dismiss · Export JSON save | `index.html` `#save-warning`, `main.js` |
| Setup / Gallery / cards | Artwork missing or failed to load | fallback face | n/a (the card stays usable) | `art.js` `gameArtImgError`, `gallery.js` `galleryImgError` |

## Smoke coverage

`scripts/smoke.py` exercises at least one transition in each flow:

- **Online:** loading → error, and the real readiness check ending in the
  error state with Retry and Hotseat actions.
- **Hub / Dossier:** the empty Dossier before Act I, then the filled
  Dossier at the end of the case.
- **Setup:** Case covers return 404, and each card keeps its fallback title.
- **Gallery:** Hero art returns 404, and each tile keeps its fallback title.
