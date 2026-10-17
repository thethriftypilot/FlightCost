# FlightCost verification results

Validated on Windows 11 x64 on October 17, 2026. All records used for testing were fictional. No public repository or release was created.

## Automated checks

| Check | Observed result |
|---|---|
| `npm run lint` | Passed: Biome checked 26 source/test/script files |
| `npm test` | Passed: 52 tests across 3 files |
| `npm run build` | Passed: strict TypeScript, Vite production renderer, bundled Electron main/preload |
| Development Electron workflow | Passed with network disabled |
| Packaged `dist\win-unpacked\FlightCost.exe` workflow | Passed with network disabled |
| Installed executable workflow | Passed with network disabled |
| Windows x64 NSIS build | Passed |
| Isolated per-user silent installation | Exit code 0; executable and Start menu shortcut present |
| Isolated silent uninstallation | Exit code 0; installed executable removed; isolated test data retained |
| Installer metadata | FlightCost / The Thrifty Pilot / 0.9.0.0 |
| Authenticode | NotSigned; no certificate configured |
| Runtime dependency audit | 0 vulnerabilities reported by `npm audit --omit=dev` |
| Full development dependency audit | 8 moderate findings in the electron-builder → @electron/get/global-agent/roarr/sprintf-js tooling chain |

The audit result does not establish absence of all vulnerabilities. No security protection was disabled. The SQLite module emits an experimental API warning; Vite emits an advisory about the renderer bundle exceeding 500 kB. Neither caused a failed test or build.

One test attempt was interrupted by running the native installer concurrently with an unpacked application smoke test: the installer closed the running application. Installation and application tests were then run sequentially. This was a test-orchestration failure, not a passing result; the successful runs are identified below. Close FlightCost before installation or upgrade.

## Financial verification

| Reference measure | Expected | Observed |
|---|---:|---:|
| Annual fixed | $6,000 | $6,000 |
| Fixed/hour at 150 h | $40 | $40 |
| Fuel/hour | $54 | $54 |
| Variable/hour | $89 | $89 |
| Fully loaded/hour | $129 | $129 |
| 2.5-hour fuel | $135 | $135 |
| 2.5-hour reserves | $87.50 | $87.50 |
| 2.5-hour fixed allocation | $100 | $100 |
| 2.5-hour fully loaded | $322.50 | $322.50 |
| 2.5-hour incremental | $135 | $135 |
| $2,400 insurance / 30 h | $80/hour | $80/hour |
| $2,400 insurance / 150 h | $16/hour | $16/hour |

Other tests cover missing/zero utilization, missing price, unconfirmed fixed assumptions, decimal precision, gallon/liter conversion, periodic annualization, leap-year/month-end dates, partial payments and prepayments, derived engine rates, round trips, principal separation, duplicate interest detection, meter basis, measured fuel, trip-fee safeguards, frozen trip assumptions, validation, aircraft isolation, report selection, duplicate budgets, currency safeguards, database reopening, schema initialization/reopening, corrupt/future backup rejection, transactional rollback, receipts, restore, and preserving original bytes during startup recovery.

## End-to-end workflow

The Playwright Electron harness completed the setup wizard; created plans; verified $129/hour; entered a 2.5-hour flight, $135 fuel payment and $75 maintenance payment; saved a $322.50 trip; created a budget and maintenance reminder; edited payment and aircraft data; verified deletion cancellation and confirmation; attached a receipt; imported valid CSV and rejected invalid CSV; exported all eight report types, trip PDF and summary/payment CSV; backed up; closed and reopened the process; compared persisted snapshots; restored and compared the result; and confirmed example-data isolation.

Renderer tests confirm `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`, and no renderer `require`. Workflows ran with Playwright's browser context network disabled. Native file and confirmation dialogs were stubbed to controlled test paths/answers; file contents and restored state were checked after the operations. The installer/uninstaller themselves ran as native Windows programs.

## Layout and reports

Screenshots were captured at 1366×768, 1920×1080 and 2560×1440, including light mode and all nine navigation pages. Representative dashboard and trip screens were visually inspected. Chart animations were disabled after an initial screenshot exposed blank animation frames.

PDFs were parsed with pypdf and rendered with Poppler. The reference trip retained $135 and $322.50. An 80-entry pagination fixture produced a four-page report containing every numbered entry. Visual review checked repeated headers, readable rows, assumptions, margins and page numbering. A trip-report encoding issue found during review was fixed before the final package.

## Evidence

- Final development/offline run: `test-output/smoke-1792263963418/result.json`
- Final packaged/offline run: `test-output/smoke-1792264020286/result.json`
- Final installed/offline run: `test-output/smoke-1792264064450/result.json`
- Native installation/uninstallation: `test-output/installer-validation.json`
- PDF layout evidence: `test-output/smoke-1792263400999/`
- Dependency audits: `test-output/dependency-audit.json` and `runtime-audit.json`
- Reusable test runner: `scripts/smoke.mjs`

## Acceptance criteria audit

| Criterion | Status / evidence |
|---|---|
| Application launches | Verified in development, packaged and installed builds |
| Create/edit aircraft | Verified through setup and edit UI |
| Aircraft persists across restart | Verified snapshot equality after process restart |
| Add/edit/remove expenses | Verified UI entry/edit and confirmed/canceled deletion |
| Record/view flights | Verified UI workflow |
| Calculated dashboard | Reference $129/hour verified in the real renderer |
| Fixed/variable separation | Unit and workflow tests |
| Hourly verification | All reference figures pass |
| Trip calculator and saving | UI and persisted-state verification; reference trip passes |
| Budgets | Created in UI; persisted and included in reports |
| Reporting | All eight ownership report types and trip PDF exported |
| CSV | Payment export, report export, valid/invalid import verified |
| PDF | Exported, parsed and visually checked, including four-page output |
| Backup/restore | Verified records, settings, relationships and receipt bytes |
| Example isolation | Verified no example cash records contaminate the real test profile |
| Offline operation | Workflow passed with network disabled |
| Major workflows tested | See workflow description and evidence |
| Production build | Passed optimized build and strict compiler |
| Distributable Windows app | Installer generated and installed successfully |
| Documentation | README, user guide, calculations, installation, changelog, release notes, test report and final report provided |
| Limitations disclosed | RELEASE_NOTES.md and FINAL_REPORT.md |
| Critical controls | Main navigation and financial/data operations verified; no known nonfunctional critical control found |

## Not established by these tests

Public production readiness, independent accounting certification, regulatory compliance, native physical-printer output, full screen-reader accessibility, prolonged multi-user/large-ledger performance, cross-version upgrades beyond the initial schema, signing/reputation, or operation on every supported Windows hardware configuration. Default application-data preservation on uninstall is configured; the uninstall test used an isolated data directory rather than introducing test records into the normal user directory.
