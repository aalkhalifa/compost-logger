# PocketBase backup and restore

Nightly off-droplet backup of the PocketBase vault, and the tested procedure for
getting it back.

**Built and verified 21 July 2026.** The restore procedure in this document has
been executed end-to-end against a real backup pulled out of R2 — see
*Verification record* at the bottom. An untested restore is not a backup.

---

## Architecture

```
02:10 UTC  systemd timer
   |
   +-- POST /api/backups           PocketBase's own snapshot API: a clean,
   |                               transactionally consistent SQLite snapshot,
   |                               NOT a file copy of a live database
   +-- verify locally              size floor, unzip -t, contains data.db,
   |                               md5 vs PocketBase's own .attrs checksum
   +-- rclone -> Cloudflare R2     daily/  (+ weekly/ on Sundays)
   +-- verify in R2                size AND md5 read back from R2
   +-- prune local                 keep 2; R2 holds the history
   +-- healthchecks.io ping        ONLY after the object is verified present
```

**One schedule, not two.** The timer drives both snapshot creation and upload.
An earlier design had PocketBase's internal backup cron produce snapshots and a
separate timer ship them, which introduces a race between two schedulers for no
benefit. PocketBase's own `backups.cron` setting is deliberately left **empty**.

**Layers.** Local snapshots (2 kept) cover "I broke the data" and restore fast.
R2 covers "the droplet is gone". DigitalOcean droplet snapshots were considered
and **deliberately declined** — nothing else on the box is irreplaceable, and at
~$2.80/mo they would mostly have been insuring 37 GB of transient video.

| Component | Value |
|---|---|
| Schedule | `02:10 UTC` daily (= 05:10 Asia/Bahrain) |
| Timer | `compost-backup.timer` (`Persistent=true`) |
| Script | `/usr/local/bin/compost-backup.sh` |
| Secrets | `/etc/compost-backup.env`, `0600 root:root` |
| Bucket | `compost-logger-backups` (Cloudflare R2) |
| Retention | `daily/` 7 days, `weekly/` 28 days — **R2 lifecycle rules** |
| Monitoring | healthchecks.io, period 1 day, grace 3h -> aalkhalifa@gmail.com |

Retention is enforced **server-side by R2 lifecycle rules**, not by the script
deleting objects. A bug in the script therefore cannot destroy history. The
script only *counts* objects and aborts if `daily` leaves 1..10 or `weekly`
leaves 0..6 — that is what catches a lifecycle rule that has silently stopped.

---

## Restore

### A. Inspect a backup without touching production (default)

Use this to check what a backup contains, or to recover a few piles. It never
touches live `pb_data` or the running service.

```bash
cd /root
mkdir -p restore-test/pb_data

# 1. Pick a backup. Newest first:
set -a; . /etc/compost-backup.env; set +a
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
       RCLONE_CONFIG_R2_REGION=auto RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
rclone lsl "r2:${R2_BUCKET}/daily/"

# 2. Download it (--s3-no-head is required, see Gotchas)
rclone copyto --s3-no-head "r2:${R2_BUCKET}/daily/compost-YYYYMMDD-HHMMSS.zip" /root/restore.zip

# 3. Verify BEFORE trusting it
unzip -t /root/restore.zip
unzip -l /root/restore.zip | grep ' data.db$'

# 4. Extract and run a SECOND PocketBase on a different port
unzip -q /root/restore.zip -d /root/restore-test/pb_data
/opt/pocketbase/pocketbase serve --dir=/root/restore-test/pb_data --http=127.0.0.1:8091 &

# 5. Inspect it (same admin credentials as live)
PBPW=$(cat /root/.pb_admin_password)
TK=$(curl -s -X POST http://127.0.0.1:8091/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"aalkhalifa@gmail.com\",\"password\":\"$PBPW\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

curl -s http://127.0.0.1:8091/api/collections/vaults/records -H "Authorization: $TK" \
  | python3 -c 'import sys,json
for r in json.load(sys.stdin)["items"]:
    p=r["data"].get("piles",[])
    print(r["id"], len(p), "piles")
    for x in p: print("   ", x.get("name"), len(x.get("entries") or []), "entries")'

# 6. Tear down
kill %1
rm -rf /root/restore-test /root/restore.zip
```

### B. Restore over live production (disaster only)

**Only after A has confirmed the backup contains what you expect.** This
replaces production data.

```bash
systemctl stop pocketbase

# Keep what is currently there. Do NOT skip this - if the backup turns out to
# be wrong, this is the only way back.
mv /opt/pocketbase/pb_data /opt/pocketbase/pb_data.before-restore-$(date -u +%Y%m%d-%H%M%S)

mkdir -p /opt/pocketbase/pb_data
unzip -q /root/restore.zip -d /opt/pocketbase/pb_data
chown -R pocketbase:pocketbase /opt/pocketbase/pb_data

systemctl start pocketbase
systemctl status pocketbase --no-pager
curl -s http://127.0.0.1:8090/api/health

# Verify through the real domain before declaring success
curl -s https://api.compostlogger.com/api/health
```

Then confirm pile counts via the snippet in step 5 above (port 8090), and only
once satisfied remove the `pb_data.before-restore-*` directory.

**What a restore does NOT do:** it does not touch any user's device. The app is
offline-first and every device keeps its own `ca_v5` in localStorage. A user who
opens the app after a restore will merge their local copy against the restored
vault, which is normally what you want.

---

## Monitoring

healthchecks.io is external on purpose: if the droplet dies, nothing running on
it can tell you. It alerts if no success ping arrives within period + grace.

