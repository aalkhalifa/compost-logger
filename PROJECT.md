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
**Storage:** localStorage primary (`ca_v5` key). Cloud sync = **PocketBase** (`https://api.compostlogger.com`). Google Drive still present as a fallback for unmigrated users; removal is Group G.
**Auth:** **PocketBase email/password** (no popup, no user cap, no 7-day expiry). Google Identity Services OAuth still present for the Drive fallback; removed with Group G.
**License:** Proprietary / All Rights Reserved (c) 2026 Abdulla Al-Khalifa / Roots of Arabia. See LICENSE.
**Service worker:** sw.js — network-first, falls back to cache offline, and (since v3.79u)
**only handles same-origin requests plus a static-CDN allowlist; all API traffic bypasses
it entirely**. Cache key = `compost-logger-v3.82` — bump on every deploy; sw.js is shared by
prod + beta, so the key tracks the **newest deploy of either channel** (currently beta).
NOTE: prior to v3.77q the file was corrupted with smart/curly quotes and did not parse; fixed to ASCII in v3.77q.
**SW registration (fixed v3.78a):** registration derives the repo root from `location.pathname` (strip the page filename, then a trailing `beta/`) and registers that root `sw.js`. Works from both `/<repo>/` and `/<repo>/beta/`, no hardcoded repo path. The root sw.js's default scope covers `/beta/`. Because the path is computed at runtime, promoting via `cp beta/index.html -> root index.html` stays a plain copy with no edits.

---

## Current Version

