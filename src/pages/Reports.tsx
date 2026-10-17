import { useState } from 'react';

import { api } from '../api';
import { Chart } from '../components/Charts';
import { Empty, Panel } from '../components/common';
import type { Aircraft, Snapshot } from '../domain/models';
import { today } from '../domain/models';
import { createReport, monthlyCash, type ReportKind, reportKinds } from '../domain/reporting';

export function Reports({
  a,
  s,
  run,
}: {
  a: Aircraft;
  s: Snapshot;
  run: (fn: () => Promise<unknown>, message: string) => void;
}) {
  const [from, setFrom] = useState(`${today().slice(0, 4)}-01-01`),
    [to, setTo] = useState(today()),
    [kind, setKind] = useState<ReportKind>('Annual Aircraft Ownership');

  const report = createReport(s, a, from, to, kind),
    trend = monthlyCash(s, a, from, to, kind === 'Fuel Expenses' ? 'Fuel' : undefined);

  return (
    <>
      <Panel
        title="Ownership reports"
        sub="The same calculation model supplies this preview, PDF and CSV exports."
      >
        <div className="report-controls">
          <label>
            Report type
            <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind)}>
              {reportKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Through
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="actions">
          <button
            className="primary"
            onClick={() =>
              run(() => api.report(a.id, from, to, 'pdf', kind), 'Report export finished')
            }
          >
            Export PDF
          </button>
          <button
            onClick={() =>
              run(() => api.report(a.id, from, to, 'print', kind), 'Print dialog finished')
            }
          >
            Print
          </button>
          <button
            onClick={() =>
              run(() => api.reportCsv(a.id, from, to, kind), 'Report CSV export finished')
            }
          >
            Export report CSV
          </button>
        </div>
        <h2>{report.title}</h2>
        <p className="muted">
          {report.aircraft} · {from} through {to} · {a.currency}
        </p>
        {report.tables.map((table) => (
          <section className="report-section" key={table.title}>
            <h3>{table.title}</h3>
            {table.rows.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {table.columns.map((c, i) => (
                        <th key={i}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No records in the selected scope.</Empty>
            )}
          </section>
        ))}
        <details>
          <summary>Calculation definitions and assumptions</summary>
          {report.notes.map((n) => (
            <p className="muted" key={n}>
              {n}
            </p>
          ))}
        </details>
      </Panel>
      {trend.length > 0 && (
        <Panel
          title={
            kind === 'Fuel Expenses' ? 'Fuel cash spending over time' : 'Historical cash spending'
          }
          sub="Recorded payment months only; no synthetic history."
        >
          <Chart data={trend} x="period" label={a.currency} bar />
        </Panel>
      )}
    </>
  );
}
