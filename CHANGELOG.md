# Changelog

All notable changes to Timesheet. Versions follow [semantic versioning](https://semver.org/):
the app version lives in `package.json`, `index.html` (`APP_VERSION`) and `sw.js` (`VERSION`), and
`npm run check` fails if they differ.

## 2.1.0 — 2026-10-28

### Added
- 🔗 **View-only link** (Send → View link). The other person opens your timesheet just like the app:
  they can scroll, see the summary and reimbursements, and tap days for details, but nothing can be
  edited. The period's data travels inside the link (in the part after `#`, which is never sent to a
  server). Opening a link never touches the viewer's own saved timesheet.
- The share sheet now offers 💬 Message, 🔗 View link and 📄 Image.

## 2.0.0 — 2026-10-28

### Added
- 🧾 **Reimbursements section** on the main screen with an Add / Edit sheet (type, amount, date, note).
- **Custom reimbursement types** — keep Cab, Meals, Parking… or remove them and add your own with an emoji
  (Settings → Reimbursement types, or "＋ New type" while adding).
- ☕ **Unpaid break** per day (None / 15m / 30m / 45m / 1h), deducted from paid hours.
- 👋 **Welcome screen** for first-time users (name, rate, currency, pay period).
- 📅 **Pay period choice** — half-monthly (default, 1–15 and 16–end), weekly, bi-weekly or monthly.
- 💱 **Currency choice** for everyone in your community.
- ↩️ **Undo** after clearing a day, deleting a reimbursement or removing a type.
- 📣 **Share this app** button and an install hint for adding it to the Home Screen.
- 📴 **Works offline** once installed from the hosted site (service worker + web app manifest + icons).
- Emoji in the shared message (📍 site, 📝 notes, 🧾 reimbursements, 💵 grand total).

### DevOps
- Automated end-to-end tests (Playwright) covering shifts, breaks, reimbursements, persistence,
  sharing, pay periods, currency, backup import and small-screen layout.
- `npm run check`: syntax, element ids, version consistency, offline files and a size budget.
- GitHub Actions CI on every push and pull request.
- Issue templates for bug reports and feature requests.

### Compatibility
- Existing data and v1 backups load automatically; old reimbursements are matched to the new types.

## 1.x — 2026-10-28

The first release and the improvements that followed it:
- Half-monthly timesheet with start/end times, hourly rate and automatic pay.
- Worked / Day off per day, site location, notes, multiple reimbursements.
- IndexedDB storage, light/dark mode, blue accent, Barlow fonts.
- 12-hour entry with AM/PM buttons, summary card and day strip, copy previous day.
- Send as a text message or as a page image; WhatsApp / Messages / Mail / Copy.
