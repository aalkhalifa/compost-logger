# Compost Logger — Project Document

> **Purpose:** Paste this at the start of any new Claude conversation to restore full context instantly.
> **Maintain:** Update after every session. Commit to repo alongside code changes.
> **Primary tool going forward:** Claude Code on desktop (reads repo directly, no copy-paste needed)

---

## Project Overview

**App:** Compost Logger — a PWA for tracking compost piles (formerly Compost Academy Field Logger)
**Production URL:** https://aalkhalifa.github.io/compost-logger/
**Beta URL:** https://aalkhalifa.github.io/compost-logger/beta/
**Repo:** github.com/aalkhalifa/compost-logger
**Owner:** Abdulla Al-Khalifa, Bahrain (UTC+3), Roots of Arabia
**Stack:** Single HTML file, vanilla JS, Chart.js, chartjs-plugin-annotation, jsPDF, SheetJS
**Storage:** localStorage primary (`ca_v5` key), Google Drive as cloud backup (to be replaced with PocketBase)
**Auth:** Google Identity Services OAuth (testing mode, max 100 users, 7-day token expiry)
**License:** Proprietary / All Rights Reserved (c) 2026 Abdulla Al-Khalifa / Roots of Arabia. See LICENSE.
**Service worker:** sw.js — network-first, falls back to cache offline. Cache key = `compost-logger-v3.79r` (bump on every deploy; sw.js is shared by prod + beta, so key tracks the newest deploy). NOTE: prior to v3.77q the file was corrupted with smart/curly quotes and did not parse; fixed to ASCII in v3.77q.
**SW registration (fixed v3.78a):** registration derives the repo root from `location.pathname` (strip the page filename, then a trailing `beta/`) and registers that root `sw.js`. Works from both `/<repo>/` and `/<repo>/beta/`, no hardcoded repo path. The root sw.js's default scope covers `/beta/`. Because the path is computed at runtime, promoting via `cp beta/index.html -> root index.html` stays a plain copy with no edits.

---

## Current Version

**Live beta:** v3.79r (as of July 20 2026) — PocketBase migration line, Groups A-C done
**Production:** v3.78b (promoted from beta on July 11 2026, tag v3.78b)

### Deployment structure
```
compost-logger/
├── index.html          ← production (v3.78b, stable)
├── beta/
│   └── index.html      ← active development (v3.78b — clean, next line not yet opened)
├── sw.js               ← service worker (shared)
├── manifest.json
├── LICENSE             ← proprietary, all rights reserved
├── CHANGELOG.md        ← Keep a Changelog format, grouped by version
├── PROJECT.md          ← this file
├── TODO.md
└── deploy/
    └── pocketbase/     ← backend infra (Group A): runbook, collection schema, systemd, Caddy
```

### Promotion process
When beta is stable: copy `beta/index.html` → root `index.html`, commit with version tag.

### What's confirmed in v3.77p

- Multi-probe support: CORE 1, 2, 3, 4
- Sites system with GPS capture + site manager
- Ambient temperature: manual entry + Open-Meteo API + historical backfill
- Photo scanning (Anthropic API key, stored on device)
- Watered tracking (light / medium / heavy)
- PFRP compliance toggle in settings
- Operation Summary screen
- Chart overlays: RATE, DELTA, SHADE, AMB, AMB API
- Display basis toggle: AVG (Compost Academy) vs MIN (strictest probe)
- Volume units: GAL / L / YDS + custom container unit
- Excel import + CSV import with append mode
- Export all piles as JSON backup (incomplete — see bugs)
- Settings panel (gear icon)
- Google Drive: merge on connect, conflicts renamed "[Name] — Local Copy"
- PDF full report
- Multicolor segmented progress bars (BLUE/ORANGE/GREEN/RED)
- Smart heat state labels: HEATING UP / REBUILDING HEAT / STABLE-MATURING / NOT HEATING
- Chart: horizontal scroll, date labels, landscape/portrait resize
- Home screen pile sort, entries sort toggle
- Recipe collapsed by default, Turn Cycles scrollable
- Calendar reminder button in Temperature Status card
- NEXT TURN DUE in duration format
- SINCE THERMOPHILIC START as duration
- Sample pile on first run

