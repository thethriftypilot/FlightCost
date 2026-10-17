import { useState } from 'react';
import { Card, Empty, money, number, Panel } from '../components/common';
import { annualize, budgetResult, flightCost, flightHours, mul, tripCost } from '../domain/finance';
import type {
  Aircraft,
  Budget,
  Entity,
  Expense,
  Flight,
  Maintenance,
  RecordValue,
  Recurring,
  Snapshot,
  Trip,
} from '../domain/models';
import { today } from '../domain/models';
export function Records({
  entity,
  a,
  s,
  edit,
  remove,
  action,
}: {
  entity: Entity;
  a: Aircraft;
  s: Snapshot;
  edit: (e: Entity, r: RecordValue) => void;
  remove: (e: Entity, id: string) => void;
  action: (name: string, id: string) => void;
}) {
  const [search, setSearch] = useState(''),
    [sort, setSort] = useState('newest');
  const rows = (s[entity] as RecordValue[])
    .filter((r) => ('aircraftId' in r ? r.aircraftId === a.id : true))
    .filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    .sort((x, y) => {
      const left =
        'date' in x ? x.date : 'name' in x ? x.name : 'description' in x ? x.description : x.id;
      const right =
        'date' in y ? y.date : 'name' in y ? y.name : 'description' in y ? y.description : y.id;
      return sort === 'newest' ? right.localeCompare(left) : left.localeCompare(right);
    });
  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          aria-label="Search records"
          placeholder="Search dates, categories, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Sort records" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Descending</option>
          <option value="oldest">Ascending</option>
        </select>
      </div>
      {rows.length === 0 && (
        <Empty>No matching records. Add your first record to get started.</Empty>
      )}
      <div className="record-list">
        {rows.map((r) => (
          <Panel
            key={r.id}
            title={
              'name' in r
                ? r.name
                : 'description' in r
                  ? r.description
                  : 'departure' in r
                    ? `${r.departure || 'Departure'} → ${r.destination || 'Destination'}`
                    : `${(r as Budget).year} · ${(r as Budget).category} budget`
            }
          >
            {'date' in r && <p className="eyebrow">{r.date}</p>}
            {entity === 'expenses' &&
              (() => {
                const e = r as Expense;
                return (
                  <>
                    <div className="record-top">
                      <strong className="large">{money(e.amount, a.currency)}</strong>
                      <span className="badge">
                        {e.category} · {e.kind}
                      </span>
                      <span>{e.vendor}</span>
                    </div>
                    <p>{e.notes}</p>
                    {e.planId && <p className="muted">Linked plan · covered period {e.period}</p>}
                    <div className="actions">
                      <button onClick={() => action('receipt', r.id)}>Attach receipt</button>
                      {s.attachments
                        .filter((x) => x.expenseId === r.id)
                        .map((x) => (
                          <button key={x.id} onClick={() => action('saveReceipt', x.id)}>
                            Save {x.name}
                          </button>
                        ))}
                    </div>
                  </>
                );
              })()}
            {entity === 'flights' &&
              (() => {
                const f = r as Flight,
                  h = flightHours(f),
                  fc = flightCost(a, s.recurring, s.expenses, f);
                return (
                  <>
                    <div className="mini-grid">
                      <Card label={`${f.basis} duration`} value={`${number(h)} h`} />
                      <Card label="Estimated variable" value={money(fc.variable, a.currency)} />
                      <Card label="Allocated fixed" value={money(fc.fixed, a.currency)} />
                      <Card label="Fully loaded estimate" value={money(fc.total, a.currency)} />
                      <Card label="Trip-specific fees" value={money(fc.fees, a.currency)} />
                      <Card label="Linked actual cash" value={money(fc.cash, a.currency)} />
                    </div>
                    <p className="muted">
                      Estimates use current aircraft assumptions. Only payments explicitly marked as
                      trip fees enter the estimate; fuel purchases are never added to consumed fuel.
                      Recorded fuel consumed: {number(f.fuelBurned)} {f.fuelUnit} (used instead of
                      estimated burn when supplied).
                    </p>
                    <p>{f.notes}</p>
                  </>
                );
              })()}
            {entity === 'recurring' &&
              (() => {
                const p = r as Recurring;
                return (
                  <>
                    <strong className="large">
                      {money(p.amount, a.currency)} <small>/ {p.frequency.toLowerCase()}</small>
                    </strong>
                    <p>
                      {p.category} · {p.fixed ? 'Fixed ownership' : 'Other planned cash'} · starts{' '}
                      {p.start}
                      {p.end ? ` · ends ${p.end}` : ''}
                    </p>
                    <p className="muted">
                      Annual run rate: {money(annualize(p), a.currency)}. Payments are recorded
                      separately in Expenses.
                    </p>
                  </>
                );
              })()}
            {entity === 'trips' &&
              (() => {
                const t = r as Trip,
                  c = tripCost(a, s.recurring, t),
                  ta = t.assumptions?.aircraft ?? a;
                return (
                  <>
                    <p>
                      {t.legs
                        .map(
                          (l) => `${l.departure || '—'} → ${l.destination || '—'} (${l.hours} h)`,
                        )
                        .join(' / ')}{' '}
                      {t.roundTrip ? ' · with return' : ''}
                    </p>
                    <div className="mini-grid">
                      <Card
                        label="Incremental estimate"
                        value={money(c.incremental, a.currency)}
                        detail="Fuel + oil + trip fees"
                        accent
                      />
                      <Card
                        label="Fully loaded trip"
                        value={money(c.total, a.currency)}
                        detail="Includes reserves and fixed allocation"
                      />
                      <Card label="Fuel consumed" value={`${number(c.quantity)} ${ta.unit}`} />
                    </div>
                    <dl>
                      {[
                        ['Fuel cost', c.fuel],
                        ['Oil', c.oil],
                        ['Operating reserves', c.reserves],
                        ['Allocated fixed', c.fixed],
                        ['Optional economics', c.economic],
                        ['Trip fees', c.fees],
                        ['Informational / passenger', c.perPassenger],
                      ].map(([l, v]) => (
                        <div key={String(l)}>
                          <dt>{l}</dt>
                          <dd>{money(v as number | null, a.currency)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="muted">
                      {t.reserveFuel} {ta.unit} carried in reserve is not charged as fuel consumed.
                      Passenger figures do not establish permission to charge passengers. This is a
                      budget estimate, not flight planning or fuel compliance advice.
                    </p>
                    <p className="muted">
                      Scenario: fuel price +10% →{' '}
                      {money(
                        tripCost(a, s.recurring, {
                          ...t,
                          fuelPrice:
                            (t.fuelPrice ?? ta.fuelPrice) === null
                              ? null
                              : mul((t.fuelPrice ?? ta.fuelPrice)!, 1.1),
                        }).total,
                        a.currency,
                      )}{' '}
                      fully loaded. Assumptions captured:{' '}
                      {t.assumptions?.savedAt.slice(0, 10) ??
                        'Legacy estimate using current assumptions'}
                      . Edit and save to refresh.
                    </p>
                    <button onClick={() => action('tripReport', t.id)}>Export trip PDF</button>
                    <button onClick={() => action('tripPrint', t.id)}>Print trip</button>
                    <button
                      onClick={() =>
                        edit('trips', { ...t, id: crypto.randomUUID(), name: `${t.name} (copy)` })
                      }
                    >
                      Duplicate scenario
                    </button>
                  </>
                );
              })()}
            {entity === 'maintenance' &&
              (() => {
                const m = r as Maintenance;
                const due =
                  (m.dueDate !== null && m.dueDate <= today()) ||
                  (m.dueHours !== null && a.engineHours !== null && m.dueHours <= a.engineHours);
                return (
                  <>
                    <p className={due ? 'notice' : ''}>
                      {due ? 'Due — review your schedule' : 'User-defined reminder'} · Date:{' '}
                      {m.dueDate ?? 'Not set'} · Engine hours: {number(m.dueHours)}
                    </p>
                    <p>
                      Last completed: {m.lastDate ?? 'Unknown'} · {number(m.lastHours)} engine hours
                    </p>
                    <p>{m.notes}</p>
                    <p className="muted">
                      Record cash costs in Expenses. This reminder does not determine airworthiness
                      or regulatory compliance.
                    </p>
                  </>
                );
              })()}
            {entity === 'budgets' &&
              (() => {
                const b = r as Budget,
                  result = budgetResult(b, s.expenses);
                return (
                  <>
                    <p>{b.month === 0 ? 'Annual' : `Month ${b.month}`} cash spending target</p>
                    <div className="mini-grid">
                      <Card label="Budget" value={money(b.amount, a.currency)} />
                      <Card label="Recorded payments" value={money(result.actual, a.currency)} />
                      <Card
                        label={result.remaining < 0 ? 'Over budget' : 'Remaining'}
                        value={money(result.remaining, a.currency)}
                      />
                    </div>
                    <progress value={result.actual} max={b.amount || 1} />
                  </>
                );
              })()}
            <div className="actions">
              <button onClick={() => edit(entity, r)}>Edit</button>
              <button className="danger subtle" onClick={() => remove(entity, r.id)}>
                Delete
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
