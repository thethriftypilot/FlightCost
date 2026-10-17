import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { z } from 'zod';
import { date, expenseSchema, newAircraft, schemas, today } from '../src/domain/models';
import { createReport, reportKinds } from '../src/domain/reporting';
import { Store } from './database';
import { reportHtml, tripHtml } from './reports';

let store: Store;
let main: BrowserWindow;
const id = z.string().uuid();
const entity = z.enum([
  'aircraft',
  'expenses',
  'flights',
  'recurring',
  'trips',
  'maintenance',
  'budgets',
]);
const csvSafe = (v: unknown) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
async function saveDialog(name: string, ext: string) {
  const r = await dialog.showSaveDialog(main, {
    defaultPath: name,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  return r.canceled ? null : (r.filePath ?? null);
}
async function choose(exts: string[]) {
  const r = await dialog.showOpenDialog(main, {
    properties: ['openFile'],
    filters: [{ name: 'Supported files', extensions: exts }],
  });
  return r.canceled ? null : r.filePaths[0];
}
function handle(name: string, fn: (...args: unknown[]) => unknown) {
  ipcMain.handle(name, async (event, ...args: unknown[]) => {
    if (event.sender !== main.webContents || event.senderFrame !== main.webContents.mainFrame)
      throw Error('Untrusted request');
    try {
      return await fn(...args);
    } catch (e) {
      throw Error(
        e instanceof Error ? e.message : 'Operation failed. Your data has not been discarded.',
      );
    }
  });
}
function register() {
  handle('snapshot', () => store.snapshot());
  handle('setup', (aircraft, plans) => {
    const a = schemas.aircraft.parse(aircraft),
      p = z.array(schemas.recurring).max(50).parse(plans);
    if (p.some((p) => p.aircraftId !== a.id)) throw Error('Plan aircraft mismatch.');
    if (store.snapshot().aircraft.some((x) => x.id === a.id))
      throw Error('Setup aircraft already exists.');
    store.transaction(() => {
      store.save('aircraft', a);
      p.forEach((p) => store.save('recurring', p));
      store.setting('activeAircraft', a.id);
    });
    return a.id;
  });
  handle('save', (t, v) => store.save(entity.parse(t), v));
  handle('remove', async (t, key) => {
    const table = entity.parse(t);
    const uid = id.parse(key);
    const r = await dialog.showMessageBox(main, {
      type: 'warning',
      buttons: ['Cancel', 'Delete record'],
      defaultId: 0,
      cancelId: 0,
      message: 'Delete this record?',
      detail: 'This cannot be undone. Associated receipts will also be removed.',
    });
    if (r.response !== 1) return false;
    store.remove(table, uid);
    return true;
  });
  handle('setting', (key, value) => {
    const k = z.enum(['theme', 'activeAircraft', 'supportUrl']).parse(key);
    const v = z.string().max(1000).parse(value);
    if (k === 'supportUrl' && v && !v.startsWith('https://'))
      throw Error('Support link must use HTTPS.');
    store.setting(k, v);
  });
  handle('backup', async () => {
    const p = await saveDialog(`FlightCost-backup-${today()}-${Date.now()}.sqlite`, 'sqlite');
    if (p) store.backup(p);
    return p;
  });
  handle('restore', async () => {
    const p = await choose(['sqlite']);
    if (!p) return false;
    Store.verify(p);
    const r = await dialog.showMessageBox(main, {
      type: 'warning',
      buttons: ['Cancel', 'Replace current data'],
      defaultId: 0,
      cancelId: 0,
      message: 'Restore verified backup?',
      detail:
        'All current aircraft, flights, expenses, settings and receipts will be replaced. An automatic recovery backup will be saved in your application data folder.',
    });
    if (r.response !== 1) return false;
    store.backup(join(app.getPath('userData'), `before-restore-${Date.now()}.sqlite`));
    store.restore(p);
    return true;
  });
  handle('exportData', async () => {
    const p = await saveDialog('FlightCost-data.json', 'json');
    if (p) writeFileSync(p, JSON.stringify(store.snapshot(), null, 2));
    return p;
  });
  handle('exportCsv', async (key) => {
    const uid = id.parse(key);
    const p = await saveDialog('FlightCost-expenses.csv', 'csv');
    if (p) {
      const rows = store
        .snapshot()
        .expenses.filter((e) => e.aircraftId === uid)
        .map((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, csvSafe(v)])));
      writeFileSync(
        p,
        stringify(rows, {
          header: true,
          columns: Object.keys(
            expenseSchema.parse({
              id: randomUUID(),
              aircraftId: uid,
              date: today(),
              description: 'x',
              category: 'Other',
              amount: 0,
              vendor: '',
              notes: '',
              payment: '',
              kind: 'Operating',
              flightId: null,
              planId: null,
              period: null,
              tripFee: false,
              fuelQuantity: null,
              fuelUnit: 'US gal',
            }),
          ),
        }),
      );
    }
    return p;
  });
  handle('importCsv', async (key) => {
    const uid = id.parse(key);
    const p = await choose(['csv']);
    if (!p) return 0;
    if (statSync(p).size > 10 * 1024 * 1024) throw Error('CSV exceeds 10 MB.');
    const file = readFileSync(p);
    if (file.length > 10 * 1024 * 1024) throw Error('CSV exceeds 10 MB.');
    const rows = parse(file, { columns: true, skip_empty_lines: true, bom: true }) as Record<
      string,
      string
    >[];
    if (rows.length > 10000) throw Error('Import at most 10,000 rows per file.');
    const records = rows.map((r, i) => {
      try {
        return expenseSchema.parse({
          ...r,
          id: randomUUID(),
          aircraftId: uid,
          amount: r.amount?.trim() ? Number(r.amount) : Number.NaN,
          fuelQuantity: r.fuelQuantity ? Number(r.fuelQuantity) : null,
          flightId: null,
          planId: null,
          period: null,
          tripFee: false,
          vendor: r.vendor ?? '',
          notes: r.notes ?? '',
          payment: r.payment ?? '',
          kind: r.kind || 'Operating',
          fuelUnit: r.fuelUnit || 'US gal',
        });
      } catch {
        throw Error(`CSV row ${i + 2} is invalid. No records imported.`);
      }
    });
    const r = await dialog.showMessageBox(main, {
      buttons: ['Cancel', 'Import'],
      defaultId: 0,
      cancelId: 0,
      message: `Import ${records.length} payments?`,
      detail:
        'New records will be created for the selected aircraft. Re-importing creates duplicates. Flight and plan links are not imported.',
    });
    if (r.response !== 1) return 0;
    store.transaction(() => records.forEach((e) => store.save('expenses', e)));
    return records.length;
  });
  handle('receipt', async (key) => {
    const uid = id.parse(key);
    const p = await choose(['pdf', 'png', 'jpg', 'jpeg']);
    if (!p) return false;
    if (statSync(p).size > 10 * 1024 * 1024) throw Error('Receipt exceeds 10 MB.');
    store.attach(uid, basename(p), readFileSync(p));
    return true;
  });
  handle('saveReceipt', async (key) => {
    const row = store.db
      .prepare('SELECT name,bytes FROM attachments WHERE id=?')
      .get(id.parse(key));
    if (!row) throw Error('Receipt not found.');
    const r = await dialog.showSaveDialog(main, { defaultPath: basename(String(row.name)) });
    if (r.canceled || !r.filePath) return false;
    writeFileSync(r.filePath, row.bytes as Uint8Array);
    return true;
  });
  handle('report', async (key, start, end, format, kind) => {
    const reportKind = z.enum(reportKinds).parse(kind ?? 'Annual Aircraft Ownership');
    const uid = id.parse(key),
      from = date.parse(start),
      to = date.parse(end),
      f = z.enum(['pdf', 'print']).parse(format);
    if (from > to) throw Error('Start date must precede end date.');
    const s = store.snapshot(),
      a = s.aircraft.find((a) => a.id === uid);
    if (!a) throw Error('Aircraft not found.');
    const path = f === 'pdf' ? await saveDialog(`FlightCost-report-${to}.pdf`, 'pdf') : null;
    if (f === 'pdf' && !path) return null;
    const w = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    try {
      await w.loadURL(
        'data:text/html;charset=utf-8,' +
          encodeURIComponent(reportHtml(s, a, from, to, reportKind)),
      );
      if (path)
        writeFileSync(
          path,
          await w.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate:
              '<div style="font-size:9px;width:100%;padding:0 18mm;color:#526278;display:flex;justify-content:space-between"><span>FlightCost / The Thrifty Pilot</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
          }),
        );
      else
        await new Promise<void>((resolve, reject) =>
          w.webContents.print({ silent: false }, (ok, reason) =>
            ok ? resolve() : reject(Error(reason)),
          ),
        );
      return path ?? 'Sent to printer';
    } finally {
      w.destroy();
    }
  });
  handle('reportCsv', async (key, start, end, kind) => {
    const uid = id.parse(key),
      from = date.parse(start),
      to = date.parse(end),
      k = z.enum(reportKinds).parse(kind);
    if (from > to) throw Error('Start date must precede end date.');
    const s = store.snapshot(),
      a = s.aircraft.find((a) => a.id === uid);
    if (!a) throw Error('Aircraft not found.');
    const r = createReport(s, a, from, to, k),
      p = await saveDialog(`FlightCost-summary-${to}.csv`, 'csv');
    if (p)
      writeFileSync(
        p,
        stringify(
          [
            [r.title],
            [r.aircraft],
            [from, to],
            ...r.tables.flatMap((t) => [[t.title], t.columns, ...t.rows, []]),
            ['Assumptions'],
            ...r.notes.map((n) => [n]),
          ].map((row) => row.map(csvSafe)),
        ),
      );
    return p;
  });
  handle('tripReport', async (key, format) => {
    const uid = id.parse(key),
      f = z.enum(['pdf', 'print']).parse(format),
      s = store.snapshot(),
      t = s.trips.find((t) => t.id === uid);
    if (!t) throw Error('Trip not found.');
    const a = s.aircraft.find((a) => a.id === t.aircraftId)!;
    const p = f === 'pdf' ? await saveDialog(`FlightCost-trip-${t.date}.pdf`, 'pdf') : null;
    if (f === 'pdf' && !p) return null;
    const w = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    try {
      await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(tripHtml(s, a, t)));
      if (p)
        writeFileSync(
          p,
          await w.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate:
              '<div style="font-size:9px;width:100%;padding:0 18mm;color:#526278;display:flex;justify-content:space-between"><span>FlightCost / The Thrifty Pilot</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
          }),
        );
      else
        await new Promise<void>((resolve, reject) =>
          w.webContents.print({ silent: false }, (ok, reason) =>
            ok ? resolve() : reject(Error(reason)),
          ),
        );
      return p ?? 'Sent to printer';
    } finally {
      w.destroy();
    }
  });
  handle('demo', () => {
    const a = {
      ...newAircraft(),
      id: randomUUID(),
      name: 'Warrior • fictional example',
      manufacturer: 'Piper',
      model: 'PA-28-161 Warrior',
      example: true,
      fixedConfirmed: true,
      annualHours: 150,
      fuelBurn: 9,
      fuelPrice: 6,
      oil: 0,
      maintenance: 15,
      engine: 20,
      propeller: 0,
      other: 0,
    };
    store.transaction(() => {
      store.save('aircraft', a);
      for (const [description, amount] of [
        ['Insurance', 2400],
        ['Hangar', 3600],
      ] as const)
        store.save('recurring', {
          id: randomUUID(),
          aircraftId: a.id,
          description,
          category: description,
          amount,
          frequency: 'Annual',
          start: `${new Date().getFullYear()}-01-01`,
          end: null,
          fixed: true,
        });
    });
    return a.id;
  });
  handle('external', async (url) => {
    const u = z.string().url().parse(url);
    if (u !== 'https://www.thethriftypilot.com' && u !== store.snapshot().settings.supportUrl)
      throw Error('External link is not configured.');
    if (!u.startsWith('https://')) throw Error('Only HTTPS links are supported.');
    await shell.openExternal(u);
  });
}
app.setName('FlightCost');
if (process.env.FLIGHTCOST_TEST_DATA) app.setPath('userData', process.env.FLIGHTCOST_TEST_DATA);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (main) {
      main.restore();
      main.focus();
    }
  });
  app.whenReady().then(async () => {
    try {
      mkdirSync(app.getPath('userData'), { recursive: true });
      const databasePath = join(app.getPath('userData'), 'flightcost.sqlite');
      try {
        store = new Store(databasePath);
        store.snapshot();
      } catch (error) {
        try {
          store?.close();
        } catch {
          /* A failed constructor already closed its handle. */
        }
        const choice = await dialog.showMessageBox({
          type: 'error',
          buttons: ['Quit and preserve data', 'Recover from backup…'],
          defaultId: 0,
          cancelId: 0,
          message: 'FlightCost could not open your records.',
          detail: `${error instanceof Error ? error.message : 'Database error'}\nRecovery replaces the active database with a verified backup and preserves the original files in a separate recovery folder.`,
        });
        if (choice.response !== 1) {
          app.quit();
          return;
        }
        const selected = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [{ name: 'FlightCost backup', extensions: ['sqlite'] }],
        });
        if (selected.canceled) {
          app.quit();
          return;
        }
        Store.recover(databasePath, selected.filePaths[0]);
        store = new Store(databasePath);
      }
      main = new BrowserWindow({
        width: 1440,
        height: 940,
        minWidth: 1000,
        minHeight: 680,
        backgroundColor: '#0b1220',
        title: 'FlightCost',
        icon: join(__dirname, '../assets/icon.ico'),
        webPreferences: {
          preload: join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      Menu.setApplicationMenu(null);
      main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      main.webContents.on('will-navigate', (e) => e.preventDefault());
      main.webContents.session.setPermissionRequestHandler((_wc, _permission, cb) => cb(false));
      register();
      await main.loadFile(join(__dirname, 'renderer/index.html'));
    } catch (e) {
      dialog.showErrorBox(
        'FlightCost could not start',
        `${e instanceof Error ? e.message : 'Unknown error'}\nYour existing database has been preserved. Restore from a verified backup or contact support.`,
      );
      app.quit();
    }
  });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => {
    try {
      store?.close();
    } catch {
      /* Closed by startup recovery. */
    }
  });
}
