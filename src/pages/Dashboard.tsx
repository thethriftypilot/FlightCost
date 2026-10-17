import { useState } from 'react';
import { Chart } from '../components/Charts';
import { Card, Empty, money, number, Panel } from '../components/common';
import {
  budgetResult,
  cash,
  div,
  economics,
  flightHours,
  forecast,
  rounded,
  sum,
} from '../domain/finance';
import { type Aircraft, type Entity, type Snapshot, today } from '../domain/models';
export function Dashboard({
  a,
  s,
  add,
}: {
  a: Aircraft;
  s: Snapshot;
  add: (entity: Entity) => void;
}) {
  const year = Number(today().slice(0, 4));
  const [hours, setHours] = useState(100);
  const [mode, setMode] = useState('Economics');
  const e = economics(a, s.recurring, today());
  const c = cash(s.expenses, a.id, `${year}-01-01`, today());
  const flights = s.flights.filter(
    (f) => f.aircraftId === a.id && f.date >= `${year}-01-01` && f.date <= today(),
  );
  const logged = sum(flights.map(flightHours));
  const budget = s.budgets.find(
    (b) => b.aircraftId === a.id && b.year === year && b.month === 0 && b.category === 'All',
  );
  const plan = forecast(s.recurring, s.expenses, a.id, year, today());
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(year, i, 1).toLocaleString('en-US', { month: 'short' }),
    value: sum(c.rows.filter((x) => Number(x.date.slice(5, 7)) === i + 1).map((x) => x.amount)),
  }));
  const sensitivity = [
    25,
    50,
    75,
    100,
    150,
    200,
    ...(![25, 50, 75, 100, 150, 200].includes(hours) && hours > 0 ? [hours] : []),
  ]
    .sort((a, b) => a - b)
    .map((h) => ({
      hours: h,
      value: economics({ ...a, annualHours: h }, s.recurring, today()).loaded,
    }));
  const byCategory = Array.from(new Set(c.rows.map((x) => x.category)))
    .map((category) => ({
      category,
      value: sum(c.rows.filter((x) => x.category === category).map((x) => x.amount)),
    }))
    .sort((a, b) => b.value - a.value);
  return (
    <>
      <div className="hero">
        <div>
          <p className="eyebrow">YOUR AIRCRAFT. YOUR NUMBERS.</p>
          <h2>
            Know what your flying
            <br />
            really costs.
          </h2>
          <p className="muted">
            {a.manufacturer} {a.model} · {a.registration || 'Registration not supplied'} ·{' '}
            {a.currency}
          </p>
        </div>
        <div className="instrument">
          <span>EXPECTED UTILIZATION</span>
          <strong>{number(a.annualHours)}</strong>
          <span>HOURS / YEAR</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="segments">
          {['Economics', 'Cash spending', 'Forecast'].map((m) => (
            <button className={mode === m ? 'selected' : ''} onClick={() => setMode(m)} key={m}>
              {m}
            </button>
          ))}
        </div>
        <span className="muted">
          {year} · through {today()}
        </span>
      </div>
      {mode === 'Economics' && (
        <>
          <p className="explanation">
            Estimates allocate annual fixed costs across expected hours. Reserves are future-cost
            allowances, not money spent.
          </p>
          <div className="stats">
            <Card
              label="Fully loaded / flight hour"
              value={money(e.loaded, a.currency)}
              detail="Fixed + variable + optional economics"
              accent
            />
            <Card
              label="Variable / flight hour"
              value={money(e.variable, a.currency)}
              detail="Fuel, oil and operating reserves"
            />
            <Card
              label="Annual fixed ownership"
              value={money(e.fixed, a.currency)}
              detail="Annualized active recurring plans"
            />
          </div>
          {e.missing.length > 0 && (
            <p className="notice">
              Complete these assumptions to calculate totals: {e.missing.join(', ')}. Unknown does
              not mean zero.
            </p>
          )}
          <div className="two-columns">
            <Panel
              title="Fly more. Spread your fixed costs."
              sub="Fully loaded hourly estimate at different annual utilization"
            >
              <label className="inline">
                Custom annual hours
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </label>
              {e.loaded === null ? (
                <Empty>
                  Complete aircraft assumptions and fixed cost plans to view sensitivity.
                </Empty>
              ) : (
                <Chart
                  data={sensitivity.map((v) => ({
                    ...v,
                    value: v.value === null ? null : rounded(v.value),
                  }))}
                  x="hours"
                  label={`${a.currency} / hour`}
                />
              )}
              <div className="mini-grid">
                {[30, 150].map((h) => (
                  <div key={h}>
                    <span>Fixed allocation at {h} h</span>
                    <strong>
                      {money(e.fixed === null ? null : div(e.fixed, h), a.currency)} / h
                    </strong>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Inside your hourly estimate"
              sub="All components use your selected aircraft assumptions"
            >
              <dl>
                {[
                  ['Fuel consumed', e.fuel],
                  ['Oil allowance', a.oil],
                  ['Operating reserves', e.reserves],
                  ['Allocated fixed costs', e.fixedHourly],
                  ['Optional economic costs', e.economicHourly],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt>{label}</dt>
                    <dd>{money(value as number | null, a.currency)}</dd>
                  </div>
                ))}
              </dl>
              <p className="muted">
                Optional annual economics: depreciation, financing interest and opportunity cost.
                Loan principal and purchase price are excluded.
              </p>
            </Panel>
          </div>
        </>
      )}
      <div className="stats">
        <Card
          label="Year-to-date cash spending"
          value={money(c.total, a.currency)}
          detail="Actual recorded payments only"
        />
        <Card
          label="Annual budget remaining"
          value={money(budget ? budgetResult(budget, c.rows).remaining : null, a.currency)}
          detail={budget ? 'All-category annual cash budget' : 'Set an annual All-category budget'}
        />
        <Card
          label="Logged flight hours"
          value={`${number(logged)} h`}
          detail="Year to date · selected time basis per flight"
        />
      </div>
      {mode === 'Cash spending' && (
        <>
          <p className="explanation">
            Includes cash movements for principal and acquisitions, shown separately below.
            Estimates and reserves are excluded.
          </p>
          <div className="mini-grid">
            <Card label="Operating payments" value={money(c.operating, a.currency)} />
            <Card label="Principal payments" value={money(c.principal, a.currency)} />
            <Card label="Acquisitions" value={money(c.acquisition, a.currency)} />
          </div>
        </>
      )}
      {mode === 'Forecast' && (
        <Panel
          title="Recorded cash + unpaid scheduled plans"
          sub="Includes outstanding plan installments across the selected year. Payments must link to a plan and covered month to reconcile."
        >
          <div className="stats">
            <Card label="Recorded payments (full year)" value={money(plan.actual, a.currency)} />
            <Card label="Unpaid plan installments" value={money(plan.unpaid, a.currency)} />
            <Card label="Committed cash projection" value={money(plan.total, a.currency)} />
          </div>
          <p className="notice">
            This is a committed-spending projection, not a complete annual prediction. It excludes
            unplanned fuel, repairs and future flying. Past-due unpaid installments remain included.
            No partial-year extrapolation is applied.
          </p>
        </Panel>
      )}
      <div className="two-columns">
        <Panel title="Monthly cash spending" sub="Recorded payments, selected aircraft only">
          {c.rows.length ? (
            <Chart data={months} x="month" label={a.currency} bar />
          ) : (
            <Empty>No payments recorded this year. Add an expense to start your history.</Empty>
          )}
        </Panel>
        <Panel title="Where your money goes" sub="Year-to-date cash by category">
          {byCategory.length ? (
            byCategory.map((row) => (
              <div className="category" key={row.category}>
                <div>
                  <span>{row.category}</span>
                  <strong>{money(row.value, a.currency)}</strong>
                </div>
                <progress value={row.value} max={c.total || 1} />
              </div>
            ))
          ) : (
            <Empty>Your category breakdown will appear here.</Empty>
          )}
        </Panel>
      </div>
      <Panel title="Recent activity">
        <div className="actions">
          <button onClick={() => add('flights')}>+ Add flight</button>
          <button onClick={() => add('expenses')}>+ Add expense</button>
          <button onClick={() => add('trips')}>+ Estimate trip</button>
          <button onClick={() => add('maintenance')}>+ Maintenance reminder</button>
        </div>
        {[
          ...c.rows.map((x) => ({
            id: x.id,
            date: x.date,
            label: x.description,
            value: money(x.amount, a.currency),
          })),
          ...flights.map((x) => ({
            id: x.id,
            date: x.date,
            label: `Flight ${x.departure} → ${x.destination}`,
            value: `${number(flightHours(x))} h`,
          })),
        ]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 6)
          .map((x) => (
            <div className="activity" key={x.id}>
              <time>{x.date}</time>
              <span>{x.label}</span>
              <strong>{x.value}</strong>
            </div>
          ))}
      </Panel>
    </>
  );
}