**Production:** **v3.83** (promoted July 22 2026, tag `v3.83`) — the privacy policy is
published and linked from the sign-in overlay and Settings. Carries everything in v3.82
(PocketBase accounts, demo-pile purge fix). Drive still present and working (removal is
Group G).
**Live beta:** v3.83 — mirrors production; no line open. The next line opens at **v3.84a**
and will ship as **v3.84**. Next up: Group G (Drive/GSI removal), deferred to ~July 27.
**Backend:** `https://api.compostlogger.com` (Caddy + Let's Encrypt on the DO box)
**Domain:** compostlogger.com, registered on Cloudflare (July 20 2026)

### Version convention (July 20 2026)

**A beta build always carries a letter. A production build never does.** That single rule
is the whole convention — a version on someone's phone says at a glance which channel it
came from.

**A line is promoted as its own number.** Line `v3.83` opens in beta at **`v3.83a`**,
iterates `v3.83b`, `v3.83c`, …, and ships to production as **`v3.83`**. No number is
skipped and no number is used twice.

```
beta   v3.83a -> v3.83b -> v3.83c ──┐                     v3.84a -> ...
                                 promote
prod   ─────────────────────────────┴──> v3.83 ───────────────────────
```

- The line opens directly at the **`a`** iteration — there is never a letterless build in
  beta while a line is in progress.
- When no line is open, `beta/index.html` simply mirrors production at the production
  number (as now: both `v3.82`).
- After `v3.83` ships, the next line opens at `v3.84a`.

Retired: the pre-July-20 scheme of promoting a lettered build straight to production
(`v3.77q`, `v3.78b`), and the brief intermediate scheme where a line promoted to the
*next* number.

> **Known gap: there is no `v3.81` tag.** The `v3.81` line existed only as `v3.81a`, which
> shipped as `v3.82` under the intermediate scheme. Under the current rule it would have
> shipped as `v3.81`. Left as-is rather than retagging — `v3.82` is what is live and what
> users have. The gap is an artifact, not a missing release.

`sw.js` is shared by prod and beta, so its cache key always tracks the **newest deploy**
of either channel.

### Deployment structure
```
compost-logger/
├── index.html          ← production (v3.82 — PocketBase accounts + Drive)
├── beta/
│   └── index.html      ← active development (v3.82, == prod)
├── sw.js               ← service worker (shared)
├── manifest.json
├── LICENSE             ← proprietary, all rights reserved
├── CHANGELOG.md        ← Keep a Changelog format, grouped by version
├── PROJECT.md          ← this file
├── TODO.md
├── test/               ← node harnesses, no build step (./test/run-all.sh)
└── deploy/
    └── pocketbase/     ← backend infra: runbook, collection schema, systemd unit, Caddyfile
        │                 (mirrors of what is live on the box - keep in sync)
        ├── BACKUP-RESTORE.md  ← nightly backup design + tested restore runbook
        └── backup/            ← backup script, systemd unit + timer, .env.example
                                 (mirrors; secrets live only in /etc, never here)
```

### Promotion process
When beta is stable:
1. Set `BUILD_VER` in `beta/index.html` to the line's clean number (drop the letter).
2. `cp beta/index.html index.html` — a **plain copy**, no edits. `APP_VERSION` derives the
   " BETA" suffix from `location.pathname` at runtime, so both files stay byte-identical.
3. Bump the `sw.js` cache key to match. **Easy to forget, and a stale service worker means
   testers get the old file and report the release as broken.**
4. Verify: `./test/run-all.sh`, `node --check` on the extracted inline script of *both*
   index.html files, then commit and annotate-tag.

### Core features (established by v3.77p; all still present)

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

## Operating this project (read before touching the backend)

**Claude Code runs ON the DigitalOcean droplet.** The repo at `/root/compost-logger` and
the live backend are the same machine — `systemctl`, `journalctl` and `curl
127.0.0.1:8090` all work directly. Older session-log entries that say "server execution is
on Abdulla, I can't reach the DO box" describe how things were on July 11 and are no
longer true.

### Services

| Unit | Role |
|---|---|
| `pocketbase` | PocketBase 0.22.21, `/opt/pocketbase`, bound `127.0.0.1:8090`, `--origins` CORS lockdown |
| `caddy` | TLS + reverse proxy for `api.compostlogger.com`; the only public path in |
| `cloudflared-pocketbase` | Cloudflare quick tunnel, kept as break-glass fallback (hostname rotates on restart) |

All three are `enabled`. Config lives at `/etc/caddy/Caddyfile` and
`/etc/systemd/system/pocketbase.service`; both are mirrored into `deploy/pocketbase/` and
should be kept in sync when changed.

### Admin token (needed for anything server-side)

PocketBase 0.22 uses `/api/admins/`; 0.23+ renames this to `_superusers`, so this breaks
if the binary is ever upgraded.

```bash
PBPW=$(cat /root/.pb_admin_password)
TK=$(curl -s -X POST http://127.0.0.1:8090/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"aalkhalifa@gmail.com\",\"password\":\"$PBPW\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
```

Superuser is `aalkhalifa@gmail.com`; the password is at `/root/.pb_admin_password` (mode
0600). It was **auto-generated during setup and has appeared in a chat transcript** — see
TODO for the rotation item.

### Inspecting a vault

```bash
curl -s http://127.0.0.1:8090/api/collections/vaults/records -H "Authorization: $TK" \
  | python3 -c 'import sys,json
d=json.load(sys.stdin)
for r in d["items"]:
    p=r["data"].get("piles",[])
    print(r["id"], r["updated"], len(p), "piles")
    for x in p: print("   ", x.get("name"), len(x.get("entries") or []), "entries")'
```

### The diagnostic that found the worst bug

PocketBase logs every request. Filtering for failures is how the v3.79u service-worker bug
was found — the app showed only "SYNC ERROR", but the server showed exactly which call was
failing and why:

```bash
curl -s "http://127.0.0.1:8090/api/logs?perPage=40&sort=-created&filter=data.status%3E%3D400" \
  -H "Authorization: $TK" | python3 -c 'import sys,json
for i in json.load(sys.stdin)["items"]:
    d=i.get("data",{}); print(i["created"], d.get("status"), d.get("method"), d.get("url"), "|", d.get("error"))'
```

`data.auth`, `data.userAgent` and `data.details` on each entry distinguish "bad token"
from "valid token, rejected request" — that distinction is what identified the bug as
client-side caching rather than auth.

### Test-account hygiene

Signup is public, so testing creates real accounts. **Delete them afterwards** — deleting
a user cascades to their vault. Verify only the real account remains:

```bash
curl -s http://127.0.0.1:8090/api/collections/users/records -H "Authorization: $TK" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["totalItems"],[i.get("email") for i in d["items"]])'
```

### Current backend state (July 20 2026)

One real account (`aalkhalifa@gmail.com`, `verified: false` — email verification is **off**,
so signup logs straight in), one vault, 7 piles. No test accounts remain.

### Backups (live since July 21 2026)

**The vault is backed up nightly off the droplet.** Full detail, including the
restore runbook, is in **`deploy/pocketbase/BACKUP-RESTORE.md`** — read that
before restoring anything.

| | |
|---|---|
| Schedule | `02:10 UTC` daily (05:10 Bahrain), `compost-backup.timer` |
| Method | PocketBase snapshot API -> verify -> `rclone` -> Cloudflare R2 -> verify |
| Retention | `daily/` 7 days, `weekly/` 28 days, via R2 lifecycle rules |
| Local | 2 most recent snapshots in `pb_data/backups/` for fast restore |
| Monitoring | healthchecks.io (period 1d, grace 3h) -> aalkhalifa@gmail.com |
| Secrets | `/etc/compost-backup.env` 0600 — **never in this repo, which is public** |

Two properties worth knowing before touching any of it:

- **The success ping is gated on the object being verified present in R2** (size
  *and* md5 read back), not on the script having run. A green check next to an
  empty bucket is the failure mode the whole design targets.
- **PocketBase's own `backups.cron` is deliberately empty.** The systemd timer
  drives both snapshot creation and upload, so there is no race between two
  schedulers.

The restore was **tested end-to-end on July 21 2026**, not just written down:
restored from an R2-downloaded archive into a throwaway instance on port 8091 and
diffed against live — 7 piles, 227 entries, every entry id identical.

DigitalOcean droplet snapshots were considered and **declined**: nothing else on
the box is irreplaceable, so the ~$2.80/mo would mostly have insured transient
LivingSoil video.

---

## ROLLBACK

Every beta build in the PocketBase line is tagged. Rolling back restores a **file** from
a tag and commits that as a **new** commit — history is never rewritten, nothing is lost,
and you can roll forward again the same way. Do **not** use `git reset --hard` on `main`:
it is pushed, and a force-push would destroy commits.

### Tags

| Tag | Build | What it is |
|---|---|---|
| `v3.78b` | ex-production | **The Drive-only fallback.** No PocketBase code at all. |
| `v3.79r` | beta | Group C — shared `mergeCloudData` + `pbLoad`/`pbSaveNow`. No UI. |
| `v3.79s` | beta | Group D — first-login migration decision. No UI. |
| `v3.79t` | beta | Groups E+F — consent + account UI. First user-reachable build. |
| `v3.79u` | beta | `sw.js` API-caching fix + `pbLoad` self-heal. |
| `v3.79v` | beta | Demo-pile duplicate fix. Verified on iPad Safari. |
| `v3.79w` | beta | Backend on `api.compostlogger.com`, CORS locked. Verified on iPad Safari. |
| `v3.80` | ex-production | PocketBase accounts + Drive. **Demo-pile purge here is broken** — a polluted vault will not self-clean. |
| `v3.81a` | beta | Demo-pile purge fix. Confirmed to clean the real vault, 13 piles → 7. |
| **`v3.82`** | **production** | **Current production.** v3.81a promoted; prod and beta agree. |

Group A (`85ade7f`) carried no version bump — it was server infra plus the `PB_BASE_URL`
value — so there is no `v3.79` tag between `q` and `r`.

> **Changed July 20 2026:** production is **no longer** the untouched Drive-only build.
> `v3.80` onward ships PocketBase. The pure-Drive safety net is now the **`v3.78b` tag**,
> not the live production file — see "Emergency" below.
>
> **Do not roll production back to `v3.80`** to undo something in v3.82: v3.80 carries the
> broken demo-pile filter, so a vault that gets polluted again would not self-clean. The
> only difference between them is that fix.

### Roll a build back to a tagged version

Works for either channel — the only difference is which file you restore.

```bash
cd /root/compost-logger
git checkout main && git pull

# beta:       git checkout v3.79w -- beta/index.html
# production: git checkout v3.79w -- index.html
git checkout v3.79w -- index.html

# REQUIRED: bump the SW cache key to something NEW (see the trap below)
#   edit sw.js -> const CACHE = 'compost-logger-v3.80-rollback';

git commit -am "Roll production back to v3.79w"
git push origin main
```

Note `v3.79w` and `v3.80` are the **same code** — v3.80 is the promotion of v3.79w under
the new numbering — so rolling production back one step means going to `v3.79v` or
earlier, not to `v3.79w`.

**The service-worker trap:** `sw.js` is network-first but falls back to cache. Restoring
an *older* cache key means clients that already cached the newer build may keep serving
it. Always set a **new, never-used** key on a rollback (e.g. `...-rollback`), never the
old one. `BUILD_VER` inside the restored `beta/index.html` will read as the old version —
that is expected and correct.

### Emergency: fall back to Drive entirely

**As of v3.80 this is a deliberate action, not the status quo.** Production now ships
PocketBase. The pure-Drive build survives only as the **`v3.78b` tag** — zero PocketBase
code, Drive sync fully intact.

```bash
git checkout v3.78b -- index.html        # production becomes the Drive-only build
git checkout v3.78b -- beta/index.html   # and beta too, if needed
# bump sw.js cache key to a NEW value, then commit + push
```

**Before doing this, understand what it costs.** Any user who has already signed in has
their piles in a PocketBase vault. `v3.78b` has no PocketBase code, so it cannot read that
vault — it falls back to whatever `ca_v5` is in that device's localStorage, which is
current for anyone who used the app on that device but **stale or empty on a device where
they only ever pulled from the account**. Their vault is not deleted (the server is
untouched), but it becomes unreachable until a PocketBase build is restored.

A less destructive first step is rolling back one beta build (`v3.79v`, or `v3.79u` to
also undo the domain move) — those still speak PocketBase.

### What a rollback does and does not undo

- **Does not touch server state.** Accounts and vaults on the DigitalOcean box survive.
  Rolling back is a client change only.
- **Does not remove data from devices.** `ca_v5` in localStorage is untouched; the app is
  offline-first and reads it the same way in every version.
- **Leaves stale localStorage keys.** `pb_auth`, `pb_import_<userId>` and
  `pb_analytics_optin` remain. Harmless — older builds ignore keys they do not know — but
  rolling back to `v3.79r`/`s` leaves a signed-in session with **no UI to sign out of**,
  because the account UI only exists in `v3.79t`. Those builds still restore the session
  and sync via `pbRestoreAuth`.
- **Rolling back past `v3.79r` loses `mergeCloudData`**, which both Drive paths now
  depend on. Anything earlier than `v3.79r` means going to `v3.78b`, not an intermediate.

Verify any rollback the same way as a build: extract the inline script and run
`node --check`, confirm `BUILD_VER` and the `sw.js` key are consistent, and load the page.

---

## Session Log

> **Reading order:** entries are newest-first, so a single day reads bottom-up. July 20's
> arc, in the order it happened: Groups A–F (v3.79r→t) → real-device test → fixes
> (v3.79u/v) → domain + TLS (v3.79w) → **promoted v3.80** → demo-pile purge fix (v3.81a) →
> **promoted v3.82**. Start at *SESSION SUMMARY* for the overview.
>
> Version history across sessions: **v3.75 → v3.77q → v3.78b** (July 11, two sessions) →
> **v3.82** (July 20) → **v3.83** (July 22). Beta went v3.78 → v3.79 → v3.82 → v3.83 over
> the same span. July 22's arc: `v3.83a` → promotion reset for a device check → `v3.83b` →
> **promoted v3.83**.
>
> **v3.79b–q (July 15) were made in a session that left no log.** They are reconstructed
> below from commit messages and diffs, with certainty levels marked. Three of them changed
> compliance-relevant behaviour and are live in production — see that entry before touching
> cycle-closing or extrapolation logic.

### July 24 2026 (Claude Code) — planning session recorded: design principles and business direction

**Docs only — no app code was touched, no version bumped, production stays v3.83.**
*The planning itself happened on the afternoon of **July 22**, after the v3.83 promotion
below; it is dated here as July 24 because that is when it was written down.*

UX and conversion research was reviewed and distilled into **`DESIGN-PRINCIPLES.md`** at the
repo root — written product-agnostically, since it governs LivingSoil.ai and anything else
that follows, not just Compost Logger. It records what was **rejected** (loss-aversion
pressure, fake urgency, journey-style CTA copy, subscription pre-selection) alongside what
was adopted, because the rejections are the part a future session would otherwise
re-propose. Business direction was set on a **business-as-experiment** footing: a
**founding-10 offer** whose stated after-price doubles as the pricing validation, a
**merchant-of-record** path for payments (Paddle/Lemon Squeezy) deliberately deferred until
someone has agreed to pay, and a **validation gate** that puts 10+ real users and a concrete
price question *before* any billing code. The **free/Pro boundary rule** was established and
is the one to hold: *charge for what you add, never ransom what you shipped* — single-pile
capability and full compliance (PFRP, stages, exports) stay free permanently, because that
is the wedge against the spreadsheet. An **onboarding wizard** (its own line, after Group G,
since it touches settings, forms and PFRP display) and an **Excel-format export** were
scoped as future lines. All of it is unscheduled; the detail lives in `DESIGN-PRINCIPLES.md`
and the new *Business planning* section of TODO.md.

### July 22 2026 (Claude Code) — v3.83: privacy policy published, and a bug only a device found

**The privacy policy was a launch blocker and is now shipped.** `PRIVACY.md` at the repo
root is the reviewed source; `privacy.html` (root **and** `beta/`, byte-identical) is the
page users actually read, linked from the sign-in/sign-up overlay and Settings > ABOUT.

**Two factual corrections were made before publishing, both caught by checking the claim
against the code rather than trusting the draft:**

- **"Encrypted backups" → "encrypted at rest by our storage provider."** `compost-backup.sh`
  uploads a plain PocketBase snapshot zip; Cloudflare encrypts at rest, but *we* do not
  encrypt anything. The original wording implied we did. In a privacy policy the difference
  is the whole point.
- **"Cloudflare R2 in Western Europe" — confirmed, not assumed.** Nothing in the repo records
  the bucket's jurisdiction (`rclone` uses `region=auto`, and a bucket-scoped token gets 403
  on `GetBucketLifecycle`), so this was flagged as unverifiable from here. Abdulla confirmed
  the WEUR location hint was set at bucket creation, and the claim stayed on that basis.

