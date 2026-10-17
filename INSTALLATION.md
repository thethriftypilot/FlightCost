# Installing FlightCost 0.9.0

Use FlightCost on **Windows 11 x64**. This is an unsigned preview build. No Node.js, Python, database server, account, or subscription is required when installing the packaged app.

Open [FlightCost Releases](https://github.com/thethriftypilot/FlightCost/releases), select the Windows preview, and expand **Assets**. Download `FlightCost-Setup-0.9.0.exe` and `SHA256SUMS.txt` into the same folder. The automatically generated source-code ZIP and tar.gz files are for developers, not installation. If no installer is published yet, follow the source-build steps below.

1. In PowerShell, open your download folder and run `Get-FileHash .\FlightCost-Setup-0.9.0.exe -Algorithm SHA256`. Compare the result with the value in `SHA256SUMS.txt`.
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
git clone https://github.com/thethriftypilot/FlightCost.git
Set-Location FlightCost
npm ci
npm run lint
npm test
npm run build
npm run smoke
npm run package
$env:FLIGHTCOST_EXE = (Resolve-Path 'dist\win-unpacked\FlightCost.exe').Path
npm run smoke
Remove-Item Env:FLIGHTCOST_EXE
Get-FileHash -Algorithm SHA256 'dist\FlightCost-Setup-0.9.0.exe'
```

Source builds require Git, Node.js 24+, npm, and an internet connection for dependency installation. The commands produce the installer in `dist`. Update `package.json` version and the lockfile, About/sidebar labels, documentation and release notes together when developing a new version. Add migration tests for any persisted-format changes. Repeat packaged and installed-app tests, inspect PDF outputs, regenerate checksums after the last build, and verify the Authenticode result. No source-code license has been selected.

`FLIGHTCOST_TEST_DATA` is an internal test hook that redirects the local data directory. The smoke harness sets it to a unique directory under `test-output` and never uses personal financial records. Do not set it for normal use.
