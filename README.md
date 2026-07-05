# Compost Logger

A mobile-first PWA for tracking hot compost piles. Built for field use — dark theme, offline capable, works on iPhone and iPad.

**Live app:** https://aalkhalifa.github.io/compost-logger/
**Beta (active development):** https://aalkhalifa.github.io/compost-logger/beta/

---

## What it does

- Log temperature readings across up to 4 probes (CORE 1-4)
- Track compost cycles with automatic stage detection (Stage 1-4, PFRP)
- Multicolor progress bars showing mesophilic / thermophilic / satisfied phases
- Turn timer with countdown to next recommended turn
- Sites system with GPS capture
- Ambient temperature (manual + Open-Meteo API)
- Watered tracking, moisture logging
- Photo scanning via Anthropic API
- PDF report export, CSV import/export, Excel import
- Google Drive sync (cross-device backup)
- Offline capable via service worker

---

## Development

Built by Abdulla Al-Khalifa, Roots of Arabia.

Single HTML file — no build system, no dependencies to install.
Edit `beta/index.html`, push to GitHub, GitHub Pages deploys automatically.

**Docs:**
- `PROJECT.md` — full development context, architecture notes, key decisions
- `TODO.md` — current task list and priorities

**Process rule:** All proposed changes must be listed and approved before any code is written.

---

## Deployment

```
compost-logger/
├── index.html          ← production (stable)
├── beta/
│   └── index.html      ← active development
├── sw.js               ← service worker (bump cache version on every deploy)
├── manifest.json
├── PROJECT.md
└── TODO.md
```

To promote beta to production: copy `beta/index.html` → root `index.html`, commit.

---

## Current version

v3.77p (beta) — see PROJECT.md for full changelog and known bugs.