**Why link out rather than render the policy in-app:** the single-file app forbids backticks
in JS strings, so embedding 112 lines of policy means a long escaped concatenation — but the
real objection is that it creates **two copies of a legal document**, and the one users read
would be the one nobody reviewed. A standalone page also gives the App Store / Play backlog
item a URL to submit, which a `github.com` blob link does not.

#### The `#auth-intro` bug — shipped, invisible, caught by a thumb

`v3.83a` put the overlay's privacy anchor **inside** `#auth-intro`. `authRenderMode()` sets
that element's `.textContent`, which replaces **every child node**, and `openAuth()` calls
`authRenderMode()` before un-hiding the overlay. So the anchor was destroyed on the way in,
every single time. It existed in the file and **rendered zero times**.

**All 94 checks passed on that build.** The Settings link worked, because nothing rewrites
the ABOUT card — which is exactly what made it look fine from the desk. It was found by
Abdulla tapping the link on iPad Safari in standalone PWA mode.

Fix: the anchor moved to a sibling `#auth-privacy` that no JS touches — verified by grep that
`#auth-intro` is the **only** element in the overlay whose children are replaced, and that
there is no `innerHTML` anywhere in the auth code. `#auth-intro` went back to being a pure
`textContent` target, with a comment above the assignment saying why markup must not go back
in, so the trap is not re-set by a later edit.

**Five new assertions in `test/f-account-ui.js`** guard the class, not the instance: the
anchor lives in `#auth-privacy`, `#auth-intro` holds no markup, `authRenderMode` *still*
overwrites it (so the guard cannot quietly become pointless if that line is removed), no JS
references `#auth-privacy`, and both links exist. **Mutation-tested against the real broken
`v3.83a` markup** rather than trusted on a green run — two correctly fail there, naming the
cause. Suite is now **99 checks across 5 suites**.

#### Version arc and the deliberate un-promotion

`v3.83a` opened the line → promoted to production → **the promotion was reset and only the
beta line pushed**, so the device check could happen before users saw it → `v3.83b` fixed the
bug → re-promoted as **`v3.83`**, tagged and pushed. Confirmed on device: production reads
`FIELD LOGGER v3.83` with no `BETA` suffix.

That reset is the part worth keeping. The first promotion was fully built, tested and tagged
before it was rolled back — not because anything failed, but because the one risk flagged at
plan time (iOS `target="_blank"` behaviour) had not been checked on a device. Rolling it back
cost minutes; shipping it would have put the broken link in front of every user.

#### Accepted limitation

In standalone PWA, tapping the privacy link and returning **reloads the app, losing a
half-typed email and password.** Accepted as an annoyance rather than data loss: the link sits
above the fields, so the natural order is read-then-type. `history.back()` in `privacy.html`'s
BACK TO APP anchor is flagged as the cheapest thing to try — the reload may be caused by our
own anchor navigating to `index.html` instead of going back — but it is **untested**, since
bfcache behaviour in a standalone PWA cannot be reasoned about from the desk. Folded into
`v3.84a` with Group G, along with the stale 8h/24h freeze-cap comment.

### July 21 2026 (Claude Code) — nightly backups to R2, with a tested restore

**The vault had no backup at all until today.** `pb_data` was 442 KB on a single
droplet: no PocketBase backup cron, no S3, no snapshots, no cron job, no timer. As
of v3.82 that file is the authoritative store for every user's piles, so a droplet
loss would have lost all of it. Now: nightly snapshot at 02:10 UTC, verified, shipped
to Cloudflare R2, monitored by healthchecks.io. Full detail in
`deploy/pocketbase/BACKUP-RESTORE.md`.

**Design decisions worth remembering:**
- **Not** PocketBase's built-in S3 backups. Enabling `backups.s3` does not *add* an
  offsite copy, it **relocates** the backup filesystem — local backups stop entirely,
  and every restore would then depend on PB's S3 client working. It would also add a
  second reason we cannot upgrade off 0.22.21.
