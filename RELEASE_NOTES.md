# FlightCost 0.9.0 preview

**Know what your flying really costs.** Developed by The Thrifty Pilot.

This Windows preview helps owners distinguish actual payments from operating economics and planned spending. It runs locally without an account, subscription, synchronization service or telemetry.

## Available

Multiple aircraft, guided setup, editable assumptions, flight and payment records, recurring plans, local receipts, annual/month/category budgets, maintenance reminders, multi-leg trip estimates, utilization sensitivity, structured PDF/CSV reports, and verified backup/restore. Saved trips preserve the assumptions used at save time. Unknown values remain visibly unknown. All demo assumptions are labeled fictional.

The reference aircraft calculates $6,000 annual fixed costs, $40 fixed/hour, $54 fuel/hour, $89 variable/hour and $129 fully loaded/hour. Its 2.5-hour trip calculates $135 fuel, $87.50 reserves, $100 fixed allocation, and $322.50 fully loaded cost.

## Important preview limits

- This is not yet represented as a production-ready public release. It needs wider pilot usability testing and independent financial review before publication.
- The cash forecast is recorded payments plus unpaid scheduled installments. It does not predict unscheduled fuel, maintenance or future utilization-driven cash. It is labeled accordingly.
- Historical cash reports use historical payments; general economic and flight estimates use current aircraft assumptions. Saved trips have captured assumptions. There is no complete historical profile-version ledger.
- Maintenance is a manual reminder organizer. It does not automatically generate recurring inspection cycles, integrate official maintenance records, or assess airworthiness/compliance.
- Currency conversion is not supported. Existing financial records prevent currency relabeling. Aircraft performance-unit changes require reviewing the corresponding numeric assumptions; no automatic rescaling of edited profile values is implied.
- Expenses are nonnegative payments. Refund/credit workflows, split transactions, loan amortization schedules, partner allocations and multi-user access are not implemented.
- CSV import is for payments, creates new records, and intentionally clears flight/plan links. Re-importing duplicates records. JSON exports receipt metadata; SQLite backups include receipt contents. Neither backup nor export is encrypted.
- Built-in maintenance-category reports use named built-in categories. Custom categories remain available in full ownership reports.
- Optional rental break-even, saved aircraft-comparison scenarios, and multi-year inflation projections are deferred. There are no automatic updates, cloud synchronization or accounts.
- Native printer output and accessibility with assistive technology require broader manual testing. Automated tests exercise file operations with native dialogs stubbed to isolated test paths.
- No code-signing certificate is configured. The installer and executable are unsigned. Do not bypass Windows security protections.
- `npm audit --omit=dev` reports zero runtime advisories at validation time. The full development dependency audit reports eight moderate transitive findings in packaging tooling. See TEST_RESULTS.md. Electron's bundled SQLite API is currently labeled experimental by its runtime.

## Installation and data

Run `FlightCost-Setup-0.9.0.exe` for Windows x64. No development tools are needed. See INSTALLATION.md for checksums and rebuilding. Back up from Settings before changing versions. Data resides under `%APPDATA%\FlightCost` and is preserved on uninstall by configuration.

## Next version priorities

1. Independent pilot/accounting review and wider Windows/device/accessibility testing.
2. Explicit refunds and split payments, richer structured filtering and large-ledger performance testing.
3. Historical assumption revisions for flights and annual economics, plus documented migration policy for public releases.
4. User-defined recurring maintenance intervals and fuller utilization-driven cash planning.
5. Optional rental break-even and inflation scenarios after core review; signing and controlled public release when authorized.
