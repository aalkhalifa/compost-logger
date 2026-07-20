# Compost Logger — Task List

> One source of truth for what's next.
> Updated: July 20 2026
> Current version: beta v3.79w (PocketBase line) / production v3.78b
> Backend: https://api.compostlogger.com (stable, TLS, CORS locked)

---

## 🔴 NOW — Active beta work (v3.79w)

- [ ] **Re-test sync on the iPhone after v3.79w deploys.** Three things are waiting:
  the SYNC ERROR fix (`sw.js` was caching API responses — not the tunnel, which was fine),
  the demo-pile duplicate fix, and the move to the real domain. **Hard-refresh or reinstall
  the PWA** so the new service worker activates — the old one is still installed on that
  device and will keep serving the stale cached list until it does.
- [ ] **Confirm the vault self-cleans** — see below; unchanged by the domain move.
- [ ] **Decide when to retire the Cloudflare tunnel.** It still fronts the same backend as
  a fallback. Once the domain has proven itself, `systemctl disable --now
  cloudflared-pocketbase` closes a second public path in. Its hostname still rotates on
  restart, so it is break-glass only, not a second endpoint.
- [ ] **Pending kernel upgrade on the box** (running 6.8.0-124, expects 6.8.0-136). A
  reboot is now much safer than it was — the backend URL no longer depends on the tunnel —
  but it *will* rotate the tunnel's fallback hostname. Verify `api.compostlogger.com`
  comes back up after any reboot; all three services are `enabled`.
- [ ] **Confirm the vault self-cleans.** It currently holds `Demo Pile — 30 Days` plus
  five `— Local Copy` duplicates. No manual cleanup needed: sign in on v3.79v and make any
  edit, and the next save purges them, because every vault write replaces `data` wholesale
  and the demo piles are now filtered out of the payload. Verify afterwards that the six
  demo entries are gone and the real piles are intact.

- PocketBase migration **Groups A–F are done**. The migration is now **reachable by a
  real user**: sign up, sign in, sync, migrate a device's existing data into an account,
  and set analytics consent.
- **Beta-test before Group G.** G deletes the Drive code, the last exit if something in
  A–F is wrong. The first real-device test already found a genuine bug (the `sw.js`
  caching issue above) that every headless test missed, so treat device testing as
  required, not a formality.
- **Test the PWA over http(s), not `file://`.** Service workers do not register on
  `file://`, so the entire caching layer went unexercised until the iPhone test. Any
  future browser verification needs a local http server at minimum.
- **Rollback is ready if it misbehaves.** Beta builds are tagged `v3.79r` / `v3.79s` /
  `v3.79t`; exact revert commands are in the **ROLLBACK** section of PROJECT.md. Note the
  service-worker trap documented there: a rollback needs a *new* `sw.js` cache key, never
  the old one. Production stays v3.78b (pure Drive, untouched) as the ultimate fallback.
- **Next up: Group G** (Drive/GSI removal), then H (release/promotion).
- **The ephemeral-hostname caveat is retired.** `PB_BASE_URL` is now the stable
  `https://api.compostlogger.com`. If sign-in fails with "Can't reach the server", check
  `systemctl status caddy pocketbase` and the cert (`curl -sI
  https://api.compostlogger.com/api/health`) rather than hunting for a rotated tunnel name.