- One schedule, not two: the timer creates the snapshot *and* ships it.
- Retention is **R2 lifecycle rules**, not script deletions, so a bug in the script
  cannot destroy history. The script only counts objects and shouts if the counts
  drift.
- Storage went R2 rather than DO Spaces on Abdulla's call — Spaces has a $5/mo floor
  for what is ~4 MB of data; R2 is free at this size.
- DO droplet snapshots **declined** — nothing else on the box is irreplaceable.

**Three real bugs, all found by running it rather than reading it:**
1. `SUMMARY="...$([ x ] && echo y)..."` — a false command substitution makes the
   *assignment* non-zero, so `set -e` killed the script **after** the backup had
   already succeeded. Would have sent a FAILURE alert on 6 nights in 7.
2. `exit 1` does not fire an `ERR` trap, so every `FATAL:` validation guard aborted
   **without pinging healthchecks at all**. The checks built to catch corruption
   could not report that they had fired. Now an `EXIT` trap covers any non-zero exit.
3. R2 returns **501 on the HEAD rclone issues after a successful PUT**; rclone's own
   retry masked it by finding the object already there. `--s3-no-head` plus our own
   size+md5 read-back replaces rclone's check with a stronger one.

**One failure remains unexplained.** A run aborted with `FATAL: archive does not
contain data.db` on an archive that demonstrably contained it. A SIGPIPE/`pipefail`
race, a write race and memory pressure were each investigated and **ruled out**; it
did not reproduce in ~58 attempts across three configurations. The check was
rewritten to remove the pipeline entirely, which is robust regardless of cause, but
the trigger is unidentified. Recorded in BACKUP-RESTORE.md rather than quietly
papered over.

**Verified, not assumed:** corruption guards were tested by constructing four bad
archives and confirming each was rejected; the restore was driven from a file
downloaded *out of R2* and diffed against live by **entry id**, not counts; and the
alerting was tested by inducing four distinct failures and confirming each produced
an actionable message and a `/fail` ping accepted with HTTP 200.

**The Sunday-only weekly path was forced rather than left to chance** (`FORCE_WEEKLY=1`,
which can only turn the weekly copy on, never off). It uploaded to `daily/` *and*
`weekly/`, both verified by size and md5, and the weekly copy was then restored into a
throwaway instance — 7 piles, 227 entries, all ids matching. That run also exercised the
`daily/+weekly/` summary string, **the exact branch the `set -e` bug had made
unreachable**: the bug only bit on non-Sundays, so waiting for a real Sunday would have
masked it. Chosen over installing `faketime`, which would have meant an `LD_PRELOAD`
time-faking library on a production box to test a one-line conditional.

> The lifecycle rules themselves **cannot be verified from the droplet** — a
> bucket-scoped Object Read & Write token gets 403 on `GetBucketLifecycle`. They were
> set in the Cloudflare dashboard and are taken on trust; the script's object-count
> guard is the backstop and fails within ~10 days if the `daily/` rule stops working.

### July 20 2026 (Claude Code) — v3.81a: the demo-pile purge never actually ran

Checking the real account to confirm the v3.79v self-clean showed it had **not** happened:
still 13 piles, six demo-related, with a vault `updated` stamp *after* a sync on the fixed
build.

**Cause — the fix was defeated by its own safety guard.** `isSamplePile` returned false for
any pile carrying `lastModified`, on the assumption that it meant "the user edited this".
It does not: `mergeCloudData` sets `merged.lastModified=Date.now()` on **every** pile
present on both sides. The six demo piles carried stamps `…702` through `…705` — six
sequential milliseconds from a single merge pass — so after one sync every one of them
looked user-edited and the filter became a no-op.

**Why the harness missed it.** Its demo-pile fixtures were only ever *local-only*, so they
never went through the branch that stamps `lastModified`. The convergence test even ran
merges, but the fresh demo pile had a new id each round and so was never matched against a
remote copy. The one shape that mattered — a demo pile present on **both** sides — was
exactly the shape never constructed. Harness fixtures that only cover the path you were
thinking about will confirm whatever you already believed.

**Fix:** `isSamplePile` now keys only on merge-stable signals. A pile is onboarding data
only if it is not explicitly marked adopted (`isSample:false`), **and** still carries the
demo name, **and** still has the pristine sample entry count (counted from `SAMPLE_CSV`,
so it cannot drift). Any one failing means the user made it theirs — dropping a real pile
is far worse than leaving a demo pile behind. `save()` and `renamePile` now set
`isSample:false` explicitly, which survives merges where `lastModified` does not.

Tightening it also closed a gap the first attempt had: a demo pile renamed by an *older*
build still carries `isSample:true`, and keying on the flag alone would have discarded it.

**Verified against the real vault blob**, not fixtures: 13 piles → 7, all six demo entries
gone, all seven real piles intact with unchanged entry counts. Harnesses now 94 checks
across five suites, including the both-sides case and the old-build-rename case.

**Production v3.80 still carries the broken filter.** Not harmful — a fresh signup's demo
pile is local-only at first sync and gets filtered before any merge can stamp it — but an
already-polluted vault will not self-clean on production until v3.81a is promoted.

### July 20 2026 (Claude Code) — v3.80 PROMOTED TO PRODUCTION

**PocketBase accounts are live for all users.** Production went **v3.78b → v3.80**, a
jump of the entire migration in one release.

Device verification (iPad Safari) confirmed **v3.79v and v3.79w** end-to-end — signup,
import, save reaching `ACCOUNT SYNCED`, going offline showing `OFFLINE (local only)`,
reconnect syncing cleanly, and the same again after the backend moved to
`api.compostlogger.com`. That covers the v3.79u `sw.js` fix transitively, since versions
are cumulative. With that, Group H was unblocked and promoted.

- **New version convention** (see *Current Version*): production releases get clean
  numbers, letters are beta-only. So this shipped as **`v3.80`**, not `v3.79w`.
- Promotion was a plain `cp beta/index.html index.html` — `APP_VERSION` derives the
  " BETA" suffix from `location.pathname` at runtime, so the two files stay byte-identical
  and no per-file edits are needed.
- `sw.js` cache key → `compost-logger-v3.80`.
- **Drive deliberately NOT removed** (that is Group G, deferred ~July 27). Production now
  carries both backends: PocketBase wins when signed in, Drive keeps working for everyone
  who has not migrated.
- **Next beta line opened at v3.81.**

> **This changes the rollback story.** Production is no longer the untouched Drive-only
> build — the pure-Drive fallback is now the **`v3.78b` tag** only. The ROLLBACK section
> above has been updated, including what falling back to it would cost a user who has
> already moved their piles into an account.

### July 20 2026 (Claude Code) — SESSION SUMMARY

**The PocketBase migration went from "scoped, nothing running" to "live on a real domain
and reachable by a user", in one session.** Beta v3.79q → **v3.79w**, seven tagged builds.
Production untouched at v3.78b (pure Drive) throughout.

| Phase | Builds | What |
|---|---|---|
| Groups A–F | v3.79r → v3.79t | Backend stood up, sync, migration gate, consent, account UI |
| Real-device test | — | iPhone found two genuine bugs no headless test caught |
| Fixes | v3.79u, v3.79v | `sw.js` API-caching bug; demo-pile duplicates |
| Domain + TLS | v3.79w | `api.compostlogger.com`, Caddy/Let's Encrypt, CORS locked |

**What today actually demonstrated:** the harnesses (87 checks across five suites) caught
real regressions and made the refactors safe — but the two bugs that would have hurt users
were both found by *running the thing on a phone*. One (`sw.js` caching API responses) was
invisible to every headless test because service workers do not register on `file://`. The
other (demo-pile duplicates) only appeared because a real device had been reinstalled a few
times. Harnesses proved the code did what I meant; the device proved what I meant was
wrong.

