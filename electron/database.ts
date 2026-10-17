import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { dueDates } from '../src/domain/finance';
import {
  type Entity,
  expenseSchema,
  type RecordValue,
  type Snapshot,
  schemas,
} from '../src/domain/models';

const tables = Object.keys(schemas) as Entity[];
export class Store {
  db: DatabaseSync;
  constructor(public path: string) {
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
      const version = Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
      if (version > 1) throw Error('Database is from a newer FlightCost version.');
      if (version === 0) this.migrate();
      this.db.exec('PRAGMA journal_mode=WAL;');
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  migrate() {
    this.db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE aircraft(id TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload)));
 CREATE TABLE flights(id TEXT PRIMARY KEY,aircraftId TEXT NOT NULL REFERENCES aircraft(id),payload TEXT NOT NULL CHECK(json_valid(payload)),UNIQUE(id,aircraftId));
 CREATE TABLE recurring(id TEXT PRIMARY KEY,aircraftId TEXT NOT NULL REFERENCES aircraft(id),payload TEXT NOT NULL CHECK(json_valid(payload)),UNIQUE(id,aircraftId));
 CREATE TABLE expenses(id TEXT PRIMARY KEY,aircraftId TEXT NOT NULL REFERENCES aircraft(id),flightId TEXT,planId TEXT,payload TEXT NOT NULL CHECK(json_valid(payload)),FOREIGN KEY(flightId,aircraftId) REFERENCES flights(id,aircraftId),FOREIGN KEY(planId,aircraftId) REFERENCES recurring(id,aircraftId));
 CREATE TABLE trips(id TEXT PRIMARY KEY,aircraftId TEXT NOT NULL REFERENCES aircraft(id),payload TEXT NOT NULL CHECK(json_valid(payload)));
 CREATE TABLE maintenance(id TEXT PRIMARY KEY,aircraftId TEXT NOT NULL REFERENCES aircraft(id),payload TEXT NOT NULL CHECK(json_valid(payload)));
 CREATE TABLE budgets(id TEXT PRIMARY KEY,aircraftId TEXT NOT NULL REFERENCES aircraft(id),payload TEXT NOT NULL CHECK(json_valid(payload)));
 CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE attachments(id TEXT PRIMARY KEY,expenseId TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,name TEXT NOT NULL,bytes BLOB NOT NULL);
 CREATE TABLE migrations(version INTEGER PRIMARY KEY,applied TEXT NOT NULL);
 INSERT INTO migrations VALUES(1,datetime('now'));
 PRAGMA user_version=1; COMMIT;`);
    for (const t of tables.filter((t) => t !== 'aircraft'))
      this.db.exec(`CREATE INDEX ${t}_aircraft ON ${t}(aircraftId)`);
  }
  snapshot(): Snapshot {
    const result: Record<string, unknown> = {};
    for (const t of tables)
      result[t] = this.db
        .prepare(`SELECT payload FROM ${t}`)
        .all()
        .map((r) => schemas[t].parse(JSON.parse(String(r.payload))));
    result.settings = Object.fromEntries(
      this.db
        .prepare('SELECT key,value FROM settings')
        .all()
        .map((r) => [r.key, r.value]),
    );
    result.attachments = this.db.prepare('SELECT id,expenseId,name FROM attachments').all();
    return result as Snapshot;
  }
  save(entity: Entity, input: unknown) {
    let value = schemas[entity].parse(input);
    if (entity === 'trips') {
      const t = schemas.trips.parse(value),
        snapshot = this.snapshot(),
        a = snapshot.aircraft.find((a) => a.id === t.aircraftId);
      if (!a) throw Error('Aircraft not found.');
      value = {
        ...t,
        assumptions: {
          aircraft: a,
          plans: snapshot.recurring.filter((p) => p.aircraftId === a.id),
          savedAt: new Date().toISOString(),
        },
      };
    }
    if (entity === 'aircraft') {
      const old = this.snapshot().aircraft.find((a) => a.id === value.id);
      const next = schemas.aircraft.parse(value);
      if (
        old &&
        old.currency !== next.currency &&
        ['expenses', 'recurring', 'budgets', 'flights', 'trips'].some((t) =>
          this.db.prepare(`SELECT id FROM ${t} WHERE aircraftId=? LIMIT 1`).get(value.id),
        )
      )
        throw Error(
          'Currency cannot be changed after financial records exist. Create a separate aircraft profile; FlightCost does not convert currencies.',
        );
      this.db
        .prepare(
          'INSERT INTO aircraft VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
        )
        .run(value.id, JSON.stringify(value));
    } else {
      const row = value as Exclude<RecordValue, { manufacturer: string }>;
      if (entity === 'recurring') {
        const plan = schemas.recurring.parse(value);
        const linked = this.snapshot().expenses.filter((e) => e.planId === plan.id);
        if (
          linked.some(
            (e) =>
              e.kind !== plan.kind ||
              !e.period ||
              !dueDates(plan, Number(e.period.slice(0, 4))).some((d) => d.startsWith(e.period!)),
          )
        )
          throw Error(
            'This change would invalidate linked payments. Unlink or revise those payments before changing the plan classification or schedule.',
          );
      }
      if (entity === 'budgets') {
        const b = schemas.budgets.parse(value);
        const duplicate = this.snapshot().budgets.find(
          (x) =>
            x.id !== b.id &&
            x.aircraftId === b.aircraftId &&
            x.year === b.year &&
            x.month === b.month &&
            x.category === b.category,
        );
        if (duplicate)
          throw Error(
            'A budget already exists for this year, month and category. Edit that budget instead.',
          );
      }
      const existing = this.db.prepare(`SELECT aircraftId FROM ${entity} WHERE id=?`).get(value.id);
      if (existing && existing.aircraftId !== row.aircraftId)
        throw Error('Records cannot be moved between aircraft.');
      if (entity === 'expenses') {
        const e = expenseSchema.parse(row);
        if (e.planId) {
          const plan = this.snapshot().recurring.find((p) => p.id === e.planId);
          if (plan && plan.kind !== e.kind)
            throw Error('Payment classification must match the linked recurring plan.');
          if (
            plan &&
            e.period &&
            !dueDates(plan, Number(e.period.slice(0, 4))).some((d) => d.startsWith(e.period!))
          )
            throw Error(
              'The covered month is not an installment month for this plan. Use its scheduled due month.',
            );
        }
        this.db
          .prepare(
            'INSERT INTO expenses VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET flightId=excluded.flightId,planId=excluded.planId,payload=excluded.payload',
          )
          .run(e.id, e.aircraftId, e.flightId, e.planId, JSON.stringify(e));
      } else
        this.db
          .prepare(
            `INSERT INTO ${entity} VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload`,
          )
          .run(row.id, row.aircraftId, JSON.stringify(row));
    }
    return value.id;
  }
  remove(entity: Entity, id: string) {
    if (entity === 'aircraft')
      throw Error('Archive aircraft instead of deleting ownership history.');
    try {
      this.db.prepare(`DELETE FROM ${entity} WHERE id=?`).run(id);
    } catch {
      throw Error('This record is linked to an expense. Remove its association in Expenses first.');
    }
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  setting(key: string, value: string) {
    this.db
      .prepare(
        'INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      )
      .run(key, value);
  }
  attach(expenseId: string, name: string, bytes: Uint8Array) {
    if (bytes.length > 10 * 1024 * 1024) throw Error('Receipt exceeds 10 MB.');
    this.db
      .prepare('INSERT INTO attachments VALUES(?,?,?,?)')
      .run(randomUUID(), expenseId, name, bytes);
  }
  backup(path: string) {
    if (existsSync(path)) throw Error('Choose a new backup filename to preserve existing backups.');
    this.db.prepare('VACUUM INTO ?').run(path);
    try {
      Store.verify(path);
    } catch (e) {
      unlinkSync(path);
      throw e;
    }
  }
  static verify(path: string) {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      if (db.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok')
        throw Error('Backup integrity check failed.');
      if (db.prepare('PRAGMA user_version').get()?.user_version !== 1)
        throw Error('Backup schema is incompatible.');
      if (db.prepare('PRAGMA foreign_key_check').all().length)
        throw Error('Backup contains invalid record links.');
      for (const t of tables)
        for (const r of db.prepare(`SELECT * FROM ${t}`).all()) {
          const v = schemas[t].parse(JSON.parse(String(r.payload)));
          if (v.id !== r.id || ('aircraftId' in v && v.aircraftId !== r.aircraftId))
            throw Error('Backup record identity mismatch.');
          if (t === 'expenses') {
            const e = expenseSchema.parse(v);
            if (e.flightId !== r.flightId || e.planId !== r.planId)
              throw Error('Backup expense link mismatch.');
          }
        }
      for (const receipt of db
        .prepare('SELECT id,expenseId,name,length(bytes) AS size FROM attachments')
        .iterate()) {
        if (Number(receipt.size) > 10 * 1024 * 1024)
          throw Error('Backup contains an oversized receipt.');
      }
      db.prepare('SELECT key,value FROM settings').all();
    } finally {
      db.close();
    }
  }
  restore(path: string) {
    Store.verify(path);
    this.db.prepare('ATTACH DATABASE ? AS restored').run(path);
    try {
      this.transaction(() => {
        for (const t of [
          'attachments',
          'expenses',
          'trips',
          'maintenance',
          'budgets',
          'flights',
          'recurring',
          'aircraft',
          'settings',
        ])
          this.db.exec(`DELETE FROM ${t}`);
        for (const t of [
          'aircraft',
          'flights',
          'recurring',
          'expenses',
          'trips',
          'maintenance',
          'budgets',
          'settings',
          'attachments',
        ])
          this.db.exec(`INSERT INTO ${t} SELECT * FROM restored.${t}`);
        if (this.db.prepare('PRAGMA foreign_key_check').all().length)
          throw Error('Restore failed reference validation.');
      });
    } finally {
      this.db.exec('DETACH DATABASE restored');
    }
  }
  close() {
    this.db.close();
  }
  static recover(current: string, backup: string) {
    if (resolve(current) === resolve(backup)) throw Error('Select a separate backup file.');
    Store.verify(backup);
    const preserved = `${current}.recovery-${Date.now()}`;
    mkdirSync(preserved);
    const moved: string[] = [];
    try {
      for (const path of [current, `${current}-wal`, `${current}-shm`]) {
        if (existsSync(path)) {
          renameSync(path, join(preserved, basename(path)));
          moved.push(path);
        }
      }
      copyFileSync(backup, current);
      Store.verify(current);
      return preserved;
    } catch (error) {
      if (moved.includes(current) && existsSync(current)) unlinkSync(current);
      for (const path of moved.reverse()) renameSync(join(preserved, basename(path)), path);
      throw error;
    }
  }
}
