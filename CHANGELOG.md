# Changelog

All notable changes to Compost Logger are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses date-stamped `v3.XX` releases with letter sub-revisions
(e.g. `v3.77q`). Beta builds ship from `/beta/`; production is promoted by copying
`beta/index.html` to the repo-root `index.html`. `sw.js` is shared by both.

## [3.78] - 2026-07-11 [beta]

Active beta line opened after v3.77q was promoted to production. Sub-revisions below
are newest first: v3.78b, v3.78a, v3.78 (open).

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
