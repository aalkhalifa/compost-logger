# PocketBase backend — deployment runbook (Group A)

Backend for the Compost Logger PocketBase migration. This is **server-side infra**,
separate from the single-file app (`index.html`). Follow this once to stand up the
backend the app (Group B onward) will talk to.

Locked decisions (see PROJECT.md): **blob-per-user** data model (one record per user
holds the whole `ca_v5` JSON), **existing DigitalOcean box + TLS subdomain** hosting,
app talks to it via a single configurable `PB_BASE_URL` constant.

> **This backend is live.** `https://api.compostlogger.com` — domain registered on
> Cloudflare (July 20 2026), TLS by Caddy with an auto-renewing Let's Encrypt cert, CORS
> locked to the app origin. See **Deployed state** at the bottom for exactly what is
> running. The steps below are the reproducible runbook, not pending work.

---

## 1. Install PocketBase on the DigitalOcean box

SSH in, then (pin a specific version — do not blindly grab "latest" so the schema and
API rules below stay reproducible):

```bash
sudo mkdir -p /opt/pocketbase && cd /opt/pocketbase
# Pick a release from https://github.com/pocketbase/pocketbase/releases
PB_VERSION=0.22.21
curl -L -o pb.zip \
  "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
sudo apt-get update && sudo apt-get install -y unzip
sudo unzip -o pb.zip && rm pb.zip
./pocketbase --version
```

PocketBase is a single Go binary with an embedded SQLite DB (data lands in
`/opt/pocketbase/pb_data`). Bind it to **localhost only** — Caddy (step 3) terminates
TLS and proxies to it, so PB is never exposed directly.

```bash
# smoke test (Ctrl-C after you confirm it starts)
./pocketbase serve --http=127.0.0.1:8090
```

## 2. Run it as a systemd service

Copy `pocketbase.service` (in this folder) to the box and enable it:

```bash
sudo cp pocketbase.service /etc/systemd/system/pocketbase.service
# create an unprivileged user to own the process + data
sudo useradd --system --home /opt/pocketbase --shell /usr/sbin/nologin pocketbase || true
sudo chown -R pocketbase:pocketbase /opt/pocketbase
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
sudo systemctl status pocketbase --no-pager
```

## 3. TLS + reverse proxy with Caddy — DONE (July 20 2026)

Live at **`https://api.compostlogger.com`**. DNS: an `api` A-record on Cloudflare pointing
at `64.226.83.129`, **proxy disabled (DNS only)** — that matters, because Caddy validates
via `tls-alpn-01`, which needs the TLS handshake to reach this box rather than terminating
at Cloudflare's edge.

```bash
# Caddy's official apt repo (see https://caddyserver.com/docs/install)
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy

sudo cp Caddyfile /etc/caddy/Caddyfile       # already set to api.compostlogger.com
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
journalctl -u caddy -f | grep -i 'certificate obtained'
```

Verify:

```bash
curl https://api.compostlogger.com/api/health          # {"code":200,...}
echo | openssl s_client -servername api.compostlogger.com \
  -connect api.compostlogger.com:443 2>/dev/null | openssl x509 -noout -dates
```

Caddy renews automatically; no cron needed. HTTP is 308-redirected to HTTPS.

## 4. Create the superuser (admin)

```bash
cd /opt/pocketbase
# newer PB (>=0.23): ./pocketbase superuser create you@email.com "a-strong-password"
./pocketbase admin create you@email.com "a-strong-password"
```

Then log into the Admin UI at `https://pb.example.com/_/` (or `http://127.0.0.1:8090/_/`
over an SSH tunnel before TLS exists).

## 5. Collections

### `users` (built-in)
A fresh PocketBase ships with a `users` **auth** collection — email/password is enabled
out of the box. No Google, no OAuth popup. Nothing to create; just confirm it exists.
(Optionally disable email-verification requirement during beta if you want frictionless
signup, then re-enable before public launch.)

### `vaults` (create this — the blob-per-user store)
One record per user holding the entire `ca_v5` JSON blob. **Authoritative field spec**
(create via Admin UI → New collection → base collection `vaults`; the field table below
is the source of truth — `vaults.collection.json` in this folder is an import
convenience but verify it matches your PB version):

| Field | Type | Settings |
|---|---|---|
| `user` | Relation → `users` | required, single, cascade-delete, **Unique index** (one vault per user) |
| `data` | JSON | holds the full `ca_v5` shape (`piles, sites, recipes, ingHist, tempUnit, volumeUnit, containerUnit, deletedPileIds`) + separate-key settings |
| `analyticsOptIn` | Bool | default false (set at signup, Group E) |
| `created` / `updated` | Autodate | ensure `updated` exists (auto-managed); Group C uses it for optimistic-concurrency on PULL-merge-PUSH |