**Bugs found and fixed today, none of which were in any group's scope:**
1. `sw.js` cached cross-origin API responses → permanent SYNC ERROR (v3.79u)
2. `pbLoad` could not distinguish "no vault" from "cannot see vault" → now self-heals (v3.79u)
3. Demo pile uploaded to real accounts + non-converging `— Local Copy` duplicates (v3.79v)
4. `renamePile` never stamped `lastModified` → a merge could silently revert a rename (v3.79v)
5. `pbLoad` silently uploaded the whole local vault on first login (v3.79s)
6. `pbLogout` leaked `pbAnalyticsOptIn` across accounts — a consent bug (v3.79t)
7. `showToast` rendered a dead UNDO button on every informational toast (v3.79t)
8. `pbRestoreAuth` signed users out silently, including when merely offline (v3.79t)
9. A failed signup could strand a user on "already registered" (v3.79t)
10. `sw.js` cache key had drifted at v3.78b through v3.79b–q (v3.79r)
11. "1 entries" grammar in Group D's destructive confirm (v3.79s)

**State at session end:** backend live and stable at `https://api.compostlogger.com`.
v3.79v and v3.79w were **verified on iPad Safari** (signup, import, `ACCOUNT SYNCED`,
`OFFLINE (local only)`, reconnect sync — and again after the domain move), which unblocked
Group H. Promoted as v3.80, then a further fix (v3.81a) shipped as **v3.82** after the
demo-pile purge was found not to have worked. Group G remains deferred ~July 27.

**Verification assets were preserved into `test/`** at the end of the session — the five
harness suites had lived only in a session scratchpad and would have been lost. They are
the guard for Group G, which will heavily edit `mergeCloudData`. `./test/run-all.sh`.

**What I would tell the next session in one line:** the harnesses protect refactors, but
both bugs that actually reached a user were found on a phone — treat device testing as
required, and be suspicious of any test fixture that only covers the path you were already
thinking about.

---

### July 20 2026 (Claude Code) — v3.79w: real domain + TLS, CORS locked

**compostlogger.com registered** (Cloudflare), `api` A-record → `64.226.83.129`, **proxy
disabled (DNS only)** — which matters: Caddy validates via `tls-alpn-01`, so the TLS
handshake has to reach this box rather than terminating at Cloudflare's edge.

- **Caddy 2.11.4** installed and enabled, fronting PocketBase for `api.compostlogger.com`.
  Let's Encrypt cert obtained via `tls-alpn-01`, valid to 2026-10-18, renewed
  automatically by Caddy (no cron). HTTP 308-redirects to HTTPS. PocketBase stays bound to
  `127.0.0.1:8090`, so Caddy is the only public path in.
- **`PB_BASE_URL` = `https://api.compostlogger.com`** — finally a *stable* hostname. The
  Cloudflare quick tunnel it replaces minted a new name on every restart, which is what
  made the earlier ephemeral-hostname caveat necessary. That caveat is now retired.
- **CORS locked to `https://aalkhalifa.github.io`** via PocketBase's `--origins` flag.

> **Do the CORS lockdown on PocketBase, not in Caddy.** The `Caddyfile` template shipped a
> commented block that set `Access-Control-Allow-Origin` at the proxy layer. PocketBase
> already emits its own, so that would have sent **two** ACAO headers — and browsers reject
> any response carrying more than one. It would have broken the app completely while
> presenting as a CORS misconfiguration. The template has been corrected.

**Tunnel kept as a fallback,** as requested: `cloudflared-pocketbase.service` still fronts
the same instance. Two caveats recorded in the runbook — its hostname still rotates on
restart (so it is break-glass, not a second endpoint), and it shares the same CORS
allowlist.

**Verified:** valid chain (`ssl_verify_result: 0`), health 200 over HTTPS, HTTP→HTTPS
redirect, CORS allows the app origin and returns *no* headers for others with exactly one
ACAO, and a full signup → login → vault create → scoped list → PATCH cycle through the new
domain while an unauthenticated list still returns 0 items. All five harnesses still green
(87 checks). Test accounts removed.

**Consequence for local testing:** a `file://` or `localhost` build now has a page origin
that is not allowlisted, so the browser blocks its API calls. The headless-Chrome harnesses
that ran from `file://` can no longer reach the backend; they would need that origin added
to `--origins` temporarily. Backend behavior itself is verified by curl, which is not
subject to CORS.

### July 20 2026 (Claude Code) — v3.79u/v: first real-device test found two real bugs

**First real-device test of v3.79t found a real bug, and it was in `sw.js`, not the
PocketBase code.** Symptom: on iPhone, signup and import worked, then the header stuck on
SYNC ERROR and saves never reached SAVED.

Diagnosis, from PocketBase's own request log (`/api/logs`): six `POST
/api/collections/vaults/records` → `400 user: Value must be unique`, all with
`"auth":"authRecord"` (so the token was fine) and a Safari user agent. That is `pbLoad`
taking its *create-a-vault* branch for a user who already had one — meaning the list
query had returned empty.

Root cause: `sw.js`'s fetch handler intercepted **every** GET, including cross-origin,
and cached successful responses. `pbLoad`'s "does this user have a vault?" GET was cached
while the answer was still *no*. Any later network hiccup served that stale empty list
from cache, so `pbLoad` tried to create a second vault, the unique index rejected it, and
`pbVaultId` stayed null — so every subsequent `save()` repeated the same doomed create.
A permanent failure that no retry could clear.

Two fixes:
- **`sw.js` only handles same-origin requests plus an allowlist of static asset CDNs.**
  All API traffic (PocketBase, Drive, Open-Meteo, Anthropic) now bypasses the worker with
  no `respondWith` at all. The same bug would have served stale Drive and weather data.
- **`pbLoad` self-heals.** The list rule returns `200` with an empty array for anything it
  filters out, so "no vault" and "cannot see your vault" are indistinguishable. On a
  unique-violation create, `pbLoad` re-queries and adopts the existing vault. The re-query
  uses a cache-busting URL — the first attempt reused the same URL and was defeated by the
  very cache entry it was recovering from, which the test caught.
- Vault-adoption logic extracted to `pbAdoptVaultRecord` so the normal and heal paths
  cannot drift.

**Why the earlier verification missed it:** every browser test loaded the app from
`file://`, where service workers do not register at all. The SW was never exercised. A
`file://` harness cannot validate a PWA's caching layer — that needs a real http origin.

*This was not a one-off: the July 22 privacy-anchor bug repeated the pattern from a
different angle. See **The device gate before promotion** under How Abdulla works.*

**v3.79v — demo pile duplicates fixed.** The same real-device session exposed a second
problem: the vault held `Demo Pile — 30 Days` plus five `— Local Copy` duplicates.

Two independent causes, both now closed:
1. **The demo pile was being uploaded at all.** Group D only drops the sample pile when
   it is the *only* thing on the device; a device with real piles *and* the sample pushed
   both. Fixed at the boundary: `pbBuildPayload` filters sample piles out of the vault
   payload. Because every vault write replaces `data` wholesale, this also **purges junk
   an earlier build already uploaded** on the next successful save.
2. **It never converged.** Rename-on-conflict fires when local and remote hold same-named
   piles with *different* ids — and a reinstall regenerates the demo pile with a fresh id
   while the vault still holds the old one. So each sign-in minted another "Local Copy"
   rather than settling. Real piles converge fine (once renamed they match by id
   thereafter); only the regenerating demo pile did not. `mergeCloudData` gains a
   `dropSamplePiles` opt used by the PocketBase paths only, so legacy junk is not pulled
   back down while the purge happens. **Drive does not pass it and stays byte-identical.**

