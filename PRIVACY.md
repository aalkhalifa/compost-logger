# Privacy Policy - Compost Logger

**Last updated:** 21 July 2026

Compost Logger is an independently operated application.

This policy explains what the app stores, where it lives, and what you can do about it. It is written to be read, not to be survived.

---

## The short version

- Your compost data is yours. It is not sold, rented, shared, or used for advertising - ever.
- An account stores your email and your compost records so they sync across your devices.
- You can export everything at any time, and you can delete your account and its data.
- Optional analytics are off unless you turn them on. As of this date, no analytics are being collected at all.

---

## What the app stores

**If you use the app without an account**

Everything stays in your device's local browser storage. Nothing is sent to a server. If you clear your browser data or uninstall the app, that data is gone - there is no copy for us to restore.

**If you create an account**

An account stores:

- **Your email address and a securely hashed password.** Passwords are never stored in readable form.
- **Your compost records** - piles, temperature readings, turn events, moisture and water entries, notes, recipes, and settings such as your preferred units and display basis.
- **Site information you choose to create**, including any GPS coordinates you capture for a site. Location is only recorded when you explicitly capture it.
- **An analytics preference flag** recording whether you opted in.

That's the complete list. There is no tracking of your browsing, no advertising identifiers, no behavioural profiling.

---

## Where your data is stored

- **The app itself** is served from GitHub Pages.
- **Your account and compost records** are stored on a private server operated by us on DigitalOcean infrastructure in Frankfurt, Germany.
- **Backups** of that data are stored with Cloudflare R2 in Western Europe, encrypted at rest by our storage provider, so your records can be recovered if the main server fails. Backups are kept for up to 7 days (daily) and 28 days (weekly), then automatically deleted.

Data is transmitted over HTTPS.

---

## Other services the app touches

We do not share your data with anyone for their own purposes. However, running the app necessarily involves a few service providers, and one optional feature sends data outside our systems. In the interest of being accurate rather than reassuring:

- **DigitalOcean** hosts the server holding your records.
- **Cloudflare** stores our backups and provides domain services.
- **GitHub** serves the application files.
- **Open-Meteo** receives approximate coordinates when you use the ambient temperature feature, in order to return weather data for that location. No account information is sent.
- **Anthropic** receives a photograph only if you use the optional photo-scanning feature, and only using an API key you supply and store on your own device. If you do not use this feature, nothing is sent.
- **Google Drive** is used only if you connected the app to your own Drive under an earlier version. In that case the data sits in your own Google account, under Google's terms. This option is being retired.

These providers process data to deliver the service. They are not permitted to use your compost records for their own purposes, and we do not sell or disclose your data to anyone.

---

## Analytics

You may opt in to anonymised usage analytics when you create an account, and you can change that choice at any time in Settings.

**As of the date above, no analytics pipeline exists and no usage data is being collected.** The preference is recorded so that if analytics are introduced in future, your existing choice is respected. If that changes, this policy will be updated and the change will be visible in the app before any collection begins.

---

## Your rights and controls

- **Export.** Settings, "Download My Data" produces a complete file containing your piles, entries, sites, recipes, and settings.
- **Correction.** You can edit or delete any pile or entry directly in the app.
- **Deletion.** Ask us to delete your account and the associated records will be deleted with it. Backups containing the data expire automatically within 28 days.
- **Withdraw analytics consent.** Change the setting at any time.

To make a request, contact us at the address below.

---

## Children

Compost Logger is intended for adults managing composting operations. It is not directed at children and we do not knowingly collect data from them.

---

## Security

Access to the server is restricted, the database is not publicly reachable, and credentials are held outside the application's source code. Backups are verified and periodically test-restored.

No system is perfectly secure. We keep only what the app needs and nothing more, which is the most reliable protection available.

---

## Changes to this policy

If this policy changes materially, the date at the top will be updated and the change will be announced in the app. Continuing to use the app after a change means you accept the updated policy.

---

## Contact

Questions, requests, or concerns:

**Compost Logger**
compostlogger.com@gmail.com

---

*Compost Logger records on-pile temperatures for your own management purposes. It is a record-keeping tool, not a certified compliance test.*