**Unique index on `user`** is what enforces exactly one vault per account — add it in the
collection's Indexes section: `CREATE UNIQUE INDEX idx_vaults_user ON vaults (user)`.

### API rules (so each user sees only their own vault)
Set these on the `vaults` collection (Admin UI → API Rules). Leave superuser-only actions
blank/locked as needed:

- **List / Search:** `@request.auth.id != "" && user = @request.auth.id`
- **View:** `@request.auth.id != "" && user = @request.auth.id`
- **Create:** `@request.auth.id != "" && @request.data.user = @request.auth.id`
- **Update:** `@request.auth.id != "" && user = @request.auth.id`
- **Delete:** `@request.auth.id != "" && user = @request.auth.id`

## 6. CORS — LOCKED (July 20 2026)

Restricted to `https://aalkhalifa.github.io` via PocketBase's own `--origins` flag in
`pocketbase.service`:

```
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090 --origins=https://aalkhalifa.github.io
```

> **Do this on PocketBase, not in Caddy.** PocketBase already emits its own CORS headers.
> Adding them in Caddy too (as an earlier version of `Caddyfile` suggested) sends **two**
> `Access-Control-Allow-Origin` headers, and browsers reject any response carrying more
> than one — which would break the app completely while looking like a CORS misconfig.

Verify allowed vs blocked, and that there is exactly one header:

```bash
# allowed -> returns access-control-allow-origin
curl -sI -X OPTIONS https://api.compostlogger.com/api/collections/users/auth-with-password \
  -H "Origin: https://aalkhalifa.github.io" -H "Access-Control-Request-Method: POST" | grep -i access-control
# blocked -> no CORS headers at all
curl -sI -X OPTIONS https://api.compostlogger.com/api/collections/users/auth-with-password \
  -H "Origin: https://evil.example.com" -H "Access-Control-Request-Method: POST" | grep -i access-control
# must print 1
curl -sI https://api.compostlogger.com/api/health -H "Origin: https://aalkhalifa.github.io" \
  | grep -ic access-control-allow-origin
```

**Consequence for local development:** a build opened from `file://` or `http://localhost`
now has a page origin that is not on the allowlist, so the browser blocks every API call.
To test locally, add that origin to `--origins` (comma-separated) temporarily, or test
against the deployed GitHub Pages build.

---

## Deployed state (July 20 2026) — live on the DO box

Running on the DigitalOcean droplet (`fra1`, `64.226.83.129`):

| Component | State |
|---|---|
| PocketBase **0.22.21** (pinned) | `/opt/pocketbase`, data in `pb_data`, unprivileged `pocketbase` user, bound `127.0.0.1:8090` |
| `pocketbase.service` | enabled + active, `--origins` CORS lockdown |
| **Caddy 2.11.4** | enabled + active, TLS for `api.compostlogger.com`, auto-renewing |
| `cloudflared-pocketbase.service` | enabled + active — **kept as a fallback** |
| `vaults` collection | 3 fields, unique index on `user`, all 5 API rules |
| Superuser | `aalkhalifa@gmail.com`, password at `/root/.pb_admin_password` (0600) |

**`PB_BASE_URL` = `https://api.compostlogger.com`.** Cert issued by Let's Encrypt via
`tls-alpn-01`, valid to 2026-10-18, renewed automatically by Caddy.

Verified through the public HTTPS host: `/api/health` 200, valid chain
(`ssl_verify_result: 0`), HTTP 308-redirects to HTTPS, CORS allows the app origin and
returns nothing for others (exactly one ACAO header), and signup → login → vault create →
scoped list → PATCH all succeed while an unauthenticated list returns 0 items.

### The Cloudflare tunnel is still running, as a fallback

`cloudflared-pocketbase.service` still fronts the same PocketBase instance. If the domain
or Caddy ever fails, swap `PB_BASE_URL` to the tunnel URL:

```bash
journalctl -u cloudflared-pocketbase | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

Two things to know about that fallback:

- Its hostname **still rotates on every `cloudflared` restart**, so the URL you find today
  is not durable. It is a break-glass option, not a second production endpoint.
- It shares PocketBase's CORS allowlist, so it is equally locked to the app origin.

Once the domain has proven itself, retiring the tunnel (`systemctl disable --now
cloudflared-pocketbase`) removes a second public path into the backend.

## Handoff to Group B

Group B (app code) needs exactly one value from this runbook: the reachable base URL,
which becomes `const PB_BASE_URL = "..."` in `index.html`. Everything else here is
server-side and lives only on the box.
