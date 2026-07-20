# Test harnesses

Static harnesses for the PocketBase migration logic. They extract functions straight out
of `beta/index.html` and run them in Node with stubbed globals — no build step, no test
framework, no network, no browser. Nothing here is loaded by the app.

```bash
./test/run-all.sh          # all five suites, 94 checks
node test/prepare.js       # regenerate fixtures only (run-all does this for you)
```

`prepare.js` writes `test/.fixtures/` (gitignored) by pulling the **pre-Group-C** merge
code out of git history — that's what the equivalence suite diffs against.

## Suites

| File | Checks | What it protects |
|---|---|---|
| `c-merge-equivalence.js` | 12 | `mergeCloudData()` behaves **byte-identically** to the two separate Drive merge blocks it replaced. Runs old and new over the same fixtures and compares serialized globals. |
| `d-migration-decision.js` | 18 | First-login migration: device classification, prompt counts, both destructive branches, the safe fallback, warning-text assertions, per-account persistence. |
| `f-account-ui.js` | 31 | `updatePbUI` status map (all 8 values), the `updateDriveUI`/`updatePbUI` mutual-yield recursion guard, auth error mapping, signup/login mode rendering, settings card. |
| `sw-cache-policy.js` | 12 | `sw.js` caches app/CDN assets and **never** API hosts. Directly guards the bug that broke sync in v3.79u. |
| `demo-pile-filter.js` | 21 | Demo pile never reaches a vault; adopted/renamed piles are never discarded; duplicates converge. Includes the both-sides merge case that the original harness missed. |

`real-vault-dryrun.js` is a manual tool, not part of `run-all.sh`. It runs a **real** vault
blob through merge + payload-build to show what a sync would do to it, without touching the
server:

```bash
node test/real-vault-dryrun.js /tmp/vault.json
```

It prints usage (including how to export a vault) if run with no argument. **Never commit
a vault export — it is real user data.**

## Why these exist, and their one known failure mode

Every one of them was written because something broke. They have caught real regressions
(the C suite was mutation-tested to prove it *can* fail; the D suite caught a grammar bug).

But they have also given false confidence, and it is worth knowing how:

- **The demo-pile suite passed while the bug was live.** Its fixtures were only ever
  *local-only* piles, so they never hit the branch where `mergeCloudData` stamps
  `lastModified`. The shape that mattered — a demo pile present on **both** sides — was the
  one never constructed. Fixed in v3.81a, and that case is now covered.
- **No harness here registers a service worker.** They run in Node; the SW cache bug was
  found on a real iPhone. `sw-cache-policy.js` tests the *policy function*, not the worker.

So: these suites protect refactors. They do not replace testing on a device, and the two
worst bugs of the migration were both found on hardware, not here.

## Browser-driven tests

The Puppeteer scripts used during the migration are **not** kept. They loaded the app from
`file://`, where service workers do not register at all — which is precisely why the cache
bug survived them. They would also now fail CORS, since the backend only accepts
`https://aalkhalifa.github.io`.

If you rebuild browser tests: serve over http and add that origin to PocketBase
`--origins` temporarily, or drive the deployed build.
