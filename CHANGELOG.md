# Changelog

All notable changes to Compost Logger are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses date-stamped `v3.XX` releases with letter sub-revisions
(e.g. `v3.77q`). Beta builds ship from `/beta/`; production is promoted by copying
`beta/index.html` to the repo-root `index.html`. `sw.js` is shared by both.

## [3.80] - 2026-07-20 — PRODUCTION

**The PocketBase migration is live for all users.** Production went v3.78b → v3.80,
promoting the whole of Groups A–F in one release (`cp beta/index.html index.html`, a plain
copy — `APP_VERSION` derives the " BETA" suffix from the path at runtime). Tag `v3.80`.

Unblocked by device verification on **iPad Safari** of v3.79v and v3.79w: signup, import,
save reaching `ACCOUNT SYNCED`, `OFFLINE (local only)` when disconnected, reconnect
syncing, and the same again after the backend moved to `api.compostlogger.com`.

- Accounts (email/password), cloud sync, first-login data migration, analytics consent.
- Backend: `https://api.compostlogger.com` (Caddy + Let's Encrypt, CORS locked).
- **Google Drive is retained and still works** — removal is Group G, deferred ~2026-07-27.
  PocketBase takes precedence when signed in; unmigrated users keep syncing to Drive.
- `sw.js` cache key → `compost-logger-v3.80`.

> **Version convention changed here.** Production releases now get **clean numbers**
> (`v3.80`, `v3.81`); **letter suffixes are beta-only** (`v3.81a`, `v3.81b`). That is why
> this is v3.80 rather than v3.79w. Promoting a lettered build — as `v3.77q` and `v3.78b`
> were — is retired.

> **Rollback note:** production is no longer the untouched Drive-only build. The pure-Drive
> fallback is now the `v3.78b` **tag** only. See ROLLBACK in PROJECT.md, including what
> falling back would cost a user whose piles already live in an account.

## [3.81] - unreleased [beta]

Next beta line, opened 2026-07-20. Group G (Drive/GSI removal) is deferred to ~2026-07-27.

### Fixed
- **v3.81a — the v3.79v demo-pile purge never actually ran.** Checking the real account
  showed the vault still holding `Demo Pile — 30 Days` plus five `— Local Copy`
  duplicates *after* syncing on the fixed build. Cause: `isSamplePile` treated any pile
  carrying `lastModified` as user-edited and therefore real — but `mergeCloudData` stamps
  `lastModified=Date.now()` on **every** pile present on both sides, so one sync marked
  all six as "real" and the filter became a no-op. The guard added to prevent data loss
  defeated the fix it was guarding.
  `isSamplePile` now keys on merge-stable signals: a pile is onboarding data only if it
  is not explicitly marked adopted (`isSample:false`), still carries the demo name, **and**
  still has the pristine sample entry count (counted from `SAMPLE_CSV`, not hardcoded).
  Any one of those failing means the user made it theirs. `save()` and `renamePile` now
  set `isSample:false` explicitly, which survives merges where `lastModified` does not.
  Verified against the real vault blob: 13 piles → 7, all six demo entries gone, all seven
  real piles intact with unchanged entry counts.

## [3.79] - 2026-07-11 [beta]

PocketBase migration line (replacing Google Drive sync). Ships from `/beta/`; additive
during the transition (Drive/GSI keeps working until Group G's import-then-remove).

**Groups A–F landed 2026-07-20**, followed the same day by two fixes from the first
real-device test and the move to a real domain. Beta went v3.79q → **v3.79w**, tagged at
each step (`v3.79r` … `v3.79w`) — see the ROLLBACK section of PROJECT.md for the revert
procedure. Backend is live at `https://api.compostlogger.com`. Production remains
**v3.78b, untouched and still Drive-based**, as the fallback.

**Status:** v3.79v and v3.79w were verified on iPad Safari, and the line was **promoted to
production as v3.80** — see above. Group G (Drive/GSI removal) is **deferred one week
(~2026-07-27)**; Drive remains the fallback until it has run in production for a while.

### Added
- **v3.79t — Group F (account UI).** The PocketBase migration is now reachable by a user.
  `updatePbUI()` — the renderer every `pb*` function has been calling behind a `typeof`
  guard since Group B — maps all eight `pbStatus` values to the header dot and label. New
  sign-in/sign-up overlay (`openAuth` / `authSubmit` / `authToggleMode`) with email and
  password, Enter-to-submit, `autocomplete` hints for iOS Keychain, client-side length
  validation on signup only, and a submit button that disables while a request is in
  flight. New Settings ACCOUNT card with status, email and sign-out.
- **v3.79t — Group E (analytics consent).** `pbSetAnalyticsOptIn()` writes consent via a
  dedicated single-field PATCH (never folded into `pbSaveNow`, which could push a stale
  local default over a cloud opt-in), `pbLoad` restores it from the vault, and a Settings
  row lets a user change their mind. Opt-in checkbox on signup, unchecked by default.
  Wiring only — no analytics pipeline exists, and the copy says so.
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
- **v3.79t — Drive connect moves to Settings.** The header keeps one status line;
  PocketBase takes precedence over Drive whenever a session exists (`updateDriveUI` and
  `updatePbUI` yield to each other on complementary guards, so exactly one renders). A
  Drive-only user's header is unchanged — which matters, since every existing user is
  one. `CONNECT DRIVE` stays in the DOM but renders only from the Settings Drive card.
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
- **Group B (auth layer).** PocketBase email/password auth in `beta/index.html`: a single
  configurable `PB_BASE_URL` constant and `pbApi` / `pbSignup` / `pbLogin` / `pbLogout` /
  `pbRestoreAuth` (raw `fetch`, no PB JS SDK). Session persists in the `pb_auth`
  localStorage key; `pbRestoreAuth()` validates it on load via `auth-refresh` and makes
  zero network calls when no session is stored. No Google popup. Storage/sync (Group C)
  and login UI (Group F) not yet wired, so the auth functions are callable but not yet
  surfaced. Drive/GSI untouched (removed in Group G).

### Changed
- **v3.79w — planned app-domain cutover is additive, not a redirect.** When the *app*
  moves to compostlogger.com it must ship a migration banner on the `github.io` build
  first (localStorage does not follow a user across origins, so anyone who has not signed
  in would arrive at an empty app), keep both URLs live rather than redirecting (installed
  PWAs and home-screen shortcuts point at the old origin, and a redirect can leave a stale
  service worker serving the old build), and add the new origin to PocketBase `--origins`
  *before* the app is served from it. Checklist in TODO.md.
- **v3.79w — backend moved to `https://api.compostlogger.com`.** Real domain, real TLS.
  Caddy fronts PocketBase with a Let's Encrypt cert (`tls-alpn-01`, auto-renewing);
  PocketBase stays bound to `127.0.0.1:8090` so Caddy is the only public path. `PB_BASE_URL`
  is now a **stable** hostname, replacing the Cloudflare quick tunnel that minted a new
  name on every restart. The tunnel keeps running as a break-glass fallback.
- **v3.79w — CORS locked to `https://aalkhalifa.github.io`.** Enforced by PocketBase's
  `--origins` flag rather than at the Caddy layer: PocketBase already emits CORS headers,
  so adding them in Caddy too would send two `Access-Control-Allow-Origin` headers, which
  browsers reject outright. Note this means a `file://` or `localhost` build can no longer
  call the API — local testing needs that origin added to `--origins` temporarily.

### Fixed

- **v3.79v — the onboarding demo pile no longer reaches accounts, and its duplicates
  clear themselves.** A real vault had accumulated `Demo Pile — 30 Days` plus five
  `— Local Copy` duplicates. Two causes: Group D only dropped the sample pile when it was
  the *only* thing on the device, so a device with real piles uploaded it too; and
  rename-on-conflict fired on every load, because a reinstall regenerates the demo pile
  with a **new id** while the vault still holds the old one — same name, different id, so
  each sign-in minted another copy instead of converging. `pbBuildPayload` now filters
  sample piles out of the vault payload, and since every write replaces `data` wholesale,
  the next successful save purges junk an earlier build already uploaded. `mergeCloudData`
  gains a `dropSamplePiles` opt (PocketBase only — Drive is untouched and still verified
  byte-identical) so the junk is not pulled back down in the meantime.
- **v3.79v — an edited demo pile is never treated as sample data.** `isSamplePile` now
  returns false for any pile carrying `lastModified`, so a demo pile someone adopted as a
  real one is uploaded and kept normally rather than silently discarded.
- **v3.79v — `renamePile` did not stamp `lastModified`.** Renaming happens outside the
  active-pile path, so `save()` never stamped it — meaning a merge could revert a rename
  to an older remote copy. Latent since well before the migration.
- **v3.79u — the service worker was caching API responses, permanently breaking sync.**
  Found on a real iPhone: signup and import worked, then the header stuck on SYNC ERROR
  and saves never reached SAVED. `sw.js`'s fetch handler intercepted **every** GET,
  including cross-origin ones, and cached successful responses. `pbLoad`'s "does this
  user have a vault?" list GET was cached while the answer was still *no*; any later
  network hiccup served that stale empty list, so `pbLoad` took its create-a-vault
  branch, which the unique index rejected with 400 — permanently, because `pbVaultId`
  never got set and every subsequent save retried the same doomed create. The handler now
  only touches same-origin requests and a small allowlist of static asset CDNs; all API
  traffic (PocketBase, Google Drive, Open-Meteo, Anthropic) bypasses the worker entirely.
  The same bug would have served stale Drive and weather data.
- **v3.79u — `pbLoad` now self-heals a phantom "no vault".** The list rule returns
  `200` with an empty `items` array for anything it filters out, so "you have no vault"
  and "I could not see your vault" are indistinguishable. When the follow-on create is
  rejected by the unique index, `pbLoad` re-queries — with a cache-busting URL, so a
  stale cache entry cannot defeat the recovery — and adopts the existing vault.

The rest of these were latent bugs found by building the next layer on top, not by review.

- **v3.79s — first login uploaded the local vault silently.** `pbLoad`'s create branch
  POSTed the entire local vault the moment a user authenticated — no consent, and the
  onboarding demo pile included, which then synced to every device on that account. Both
  branches now route through the Group D decision.
- **v3.79t — consent leaked between accounts.** `pbLogout` cleared token and vault state
  but not `pbAnalyticsOptIn`, so an account created after signing out of another in the
  same session had its vault built with the previous user's opt-in.
- **v3.79t — `showToast` rendered a dead UNDO button on every call.** It was hardcoded
  into the markup, so any informational toast showed an UNDO that did nothing —
  including Group D's import confirmation, which had already shipped. Now rendered only
  when there is something to undo.
- **v3.79t — expired sessions failed silently.** `pbRestoreAuth` called `pbLogout()` on a
  failed refresh with no user-facing signal: the header read NOT SIGNED IN and edits
  quietly stopped syncing. It now says so, and an offline boot keeps the session rather
  than signing the user out for what is only a network problem.
- **v3.79t — a failed signup could strand a user.** If the account was created but the
  follow-on login failed (email verification, or a dropped connection), retrying reported
  the email as already registered — a dead end. The failing leg is now tagged and the
  form switches to sign-in with "Account created. Sign in to continue."
- **v3.79s — "1 entries" grammar** in Group D's destructive confirm, caught by its
  decision-matrix harness.
- **v3.79r — `sw.js` cache key had drifted** at `compost-logger-v3.78b` while beta
  advanced through v3.79b–q, so the service worker could serve stale assets offline.

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
