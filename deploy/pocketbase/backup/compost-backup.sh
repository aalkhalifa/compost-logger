#!/usr/bin/env bash
#
# compost-backup.sh - nightly PocketBase snapshot -> Cloudflare R2
#
# Layer 1: create a snapshot via PocketBase's built-in snapshot API (a clean,
#          transactionally consistent SQLite snapshot - NOT a file copy).
# Layer 2: verify it, ship it off the droplet to R2, verify it landed.
# Monitor:  healthchecks.io. The success ping is deliberately gated on the
#          object being VERIFIED PRESENT IN R2, not on this script having run.
#          A green check next to an empty bucket is the failure mode this
#          whole design exists to prevent.
#
# Retention is enforced by R2 lifecycle rules (daily/ 7d, weekly/ 28d) rather
# than by this script deleting things. Server-side expiry cannot be broken by a
# bug in here. This script only VERIFIES the counts look sane and shouts if not.
#
# Secrets come from /etc/compost-backup.env (0600). Nothing secret lives in the
# repo - the repo is public.
#
set -Eeuo pipefail

ENV_FILE=${ENV_FILE:-/etc/compost-backup.env}
PB_BACKUP_DIR=/opt/pocketbase/pb_data/backups
PB_ADMIN_EMAIL=aalkhalifa@gmail.com
PB_ADMIN_PW_FILE=/root/.pb_admin_password
KEEP_LOCAL=2           # local copies kept for fast restore; R2 holds the history

