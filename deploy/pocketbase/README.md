# PocketBase backend — deployment runbook (Group A)

Backend for the Compost Logger PocketBase migration. This is **server-side infra**,
separate from the single-file app (`index.html`). Follow this once to stand up the
backend the app (Group B onward) will talk to.

Locked decisions (see PROJECT.md): **blob-per-user** data model (one record per user
holds the whole `ca_v5` JSON), **existing DigitalOcean box + TLS subdomain** hosting,
app talks to it via a single configurable `PB_BASE_URL` constant.

> **No domain purchased yet.** Wherever this runbook says `pb.example.com`, substitute
> your real subdomain once you own one (`rootsofarabia.com` or alternative). Acquiring
> the domain + issuing TLS is a **deploy** prerequisite, not a build blocker — see
> "Testing before you own a domain" at the bottom to exercise Groups B–F meanwhile.

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

## 3. TLS + reverse proxy with Caddy (requires the domain)

Caddy auto-issues a Let's Encrypt cert for your subdomain. **This step needs a real
domain whose DNS A-record points at the box** — do it once the domain is purchased.

```bash
# install Caddy (see https://caddyserver.com/docs/install for the apt repo one-liner)
sudo cp Caddyfile /etc/caddy/Caddyfile        # edit pb.example.com -> your subdomain first
sudo systemctl reload caddy
```

After this, `https://pb.example.com/api/health` returns `{"code":200,...}` and that URL
becomes `PB_BASE_URL` for the app in Group B.

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

## 6. CORS

PocketBase's default CORS is permissive (echoes the request origin), so the GitHub Pages
app can call it as soon as TLS is up. **Before public launch**, tighten it to just the app
origin at the Caddy layer (see the commented block in `Caddyfile`):
`https://aalkhalifa.github.io`.

---

## Testing before you own a domain

GitHub Pages serves the app over **HTTPS**, and browsers block an HTTPS page from calling
an `http://` endpoint (mixed content). So you cannot point the deployed beta at a bare
`http://SERVER_IP:8090`. Two ways to exercise Groups B–F now:

1. **Local dev (simplest):** run PocketBase locally (`./pocketbase serve`) and open the
   app from `http://localhost/...`. `localhost` is exempt from the mixed-content block, so
   `PB_BASE_URL=http://localhost:8090` works end-to-end.
2. **Temporary HTTPS host (test against the real box):** get a throwaway TLS hostname
   without buying a domain — e.g. a Caddy site on an `nip.io` wildcard
   (`pb.<box-ip>.nip.io`) or a Cloudflare Tunnel. Point `PB_BASE_URL` at that HTTPS URL.

Either way, when the real domain lands you change **one constant** (`PB_BASE_URL`) and
re-issue TLS — no app-code changes.

## Handoff to Group B

Group B (app code) needs exactly one value from this runbook: the reachable base URL,
which becomes `const PB_BASE_URL = "..."` in `index.html`. Everything else here is
server-side and lives only on the box.
