# FlightCost

**Know what your flying really costs.** Developed by The Thrifty Pilot.

FlightCost is a local Windows aircraft ownership desk built with Electron, React, TypeScript and SQLite. It separates recorded cash payments, estimated operating economics, and planned spending. There are no accounts, subscriptions, advertisements, synchronization services, or telemetry.

## Status

Version 0.9.0 is a preview, not a certified production release. See `TEST_RESULTS.md` for observed checks and `RELEASE_NOTES.md` for remaining scope. No repository or release has been published, and no source-code license has been selected.

## Core features

- Multiple aircraft, editable assumptions, archiving, and profile duplication.
- Decimal-based calculation services, US gallon/liter conversion, utilization sensitivity, manual or derived engine reserve.
- Cash payments, aircraft-scoped flight links, recurring plan reconciliation, local receipts, CSV import/export.
- Manual, Hobbs or tach flight duration; saved multi-leg trip scenarios.
- User-defined maintenance reminders, annual/month/category cash budgets.
- Ownership PDF reports and printing, local SQLite backup verification and transactional restoration.
- Optional clearly labeled fictional Warrior profile, separated by aircraft identity.
- Dark and light themes; no network dependency for normal operation.

## Requirements and development

Windows 11 x64. End users do not need Node.js or Python. Development requires Node.js 24+, npm and Windows for installer validation.

```powershell
npm ci
npm test
npm run build
npm start
npm run smoke
npm run package
```

`npm ci` uses the project lockfile. The first Electron invocation may download its runtime. `npm run package` creates the NSIS installer under `dist`. Run `scripts/icon.ps1` only when regenerating the original geometric application icon.

## Privacy and portability

The database lives in `%APPDATA%\FlightCost\flightcost.sqlite`. Receipts are stored as database BLOBs, so a verified SQLite backup includes their contents. Backups are not encrypted. Store them privately and keep a separate copy on a trusted drive. Never copy a live WAL database manually; use Settings → Create verified backup.

JSON exports provide portable structured records and receipt metadata. CSV exports contain the selected aircraft's payments. SQLite backups are the complete recovery format. Restore validates schema, records and relationships, saves an automatic recovery backup, and replaces current tables in one transaction.

## Architecture

`src/domain` is the authoritative model and financial layer. `electron/database.ts` owns persistence, migration and recovery. `electron/main.ts` implements validated IPC and native file dialogs; `preload.ts` exposes only named operations. React pages cannot access arbitrary filesystem paths. Renderer Node integration is disabled, sandbox and context isolation are enabled, navigation and permissions are blocked, and CSP denies network connections.

SQLite uses the Node SQLite module bundled in Electron rather than a separately rebuilt native addon. This reduces ABI packaging risk. The runtime currently marks this API experimental; tests must be repeated when upgrading Electron. The schema uses normalized ownership/reference columns and validated JSON payloads for evolving assumptions, with receipt BLOBs and indexed aircraft relationships.

## Documentation

Read `USER_GUIDE.md`, `CALCULATIONS.md`, `INSTALLATION.md`, `TEST_RESULTS.md`, and `RELEASE_NOTES.md`. Support website: [The Thrifty Pilot](https://www.thethriftypilot.com). The optional support URL is blank until configured by the user/publisher.

Technical references: [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security/) and [SQLite backup guidance](https://sqlite.org/backup.html). No aircraft performance or cost values are fetched from external sources; demonstration assumptions are fictional.

## Screenshots

Captured from the tested desktop application using fictional test records:

![FlightCost dashboard with the reference $129 hourly estimate](docs/screenshots/dashboard.png)

![Saved reference trip with the $322.50 fully loaded estimate](docs/screenshots/trip.png)
