import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { Store } from '../electron/database';
import { tripCost } from '../src/domain/finance';
import { type Expense, newAircraft, newRecord } from '../src/domain/models';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'flightcost-'));
  const store = new Store(join(dir, 'data.sqlite'));
  const a = { ...newAircraft(), name: 'Fictional test' };
  store.save('aircraft', a);
  return {
    dir,
    store,
    a,
    cleanup: () => {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
it('recovers an unreadable database while preserving its original bytes', () => {
  const f = fixture();
  try {
    const backup = join(f.dir, 'backup.sqlite');
    f.store.backup(backup);
    const current = join(f.dir, 'broken.sqlite');
    writeFileSync(current, 'preserve this corrupt file');
    const preserved = Store.recover(current, backup);
    expect(readFileSync(join(preserved, 'broken.sqlite'), 'utf8')).toBe(
      'preserve this corrupt file',
    );
    const restored = new Store(current);
    expect(restored.snapshot().aircraft[0].name).toBe(f.a.name);
    restored.close();
  } finally {
    f.cleanup();
  }
});
it('persists records, edits, receipts and settings across process-like reopening', () => {
  const f = fixture();
  try {
    const e = { ...newRecord('expenses', f.a.id), description: 'Fuel', amount: 123.45 } as Expense;
    f.store.save('expenses', e);
    f.store.save('expenses', { ...e, amount: 150 });
    f.store.attach(e.id, 'test.txt', Buffer.from('receipt fixture'));
    f.store.setting('theme', 'light');
    f.store.close();
    f.store = new Store(join(f.dir, 'data.sqlite'));
    expect(f.store.snapshot().expenses[0].amount).toBe(150);
    expect(f.store.snapshot().attachments).toHaveLength(1);
    expect(f.store.snapshot().settings.theme).toBe('light');
    f.store.close();
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
it('backs up and restores every entity and receipt atomically', () => {
  const f = fixture();
  let target: Store | undefined;
  try {
    for (const entity of [
      'expenses',
      'recurring',
      'flights',
      'trips',
      'maintenance',
      'budgets',
    ] as const) {
      const r = newRecord(entity, f.a.id);
      const valid = {
        ...r,
        ...('description' in r ? { description: 'Test' } : {}),
        ...('name' in r ? { name: 'Trip' } : {}),
        ...(entity === 'flights' ? { duration: 1 } : {}),
      };
      f.store.save(entity, valid);
    }
    const e = f.store.snapshot().expenses[0];
    f.store.attach(e.id, 'fixture.pdf', Buffer.from('fake test receipt'));
    const path = join(f.dir, 'backup.sqlite');
    f.store.backup(path);
    target = new Store(join(f.dir, 'target.sqlite'));
    target.restore(path);
    expect(target.snapshot()).toEqual(f.store.snapshot());
    expect(target.db.prepare('SELECT bytes FROM attachments').get()?.bytes).toEqual(
      f.store.db.prepare('SELECT bytes FROM attachments').get()?.bytes,
    );
  } finally {
    target?.close();
    f.cleanup();
  }
});
it('rejects corrupt and future backups without touching current data', () => {
  const f = fixture();
  try {
    const before = f.store.snapshot();
    const path = join(f.dir, 'broken.sqlite');
    writeFileSync(path, 'not sqlite');
    expect(() => f.store.restore(path)).toThrow();
    expect(f.store.snapshot()).toEqual(before);
    const future = new Store(join(f.dir, 'future.sqlite'));
    future.db.exec('PRAGMA user_version=999');
    future.close();
    expect(() => f.store.restore(join(f.dir, 'future.sqlite'))).toThrow();
    expect(f.store.snapshot()).toEqual(before);
  } finally {
    f.cleanup();
  }
});
it('enforces aircraft-scoped flight associations and rolls back batches', () => {
  const f = fixture();
  try {
    const b = { ...newAircraft(), name: 'Second' };
    f.store.save('aircraft', b);
    const flight = { ...newRecord('flights', b.id), duration: 1 };
    f.store.save('flights', flight);
    expect(() =>
      f.store.save('expenses', {
        ...newRecord('expenses', f.a.id),
        description: 'Wrong aircraft',
        flightId: flight.id,
      }),
    ).toThrow();
    expect(() =>
      f.store.transaction(() => {
        f.store.save('expenses', { ...newRecord('expenses', f.a.id), description: 'First' });
        throw Error('Failure');
      }),
    ).toThrow();
    expect(f.store.snapshot().expenses).toHaveLength(0);
  } finally {
    f.cleanup();
  }
});
it('migration is repeatable and preserves earlier data', () => {
  const f = fixture();
  try {
    expect(f.store.db.prepare('PRAGMA user_version').get()?.user_version).toBe(1);
    expect(f.store.db.prepare('SELECT * FROM migrations').all()).toHaveLength(1);
    const second = new Store(join(f.dir, 'data.sqlite'));
    expect(second.snapshot().aircraft[0].name).toBe('Fictional test');
    second.close();
  } finally {
    f.cleanup();
  }
});
it('deleting a payment removes attached receipts but not aircraft', () => {
  const f = fixture();
  try {
    const e = { ...newRecord('expenses', f.a.id), description: 'Fuel' };
    f.store.save('expenses', e);
    f.store.attach(e.id, 'receipt.txt', Buffer.from('test'));
    f.store.remove('expenses', e.id);
    expect(f.store.snapshot().attachments).toHaveLength(0);
    expect(f.store.snapshot().aircraft).toHaveLength(1);
  } finally {
    f.cleanup();
  }
});
it('captures trip assumptions and refreshes them only on save', () => {
  const f = fixture();
  try {
    const a = { ...f.a, fuelPrice: 6, fuelBurn: 9 };
    f.store.save('aircraft', a);
    const t = { ...newRecord('trips', a.id), name: 'Test trip' };
    f.store.save('trips', t);
    const saved = f.store.snapshot().trips[0];
    f.store.save('aircraft', { ...a, fuelPrice: 20 });
    expect(tripCost({ ...a, fuelPrice: 20 }, [], saved).fuel).toBe(54);
    f.store.save('trips', saved);
    expect(f.store.snapshot().trips[0].assumptions?.aircraft.fuelPrice).toBe(20);
  } finally {
    f.cleanup();
  }
});
it('prevents currency relabeling and duplicate budget targets', () => {
  const f = fixture();
  try {
    const b = { ...newRecord('budgets', f.a.id), amount: 500 };
    f.store.save('budgets', b);
    expect(() => f.store.save('budgets', { ...b, id: crypto.randomUUID() })).toThrow(
      /already exists/,
    );
    expect(() => f.store.save('aircraft', { ...f.a, currency: 'EUR' })).toThrow(/Currency cannot/);
  } finally {
    f.cleanup();
  }
});
it('rejects incorrect covered months and plan edits that orphan payment coverage', () => {
  const f = fixture();
  try {
    const plan = {
      ...newRecord('recurring', f.a.id),
      description: 'Insurance',
      start: '2026-01-01',
    };
    f.store.save('recurring', plan);
    const payment = {
      ...newRecord('expenses', f.a.id),
      description: 'Payment',
      planId: plan.id,
      period: '2026-02',
    };
    expect(() => f.store.save('expenses', payment)).toThrow(/installment month/);
    f.store.save('expenses', { ...payment, period: '2026-01' });
    expect(() => f.store.save('recurring', { ...plan, start: '2026-02-01' })).toThrow(
      /invalidate linked/,
    );
  } finally {
    f.cleanup();
  }
});
