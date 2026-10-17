# FlightCost 0.9.0 — Windows Preview

**Know what your flying really costs.** By The Thrifty Pilot.

FlightCost helps aircraft owners separate payments actually made from the economic cost of flying. It runs locally on Windows with SQLite storage and no accounts or cloud sync.

## Functions in this preview

- Aircraft profiles, ownership assumptions, and annual utilization comparisons.
- Expense tracking, receipts, recurring payments, and CSV import/export.
- Flight logs using manual, Hobbs, or tach hours.
- Saved multi-leg trip estimates with captured assumptions.
- Annual, monthly, and category budgets; manual maintenance reminders.
- Ownership reports with PDF output, plus verified backups and restoration.
- Dark and light themes and a clearly labeled fictional example aircraft.

## Install

Requires Windows 11 x64. Download **FlightCost-Setup-0.9.0.exe** and **SHA256SUMS.txt** from the assets below. Compare the installer's checksum using PowerShell:

```powershell
Get-FileHash .\FlightCost-Setup-0.9.0.exe -Algorithm SHA256
```

Expected SHA-256:

```text
27dce3c8f0b5b749910542dfa3c410b19c67e194d6f2cb05f62a7d0648c6519b
```

Close any running FlightCost instance, run the installer, and launch FlightCost from the Start menu. Complete aircraft setup or explore the fictional example. No Node.js or Python is required. The source-code ZIP is not the installer.

This preview is unsigned. Windows may display an unknown-publisher warning; verify the download source and checksum before deciding whether to run it.

## Status and data

The validation run passed 52 automated tests and development, packaged, and installed application smoke checks. This remains a preview needing broader pilot review, independent financial review, accessibility testing, and device coverage.

Forecasts cover committed payments rather than every future expense. Maintenance reminders do not assess regulatory compliance or airworthiness. General reports use current assumptions; saved trips retain snapshots. Currency conversion, refunds, partnership allocations, and amortization schedules are not included.

Data lives under `%APPDATA%\FlightCost`. Use **Settings → Create verified backup** to preserve records and receipt contents. Backups are not encrypted. Do not post real financial records or backups in public issues.

See [installation instructions](https://github.com/thethriftypilot/FlightCost/blob/main/INSTALLATION.md), [user guide](https://github.com/thethriftypilot/FlightCost/blob/main/USER_GUIDE.md), and [detailed release notes](https://github.com/thethriftypilot/FlightCost/blob/main/RELEASE_NOTES.md).
