# FlightCost delivery report

## Overall status

A working, tested **0.9.0 Windows preview** has been built in `M:\CODEX PROJECTS\FlightCost`. It is a local desktop application with persisted SQLite records, not a dashboard mockup. Core acceptance workflows passed in development, the unpacked distributable and a native installed copy. It is not claimed to be ready for unrestricted public production release.

## Completed

Guided setup; multiple aircraft; editable assumptions; archive/duplicate; real payment and flight records; decimal financial engine; cash/economic/forecast separation; unit conversion; reserve methods; utilization sensitivity; recurring reconciliation; local receipts; CSV import/export; saved multi-leg trip assumptions and PDFs; manual maintenance reminders; annual/month/category budgets; eight ownership report types; PDF/CSV/print actions; themes; versioned SQLite initialization; foreign keys; transactional writes; verified portable backups; restore and startup recovery; offline operation; original app icon; Windows installer; and user/developer documentation.

## Partial and deferred scope

The cash forecast covers recorded and committed planned spending rather than a complete utilization-driven cash projection. Maintenance intervals require manual next-due entries. Structured record filtering is basic text search and ordering rather than a full table-query interface. General economic/flight reports use current assumptions; only saved trips freeze assumptions. Maintenance-category reporting uses named built-in categories. Native print dialogs are implemented, but physical printing was not validated.

Optional rental break-even, saved aircraft-comparison scenarios, inflation projections, refunds, split payments, loan amortization, partnership allocations, and historical profile revision tracking are not implemented. Signing, independent pilot/accounting review and wider accessibility/device testing remain release work. See RELEASE_NOTES.md for the complete limitations list.

## Verified financial and automated results

All prompt reference values pass: $6,000 annual fixed; $40 fixed/hour; $54 fuel/hour; $89 variable/hour; $129 fully loaded/hour; and $322.50 for the 2.5-hour trip ($135 fuel + $87.50 reserves + $100 fixed allocation). Incremental estimate is $135. Insurance of $2,400 allocates to $80/hour at 30 hours and $16/hour at 150 hours.

**52 automated tests passed**, strict TypeScript and lint checks passed, and the real Electron workflow passed in development, packaged and installed builds with networking disabled. Backup restoration included receipt contents and settings. PDF checks included an 80-entry, four-page report. Exact evidence and acceptance-by-acceptance status are in TEST_RESULTS.md.

## Release artifacts

- Installer: `M:\CODEX PROJECTS\FlightCost\dist\FlightCost-Setup-0.9.0.exe`
- Independently runnable directory: `M:\CODEX PROJECTS\FlightCost\dist\win-unpacked` (launch `FlightCost.exe`; retain the whole directory)
- Installer size: **117,625,991 bytes** (112.18 MiB)
- Unpacked directory size: **451,559,337 bytes** (430.64 MiB)
- SHA-256: `27dce3c8f0b5b749910542dfa3c410b19c67e194d6f2cb05f62a7d0648c6519b`
- Checksum file: `dist\SHA256SUMS.txt`
- Signature: **NotSigned**, verified through Windows Authenticode inspection.

Native installer and uninstaller each returned exit code 0. Product metadata identifies FlightCost and The Thrifty Pilot. The test installation was removed after validation; it did not replace or populate normal user financial records. No release, repository, or source license has been published or selected.

## Known defects and practical limits

No critical calculation or persistence failure remains in the exercised tests. This does not establish absence of defects. The runtime SQLite API is marked experimental, and the development packaging dependency audit has eight moderate transitive findings; the runtime-only audit reports zero. The renderer bundle currently triggers a size advisory. These are disclosed rather than hidden by changing audit or security settings.

Git was initialized and source files were staged. A local commit could not be created because no Git author identity is configured. No identity was invented or global Git setting changed; all source files remain present in the project.

## Install, use and maintain

Run the installer, complete setup, review fixed plans, and create regular backups from Settings. Use USER_GUIDE.md and CALCULATIONS.md to distinguish payments, estimates and forecasts. INSTALLATION.md supplies exact build/test/package commands. Future versions should update version labels and lockfile together, add migration tests before schema changes, rerun both packaged and installed workflows, inspect generated reports, and generate a fresh checksum after the final build.

For v1.1, prioritize independent financial/usability review, refunds/split payments, historical assumptions for flights, fuller cash planning and maintenance intervals, large-ledger/accessibility checks, then optional break-even/inflation scenarios. Obtain signing and authorize publication separately.
