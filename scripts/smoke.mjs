import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { _electron as electron } from 'playwright';

const root = resolve('.'),
  output = join(root, 'test-output', `smoke-${Date.now()}`),
  data = join(output, 'userdata');
mkdirSync(data, { recursive: true });
const executablePath = process.env.FLIGHTCOST_EXE;
const launch = () =>
  electron.launch({
    ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
    cwd: root,
    env: { ...process.env, FLIGHTCOST_TEST_DATA: data },
    timeout: 30000,
  });
let app = await launch();
let page = await app.firstWindow();
await page.context().setOffline(true);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
async function clickNav(name) {
  await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
}
async function save() {
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
try {
  const security = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  );
  assert.equal(security.nodeIntegration, false);
  assert.equal(security.contextIsolation, true);
  assert.equal(security.sandbox, true);
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  await page.getByRole('button', { name: 'Set up my aircraft', exact: true }).click();
  for (const [name, value] of Object.entries({
    'Aircraft nickname': 'Smoke aircraft',
    Manufacturer: 'Test',
    Model: 'Fictional',
    'Typical cruise fuel burn / hour': '9',
  }))
    await page.getByLabel(name, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  for (const [name, value] of Object.entries({
    'Expected annual flight hours': '150',
    'Typical fuel price': '6',
    'Oil allowance / hour': '0',
    'Maintenance allowance / hour': '15',
    'Engine reserve / hour': '20',
    'Propeller reserve / hour': '0',
    'Other use-based allowance / hour': '0',
    'Annual insurance': '2400',
    'Monthly hangar / tie-down': '300',
  }))
    await page.getByLabel(name, { exact: true }).fill(value);
  await page
    .getByLabel(
      'These fixed ownership assumptions are complete, including any intentional zeros.',
      { exact: true },
    )
    .check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Finish setup', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await clickNav('Dashboard');
  await page.getByText('$129.00', { exact: true }).waitFor();
  await clickNav('Flights');
  await page.getByRole('button', { name: 'Add flight', exact: true }).click();
  await page.getByLabel('Manual duration (hours)', { exact: true }).fill('2.5');
  await page.getByLabel('Departure', { exact: true }).fill('KTEST');
  await page.getByLabel('Destination', { exact: true }).fill('KDEMO');
  await save();
  await clickNav('Expenses');
  await page.getByRole('button', { name: 'Payments', exact: true }).click();
  for (const [description, amount, category] of [
    ['Fuel purchase', '135', 'Fuel'],
    ['Maintenance payment', '75', 'Routine maintenance'],
  ]) {
    await page.getByRole('button', { name: 'Add expense', exact: true }).click();
    await page.getByLabel('Description', { exact: true }).fill(description);
    await page.getByLabel('Amount', { exact: true }).fill(amount);
    await page.getByLabel('Category', { exact: true }).fill(category);
    await save();
  }
  await clickNav('Trip Calculator');
  await page.getByRole('button', { name: 'Add trip', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Reference trip');
  await page.getByLabel('Leg 1 hours', { exact: true }).fill('2.5');
  await save();
  await page.getByText('$322.50', { exact: true }).waitFor();
  await clickNav('Budgets');
  await page.getByRole('button', { name: 'Add budget', exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).fill('10000');
  await save();
  await clickNav('Maintenance');
  await page.getByRole('button', { name: 'Add reminder', exact: true }).click();
  await page.getByLabel('Description', { exact: true }).fill('User-defined inspection');
  await page.getByLabel('Due date', { exact: true }).fill('2026-12-01');
  await save();
  await clickNav('Expenses');
  await page.getByRole('button', { name: 'Payments', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.getByLabel('Vendor', { exact: true }).fill('Fictional vendor');
  await save();
  const beforeDelete = await page.evaluate(() => window.flightcost.snapshot());
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false });
  });
  assert.equal(
    await page.evaluate(
      (id) => window.flightcost.remove('expenses', id),
      beforeDelete.expenses[0].id,
    ),
    false,
  );
  const disposable = {
    ...beforeDelete.expenses[0],
    id: crypto.randomUUID(),
    description: 'Delete-test',
  };
  await page.evaluate((v) => window.flightcost.save('expenses', v), disposable);
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
  });
  assert.equal(
    await page.evaluate((id) => window.flightcost.remove('expenses', id), disposable.id),
    true,
  );
  const receiptPath = join(output, 'receipt.png');
  await page.screenshot({ path: receiptPath });
  await app.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] });
  }, receiptPath);
  assert.equal(
    await page.evaluate((id) => window.flightcost.receipt(id), beforeDelete.expenses[0].id),
    true,
  );
  await page.evaluate(() => window.flightcost.setting('theme', 'dark'));
  const forImport = await page.evaluate(() => window.flightcost.snapshot());
  const importPath = join(output, 'import.csv');
  writeFileSync(
    importPath,
    'date,description,category,amount\n2026-01-01,Imported fictional payment,Other,12.34\n',
  );
  await app.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] });
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
  }, importPath);
  assert.equal(
    await page.evaluate((id) => window.flightcost.importCsv(id), forImport.aircraft[0].id),
    1,
  );
  const imported = (await page.evaluate(() => window.flightcost.snapshot())).expenses.find(
    (e) => e.description === 'Imported fictional payment',
  );
  await page.evaluate((id) => window.flightcost.remove('expenses', id), imported.id);
  writeFileSync(importPath, 'date,description,category,amount\n2026-01-01,Bad input,Other,-1\n');
  assert.equal(
    await page.evaluate(async (id) => {
      try {
        await window.flightcost.importCsv(id);
        return false;
      } catch {
        return true;
      }
    }, forImport.aircraft[0].id),
    true,
  );
  const state = await page.evaluate(() => window.flightcost.snapshot());
  assert.equal(state.expenses.length, 2);
  assert.equal(state.flights.length, 1);
  assert.equal(state.trips.length, 1);
  assert.equal(state.budgets.length, 1);
  const tripPdf = join(output, 'trip.pdf');
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, tripPdf);
  await page.evaluate((id) => window.flightcost.tripReport(id, 'pdf'), state.trips[0].id);
  assert.equal(readFileSync(tripPdf).subarray(0, 4).toString(), '%PDF');
  const reportKinds = [
    'Annual Aircraft Ownership',
    'Monthly Cost Summary',
    'Cost Per Flight Hour',
    'Fuel Expenses',
    'Maintenance Expenses',
    'Budget Versus Actual',
    'Multi-Year Ownership',
    'Aircraft Comparison',
  ];
  for (const kind of reportKinds) {
    const p = join(output, kind.replaceAll(' ', '-') + '.pdf');
    await app.evaluate(({ dialog }, p) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
    }, p);
    await page.evaluate(
      ({ id, kind }) => window.flightcost.report(id, '2026-01-01', '2026-12-31', 'pdf', kind),
      { id: state.aircraft[0].id, kind },
    );
    assert.equal(readFileSync(p).subarray(0, 4).toString(), '%PDF');
  }
  const summaryCsv = join(output, 'report-summary.csv');
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, summaryCsv);
  await page.evaluate(
    (id) => window.flightcost.reportCsv(id, '2026-01-01', '2026-12-31', 'Cost Per Flight Hour'),
    state.aircraft[0].id,
  );
  assert.ok(readFileSync(summaryCsv, 'utf8').includes('129.00'));
  const report = join(output, 'report.pdf'),
    backup = join(output, 'backup.sqlite'),
    csv = join(output, 'expenses.csv');
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, report);
  await page.evaluate(
    (id) => window.flightcost.report(id, '2026-01-01', '2026-12-31', 'pdf'),
    state.aircraft[0].id,
  );
  assert.equal(readFileSync(report).subarray(0, 4).toString(), '%PDF');
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, csv);
  await page.evaluate((id) => window.flightcost.exportCsv(id), state.aircraft[0].id);
  assert.ok(readFileSync(csv, 'utf8').includes('Fuel purchase'));
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, backup);
  await page.evaluate(() => window.flightcost.backup());
  assert.ok(existsSync(backup));
  const bulk = Array.from({ length: 80 }, (_, i) => ({
    ...state.expenses[0],
    id: crypto.randomUUID(),
    description: `Pagination fixture ${String(i + 1).padStart(3, '0')}`,
    amount: 1,
    flightId: null,
    planId: null,
    tripFee: false,
  }));
  for (const expense of bulk)
    await page.evaluate((v) => window.flightcost.save('expenses', v), expense);
  const largeReport = join(output, 'multipage-report.pdf');
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, largeReport);
  await page.evaluate(
    (id) => window.flightcost.report(id, '2026-01-01', '2026-12-31', 'pdf'),
    state.aircraft[0].id,
  );
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
  });
  for (const expense of bulk)
    await page.evaluate((id) => window.flightcost.remove('expenses', id), expense.id);
  await clickNav('Dashboard');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: join(output, 'dashboard-1366.png'), fullPage: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: join(output, 'dashboard-1920.png'), fullPage: true });
  for (const name of [
    'Aircraft',
    'Flights',
    'Expenses',
    'Trip Calculator',
    'Maintenance',
    'Budgets',
    'Reports',
    'Settings',
  ]) {
    await clickNav(name);
    assert.equal(await page.getByRole('heading', { name, exact: true, level: 1 }).count(), 1);
    await page.screenshot({
      path: join(output, name.replaceAll(' ', '-') + '.png'),
      fullPage: true,
    });
  }
  await page.evaluate(() => window.flightcost.setting('theme', 'light'));
  await clickNav('Dashboard');
  await page.reload();
  await page.getByText('$129.00', { exact: true }).waitFor();
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.screenshot({ path: join(output, 'dashboard-light-2560.png'), fullPage: true });
  await page.evaluate(() => window.flightcost.setting('theme', 'dark'));
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Dashboard', exact: true }).waitFor();
  const reopened = await page.evaluate(() => window.flightcost.snapshot());
  assert.deepEqual(reopened, state);
  await app.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] });
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
  }, backup);
  await page.evaluate(() => window.flightcost.restore());
  const restored = await page.evaluate(() => window.flightcost.snapshot());
  assert.deepEqual(restored, state);
  await clickNav('Aircraft');
  await page.getByRole('button', { name: 'Edit profile & assumptions', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Smoke aircraft edited');
  await save();
  assert.equal(
    (await page.evaluate(() => window.flightcost.snapshot())).aircraft[0].name,
    'Smoke aircraft edited',
  );
  const demoId = await page.evaluate(() => window.flightcost.demo());
  const withDemo = await page.evaluate(() => window.flightcost.snapshot());
  assert.equal(withDemo.aircraft.find((a) => a.id === demoId).example, true);
  assert.equal(withDemo.expenses.filter((e) => e.aircraftId === demoId).length, 0);
  assert.equal(withDemo.expenses.filter((e) => e.aircraftId === state.aircraft[0].id).length, 2);
  await page.reload();
  await page.getByLabel('Active aircraft', { exact: true }).selectOption(demoId);
  await page
    .getByText(
      'FICTIONAL EXAMPLE · Assumed values, not verified aircraft specifications or market costs. Reports remain separate from real profiles.',
      { exact: true },
    )
    .waitFor();
  assert.deepEqual(errors, []);
  writeFileSync(
    join(output, 'result.json'),
    JSON.stringify(
      {
        status: 'passed',
        packaged: !!executablePath,
        checks: [
          'onboarding',
          'plans',
          'financial reference dashboard',
          'flight',
          'fuel payment',
          'maintenance payment',
          'saved trip',
          'budget',
          'PDF',
          'CSV',
          'backup',
          'restart persistence',
          'restore',
          '1366/1920/2560 screenshots',
          'all navigation pages',
          'light theme',
          'expense edit',
          'delete cancellation and confirmation',
          'receipt persistence',
          'trip PDF',
          'all eight report types',
          'report CSV',
          'valid and invalid CSV import',
          'multi-page report',
          'offline context',
          'renderer security settings',
          'aircraft editing',
          'isolated fictional example',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(`PASS: ${output}`);
} catch (e) {
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  console.error('Smoke output:', output);
  throw e;
} finally {
  await app.close();
}
