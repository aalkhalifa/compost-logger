# Compost Logger — Task List

> One source of truth for what's next.
> Updated: July 20 2026
> **Production: v3.82** (July 20 2026) — PocketBase accounts + demo-pile fix, Drive retained
> **Beta: v3.82** — mirrors prod, no line open. Next line opens at `v3.83a`, ships as `v3.83`
> Backend: https://api.compostlogger.com (stable, TLS, CORS locked)
> Versioning: **beta always has a letter, production never does**. A line opens at `v3.83a` and ships as `v3.83` — no gaps.

---

## 🔴 NOW — v3.82 is in production

The PocketBase migration is **live for all users**. Groups A–F shipped; v3.79v and v3.79w
were verified on **iPad Safari** (signup, import, `ACCOUNT SYNCED`, `OFFLINE (local only)`,
reconnect sync — and again after the domain move), which unblocked Group H. Production went
v3.78b → v3.80 → **v3.82** (demo-pile purge fix). **Drive is retained and still works.**

- [ ] **Watch production for a few days.** Every existing user is a Drive user who now sees
  an account UI for the first time. Things worth checking early: nobody is stuck on SYNC
  ERROR, Drive-only users see an unchanged header, and no unexpected `— Local Copy`
  duplicates appear in vaults.
- [x] **Vault self-clean — CONFIRMED July 20 2026.** Failed on v3.80 (the v3.79v filter was
  defeated by its own data-loss guard: `mergeCloudData` stamps `lastModified` on every
  merged pile, which the guard read as "user edited this"). Fixed in v3.81a and verified on
  the real account: **13 piles → 7**, all six `Demo Pile` entries gone, all seven real piles
  intact — checked by diffing pile ids *and individual entry ids* against a pre-fix
  snapshot, plus `sites`/`recipes`/`ingHist`/units/settings all unchanged. A later sync
  stayed clean, which is the case that matters since the original bug minted a duplicate on
  every sign-in. **Promoted to production as v3.82.**
- [ ] **Group G — Drive/GSI removal, deferred to ~July 27 2026.** Now that production runs
  on PocketBase, Drive is the fallback for anyone who has not migrated. Let it sit a week
  before deleting it.

### ⚠️ Before making any compliance claim

- [ ] **Review the three July-15 biological-model changes against the intended model.**
  They are live in production (v3.82), were made in a session that left no notes, and have
  not been reviewed by anyone outside it. **The 24h cap is deliberately left as-is for now
  — this is a review gate, not a bug report.** Reconstructed in PROJECT.md's July 15 entry.

  | Build | Change | Judgement needed |
  |---|---|---|
  | `v3.79b` | Segmented stage bars derive their band from `displayTemp` (honours AVG/MIN basis) instead of raw `core1` | Should the *visual stage bars* follow the user's chosen display basis, or should they always be strict like PFRP? |
  | `v3.79c` / `v3.79e` | A logged turn closes its cycle regardless of the turn reading's own temperature — closure depends on whether a stage was satisfied *earlier* in the cycle | Is "turn closes the cycle it belongs to" right, or should a turn logged below the band floor leave the cycle open? |
  | `v3.79d` | `cappedNow()` extrapolation cap **8h → 24h** — one reading on a hot pile credits up to a full day of thermophilic/READY time | Is 24h of unlogged time a defensible inference about a real pile? 8h was the original judgement. |

  **Scope, verified in code July 20 — narrower than first assumed.** These affect the
  **Compost Academy stage model** (Stage 1-4 satisfaction, READY/thermophilic times, cycle
  bars, TURN NOW). They do **not** affect the PFRP figures: `pfrpStatus()` uses
  `strictMinTemp` (coldest probe, ignores display basis) and gives **zero** credit after
  the last reading — it never calls `cappedNow`. "Avg PFRP days" and "Windrow-PFRP pass
  rate" are unaffected by all three.

- [ ] **Rename or re-scope `complianceTemp()`.** It is a **legacy alias that now returns
  `displayTemp`** — it follows the AVG/MIN display basis despite the name. It feeds stage
  satisfaction, degree-hours-above-threshold, and the "first entry ≥131°F" figure shown in
  the Operation Summary and PDF. Only `pfrpStatus` uses the strict minimum. The name
  invites exactly the wrong assumption in exactly the place it matters; either rename it
  (e.g. `bandingTemp`) or make it strict, but decide deliberately.

  Note the app already disclaims correctly in code — *"On-pile temperature record, NOT a
  certified test"* — and that wording should survive any change here.

### Before pointing compostlogger.com at the app

- [ ] **Migration banner + dual-URL cutover.** When the app itself moves to
  compostlogger.com, do it additively rather than as a hard switch:
  - **Add a migration banner to the `github.io` build** prompting users to sign in, so
    their data reaches an account before they follow the new URL. A user who moves domains
    with only localStorage data would land on a fresh origin with an empty app — different
    origin means different localStorage.
  - **Keep both URLs live; do not redirect.** Installed PWAs, home-screen shortcuts and
    bookmarks all point at the old origin, and a redirect can leave a stale service worker
    serving the old app from cache. Retire the old URL only once traffic has actually moved.
  - **Update PocketBase `--origins` to include the new domain** *before* the app is served
    from it — the allowlist is currently pinned to `https://aalkhalifa.github.io` alone, so
    the new origin would be blocked on arrival. Keep **both** origins listed for as long as
    both URLs are live, comma-separated in `pocketbase.service`, then `daemon-reload` and
    restart PocketBase.