**Guarding against data loss:** `isSamplePile` now returns false for any pile carrying
`lastModified`, so a demo pile a user adopted as a real one is never discarded. That
exposed a latent bug — `renamePile` never stamped `lastModified` (it runs outside the
active-pile path that `save()` stamps), which also meant a merge could revert a rename to
an older remote copy. Now stamped.

Verified by a 14-case harness (detection, upload filter, merge stripping, Drive
unchanged, and a convergence test simulating five reinstall-and-sign-in cycles), plus an
end-to-end run seeding a vault with the exact junk from the real account and confirming
it self-cleans while the real piles survive.

### July 20 2026 (Claude Code) — PocketBase migration, Groups A through F

**One session, six groups.** The migration went from "scoped, nothing running" to
"reachable by a real user": backend live on the DigitalOcean box, and beta v3.79t with
sign-up, sign-in, sync, first-login data migration, and analytics consent. Tagged
`v3.79r` / `v3.79s` / `v3.79t`; see **ROLLBACK** above. Production is untouched at
v3.78b, still pure Drive.

Sequence: **A** (server, live) → **C** (storage/sync) → **D** (migration gate) →
**E + F** (consent + account UI). B was already done in the previous session. G (Drive
removal) and H (promotion) remain.

**Verification approach, since none of this had ever run:** each group got a purpose-built
harness rather than inspection — a differential harness for C (old vs new merge, byte
comparison), a decision-matrix harness for D (scripted `confirm()` answers), and a
DOM-stub harness for F. The C harness was mutation-tested to prove it could actually
detect a regression. Groups E/F then got driven in a real headless Chrome against the
live backend, which is the only reason the end-to-end flows are known to work at all.

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

**Note:** `origin/main` had 16 commits that were not in the local checkout (beta v3.79b-q,
made July 15). Group A/C work was rebased on top of them. They are now reconstructed in the
**July 15 2026** entry below, from commit messages and diffs.

**Group D (first-login migration) built — beta v3.79s.**
- Found that `pbLoad`'s create branch was silently uploading the entire local vault —
  demo pile included — the moment a user authenticated. D's real job was putting a
  decision in front of that write, not adding a new capability.
- `pbLocalDataState()` classifies the device as `empty` / `sample-only` / `real`;
  `pbFirstRunDecision()` only prompts when real data is at stake.
- Declining the import is destructive (it replaces local with the vault, which may be
  empty), so it takes a second confirm naming the exact pile + entry count and pointing
  at "Download My Data" first. Cancelling that second confirm falls back to import —
  the safe direction when the user is unsure.
- Decision remembered per (device, account) in `pb_import_<userId>`; a second device
  asks again, which is the correct grain.
- Demo pile now carries `isSample:true`, with a name fallback (`"Demo Pile"` prefix) so
  devices from earlier builds are also covered.
- **Drive-file import deferred** — every Drive user's data is already in local
  `ca_v5`, and pulling Drive too would add a third merge authority to the flow.
- **Verified:** 18-case decision-matrix harness with scripted `confirm()` answers
  (classification, prompt counts, both destructive branches, the fallback, warning-text
  assertions, per-account persistence). It caught a real "1 entries" grammar bug. Group
  C's 12/12 equivalence harness re-run and still passing. Import paths exercised against
  the live backend; test accounts removed.

**Groups E + F built — beta v3.79t. The migration is now reachable by a user.**
- **Group E (consent):** `pbSetAnalyticsOptIn` writes via a *dedicated single-field
  PATCH* — deliberately not folded into `pbSaveNow`, which fires from `save()` and could
  push a stale local default over a cloud opt-in. `pbLoad` restores it from the vault
  (authoritative); a local cache key only drives the Settings row before load resolves.
  Fixed a consent leak found while building: `pbLogout` did not clear `pbAnalyticsOptIn`,
  so a second account created in the same session inherited the first one's opt-in.
- **Group F (account UI):** `updatePbUI` created — the renderer every `pb*` function has
  called behind a `typeof` guard since Group B — covering all 8 `pbStatus` values.
  Sign-in/sign-up overlay (Enter-to-submit, iOS Keychain `autocomplete`, signup-only
  length validation, in-flight submit lock), Settings ACCOUNT card, and
  `pbAuthErrorMessage` mapping PocketBase failures to human text. Bad credentials stay
  deliberately opaque so accounts cannot be enumerated.
- **Header:** one status line, PocketBase takes precedence. `updateDriveUI` and
  `updatePbUI` yield to each other on complementary guards, so exactly one renders and
  there is no recursion. Drive keeps its Settings card but loses its header button; a
  Drive-only user's header is unchanged.
