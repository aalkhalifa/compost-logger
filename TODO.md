# Compost Logger — Task List

> One source of truth for what's next.
> Updated: July 11 2026
> Current version: v3.77q (beta)

---

## 🔴 NOW — Fix these before promoting to production

- [ ] **Beta-test v3.77q, then promote to production**
  - Verify the three fixes below on the live beta (see test plan), THEN copy beta → root
  - [ ] Still TODO: rename "EXPORT ALL PILES" button to "Download My Data"

---

## 🟡 NEXT — After bugs are fixed

- [ ] **PocketBase migration (major)**
  - Set up PocketBase on DigitalOcean server
  - Replace Google Drive sync with PocketBase API calls
  - Build email/password auth (no Google OAuth = no scary popup)
  - Add opt-in analytics consent checkbox at signup
  - Migration path: detect localStorage on first login, offer one-tap import
  - Offline queue: write to localStorage first, sync to PocketBase in background

- [ ] **Promote beta to production**
  - Fix bugs above first
  - Copy beta/index.html → root index.html
  - Commit with version tag

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