- **Local testing needs a CORS exception now.** The backend only accepts
  `https://aalkhalifa.github.io`, so a `file://` or `localhost` build is blocked by the
  browser. Add that origin to `--origins` in `pocketbase.service` temporarily, or test
  against the deployed build.

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
    - **[DONE and LIVE, July 20 2026]** Executed on the DO box: PocketBase 0.22.21 pinned,
      under systemd, `vaults` imported and verified (fields, unique index, all 5 rules),
      superuser created, `PB_BASE_URL` set. Initially fronted by a Cloudflare quick tunnel.
    - **[COMPLETE, July 20 2026 — v3.79w]** Domain + TLS done: `api.compostlogger.com`
      behind Caddy with an auto-renewing Let's Encrypt cert, PocketBase still bound to
      localhost. CORS locked to `https://aalkhalifa.github.io` via PocketBase `--origins`
      (**not** at the Caddy layer — doing both sends duplicate ACAO headers and browsers
      reject that). Tunnel kept as a break-glass fallback. **Group A is fully done.**
  - **B. Auth:** add a single configurable `PB_BASE_URL` constant (all PB calls read from
    it); add `pbLogin/pbSignup/pbLogout/pbRestoreAuth` (+ `pbApi` helper) via raw `fetch`
    (no PB JS SDK — respects single-file + Safari/no-optional-chaining rules); store
    `pb_auth` in localStorage.
    - **[DONE in beta, July 11 2026 — v3.79 line]** Additive: functions added, callable,
      `pbRestoreAuth()` wired into load (no-op with no stored session). GSI/`CLIENT_ID`
      removal was moved to **Group G** (import-then-remove needs Drive alive during beta).
      Not yet surfaced in UI (Group F) or wired to sync (Group C). Untested end-to-end
      until PB is reachable (`PB_BASE_URL` still the `localhost:8090` placeholder).
  - **C. Storage/sync:** extract the duplicated merge into `mergeCloudData(remote)`;
    add `pbLoad()` + `pbSaveNow()` (PULL-merge-PUSH, same shape as driveSaveNow, with
    `updated`-based optimistic concurrency); repoint `save()` from driveSaveNow.
    - **[DONE in beta, July 20 2026 — v3.79r]** `mergeCloudData(remote, opts)` shared by
      both backends. The two Drive blocks were **not** duplicates (recipes, remote
      settings, rename-on-conflict, sites guard were connect-path only), so those became
      `opts` flags and each Drive site passes the flags preserving its old behavior —
      verified byte-identical over 6 fixtures x 2 paths (12/12), harness mutation-tested.
      `save()` prefers PB when signed in, else Drive. Concurrency is read-merge-write, not
      atomic (PB has no If-Match): a write landing between GET and PATCH can still be
      missed, but the union-by-id merge bounds the loss to an edit, never a whole pile.
  - **D. Migration path:** on first PB login detect local `ca_v5` (and optionally an
    existing Drive file) → one-tap import that pushes to the vault.
    - **[DONE in beta, July 20 2026 — v3.79s]** `pbFirstRunDecision` gates the first vault
      write; `pbLocalDataState` classifies empty / sample-only / real so the prompt only
      appears when real data is at stake. Declining is destructive (option (a)), so it
      takes a second confirm naming the exact pile + entry count and pointing at
      "Download My Data"; cancelling that second confirm falls back to import. Decision
      remembered per (device, account) in `pb_import_<userId>`. The demo pile is now
      flagged `isSample` (with a name fallback for older devices) and is never uploaded.
      **Drive-file import deferred** — local `ca_v5` already covers every Drive user, and
      it would add a third merge authority. Verified by an 18-case decision-matrix harness.
  - **E. Analytics consent:** opt-in checkbox on signup → `analyticsOptIn` (wiring
    only; analytics pipeline stays backlog).
    - **[DONE in beta, July 20 2026 — v3.79t]** `pbSetAnalyticsOptIn` writes via a
      dedicated single-field PATCH (deliberately not folded into `pbSaveNow`, which fires
      from `save()` and could push a stale local default over a cloud opt-in);
      `pbLoad` restores it from the vault; Settings row lets the user change their mind.
      Also fixed a consent leak: `pbLogout` did not clear `pbAnalyticsOptIn`, so a second
      account signed up in the same session inherited the first one's opt-in. Copy is
      honest that nothing is collected yet — there is still no pipeline and no privacy
      policy.
  - **F. UI:** swap DATA-card CONNECT/DISCONNECT/SYNC for login/signup/logout + email +
    status; `updateDriveUI` -> `updatePbUI`.
    - **[DONE in beta, July 20 2026 — v3.79t]** `updatePbUI` created (all 8 `pbStatus`
      values); sign-in/sign-up overlay with Enter-to-submit, iOS Keychain `autocomplete`
      hints, signup-only length validation, and an in-flight submit lock; Settings ACCOUNT
      card. `pbAuthErrorMessage` maps PocketBase failures to human text without leaking
      server strings, and keeps bad credentials opaque so accounts cannot be enumerated.
      Drive keeps its Settings card but loses its header button — one status line, PB
      takes precedence, Drive-only users see no change. Verified in a real (headless
      Chrome) browser end-to-end against the live backend, including both Group D
      migration prompts and the destructive decline path.
  - **G. Drive removal:** keep a one-time "import from Drive" during beta, then delete
    all Drive/GSI code once migrated.
  - **H. Release:** bump BUILD_VER (v3.79 line) + sw.js cache key; ship to /beta/ first,
    beta-test, then promote. Offline-first `save()` (localStorage first) is unchanged.
  - **Deploy prerequisite — SATISFIED July 20 2026.** compostlogger.com registered on
    Cloudflare; `PB_BASE_URL` is the stable `https://api.compostlogger.com`.
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

---

## 🔵 PARKED — Good ideas, revisit later

- [ ] **Sync concurrency — non-atomic read-merge-write** (known limitation, accepted
  July 20 2026). `pbSaveNow` does PULL-merge-PUSH using the vault's `updated` stamp as
  its baseline, but PocketBase has no `If-Match`, so a write landing between our GET and
  PATCH is missed. Union-by-id merging bounds the damage: a **lost edit** to an existing
  pile when two devices edit the *same* pile simultaneously — never a lost pile.
  - **Trigger to fix:** the first multi-user facility (two people writing one account),
    which turns a rare race into a routine one.
  - **Fix:** relational per-pile records instead of one blob, so concurrent edits to
    different piles cannot collide at all.

- [ ] **Vault size — 5MB `data` field cap** (known limitation, accepted July 20 2026).
  The `vaults.data` JSON field is capped at 5,242,880 bytes (`vaults.collection.json`),
  which is roughly **20k entries** before writes start failing. Nothing currently warns
  the user as they approach it, and the failure would surface as a sync error.
  - **Trigger to fix:** any user's vault passing ~3MB (60% of cap).
  - **Fix:** raise the PocketBase field limit, or split the blob across multiple records.

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

- **PocketBase migration Groups A–F** (July 20 2026) — backend live on the DO box under
  systemd behind a Cloudflare tunnel; shared `mergeCloudData`; `pbLoad`/`pbSaveNow`;
  first-login migration gate; analytics consent; account UI. Beta v3.79t is the first
  build a user can sign into. Tagged `v3.79r`/`v3.79s`/`v3.79t`. **G and H remain.**
- **"Download My Data" button** — shipped: full JSON export via `exportAllJSON` (complete
  `ca_v5` shape + separate-key settings, fixed v3.77q), surfaced in Settings > DATA with
  that label since v3.78b. Group D's destructive confirm points users at it.

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