The success ping is sent **only after the uploaded object has been read back
from R2 and its size and md5 matched against the local file**. It is not sent
because the script ran. A green check next to an empty bucket is the specific
failure this design exists to prevent.

### What an alert means

| Alert | Likely cause | First command |
|---|---|---|
| "cannot reach PocketBase" | PB service down | `systemctl status pocketbase` |
| "admin auth was REJECTED (HTTP 400)" | Password in `/root/.pb_admin_password` is wrong | Check the Admin UI |
| "admin auth was REJECTED (HTTP 404)" | PB upgraded to 0.23+; admin API renamed | See *Gotchas* |
| "size/md5 mismatch" | Upload corrupted | Re-run manually; check R2 status |
| "daily count N outside 1..10" | R2 lifecycle rule stopped working | Check bucket lifecycle rules in the Cloudflare dashboard |
| "archive fails integrity test" | Snapshot is corrupt — **do not trust it** | Investigate before the next run overwrites |
| No alert, but check went red | Box is down, or the timer is disabled | `systemctl list-timers compost-backup.timer` |

### Testing the alerting

The failure paths are exercisable against the real script without editing it:

```bash
# PocketBase unreachable
PB_URL=http://127.0.0.1:9999 /usr/local/bin/compost-backup.sh

# snapshot rejected by verification (exercises the `exit 1` guard path)
MIN_SIZE=99999999 /usr/local/bin/compost-backup.sh

# bad R2 credentials: point ENV_FILE at a copy with bogus keys
ENV_FILE=/path/to/test.env /usr/local/bin/compost-backup.sh
```

Each must end with `healthchecks ping '/fail' accepted (HTTP 200)`. Follow with
a normal run to return the check to green.

There is also `--skip-offsite`, which creates and verifies a snapshot but does
not upload. It deliberately **does not ping success** and says so loudly: a mode
that produced a green check without an offsite copy would defeat the point.

---

## Routine operations

**Run a backup by hand:**
```bash
systemctl start compost-backup.service   # or: /usr/local/bin/compost-backup.sh
journalctl -u compost-backup.service -n 40 --no-pager
```

**Check the timer:** `systemctl list-timers compost-backup.timer`

**Rotate the R2 key:** create a new R2 API token (Object Read & Write, scoped to
this bucket only), edit `/etc/compost-backup.env`, run the script once by hand,
then delete the old token in Cloudflare.

**Rotate the PocketBase admin password:** change it in the Admin UI, then update
`/root/.pb_admin_password`. **The backup script reads that same file**, so it
picks the change up automatically — but a mistake there breaks backups as well
as the runbook snippets. Run the script by hand afterwards to confirm.

---

## Gotchas

**R2 returns 501 on rclone's post-upload HEAD.** The PUT succeeds and the object
lands correctly; only rclone's own verification call fails, and its internal
retry then masks this by finding the object already present. The script passes
`--s3-no-head`. This is not a loss of verification — the script replaces it with
its own size+md5 read-back, which is stronger. **Any manual `rclone` command
against this bucket needs `--s3-no-head` too.**

**A bucket-scoped token cannot read bucket configuration.** `GetBucketLifecycle`
returns 403 with an Object Read & Write token, so the lifecycle rules cannot be
verified from the droplet — they must be checked in the Cloudflare dashboard.
The script's object-count guard is the backstop and will fail within ~10 days if
the `daily/` rule stops working.

**A bucket-scoped token also cannot create the bucket**, which is why
`--s3-no-check-bucket` / `no_check_bucket` is set. Without it rclone fails before
it ever uploads.

**PocketBase 0.22 vs 0.23+.** This script calls `/api/admins/auth-with-password`.
0.23+ renames that to `/api/_superusers/`. An upgrade breaks backups; the alert
will read `admin auth was REJECTED (HTTP 404)`. See the version-pin item in
TODO.md.

**One unexplained failure, 21 July 2026.** A run aborted with `FATAL: archive
does not contain data.db` on an archive that demonstrably did contain it. Could
not be reproduced (40 runs of the original form, 10 under the script's exact
redirect, 8 against freshly created snapshots); a SIGPIPE/`pipefail` race, a
write race, and memory pressure were each investigated and ruled out. The check
was rewritten to capture the listing and match with a here-string, removing the
pipeline entirely, so no upstream hiccup can present as a missing `data.db`.
**The trigger remains unidentified.** It failed safe (aborted before uploading).
If it recurs, the log tail in the healthchecks alert is the place to start.

---

## Verification record (21 July 2026)

- **Snapshot API** — `POST /api/backups` returns 204; archive contains `data.db`;
  md5 matches PocketBase's own `.attrs` checksum. Service healthy throughout.
- **Corruption guards** — truncated archive, md5 mismatch, undersized archive and
  an archive with no `data.db` were each constructed and each **rejected**.
- **Round trip** — object downloaded back out of R2 was **bit-for-bit identical**
  to the local snapshot (`md5 c90ef8fa1441c31889854f4b98ac337c`).
- **Restore drill** — restored from the R2-downloaded archive into a throwaway
  instance on port 8091: **7 piles, 227 entries, every pile id and every entry id
  identical to live**, plus `sites`/`recipes`/`ingHist`/units/`analyticsOptIn`.
  Live `pb_data` mtime unchanged; service stayed up.
- **Alerting** — four induced failures (bad R2 credentials, PocketBase
  unreachable, snapshot rejected by verification, wrong admin password) each
  produced a distinct actionable message and a `/fail` ping **accepted with
  HTTP 200**. A subsequent clean run returned the check to green.

Comparing entry **ids** rather than counts is deliberate: a count-only check
passes even if entries have been shuffled between piles. This is the same
diffing approach that caught the demo-pile purge failure in v3.80.
