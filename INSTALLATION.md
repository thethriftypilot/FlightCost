# Installing FlightCost 0.9.0

Use `dist\FlightCost-Setup-0.9.0.exe` on Windows 11 x64. This is an unsigned preview build. No Node.js, Python, database server, account, or subscription is required.

1. Verify the SHA-256 value against `dist\SHA256SUMS.txt` using `Get-FileHash -Algorithm SHA256`.
2. Close any running FlightCost instance, then run the installer and choose the per-user installation and desired folder.
3. Open FlightCost from the Start menu.
4. Complete the aircraft, ownership and review steps, or explore the labeled fictional example.

Windows may show a reputation or publisher warning because this build has no code-signing certificate. FlightCost does not disable or bypass Windows security protections. Decide whether you trust the supplied build before running it.

## Storage and recovery

Normal data location: `%APPDATA%\FlightCost\flightcost.sqlite`. The SQLite WAL and SHM sidecars may exist while the application runs. Do not copy only the main file while it is open; use the built-in backup operation.

Create a backup before installing a future version. Uninstallation is configured to preserve application data. An uninstall/reinstall is not a substitute for backup. The full `dist\win-unpacked` directory can also run independently through `FlightCost.exe`; the executable alone is insufficient.

If the database cannot open, the startup recovery dialog offers to select a verified backup. Original files are preserved in a timestamped `.recovery-...` directory. A normal in-app restore first creates a `before-restore-...sqlite` backup and replaces data transactionally.

## Build the next version

```powershell
Set-Location 'M:\CODEX PROJECTS\FlightCost'
npm ci
npm run lint
npm test
npm run build
npm run smoke
npm run package
$env:FLIGHTCOST_EXE = 'M:\CODEX PROJECTS\FlightCost\dist\win-unpacked\FlightCost.exe'
npm run smoke
Remove-Item Env:FLIGHTCOST_EXE
Get-FileHash -Algorithm SHA256 'dist\FlightCost-Setup-0.9.0.exe'
```

Update `package.json` version and the lockfile, About/sidebar labels, documentation and release notes together. Add migration tests for any persisted-format changes. Repeat packaged and installed-app tests, inspect PDF outputs, regenerate checksums after the last build, and verify the Authenticode result. Publishing or selecting a source-code license remains a separate owner decision.

`FLIGHTCOST_TEST_DATA` is an internal test hook that redirects the local data directory. The smoke harness sets it to a unique directory under `test-output` and never uses personal financial records. Do not set it for normal use.
