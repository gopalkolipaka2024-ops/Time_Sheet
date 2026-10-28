# ⏱️ Timesheet

A free, simple timesheet for your phone. Log your hours, see your pay, add reimbursements,
and send a clean timesheet by WhatsApp, Messages or email. No sign-up, no login. Everything you
enter stays on your own phone.

**👉 Open the app: https://gopalkolipaka2024-ops.github.io/Time_Sheet/**

[![CI](https://github.com/gopalkolipaka2024-ops/Time_Sheet/actions/workflows/ci.yml/badge.svg)](https://github.com/gopalkolipaka2024-ops/Time_Sheet/actions/workflows/ci.yml)

---

## ✨ What it does

- 🕒 **Hours.** Enter start and end times (hour and minute boxes, AM/PM), with an optional unpaid break.
- 💵 **Pay.** Set your hourly rate and the app works out hours × rate for every day and for the whole period.
- ✅ **Worked or day off.** Mark each day; days off are shown in red.
- 📍 **Site and notes.** Add the job site and any notes for each day.
- 🧾 **Reimbursements.** Add as many as you need: 🚕 Cab, 🍔 Meals, 🅿️ Parking, ⛽ Fuel, or your own types.
- 📅 **Pay periods.** Half-monthly (1–15 and 16–end of month) by default, or weekly, bi-weekly or monthly.
- 📤 **Send.** Share the timesheet as a 💬 text message, a 📄 page image, or a 🔗 **view-only link**. The
  link opens like the app (scroll, tap days for details) but can't be edited. Each option includes every
  day, every reimbursement and the 💵 grand total.
- 🌙 **Light and dark mode**, and it works offline once installed.

## 📲 Install it on your phone

**iPhone (Safari)**
1. Open the link above in **Safari**.
2. Tap the **Share** button (the square with an arrow).
3. Tap **Add to Home Screen**, then **Add**.

**Android (Chrome)**
1. Open the link above in **Chrome**.
2. Tap **Install** when it's offered, or use the **⋮** menu → **Add to Home screen**.

The app then opens full-screen from your Home Screen like any other app.

## 🔒 Your data and privacy

- There are **no accounts and no logins**, and nothing is sent to a server.
- Your hours and amounts are saved **only on your phone**, in the browser's storage.
- Each person who uses the app has their own separate data.
- A **view-only link** carries that period's timesheet inside the link itself (after the `#`, a part
  of a web address that browsers never send to a server). Anyone you give the link to can read it,
  so share it only with the people who should see it.
- **Back up** before changing phones or clearing your browser: **Settings → Data → Export backup**.
  On the new phone, use **Import backup**.

## 📣 Share it with your community

Send people the link, or tap **Settings → Community → Share this app with others**. Everyone sets
their own name, rate, currency and pay period the first time they open it.

Found a problem or have an idea? [Open an issue](https://github.com/gopalkolipaka2024-ops/Time_Sheet/issues/new/choose).
That needs a free GitHub account; the app itself never does.

---

## 🛠️ For developers

The whole app is **one file**, `index.html`: plain HTML, CSS and JavaScript with no frameworks and
no build step. Fonts are Barlow and Barlow Condensed from Google Fonts. The other files only add
offline support and the DevOps tooling.

| File | Purpose |
| --- | --- |
| `index.html` | The app (works on its own, even opened as a file) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Install and offline support on the hosted site |
| `scripts/check.js` | Static checks: syntax, element ids, versions, offline files, size budget |
| `tests/app.test.js` | End-to-end tests in headless Chromium on an iPhone-sized screen |
| `scripts/serve.js` | Local web server for previewing and testing |
| `scripts/make-icons.js` | Regenerates the app icons |
| `.github/workflows/ci.yml` | Runs the checks and tests on every push and pull request |

```bash
npm ci
```

```bash
npx playwright install chromium
```

```bash
npm start      # http://127.0.0.1:8080
```

```bash
npm run check && npm test
```

### Releasing a new version

1. Make the change in `index.html` and add or adjust tests in `tests/app.test.js`.
2. Bump the version in **all three** places: `package.json`, `APP_VERSION` in `index.html` and
   `VERSION` in `sw.js`. The new version number in `sw.js` is what makes installed apps pick up the update.
3. Add a section to `CHANGELOG.md`.
4. Push. CI must be green. GitHub Pages republishes the site automatically.

`npm run check` fails if the three versions don't match or the changelog entry is missing.

### Hosting your own copy

Fork the repository and enable **Settings → Pages → Deploy from a branch** for your fork. Then update
`APP_URL` and `REPO_URL` at the top of the script in `index.html`, and the links in this README.