---

## Session Log

### July 20 2026 (Claude Code) — Group A executed on the box + Group C built

**Group A is live.** Executed the `deploy/pocketbase/` runbook directly on the
DigitalOcean droplet (`fra1`, `64.226.83.129`): PocketBase **0.22.21** (version-pinned)
at `/opt/pocketbase`, bound to `127.0.0.1:8090`, owned by an unprivileged `pocketbase`
user, under `pocketbase.service` (enabled). `vaults` collection imported from
`vaults.collection.json` — 3 fields, unique index on `user`, all 5 API rules verified.
Superuser `aalkhalifa@gmail.com` created (password in `/root/.pb_admin_password`, 0600).

**Caddy/TLS skipped** (no domain yet). HTTPS comes from a Cloudflare **quick tunnel** run
as `cloudflared-pocketbase.service` (enabled, `Restart=always`). Verified end-to-end
through the public URL: health 200, CORS preflight from the Pages origin allowed, and
signup -> login -> vault create -> per-user scoped list, with unauthenticated list
returning 0 items and a duplicate vault rejected by the unique index.

> **Caveat:** a Cloudflare *quick* tunnel mints a **new random hostname on every
> `cloudflared` restart**. The unit keeps the tunnel up and reconnecting but cannot pin
> the hostname, so a reboot leaves `PB_BASE_URL` stale. Recovery command is in
> `deploy/pocketbase/README.md`. Durable fix = domain + Caddy/TLS, or a named tunnel.

**Group C (storage/sync) built — beta v3.79r.**
- `mergeCloudData(remote, opts)` extracted from the two Drive merge blocks. They were
  **not** duplicates: only the connect path merged recipes, adopted remote
  `ingHist`/`tempUnit`, renamed same-name piles, and guarded a missing `sites` array. Those
  four became `opts` flags so each Drive site reproduces its old behavior exactly.
- `pbLoad()` / `pbSaveNow()` (PULL-merge-PUSH, `updated` as the concurrency baseline),
  plus `pbBuildPayload` / `pbApplySettings` / `pbPersistLocal` / `setPbStatus`.
- `save()` now prefers PocketBase when signed in, else Drive. Same for `forceSyncNow` and
  the online/offline/beforeunload handlers.
- **Verified:** a differential harness ran the pre-extraction code and `mergeCloudData`
  over 6 remote fixtures on both Drive paths — 12/12 byte-identical. The harness was
  mutation-tested (flipping the sync flags produced 6 failures) to confirm it can detect
  a regression. PocketBase API shapes validated against the live server.
- `sw.js` cache key corrected to `v3.79r`; it had drifted at `v3.78b` while beta moved
  through v3.79b-q.

**Note:** `origin/main` had 16 unrecorded commits (beta v3.79b-q: chart refinements,
water labels, probe-spread/heating-rate mini charts, freeze cap raised 8h -> 24h). Group
A/C work was rebased on top of them. Those versions are not documented in this log.

**Next:** Group D (migration path — detect local `ca_v5` on first PB login, one-tap
import). Then E (analytics consent), F (login UI), G (Drive removal), H (release).

### July 11 2026 (Claude Code) — later session

Promoted **v3.78b to production** (`cp beta/index.html -> root index.html`, annotated
tag `v3.78b`, pushed to `origin/main`). Production went v3.77q -> v3.78b, so the real
SW-registration fix (v3.78a) and the "Download My Data" label (v3.78b) are now live on
prod. `sw.js` cache key was already `compost-logger-v3.78b` (shared file), so no SW edit
was needed. Promotion stayed a plain copy — the `app-version-home` / `app-version-settings`
divs are populated at runtime from `BUILD_VER` (no `/beta/` in the prod path = no " BETA"
suffix), so no per-file version edits.

Then **scoped the PocketBase migration into an approvable change list** (groups A-H in
TODO.md), locked the design decisions (blob-per-user, import-then-remove, existing DO box
+ TLS subdomain, single configurable `PB_BASE_URL`, raw-fetch auth), and — after explicit
approval — began building. Commits: `Scope PocketBase migration` -> `Group A` -> `Group B`.