### Operational

- [ ] **Rotate the PocketBase admin password.** It was auto-generated during setup on
  July 20 2026 and **appeared in a chat transcript**. Stored at
  `/root/.pb_admin_password` (0600). Change it in the Admin UI
  (`https://api.compostlogger.com/_/`), then update that file — several runbook commands
  read it. Not urgent (admin API is not exposed publicly beyond the login form) but it
  should not stay indefinitely.
- [ ] **Stale code comment: the freeze cap says 8h, the code does 24h.** `cappedNow()`
  caps at 24h (raised in v3.79d) but the comment above `computeIndependentStages` still
  says "capped at 8h past that entry", in **both** `index.html` and `beta/index.html`.
  Comment-only, zero behavior risk — fold into the next beta line rather than cutting a
  release for it.
- [ ] **Find out what "Task 2" was.** Commit bodies from July 15 cite Tasks 1 and 3–12; no
  commit mentions Task 2, and the task list is not in this repo. May have been dropped,
  done elsewhere, or renumbered.
- [ ] **PocketBase 0.22.21 is version-pinned.** Upgrading to 0.23+ renames the admin API
  from `/api/admins/` to `/api/_superusers/`, which breaks every server-side snippet in
  PROJECT.md's *Operating this project* section and in `deploy/pocketbase/README.md`.
  Update both if the binary is ever upgraded.

- [ ] **Decide when to retire the Cloudflare tunnel.** It still fronts the same backend as
  a fallback. Once the domain has proven itself, `systemctl disable --now
  cloudflared-pocketbase` closes a second public path in. Its hostname still rotates on
  restart, so it is break-glass only, not a second endpoint.
- [ ] **Pending kernel upgrade on the box** (running 6.8.0-124, expects 6.8.0-136). A
  reboot is much safer now that the backend URL no longer depends on the tunnel, but it
  *will* rotate the tunnel's fallback hostname. Verify `api.compostlogger.com` comes back
  after any reboot; all three services are `enabled`.

### Standing notes

- **Run `./test/run-all.sh` before and after any change to sync/merge logic.** Five suites,
  94 checks, no network or browser needed. `test/README.md` says what each one protects —
  and, importantly, documents how they have given false confidence before.
- **Group G will heavily edit `mergeCloudData`.** `test/c-merge-equivalence.js` is the
  guard: it proves the shared merge still matches the pre-extraction Drive code. Once Drive
  is deleted that suite becomes meaningless and should be **removed in the same commit**,
  not left passing against code nobody calls.
- **Test the PWA over http(s), not `file://`.** Service workers do not register on
  `file://`, which is exactly why the API-caching bug survived every headless test.
- **Local testing needs a CORS exception now.** The backend only accepts
  `https://aalkhalifa.github.io`, so a `file://` or `localhost` build is blocked by the
  browser. Add that origin to `--origins` temporarily, or test the deployed build.
- **Rollback is ready.** Builds are tagged `v3.79r` … `v3.79w`, `v3.80`, `v3.81a`, `v3.82`;
  exact commands are in the **ROLLBACK** section of PROJECT.md, including the service-worker
  trap (a rollback needs a *new* `sw.js` cache key, never the old one). Note: **do not roll
  production back to `v3.80`** — it carries the broken demo-pile filter, and that fix is the
  only difference from v3.82.
- **The ephemeral-hostname caveat is retired.** If sign-in fails with "Can't reach the
  server", check `systemctl status caddy pocketbase` and the cert rather than hunting for
  a rotated tunnel name.

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
    - **DEFERRED one week (~July 27 2026).** A–F are now verified on iPad Safari and live
      in production as v3.80, so the original reason (unproven on a device) is satisfied.
      It stays deferred because Drive is still the working backend for every user who has
      not signed up yet, and because production has only just started running on
      PocketBase — worth a week before deleting the fallback. Also note
      `mergeCloudData`'s Drive-only flags (`mergeRecipes`, `adoptRemoteSettings`,
      `renameOnConflict`, `strictSitesGuard`) and the two `updateDriveUI`/`updatePbUI`
      yield guards all become dead weight once Drive goes — G is the cleanup that
      simplifies them.
  - **H. Release — DONE July 20 2026.** Promoted as **v3.80** under the new convention
    (production = clean numbers, letters = beta only), tag `v3.80`. Plain
    `cp beta/index.html index.html`; `sw.js` key → `compost-logger-v3.80`. Unblocked by
    iPad Safari verification of v3.79v/w. Drive deliberately retained. Next beta line
    opened at v3.81.
  - **Deploy prerequisite — SATISFIED July 20 2026.** compostlogger.com registered on
    Cloudflare; `PB_BASE_URL` is the stable `https://api.compostlogger.com`.
  - **Out of scope (stays backlog):** relational per-pile records, instructor/share
    tokens, actual analytics pipeline. Capacitor and pointing the app at
    compostlogger.com are now near-term — see the cutover checklist in NOW.

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