# Overridable from the environment so failure paths can be exercised against
# the REAL script rather than a modified copy (see BACKUP-RESTORE.md, "Testing
# the alerting"). Normal runs use the defaults.
PB_URL=${PB_URL:-http://127.0.0.1:8090}
MIN_SIZE=${MIN_SIZE:-50000}   # bytes; a snapshot smaller than this is not credible
RCLONE_REMOTE=r2

LOG=$(mktemp /tmp/compost-backup.XXXXXX.log)
exec > >(tee -a "$LOG") 2>&1

STAMP=$(date -u +%Y%m%d-%H%M%S)
NAME="compost-${STAMP}.zip"
IS_WEEKLY=0
[ "$(date -u +%u)" = "7" ] && IS_WEEKLY=1   # Sunday also lands in weekly/
# FORCE_WEEKLY=1 exercises the Sunday path on any day. It can only turn the
# weekly copy ON, never off, so a stray value cannot silently cost you a weekly
# backup. Used to test that branch without waiting for a Sunday.
[ "${FORCE_WEEKLY:-0}" = "1" ] && IS_WEEKLY=1

say() { echo "[$(date -u +%H:%M:%S)] $*"; }

# --- healthchecks.io -------------------------------------------------------
# Pings never abort the backup itself. A failed success-ping causes a false
# alarm, which is the right direction to fail in.
hc() {
    local path="${1:-}" body="${2:-}" code
    [ -n "${HC_UUID:-}" ] || return 0
    # Log whether the ping was ACCEPTED. "we ran curl" is not evidence the
    # alert landed, and a fail ping that silently goes nowhere is the one
    # failure this whole design cannot tolerate.
    code=$(curl -sS -m 15 --retry 3 --retry-delay 2 -o /dev/null -w '%{http_code}' \
        --data-raw "$body" "https://hc-ping.com/${HC_UUID}${path}" 2>/dev/null) || code="000"
    if [ "$code" = "200" ]; then
        say "healthchecks ping '${path:-success}' accepted (HTTP 200)"
    else
        say "WARN: healthchecks ping '${path:-success}' NOT accepted (HTTP ${code}); backup itself unaffected"
    fi
}

# FINISHED is set to 1 only after the success ping. Anything else - a failed
# command caught by set -e, OR an explicit `exit 1` from a validation guard -
# leaves it 0 and the EXIT trap reports the failure.
#
# The ERR trap alone was NOT enough: `exit 1` does not fire ERR, so every
# "FATAL: ..." guard used to abort WITHOUT ever pinging healthchecks. Trapping
# EXIT is what makes "the script died for any reason" reliably alert.
FINISHED=0

on_err() { say "FAILED (exit $?)"; }
trap on_err ERR

on_exit() {
    local rc=$?
    if [ "$FINISHED" != "1" ] && [ "$rc" -ne 0 ]; then
        hc "/fail" "$(tail -n 20 "$LOG")"
    fi
    rm -f "$LOG"
}
trap on_exit EXIT

# --- config ----------------------------------------------------------------
SKIP_OFFSITE=0
[ "${1:-}" = "--skip-offsite" ] && SKIP_OFFSITE=1

if [ -r "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    . "$ENV_FILE"
elif [ "$SKIP_OFFSITE" = "0" ]; then
    echo "FATAL: $ENV_FILE not readable and --skip-offsite not given"; exit 1
fi

if [ "$SKIP_OFFSITE" = "0" ]; then
    for v in R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET HC_UUID; do
        [ -n "${!v:-}" ] || { echo "FATAL: $v unset in $ENV_FILE"; exit 1; }
        # Catch a half-filled env file: an untouched placeholder is not a value.
        case "${!v}" in REPLACE_WITH_*) echo "FATAL: $v still has its placeholder value"; exit 1;; esac
        # CRLF from a copy-paste ends up inside the value and corrupts the
        # endpoint URL / ping URL in ways that are painful to see. Fail loudly.
        case "${!v}" in *$'\r'*) echo "FATAL: $v contains a carriage return - save $ENV_FILE with Unix line endings"; exit 1;; esac
    done
    # Format guards for the two values most often pasted in the wrong form.
    case "$HC_UUID" in
        http*|*/*) echo "FATAL: HC_UUID must be the BARE uuid, not the full ping URL"; exit 1;;
    esac
    case "$R2_ACCOUNT_ID" in
        http*|*.*|*/*) echo "FATAL: R2_ACCOUNT_ID must be the bare account id, not the endpoint URL"; exit 1;;
    esac
    case "$R2_BUCKET" in
        */*) echo "FATAL: R2_BUCKET must be the bucket name only, with no path or slashes"; exit 1;;
    esac
    # rclone is configured entirely from the environment - no rclone.conf, so
    # there is exactly one file on this box containing secrets.
    export RCLONE_CONFIG_R2_TYPE=s3
    export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
    export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
    export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
    export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    export RCLONE_CONFIG_R2_REGION=auto
    export RCLONE_CONFIG_R2_ACL=private
    # A bucket-scoped token cannot HEAD/create the bucket; without this rclone
    # tries and fails before it ever uploads.
    export RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
fi

hc "/start" "compost-backup ${NAME} starting"
say "=== compost-backup ${NAME} (weekly=${IS_WEEKLY} skip_offsite=${SKIP_OFFSITE}) ==="

# --- 1. create the snapshot via PocketBase's snapshot API -------------------
say "authenticating to PocketBase admin API"
# NOTE: PocketBase 0.22 uses /api/admins/. 0.23+ renames this to
# /api/_superusers/ - see the version-pin item in TODO.md.
# Staged deliberately: the alert body is the tail of this log, so each failure
# must say what actually went wrong. Piping curl straight into python turned
# "PocketBase is down" into an unreadable JSONDecodeError traceback.
[ -r "$PB_ADMIN_PW_FILE" ] || { echo "FATAL: cannot read $PB_ADMIN_PW_FILE"; exit 1; }
# Capture the HTTP status separately from the body. `curl -f` collapses
# "connection refused" and "HTTP 400 wrong password" into the same exit code,
# which made a bad password report itself as "PocketBase is down" - a
# misdiagnosis that would send someone debugging the wrong system at 2am.
AUTH_BODY=$(mktemp); chmod 600 "$AUTH_BODY"
HTTP=$(curl -sS -m 30 -o "$AUTH_BODY" -w '%{http_code}' \
    -X POST "$PB_URL/api/admins/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"${PB_ADMIN_EMAIL}\",\"password\":\"$(cat "$PB_ADMIN_PW_FILE")\"}" 2>/dev/null) || HTTP="000"

if [ "$HTTP" = "000" ]; then
    rm -f "$AUTH_BODY"
    echo "FATAL: cannot reach PocketBase at ${PB_URL} - is it running? (systemctl status pocketbase)"
    exit 1
elif [ "$HTTP" != "200" ]; then
    rm -f "$AUTH_BODY"
    echo "FATAL: PocketBase reachable but admin auth was REJECTED (HTTP ${HTTP})."
    echo "       Check the password in ${PB_ADMIN_PW_FILE}. Note 0.23+ renames"
    echo "       /api/admins/ to /api/_superusers/, which would give 404 here."
    exit 1
fi
TOKEN=$(python3 -c 'import sys,json
try:    print(json.load(sys.stdin).get("token",""))
except Exception: print("")' < "$AUTH_BODY" 2>/dev/null)
rm -f "$AUTH_BODY"   # holds a live admin token; do not leave it lying around
[ -n "$TOKEN" ] || { echo "FATAL: auth returned HTTP 200 but no token in the response"; exit 1; }

say "creating snapshot via POST /api/backups"
curl -fsS -m 300 -X POST "$PB_URL/api/backups" \
    -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"${NAME}\"}"

SNAP="${PB_BACKUP_DIR}/${NAME}"
[ -f "$SNAP" ] || { echo "FATAL: API returned success but $SNAP does not exist"; exit 1; }
SIZE=$(stat -c%s "$SNAP")
say "snapshot created: $SNAP ($SIZE bytes)"

# --- 2. verify the snapshot before trusting it ------------------------------
say "verifying archive"
[ "$SIZE" -ge "$MIN_SIZE" ] || { echo "FATAL: snapshot is $SIZE bytes, below floor $MIN_SIZE"; exit 1; }
unzip -t "$SNAP" >/dev/null || { echo "FATAL: archive fails integrity test"; exit 1; }
# Capture the listing FIRST, then match against it with a here-string.
# `unzip -l ... | grep -q` is a race under `set -o pipefail`: grep exits on the
# first match, unzip gets SIGPIPE (141), and pipefail turns that into a failed
# check. It passed three runs and failed the fourth. No pipeline, no race.
LISTING=$(unzip -l "$SNAP")
grep -q ' data\.db$' <<< "$LISTING" || { echo "FATAL: archive does not contain data.db"; exit 1; }

# PocketBase writes an .attrs sidecar carrying the md5 it computed at creation.
# Comparing against it catches corruption between PB writing and us reading.
if [ -f "${SNAP}.attrs" ]; then
    WANT=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("md5",""))' "${SNAP}.attrs")
    GOT=$(openssl md5 -binary "$SNAP" | base64)
    if [ -n "$WANT" ] && [ "$WANT" != "$GOT" ]; then
        echo "FATAL: md5 mismatch - attrs=$WANT computed=$GOT"; exit 1
    fi
    say "md5 matches PocketBase's own checksum: $GOT"
fi
say "archive verified: integrity OK, contains data.db, size OK"

# --- 3. ship it off the droplet --------------------------------------------
if [ "$SKIP_OFFSITE" = "1" ]; then
    say "WARN: --skip-offsite given; NOT uploading and NOT pinging success."
    say "      This run does not constitute a backup. Local copy only."
    FINISHED=1   # exits 0 deliberately; not a failure, but not a success ping either
    exit 0
fi

DEST="${RCLONE_REMOTE}:${R2_BUCKET}"

# R2 returns 501 NotImplemented on the HEAD that rclone issues AFTER a
# successful PUT. The object lands correctly; only rclone's own post-upload
# check fails, and its internal retry then masks this by finding the object
# already present. --s3-no-head skips that check.
#
# We are NOT dropping verification by doing this - we are replacing rclone's
# with our own, below: size AND md5 of the remote object compared against the
# local file. That is a stronger check than the HEAD it replaces, and it is
# ours, so it cannot be silently masked by a retry.
RCLONE_OPTS="-q --s3-no-check-bucket --s3-no-head"

say "uploading to ${DEST}/daily/${NAME}"
# shellcheck disable=SC2086
rclone copyto $RCLONE_OPTS "$SNAP" "${DEST}/daily/${NAME}"

if [ "$IS_WEEKLY" = "1" ]; then
    say "Sunday: also uploading to ${DEST}/weekly/${NAME}"
    # shellcheck disable=SC2086
    rclone copyto $RCLONE_OPTS "$SNAP" "${DEST}/weekly/${NAME}"
fi

# --- 4. verify it actually landed (this gates the success ping) -------------
# Independent, end-to-end: ask R2 what it holds and compare to the local file.
# Never infer success from rclone's exit code alone.
LOCAL_MD5=$(md5sum "$SNAP" | cut -d' ' -f1)

verify_remote() {
    local prefix="$1" rsize rmd5
    rsize=$(rclone size --json "${DEST}/${prefix}/${NAME}" 2>/dev/null \
        | python3 -c 'import sys,json;print(json.load(sys.stdin).get("bytes",-1))')
    [ "$rsize" = "$SIZE" ] || {
        echo "FATAL: ${prefix}/${NAME} size $rsize != local $SIZE - did not land intact"; return 1; }
    # For a single-part PUT the R2 ETag is the MD5, so this is a true
    # content check, not just a length check.
    rmd5=$(rclone lsjson --hash "${DEST}/${prefix}/${NAME}" 2>/dev/null \
        | python3 -c 'import sys,json
d=json.load(sys.stdin)
print((d[0].get("Hashes") or {}).get("md5","") if d else "")')
    if [ -n "$rmd5" ]; then
        [ "$rmd5" = "$LOCAL_MD5" ] || {
            echo "FATAL: ${prefix}/${NAME} md5 $rmd5 != local $LOCAL_MD5 - content differs"; return 1; }
        say "R2 verified ${prefix}/${NAME}: ${rsize} bytes, md5 ${rmd5} matches local"
    else
        # Do not fail the backup if R2 declines to report a hash, but say so -
        # a silently weaker check must never look like a full one.
        say "WARN: R2 returned no md5 for ${prefix}/${NAME}; size matched (${rsize}b) but content unverified"
    fi
}

say "verifying object in R2"
verify_remote daily || exit 1
if [ "$IS_WEEKLY" = "1" ]; then
    verify_remote weekly || exit 1
fi

# --- 5. check retention is actually working ---------------------------------
# Lifecycle rules do the deleting; we only verify. Bounds are loose because
# lifecycle expiry runs on its own daily cycle, so a transient extra is normal.
# The upper bound is what catches "lifecycle silently stopped working".
N_DAILY=$(rclone lsf "${DEST}/daily/" 2>/dev/null | grep -c '\.zip$' || true)
N_WEEKLY=$(rclone lsf "${DEST}/weekly/" 2>/dev/null | grep -c '\.zip$' || true)
say "retention: daily=${N_DAILY} weekly=${N_WEEKLY}"
[ "$N_DAILY"  -ge 1 ] && [ "$N_DAILY"  -le 10 ] || { echo "FATAL: daily count ${N_DAILY} outside 1..10 - lifecycle rule may have stopped"; exit 1; }
[ "$N_WEEKLY" -ge 0 ] && [ "$N_WEEKLY" -le 6  ] || { echo "FATAL: weekly count ${N_WEEKLY} outside 0..6 - lifecycle rule may have stopped"; exit 1; }

# --- 6. prune local copies (R2 holds the history) ---------------------------
say "pruning local copies, keeping ${KEEP_LOCAL}"
mapfile -t OLD < <(ls -1t "${PB_BACKUP_DIR}"/*.zip 2>/dev/null | tail -n +$((KEEP_LOCAL + 1)))
for f in "${OLD[@]:-}"; do
    [ -n "$f" ] || continue
    say "  removing $(basename "$f")"
    rm -f "$f" "${f}.attrs"
done

# --- 7. success -------------------------------------------------------------
# NOTE: do NOT build this with an inline "$( [ x ] && echo y )". A command
# substitution whose test is false exits non-zero, and an assignment inherits
# that status, so `set -e` kills the script AFTER the backup already succeeded -
# a false FAILURE ping on every non-Sunday night. Found on the first live run.
WEEKLY_NOTE=""
if [ "$IS_WEEKLY" = "1" ]; then WEEKLY_NOTE="+weekly/"; fi
SUMMARY="OK ${NAME} ${SIZE}b -> R2 daily/${WEEKLY_NOTE} | daily=${N_DAILY} weekly=${N_WEEKLY}"
say "$SUMMARY"
hc "" "$SUMMARY"
FINISHED=1   # must be the last thing: gates the EXIT trap's failure ping