- **Group A (infra, no app code)** — added `deploy/pocketbase/`: deployment runbook
  (`README.md`), importable blob-per-user `vaults` collection schema
  (`vaults.collection.json`), systemd unit (`pocketbase.service`), Caddy TLS template
  (`Caddyfile`). Server execution is on Abdulla (I can't reach the DO box); TLS + CORS
  lockdown wait on a domain. No domain purchased yet, so the runbook documents a
  test-before-domain path (local `http://localhost` dev, or a temp `nip.io` /
  Cloudflare-Tunnel HTTPS host). Handoff to Group B is one value: the reachable base URL.
- **Group B (auth, beta only)** — opened the **v3.79** beta line. Added the PocketBase
  email/password auth layer to `beta/index.html`, purely additively (Drive/GSI untouched;
  their removal is Group G's import-then-remove): `PB_BASE_URL` constant (placeholder
  `http://localhost:8090`), `pbApi` helper + `pbSignup`/`pbLogin`/`pbLogout`/
  `pbRestoreAuth` via raw `fetch` (no PB JS SDK), session persisted in the `pb_auth`
  localStorage key. `pbRestoreAuth()` runs on load and makes zero network calls when no
  session is stored, so existing users are unaffected. No Google popup. Verified: one
  inline script block, `node --check` passes, no `?.`/`??`/backticks/non-ASCII introduced.
  Not yet surfaced in UI (Group F) or wired to sync (Group C); untestable end-to-end
  until PB is reachable.

**Next:** stand up Group A on the DO box to unblock testing, then build **Group C**
(storage/sync: extract `mergeCloudData(remote)`, add `pbLoad`/`pbSaveNow`). Groups C-H remain.

### July 11 2026 (Claude Code)

Shipped v3.77q (all three priority bugs) then promoted it to production, opened the
v3.78 beta line, and added a license. All changes pushed to `origin/main`; live on
GitHub Pages. Remote was switched from HTTPS to SSH (`git@github.com:...`) so pushes
work without credential prompts.

- **v3.77q** — the three NOW bugs, all fixed and beta-tested:
  - BUG 1 (siteId lost on Drive sync): Drive payload now = full `ca_v5` shape; connect
    (`initDriveStorage`) + sync (`driveSaveNow`) merge `sites` by id (local wins),
    preserve `pile.siteId` when a Drive copy lacks it, never wipe local sites when
    `driveData.sites` is undefined, and run `migrateSites()` after merge.
  - BUG 2 (500-900h READY): added `cappedNow(lastTs)` (caps active-cycle extrapolation
    at lastEntry + 8h); applied in `computeIndependentStages`, `classifyCycleTime`,
    `buildChronologicalSegments`, and `computeSatisfiedStages`. Rewrote misleading
    "Option B" comments. `calcSmartTimer` inherits the cap.
  - BUG 3 (incomplete export): `exportAllJSON` now emits full `ca_v5` shape + separate-key
    settings (`displayBasis`, `showPFRP`, `pilesSortMode`, `entriesSortMode`) +
    `exportVersion`/`exportedAt`.
  - Repaired `sw.js`: it was corrupted with smart/curly quotes and did not parse at all
    (SW never ran anywhere); fixed to ASCII, kept network-first.
- **Promoted v3.77q to production** — `cp beta/index.html -> root index.html`; annotated
  tag `v3.77q`. Production went v3.75 -> v3.77q.
- **Added LICENSE** — Proprietary / All Rights Reserved (c) 2026 Abdulla Al-Khalifa /
  Roots of Arabia.
- **v3.78 / v3.78a / v3.78b beta** — opened v3.78; v3.78a fixed the SW registration path
  (derives repo root from `location.pathname`, registers root `sw.js`, works from `/`
  and `/beta/`, promotion stays a plain copy); v3.78b renamed the "EXPORT ALL PILES"
  label to "Download My Data".

---

## Architecture Notes

### Single-file constraint
Everything is one `index.html`. No build system. Surgical edits only — never rebuild from scratch.

### Key functions
- `buildCycles(entries)` — splits entries into cycles by turn entries. Turn entry is LAST in its cycle.
- `cycleHighestStageStatus(cycleEntries)` — returns highest active stage + thermophilic start
- `calcSmartTimer(entries)` — computes NEXT TURN DUE deadline, remaining time, elapsed
- `classifyCycleTime(cycleEntries)` — returns {mesoMs, thermoMs, readyMs, satisfied} per stage band
- `getHeatStateLabel(pile, sorted)` — returns smart label when pile is below thermophilic
- `renderStageBarActive(band, times, coreTemp)` — renders one multicolor bar for active cycle
- `renderCompletedCycleBar(entries, turnEntry, idx)` — renders history bar (BLUE/ORANGE/RED)

### localStorage key
`ca_v5` — stores `{piles, sites, recipes, ingHist, tempUnit, volumeUnit, containerUnit, deletedPileIds}`.
`sites` live INSIDE `ca_v5` (each pile carries `siteId`), NOT a separate key. A few
settings live in their own keys: `ca_displayBasis`, `ca_showPFRP`, `ca_pilesSort`, `ca_entriesSort`.

### Temperature bands (Compost Academy model)
- Stage 1: 131-149°F, 72h continuous required
- Stage 2: 150-155°F, 48h required
- Stage 3: 156-164°F, 24h required
- Stage 4: 165-174°F, 12h required
- 175°F+: TURN NOW (overheat)

### Biological model rules
- Turn entry is the LAST entry of its cycle (not first of next)
- Turn entry shows PRE-TURN (hot) temperature
- Post-turn cooling appears in subsequent entries
- `displayCycles = cycles.slice(1)` when cycles.length > 1
- Stage satisfaction: continuous streak above stage floor for required hours

### Drive sync (v3.77p behavior)
- On connect: merges local + Drive data
- Local-only piles: uploaded to Drive
- Conflict: local pile renamed "[Name] — Local Copy"
- **Fixed in v3.77q:** Drive payload now carries `sites` (full `ca_v5` shape); connect/sync
  paths merge sites by id (local wins on conflict), preserve `pile.siteId` when a Drive
  copy lacks it, never wipe local sites when a Drive file has no `sites` array, and run
  `migrateSites()` after merge.

### Critical DO-NOTs (Safari/iOS compatibility)
- No backticks inside JS string literals
- No non-ASCII characters in JS code or comments
- No `/>` self-closing tags inside JS string templates
- No optional chaining (`?.`) or nullish coalescing (`??`)
- No rebuilding from scratch — surgical edits only

### Process rule (hard requirement)
Before writing ANY code: list all proposed changes, wait for explicit approval.
A build was rolled back for violating this (v3.77n incident).

---

## Known Bugs

### BUG 1 — FIXED (v3.77q): Location/siteId resets on Drive sync (PRIORITY)
**Symptom:** Pile shows correct site assignment when opened from localStorage.
As soon as Drive syncs, site assignment disappears ("Uncategorized").
**Root cause:** The connect path (`initDriveStorage`) never read/merged `d.sites`, and both
merge paths could replace a pile with an older Drive copy that had no `siteId`.
**Fix (v3.77q):** Drive payload now = full `ca_v5` shape. Connect + sync paths merge sites by
id (local wins), preserve `pile.siteId` when the Drive copy lacks it, skip the site merge when
`driveData.sites` is undefined (no wipe), and run `migrateSites()` after merge.
**Status:** Fixed in beta v3.77q. Awaiting beta test before promotion.

### BUG 2 — FIXED (v3.77q): active-cycle extrapolation
**Symptom:** Active cycle bars show 500-900h READY time.
**Root cause:** Last entry interval extended to "now". If last entry was days ago at a hot temp,
all elapsed time counted as READY.
**Fix (v3.77q):** Added `cappedNow(lastTs)` helper (caps at lastEntry + 8h). Applied in
`computeIndependentStages`, `classifyCycleTime`, `buildChronologicalSegments`, and
`computeSatisfiedStages`. `calcSmartTimer` inherits the cap.
**Status:** Fixed in beta v3.77q. Awaiting beta test before promotion.

### BUG 3 — FIXED (v3.77q): JSON export incomplete
**Symptom:** Export JSON missing sites array, recipe templates, and some settings.
**Fix (v3.77q):** `exportAllJSON` now emits the full `ca_v5` shape (incl. `sites`, `siteId` on
piles, `recipes`, `volumeUnit`, `containerUnit`, `deletedPileIds`) plus separate-key settings
(`displayBasis`, `showPFRP`, `pilesSortMode`, `entriesSortMode`) and `exportVersion`/`exportedAt`.
**Status:** Fixed in beta v3.77q. Awaiting beta test before promotion.

---

## Infrastructure Decisions (July 2026)

### Moving from Google Drive to PocketBase
**Decision:** Migrate sync/storage from Google Drive to PocketBase on DigitalOcean.
**Why:**
- Google OAuth "unverified app" warning is scaring off new users (Compost Academy colleagues)
- 100-user hard limit in testing mode
- 7-day token expiry — weekly re-login required
- Drive API is a hack for what should be a proper backend
- PocketBase: single binary, runs on existing DigitalOcean server, no extra cost,
  clean email/password auth, no scary popups, full data ownership
**Status:** Scoped July 11 2026 (approvable change list in TODO.md), build not yet started.
**Locked design decisions (July 11 2026):**
- **Data model:** blob-per-user — one `vaults` record holds the full `ca_v5` JSON;
  reuses the existing pile/entry/site/recipe/tombstone merge logic (extracted once into
  `mergeCloudData(remote)`). Relational per-pile records deferred until the share view needs them.
- **Drive cutover:** import-then-remove — keep a one-time "import from Drive" during the
  beta, then delete all Drive/GSI code once users are migrated.
- **Hosting:** PocketBase on the existing DigitalOcean box behind a TLS subdomain.
- **Base URL:** a single configurable `PB_BASE_URL` constant in the app; build/test against
  a placeholder or IP. **No domain purchased yet** — acquiring one (rootsofarabia.com or
  alternative) is a *deploy* prerequisite, not a build blocker.
- **Auth transport:** raw `fetch` against PB's REST API (no PB JS SDK) to respect the
  single-file + Safari/no-optional-chaining constraints.
**Migration path for existing users:** On first PB login, detect localStorage data (and
optionally an existing Drive file), offer one-tap import.

### Hosting plan
- Keep GitHub Pages for now
- Add custom domain (TBD — rootsofarabia.com or product-specific)
- DigitalOcean for PocketBase backend
- App Store / Google Play: via Capacitor wrapper, after PocketBase migration

### Data collection plan
- Opt-in anonymized analytics at signup
- "Download my data" button (full JSON export including sites, recipes, settings)
- Privacy policy required before public launch

---

## Compost Academy / Brian Vagg situation
Brian politely declined integration — CA has their own development plans.
Abdulla handled it perfectly: removed CA branding, offered code, stayed professional.
Brian was warm and impressed — invited Abdulla to contribute to their student group voluntarily.

**Implications for the app:**
- Build completely independently under Roots of Arabia branding
- Instructor/share view feature: build as generic feature (any educator, not CA-specific)
- Participate in CA student group for community value, not as a dependency
- Do not wait for CA ecosystem before advancing Roots of Arabia product

---

## Pending Features (Prioritized)

### 🔴 HIGH — Bugs to fix first
1. **Location/siteId bug** — site assignments lost on Drive sync
2. **classifyCycleTime extrapolation** — inflated READY times
3. **JSON export completeness** — add sites, recipe templates, settings

### 🟡 NEXT — Confirmed to build
4. **PocketBase migration** — replace Google Drive sync
5. **Migration path for existing users** — detect localStorage on first PocketBase login
6. **Opt-in analytics consent at signup**
7. **Drive auto-connect on app load** — before PocketBase migration if keeping Drive temporarily

### 🟢 BACKLOG
8. **Instructor/share view** — share pile read-only via link
9. **Custom domain** — when ready to go public
10. **App Store / Play Store** — via Capacitor, after PocketBase

---

## Deferred / Parked Ideas

- **Degree-hours above 131°F** — area under curve, scientific compliance metric
- **Core spread / probe uniformity** — std dev between probes per reading
- **Heating rate** — first derivative of temperature (dT/dt)
- **PFRP compliance auto-flag** — automatic pass/fail per EPA 503
- **Compliance profiles** — configurable (Compost Academy, PFRP, Bahrain standards)
- **RAG-based AI consultant** — rule-based Option A is live, Option B (API) planned
- **LoRaWAN probe integration** — Heltec WiFi LoRa 32 V3 → RAK7289V2 → TTN (hardware in progress)
- **Label rename: "C:N ratio" → "Input Ratio"** — parked
- **Google OAuth verification** — skip, replacing with PocketBase
- **Light mode** — decided NO
- **Multi-user / collaboration** — not planned for current phase
- **Personal benchmarks** — compare piles to your own history
- **Community benchmarks** — opt-in aggregate data (depends on PocketBase)

---

## Key Decisions and Why

| Decision | What | Why |
|---|---|---|
| Single HTML file | All code in one index.html | Minimal deployment complexity, GitHub Pages hosting |
| No light mode | Dark only | Field equipment aesthetic, explicit design decision |
| Drive sync: rename-on-conflict | Conflicts get "[Name] — Local Copy" | Simpler than merge/tombstones, no data loss |
| Replacing Drive with PocketBase | Own backend on DigitalOcean | Eliminate Google OAuth warning, own the data, enable analytics |
| Turn entry = last in cycle | buildCycles() puts turn as last entry | Biological model: record turn at moment of turning |
| Stage tracking is independent | Each stage has its own streak counter | Pile can satisfy Stage 3 without satisfying Stage 1 |
| classifyCycleTime cap at 8h | Freeze extrapolation after 8h | Prevents runaway READY time when user hasn't logged in days |
| Decimal rounding on display | Math.round() for display only | C↔F conversions create .9 artifacts, storage keeps precision |
| No auto-advance on temp fields | Removed | iOS keyboard has no Enter key, caused inconsistency |
| Day 1 = earliest entry date | Not pile.created timestamp | Users backfill historical entries before app creation date |
| localDateStr() for all dates | Custom UTC-safe function | Bahrain UTC+3 midnight entries showed wrong date |
| Sample pile on first run | 30-day test pile auto-loaded | Onboarding — users need to see data to understand the app |
| Build independently of CA | Roots of Arabia product | Brian declined integration, has own development plans |

---

## Test Data Files

- `test-30-day-pile.csv` — 30 days, 5 complete cycles (Stage 3→2→1→1→1), maturation phase
- `spring-batch-test.csv` — May 2026, 4 complete + Cycle 5 in progress (~48h remaining)
- `chatgpt-compost-csv-prompt.txt` — standalone LLM prompt for generating new test CSVs

### Biological rules for test data
- Turn entries show PRE-TURN (hot) temperature
- Post-turn: 1-3 readings below 131°F before rebuild
- Turn happens within 60-120 minutes of satisfaction
- Mesophilic phase short (6-12h) — well-built piles reheat fast
- Each cycle's T0 must be clean (rebuild drops below 131°F first)

---

## People and Context

- **Abdulla Al-Khalifa** — owner, Bahrain, Roots of Arabia
- **Brian Vagg** — Compost Academy instructor (declined integration, invited voluntary participation)
- **Compost Academy** — biological model reference (Stage 1-4, PFRP)
- **LivingSoil.ai** — second app in development, same product family aesthetic
- **Hardware project** — LoRaWAN probe (Heltec WiFi LoRa 32 V3 → RAK7289V2 → TTN), in progress

---

## Workflow

### Starting a session (Claude chat)
Paste this document. Say: "Continue Compost Logger. Current version is vX.XX."

### Starting a session (Claude Code)
Claude Code reads repo directly. Say: "Read PROJECT.md and TODO.md first."

### Ending a session
Ask: "Update PROJECT.md and TODO.md with what changed today."
Commit both files alongside any code changes.

### Before any code is written
List all proposed changes → wait for explicit approval → then build.

### Version numbering
`v3.XX` — bump on every meaningful change. Sub-revision: `v3.77n` (letter suffix).
Service worker cache key must match: `compost-logger-v3.XX`
