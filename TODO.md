# Compost Logger — Task List

> One source of truth for what's next.
> Updated: July 11 2026
> Current version: v3.78b (beta = production; promoted July 11 2026)

---

## 🔴 NOW — Active beta work (v3.78b)

- Beta v3.78b is clean and **now promoted to production** (tag v3.78b). Beta == prod.
  Next major work is the PocketBase migration below; nothing else queued for the
  v3.78 line yet.

---

## 🟡 NEXT — After bugs are fixed

- [ ] **PocketBase migration (major)** — SCOPED July 11 2026, awaiting build approval.
  Decisions locked: **blob-per-user** data model, **import-then-remove** Drive cutover,
  **existing DigitalOcean box + subdomain** hosting. Phase 1 = drop-in replacement for
  Drive that reuses the current merge logic. Approvable change groups:
  - **A. Server/infra (outside repo):** PocketBase binary on the existing DO box behind
    a TLS subdomain; `users` (built-in) + one `vaults` collection (`user` relation,
    `data` JSON = full ca_v5 shape, `updated` autodate, `analyticsOptIn` bool); CORS
    allows the GitHub Pages origin.
  - **B. Auth:** remove `gsi/client` script + `CLIENT_ID`; add a single configurable
    `PB_BASE_URL` constant (all PB calls read from it); add `pbLogin/pbSignup/
    pbLogout/pbRestoreAuth` via raw `fetch` (no PB JS SDK — respects single-file +
    Safari/no-optional-chaining rules); store `pb_auth` in localStorage.
  - **C. Storage/sync:** extract the duplicated merge into `mergeCloudData(remote)`;
    add `pbLoad()` + `pbSaveNow()` (PULL-merge-PUSH, same shape as driveSaveNow, with
    `updated`-based optimistic concurrency); repoint `save()` from driveSaveNow.
  - **D. Migration path:** on first PB login detect local `ca_v5` (and optionally an
    existing Drive file) → one-tap import that pushes to the vault.
  - **E. Analytics consent:** opt-in checkbox on signup → `analyticsOptIn` (wiring
    only; analytics pipeline stays backlog).
  - **F. UI:** swap DATA-card CONNECT/DISCONNECT/SYNC for login/signup/logout + email +
    status; `updateDriveUI` -> `updatePbUI`.
  - **G. Drive removal:** keep a one-time "import from Drive" during beta, then delete
    all Drive/GSI code once migrated.
  - **H. Release:** bump BUILD_VER (v3.79 line) + sw.js cache key; ship to /beta/ first,
    beta-test, then promote. Offline-first `save()` (localStorage first) is unchanged.
  - **Deploy prerequisite (NOT a build blocker):** no domain purchased yet. Build
    against the configurable `PB_BASE_URL` constant using a placeholder/IP for now.
    Acquiring a domain (rootsofarabia.com or alternative) + TLS subdomain is required
    before beta deploy, but not before writing/testing the code.
  - **Out of scope (stays backlog):** relational per-pile records, instructor/share
    tokens, actual analytics pipeline, Capacitor, custom domain.

- [x] **Promote beta to production** — done July 11 2026 (v3.78b, tag v3.78b)

- [ ] **Custom domain**
  - Decide: rootsofarabia.com or product-specific
  - Point to GitHub Pages (free) or DigitalOcean (after PocketBase)

---

## 🟢 BACKLOG — Confirmed, not urgent

- [ ] **Instructor/share view**
  - Share pile read-only via link (generic — not CA-specific)
  - Enables teaching platform use case
  - Depends on PocketBase (needs server-side share tokens)

- [ ] **App Store / Google Play**
  - Via Capacitor wrapper (wraps existing HTML app)
  - After PocketBase migration (need clean auth story)
  - Google Play: $25 one-time, 1-3 day review
  - Apple App Store: $99/year, stricter review

- [ ] **"Download My Data" button**
  - Complete JSON export (after fixing incomplete export bug above)
  - GDPR/PDPL compliance tool

---

## 🔵 PARKED — Good ideas, revisit later

- [ ] Degree-hours above 131°F (area under curve)
- [ ] Core spread / probe uniformity (std dev between probes)
- [ ] Heating rate (dT/dt first derivative)
- [ ] PFRP compliance auto-flag (EPA 503 pass/fail)
- [ ] Compliance profiles (CA vs PFRP vs Bahrain)
- [ ] RAG-based AI consultant (rule-based live, API version parked)
- [ ] LoRaWAN probe API endpoint (hardware build ongoing)
- [ ] Community benchmarks (depends on PocketBase + user base)
- [ ] Personal pile benchmarks (compare to your own history)
- [ ] Label rename: "C:N ratio" → "Input Ratio"
- [ ] LivingSoil.ai — second app, same product family

---

## ✅ DONE — Reference

- **v3.78b promoted to production** (July 11 2026, tag v3.78b); prod went v3.77q -> v3.78b
- **v3.78b — rename** "EXPORT ALL PILES" label to "Download My Data" (July 11 2026)
- **v3.78a — fix beta service worker path** — registration derives the repo root from
  `location.pathname` and registers the root `sw.js`; works from `/` and `/beta/`, no
  hardcoded path, promotion stays a plain copy (July 11 2026)
- **v3.77q promoted to production** (July 11 2026, tag v3.77q); v3.78 beta opened
- **LICENSE added** — proprietary / all rights reserved (c) 2026 Abdulla Al-Khalifa / Roots of Arabia
- **v3.77q — siteId Drive sync fix:** Drive payload = full ca_v5 shape; connect + sync
  merge sites by id (local wins), preserve pile.siteId, no wipe when Drive lacks sites,
  migrateSites() after merge
- **v3.77q — 8h extrapolation cap:** cappedNow() applied in computeIndependentStages,
  classifyCycleTime, buildChronologicalSegments, computeSatisfiedStages
- **v3.77q — complete JSON export:** full ca_v5 shape + separate-key settings + exportVersion
- **v3.77q — sw.js repaired:** was corrupted with curly quotes (would not parse); fixed to
  ASCII, cache key bumped to compost-logger-v3.77q
- Multi-probe (CORE 1-4)
- Sites system with GPS
- Ambient temperature (manual + Open-Meteo API + backfill)
- Photo scanning (Anthropic API)
- Watered tracking (light/medium/heavy)
- PFRP compliance toggle
- Operation Summary screen
- Chart overlays (RATE, DELTA, SHADE, AMB)
- Display basis toggle (AVG / MIN)
- Volume units + custom container
- Excel import + CSV import/export with append mode
- Drive sync: merge on connect, rename-on-conflict
- Multicolor segmented progress bars (BLUE/ORANGE/GREEN/RED)
- Smart heat state labels
- Chart: horizontal scroll, date labels, landscape resize
- Home screen pile sort + entries sort toggle
- Recipe collapsed by default
- Turn Cycles + ALL ENTRIES scrollable
- Calendar reminder in status card
- NEXT TURN DUE in duration format
- SINCE THERMOPHILIC START as duration
- Sample pile on first run
- PDF: Core at turn label + peak temp per cycle
- Removed CA branding (Brian Vagg email exchange)
- PROJECT.md + TODO.md system established
