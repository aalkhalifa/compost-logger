# Changelog

All notable changes to Compost Logger are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses date-stamped `v3.XX` releases with letter sub-revisions
(e.g. `v3.77q`). Beta builds ship from `/beta/`; production is promoted by copying
`beta/index.html` to the repo-root `index.html`. `sw.js` is shared by both.

## [3.79] - 2026-07-11 [beta]

PocketBase migration line (replacing Google Drive sync). Ships from `/beta/`; additive
during the transition (Drive/GSI keeps working until Group G's import-then-remove).

### Added
- **v3.79s — Group D (first-login migration).** A decision now sits in front of the first
  vault write. `pbFirstRunDecision()` classifies what the device holds via
  `pbLocalDataState()` (`empty` / `sample-only` / `real`) and only prompts when real data
  is at stake; `pbAdoptCloudOnly()` handles the destructive "use the cloud version"
  answer, and the choice is remembered per (device, account) in `pb_import_<userId>` so
  it asks once. On import, the merged result is pushed immediately rather than waiting
  for the next edit, and a toast confirms the pile count.
- **v3.79s — the onboarding demo pile no longer reaches real accounts.** New sample piles
  carry `isSample:true`; `isSamplePile()` also falls back to a name match so devices from
  earlier builds are covered. A device holding nothing but demo data signs in silently
  and seeds an empty vault.
- **v3.79r — Group C (storage/sync).** PocketBase read/write path: `pbLoad()` fetches (or
  creates) this user's vault and merges it in; `pbSaveNow()` does PULL-merge-PUSH with the
  record's `updated` stamp as an optimistic-concurrency baseline. `pbBuildPayload()` writes
  the full `ca_v5` shape plus the four separate-key settings (`displayBasis`, `showPFRP`,
  `pilesSortMode`, `entriesSortMode`), `pbApplySettings()` restores them, and
  `setPbStatus()` drives PocketBase status without touching Drive's. `pbLoad` is invoked
  from `pbSetAuth`, covering both login and session restore.
- **v3.79r — Group A execution (server).** Ran the runbook on the DigitalOcean box:
  PocketBase 0.22.21 version-pinned under systemd, `vaults` collection imported and
  verified, HTTPS via a Cloudflare Tunnel (also under systemd). Caddy/TLS skipped pending
  a domain. `PB_BASE_URL` now points at the tunnel.
- **Group A (infra, no app code).** `deploy/pocketbase/` — deployment runbook, importable
  blob-per-user `vaults` collection schema, systemd unit, and Caddy TLS template.

### Changed
- **v3.79s — first login no longer uploads silently.** `pbLoad`'s create branch used to
  POST the entire local vault the moment a user authenticated, with no consent and with
  the demo pile included. Both of its branches now route through the Group D decision.
- **v3.79r — shared cloud merge.** The two near-duplicate Drive merge blocks (~115 lines in
  `initDriveStorage` and `driveSaveNow`) collapse into one `mergeCloudData(remote, opts)`
  used by both Drive and PocketBase. The two blocks were *not* identical — only the connect
  path merged recipes, adopted remote `ingHist`/`tempUnit`, renamed same-name piles to
  "— Local Copy", and guarded against a remote file with no `sites` array — so those four
  differences became `opts` flags and each Drive call site passes the flags reproducing its
  previous behavior exactly. Verified byte-identical against the pre-extraction code across
  6 remote fixtures on both paths (12/12).
- **v3.79r — `save()` prefers PocketBase.** When signed into PocketBase, `save()` pushes
  there instead of Drive, so a migrated user does not write to two competing merge
  authorities. Unmigrated users are unaffected and keep syncing to Drive. Still
  localStorage-first and fire-and-forget, so offline behavior is unchanged. `forceSyncNow`
  and the `online`/`offline`/`beforeunload` handlers follow the same preference; the unload
  warning is now backend-neutral (a migrated user has no "SYNC NOW" button).
- **v3.79r — `sw.js` cache key** corrected to `compost-logger-v3.79r`; it had drifted at
  `v3.78b` while beta advanced through v3.79b-q.
- **Group B (auth layer).** PocketBase email/password auth in `beta/index.html`: a single
  configurable `PB_BASE_URL` constant and `pbApi` / `pbSignup` / `pbLogin` / `pbLogout` /
  `pbRestoreAuth` (raw `fetch`, no PB JS SDK). Session persists in the `pb_auth`
  localStorage key; `pbRestoreAuth()` validates it on load via `auth-refresh` and makes
  zero network calls when no session is stored. No Google popup. Storage/sync (Group C)
  and login UI (Group F) not yet wired, so the auth functions are callable but not yet
  surfaced. Drive/GSI untouched (removed in Group G).

## [3.78] - 2026-07-11

Promoted to production on 2026-07-11 (git tag `v3.78b`; production went v3.77q to
v3.78b) — `cp beta/index.html` to root `index.html`, a plain copy. Sub-revisions below
are newest first: v3.78b, v3.78a, v3.78.

### Added
- **LICENSE** — Proprietary / All Rights Reserved (c) 2026 Abdulla Al-Khalifa /
  Roots of Arabia. Viewing browser-served source grants no reuse rights.
- Opened the **v3.78** beta line (fresh beta after the v3.77q promotion).

### Changed
- **v3.78b** — Renamed the "EXPORT ALL PILES" label in the DATA settings card to
  **"Download My Data"** (the export itself was completed in v3.77q).

### Fixed
- **v3.78a — Service worker never registered on the beta.** The page registered a
  relative `sw.js`, which resolved to `/beta/sw.js` from the beta folder and 404'd
  (caught silently). Registration now derives the repo root from `location.pathname`
  (strip the page filename, then a trailing `beta/`) and registers the root `sw.js`,
  so it works from both `/` and `/beta/` with no hardcoded repo path. The root
  service worker's default scope covers `/beta/`. Because the path is computed at
  runtime, promotion (`cp beta/index.html` to root) stays a plain copy with no edits.
  Network-first caching strategy unchanged.

## [3.77q] - 2026-07-11

Promoted to production on 2026-07-11 (git tag `v3.77q`; production went v3.75 to
v3.77q). Fixes the three priority bugs plus a broken service worker.

### Fixed
- **siteId lost on Google Drive sync.** Site assignments reverted to "Uncategorized"
  after a sync. The Drive upload payload now matches the full `ca_v5` shape
  (`{piles, sites, recipes, ingHist, tempUnit, volumeUnit, containerUnit,
  deletedPileIds}`). Both merge paths — connect (`initDriveStorage`) and sync
  (`driveSaveNow`) — now merge `sites` by id (local wins on conflict), preserve a
  pile's `siteId` when an older Drive copy lacks it, skip the site merge when the
  Drive file has no `sites` array (so local sites are never wiped), and run
  `migrateSites()` after merging.
- **Runaway active-cycle times (500-900h READY).** The last entry's interval
  extended to `now`, so an overdue pile accumulated hundreds of "ready" hours. Added
  a `cappedNow(lastTs)` helper that caps active-cycle extrapolation at 8h past the
  last entry, applied in all four affected functions: `computeIndependentStages`,
  `classifyCycleTime`, `buildChronologicalSegments`, and `computeSatisfiedStages`.
  `calcSmartTimer` inherits the cap. Corrected the misleading "Option B" comments.
- **Incomplete data export.** `exportAllJSON` now emits the full `ca_v5` shape
  (piles with `siteId`, `sites`, `recipes`, `ingHist`, `tempUnit`, `volumeUnit`,
  `containerUnit`, `deletedPileIds`) plus the separate-key settings (`displayBasis`,
  `showPFRP`, `pilesSortMode`, `entriesSortMode`) and `exportVersion` / `exportedAt`.
- **Service worker was never running.** `sw.js` had been corrupted with smart/curly
  quotes (`compost-v4` in curly quotes throughout), so the file did not parse and the
  service worker never registered on production or beta. Repaired to straight ASCII
  quotes, cache key set to `compost-logger-v3.77q`, network-first strategy retained.

## [3.77p] - 2026-07-05

Baseline beta prior to this changelog (last pre-session commit). Feature-complete
field logger: multi-probe cores, sites with GPS, ambient temperature (manual +
Open-Meteo + backfill), photo scanning, watered tracking, PFRP toggle, chart
overlays, display-basis toggle, volume units, Excel/CSV import, Google Drive sync
(merge on connect, rename-on-conflict), multicolor stage bars, smart heat labels,
PDF report, and a sample pile on first run.

Known bugs present at this baseline (all fixed in 3.77q): siteId dropped on Drive
sync, inflated active-cycle READY times, and an incomplete JSON export.

## Earlier releases (v3.0 - v3.75) - reconstructed

Production `index.html` shipped versions v3.0 through v3.75 before this changelog
was started; v3.76 and v3.77p lived in the `beta/` file. These commits were all
bare "Update index.html" / "Update sw.js" web edits with **empty commit messages**,
so per-version change details are not recoverable from git history. The list below
is a reconstructed **version -> first-appearance-date** ledger only (dates are when
each version string first appears in a commit; some same-day versions may be listed
by first-seen rather than strict release order). Newest first.

- **v3.75** - 2026-06-17
- **v3.73** - 2026-06-16
- **v3.72** - 2026-06-16
- **v3.70** - 2026-06-16
- **v3.69** - 2026-06-16
- **v3.68** - 2026-06-16
- **v3.67** - 2026-06-14
- **v3.66** - 2026-06-13
- **v3.65** - 2026-06-13
- **v3.64** - 2026-06-13
- **v3.61** - 2026-06-13
- **v3.60** - 2026-06-13
- **v3.58** - 2026-06-13
- **v3.57** - 2026-06-13
- **v3.56** - 2026-06-12
- **v3.55** - 2026-06-12
- **v3.54** - 2026-06-12
- **v3.53** - 2026-06-06
- **v3.52** - 2026-06-06
- **v3.51** - 2026-06-05
- **v3.50** - 2026-06-05
- **v3.49** - 2026-06-05
- **v3.48** - 2026-06-05
- **v3.47** - 2026-06-05
- **v3.46** - 2026-05-31
- **v3.45** - 2026-05-29
- **v3.44** - 2026-05-29
- **v3.43** - 2026-05-24
- **v3.42** - 2026-05-24
- **v3.41** - 2026-05-24
- **v3.40** - 2026-05-24
- **v3.39** - 2026-05-24
- **v3.38** - 2026-05-24
- **v3.37** - 2026-05-23
- **v3.36** - 2026-05-22
- **v3.35** - 2026-05-20
- **v3.33** - 2026-05-19
- **v3.32** - 2026-05-19
- **v3.31** - 2026-05-18
- **v3.30** - 2026-05-18
- **v3.29** - 2026-05-18
- **v3.28** - 2026-05-18
- **v3.25** - 2026-05-18
- **v3.24** - 2026-05-17
- **v3.23** - 2026-05-17
- **v3.22** - 2026-05-17
- **v3.21** - 2026-05-17
- **v3.20** - 2026-05-17
- **v3.19** - 2026-05-17
- **v3.18** - 2026-05-17
- **v3.17** - 2026-05-17
- **v3.16** - 2026-05-17
- **v3.15** - 2026-05-17
- **v3.14** - 2026-05-17
- **v3.13** - 2026-05-17
- **v3.12** - 2026-05-17
- **v3.11** - 2026-05-17
- **v3.10** - 2026-05-17
- **v3.9** - 2026-05-17
- **v3.8** - 2026-05-17
- **v3.7** - 2026-05-17
- **v3.6** - 2026-05-17
- **v3.5** - 2026-05-16
- **v3.4** - 2026-05-16
- **v3.3** - 2026-05-15
- **v3.2** - 2026-05-15
- **v3.1** - 2026-05-15
- **v3.0** - 2026-05-15 (earliest commit in repo)