- **Three latent bugs fixed on the way:** `showToast` hardcoded an UNDO button, so every
  informational toast (including Group D's, already shipped) showed a dead control;
  `pbRestoreAuth` signed users out silently on a failed refresh, and did so even when the
  real problem was being offline; and a signup whose follow-on login failed left the
  account created but the user stuck on "already registered" when they retried.
- **Verified:** 31-case Group F harness (error mapping, the mutual-yield recursion guard,
  all 8 status values, mode rendering, settings card); C and D harnesses still 12/12 and
  18/18. Then driven **in a real browser** (headless Chrome) against the live backend:
  boot, signup with consent, both Group D migration prompts, the destructive decline
  path, wrong-password vs unknown-account (identical messages), offline, Enter-to-submit,
  session restore across reload, and sign-out. No JS errors. All test accounts removed.

**Bugs found and fixed that were not in any group's scope.** Worth recording, because
each was found by building the next layer on top rather than by review:
1. `pbLoad` silently uploaded the whole local vault (demo pile included) on first login —
   found while starting D, which then became a gate rather than a new feature.
2. `pbLogout` did not clear `pbAnalyticsOptIn`, so a second account created in the same
   session inherited the first user's consent — found while building E.
3. `showToast` hardcoded an UNDO button, so every informational toast showed a dead
   control. **Group D had already shipped this.**
4. `pbRestoreAuth` signed users out silently on a failed refresh, including when the real
   problem was simply being offline.
5. A signup whose follow-on login failed left the account created but the user stuck on
   "already registered" if they retried.
6. `sw.js` had drifted at cache key `v3.78b` while beta advanced through v3.79b–q.
7. A "1 entries" grammar bug in D's destructive confirm, caught by the D harness.

**Open items carried forward:** no domain (so Caddy/TLS and the CORS lockdown are both
still pending, and CORS remains permissive); no privacy policy (a launch blocker — E's
consent copy is deliberately written not to depend on one); and `PB_BASE_URL` points at
an ephemeral quick-tunnel hostname. Two accepted limitations are parked in TODO.md with
triggers: non-atomic read-merge-write concurrency, and the 5 MB vault field cap.

*(This was written before the real-device test. It said A–F should be confirmed on an
actual iPhone before Group G removes the Drive fallback, since everything so far had been
verified headlessly. That test happened the same day and immediately found two genuine
bugs — see the v3.79u/v entry above. The caution was warranted.)*

### July 15 2026 — beta v3.79b–q (reconstructed, not written at the time)

**This entry was reconstructed on July 20 from commit messages and diffs.** No session log
was written for this work. Everything below is labelled by how well it is actually known.
The commit bodies are detailed — read them directly (`git log 04b8748..1c56380`) before
touching this area.

#### Established from the diff (high confidence)

- **16 commits, all on 2026-07-15**, one build each: `v3.79b` → `v3.79q`.
  Range: `04b8748..1c56380`. All from a single Claude Code session
  (`session_01QPNudebVr9H65rMmYszF3r`, referenced in every commit trailer).
- **Only `beta/index.html` was touched.** Never `sw.js`, never production `index.html`.
  That is the direct cause of the cache-key drift found in v3.79r: sixteen beta builds
  shipped while the shared service-worker key still said `v3.78b`.
- **+319 / −72 lines.**
- **New functions:** `renderMiniCharts`, `toggleMiniCharts`, `toggleChartExpand`,
  `renderSettingsRecipes`, `loadRecipeFromSettings`.
  `cappedNow` was **modified, not added** (it is a one-liner, so the 8h→24h change shows
  as a whole-line replacement in the diff).
- **New localStorage key:** `ca_chartExpand` (FIT/EXPAND chart mode).
- **All of it is live in production v3.82**, carried in by the v3.80 promotion. Verified by
  marker presence in both `index.html` and `beta/index.html`.

#### What each build did (per its own commit body)

| Build | Change |
|---|---|
| `v3.79b` | Segmented bar band now derived from `displayTemp(e)`, not raw `core1` — the bar had ignored the AVG/MIN display basis and could contradict the headline status. Inherited by `renderStageBarActive`, `renderCompletedCycleBar`, PDF turn history. |
| `v3.79c` | A logged turn now closes its cycle regardless of the turn reading's own temperature. Previously a turn logged at/just below the band floor could fail to close a cycle whose *earlier* readings had satisfied a stage, leaving it stuck on SATISFIED / TURN NOW. The closing turn extends a running streak but never breaks or starts one. |
| `v3.79d` | `cappedNow()` extrapolation cap **8h → 24h**. Its own body flags the side effect: a stale-but-hot pile now credits up to 24h of the logging gap as thermophilic/READY. |
| `v3.79e` | Completes v3.79c's user-visible half: `calcSmartTimer` detects an already-closed last cycle and returns a `betweenCycles` state, so a just-turned pile stops showing TURN NOW. Renders "CYCLE N COMPLETE / TURNED". |
| `v3.79f` | AVG column added to the on-screen log table, coloured by band. PDF left alone. |
| `v3.79g` | (a) `validateEntry` no longer requires a temperature — turn/water/moisture-only entries save, with a guard against a truly empty entry. (b) On-screen moisture line steps vertically at rises, stays smooth on drops. |
| `v3.79h` | PDF gains a conditional Water column and a "Watered:" line in Turn History; `buildTurnHistory` carries `watered`/`waterAmount`/`waterQty`. |
| `v3.79i` | Water annotation labels y-staggered so adjacent ones stop overprinting; PDF label gains the amount word. |
| `v3.79j` | Chart defaults to FIT (whole lifespan, no horizontal scroll); new FIT/EXPAND toggle persisted to `ca_chartExpand`; day tick labels thinned in fit mode. |
| `v3.79k` | New collapsed-by-default section with two mini charts: probe spread (`coreSpread`) and heating rate (`heatingRateSeries`). Lazy-rendered, destroyed/rebuilt to avoid canvas leaks. |
| `v3.79l` | Settings lists saved recipes with a LOAD action that closes Settings, opens New Pile and applies the recipe. |
| `v3.79m` | Excel import explicitly skips any avg/average header so it can never bind to a temperature column. Body notes this was already the behaviour; the change is an explicit guard. |
| `v3.79n`–`v3.79q` | Four iterations on chart presentation: red shade band, portrait FIT width, expand widths, and successively reworked water labels (stacked → vertical → top-anchored → bottom zone with solid background). |

#### Inferred, not certain

- **There was an external numbered task list.** Commit bodies cite "Task 1", "Task 3"…
  "Task 12". Tasks **1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12** are accounted for. The list
  itself is not in this repo, and the Claude session URLs in the trailers are not readable
  from here.
- **The last four builds look like one problem iterated on**, not four separate tasks: they
  carry no task number and each reworks the same water-label placement. Whether the final
  state (`v3.79q`) was accepted as good or merely the last attempt of the day is **not
  recorded**.

#### Genuinely unknown — do not assume

- **What "Task 2" was.** No commit references it. It may have been dropped, done elsewhere,
  or renumbered. If a numbered list resurfaces, check this before assuming it shipped.
- **Why there is no `v3.79a`.** The base build was `v3.79` (Group B) and the first of these
  is `v3.79b`. No commit mentions `v3.79a`.
- **Whether any of it was tested on a device.** Nothing in the commits says so, and much of
  it is chart/PDF layout work that only a real screen can validate.
- **Which changes were requested vs proposed.** The bodies describe *what* and *why
  technically*, not who asked.

#### Why this matters now

Three of these are **behaviour changes to the biological model**, not cosmetics, and all
three are live in production:

- `v3.79b` changed which temperature drives stage banding on the bars.
- `v3.79c`/`v3.79e` changed when a cycle is considered closed.
- `v3.79d` raised the extrapolation cap 8h → 24h, so a pile logged once and left hot now
  accrues up to a full day of thermophilic/READY time from a single reading. This document
  had recorded the cap incorrectly as 8h until July 20.

**Scope check (verified in code, July 20):** these affect the **Compost Academy stage
model** — Stage 1-4 satisfaction, READY/thermophilic times, cycle bars, TURN NOW. They do
**not** touch the PFRP numbers. `pfrpStatus()` uses `strictMinTemp` (coldest probe,
independent of display basis) and gives **zero** credit for time after the last reading —
it never calls `cappedNow`. So "Avg PFRP days" and "Windrow-PFRP pass rate" are unaffected
by all three.

> **Naming hazard found while checking this.** `complianceTemp()` is a **legacy alias that
> now returns `displayTemp`**, i.e. it follows the AVG/MIN display basis — despite the
> name. It feeds stage-streak satisfaction, degree-hours-above-threshold, and the "first
> entry >=131F" figure used in the Operation Summary and PDF. Only `pfrpStatus` uses the
> strict minimum. Anyone reading `complianceTemp` and assuming "regulatory temperature"
> would be wrong. See the review item in TODO.md.

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

### Drive sync (superseded — see `mergeCloudData`)
Since v3.79r both Drive paths call the shared `mergeCloudData(remote, opts)`; the behavior
below is preserved exactly via its `opts` flags, verified byte-identical
(`test/c-merge-equivalence.js`). Drive itself is removed in Group G.
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
**Status:** Fixed and shipped to production in v3.77q (July 11 2026).

### BUG 2 — FIXED (v3.77q): active-cycle extrapolation
**Symptom:** Active cycle bars show 500-900h READY time.
**Root cause:** Last entry interval extended to "now". If last entry was days ago at a hot temp,
all elapsed time counted as READY.
**Fix (v3.77q):** Added `cappedNow(lastTs)` helper (caps at lastEntry + 8h). Applied in
`computeIndependentStages`, `classifyCycleTime`, `buildChronologicalSegments`, and
`computeSatisfiedStages`. `calcSmartTimer` inherits the cap.
**Status:** Fixed and shipped to production in v3.77q (July 11 2026).

### BUG 3 — FIXED (v3.77q): JSON export incomplete
**Symptom:** Export JSON missing sites array, recipe templates, and some settings.
**Fix (v3.77q):** `exportAllJSON` now emits the full `ca_v5` shape (incl. `sites`, `siteId` on
piles, `recipes`, `volumeUnit`, `containerUnit`, `deletedPileIds`) plus separate-key settings
(`displayBasis`, `showPFRP`, `pilesSortMode`, `entriesSortMode`) and `exportVersion`/`exportedAt`.
**Status:** Fixed and shipped to production in v3.77q (July 11 2026).

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
**Status:** **SHIPPED.** Scoped July 11 2026, built July 20 2026 (Groups A-F), live in production as v3.82. Group G (delete Drive/GSI) is the only part outstanding.
**Locked design decisions (July 11 2026):**
- **Data model:** blob-per-user — one `vaults` record holds the full `ca_v5` JSON;
  reuses the existing pile/entry/site/recipe/tombstone merge logic (extracted once into
  `mergeCloudData(remote)`). Relational per-pile records deferred until the share view needs them.
- **Drive cutover:** import-then-remove — keep a one-time "import from Drive" during the
  beta, then delete all Drive/GSI code once users are migrated.
- **Hosting:** PocketBase on the existing DigitalOcean box behind a TLS subdomain.
  **Live since July 20 2026** at `https://api.compostlogger.com` (Caddy + Let's Encrypt).
- **Base URL:** a single configurable `PB_BASE_URL` constant in the app — now
  `https://api.compostlogger.com`. Kept configurable so the Cloudflare tunnel fallback is
  a one-constant swap.
- **Auth transport:** raw `fetch` against PB's REST API (no PB JS SDK) to respect the
  single-file + Safari/no-optional-chaining constraints.
**Migration path for existing users:** On first PB login, detect localStorage data (and
optionally an existing Drive file), offer one-tap import.

### Hosting plan
- Keep GitHub Pages for the app (still `aalkhalifa.github.io` — the CORS allowlist is
  pinned to that origin, so pointing the app at a compostlogger.com domain later means
  updating `--origins` on the backend at the same time)
- **Domain: compostlogger.com** (Cloudflare, registered July 20 2026). `api` subdomain
  serves the backend; the apex is unused so far.
- DigitalOcean for PocketBase backend — live behind Caddy/TLS
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

> **TODO.md is the live task list.** This section is the longer-range view; where the two
> disagree, TODO.md wins.

### ✅ DONE (kept for context)
- Location/siteId bug, `classifyCycleTime` extrapolation, JSON export completeness — all
  fixed in v3.77q (July 11 2026)
- **PocketBase migration** — Groups A–F, live in production as v3.82 (July 20 2026)
- **Migration path for existing users** — Group D, first-login import decision
- **Opt-in analytics consent at signup** — Group E (wiring only; no pipeline exists)
- **Custom domain** — compostlogger.com registered; `api.` subdomain serves the backend
- **Drive auto-connect** — moot; PocketBase replaced the need

### 🟡 NEXT
1. **Group G** — delete Drive/GSI code (deferred ~July 27 2026)
2. **Point the app at compostlogger.com** — needs the migration-banner + dual-URL cutover
   in TODO.md, *and* a `--origins` update on the backend at the same time
3. **Privacy policy** — a launch blocker. E's consent copy is deliberately written not to
   depend on one, but public launch does.

### 🟢 BACKLOG
- **Instructor/share view** — share pile read-only via link. Depends on server-side share
  tokens, and is the trigger for revisiting the blob-per-user data model.
- **App Store / Play Store** — via Capacitor, now unblocked (clean auth story exists)
- **Analytics pipeline** — consent is captured; nothing collects yet

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
| classifyCycleTime cap at **24h** | Freeze extrapolation 24h after the last entry | Prevents runaway READY time when the user hasn't logged in days. Was 8h in v3.77q; **raised to 24h in v3.79d**. NOTE: a stale comment in both index.html files still says 8h — code is correct, comment is not (TODO). |
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

## How Abdulla works

> Written July 21 2026, from how the sessions have actually gone. This is not a
> style preference list — following it produces better work, and ignoring it has
> produced rollbacks. Read it before the first substantive reply of a session.

**Understand WHY before approving.** He does not want a list of proposed changes
to rubber-stamp; he wants the reasoning that makes the list obviously right or
obviously wrong. Explain the tradeoff, name the alternative that was rejected,
and say what it costs. A proposal that arrives without its reasoning will get
questions rather than approval — correctly, because the reasoning is the part he
is actually reviewing.

**Step-by-step walkthroughs while learning a new SOP.** For territory he has not
worked in before (backend infra, backups, TLS), go one step at a time and show
the output of each before moving on. Once a procedure is established he moves
fast — the granularity is about unfamiliarity, not caution in general.

**Strict pre-approval before any code.** Nothing gets written until the change
list is approved. This is a hard rule with history behind it: **a build was
rolled back for violating it (the v3.77n incident)** — see *Process rule* under
Architecture Notes. It extends to server state: enabling a timer, writing to
`/etc`, and changing a live service are all "code" for this purpose.

**Checkpoints are load-bearing.** When he says "stop and show me X before you do
Y", showing X and doing Y in the same breath defeats the point. Stop, show, wait.

**The device gate before promotion is load-bearing precedent, not ceremony.** Two
days running, the bug that actually mattered was found by tapping a real device —
never by a harness. **v3.79u** (`sw.js` caching API responses) and **the privacy
anchor** (July 22) each passed every check while being broken in the browser: the
first because `file://` does not register service workers, the second because
static harnesses verify extracted *code* and could not see that the DOM assembled
without the link. Both were invisible from the desk and obvious within seconds on
a phone. So when a change is built, green and tagged, that is not the same as
verified — if it has not been touched on a device, say so plainly and offer to
hold. Promotion was reset mid-flight for exactly this on July 22 and it was the
right call. A green suite is evidence, not proof.

**Late nights are deliberate.** Sessions run late by choice, with full focus. Do
not editorialise about the hour, suggest stopping for the night, or treat a 3am
message as a reason to be extra cautious. Match his energy and keep working.

**Secrets: password manager first, server second, chat never.** He populates
secret files himself — do not ask him to paste a credential into the
conversation. The pattern that works: tell him the exact variable names, the
exact format, and where the file goes; he fills it in; then verify permissions
and *structure* (names present, value lengths, no placeholders left) without
ever echoing a value. Redact anything key-shaped in command output by reflex.
Note **the repo is public**, so secrets never enter it — only `.example` files
with placeholders.

**Record decisions with their reasoning; do not summarise them away.** The docs
are deliberately long because the *why* is the valuable part. When something was
considered and rejected, write down that it was rejected and what it would have
cost — a future session will otherwise re-propose it. Keep the failures and the
dead ends: the demo-pile purge bug, the v3.79u service-worker bug, and the
unexplained `data.db` verification failure are all in these docs on purpose.
**Never quietly drop something that did not work.**

**Concise answers.** Lead with the result. Skip preamble, skip restating the
question, skip narrating what you are about to do. Concise does **not** mean
shallow — length spent on reasoning, tradeoffs and honest caveats is welcome;
length spent on filler and recapping is not. If an answer is getting long, the
right cut is usually the summary, not the substance.

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

### Version numbering (July 20 2026)
- **Beta always has a letter; production never does.** The one rule that matters.
- A line opens in beta at its **`a`** iteration (`v3.83a`), bumps a letter on every
  meaningful change (`v3.83b`, `v3.83c`, …), and is promoted to production as **its own
  number** (`v3.83`). No gaps, no number reused.
- The next line then opens at `v3.84a`.
- When no line is open, beta mirrors production at the production number.
- `sw.js` cache key must match the newest deploy of either channel:
  `compost-logger-v3.XX`. The file is shared by prod and beta.
- See *Version convention* near the top for the full statement, including why there is no
  `v3.81` tag.
