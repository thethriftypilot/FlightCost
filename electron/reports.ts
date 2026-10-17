import { tripCost } from '../src/domain/finance';
import type { Aircraft, Snapshot, Trip } from '../src/domain/models';
import { createReport, type ReportKind } from '../src/domain/reporting';

export const escape = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export function tripHtml(s: Snapshot, a: Aircraft, t: Trip) {
  a = t.assumptions?.aircraft ?? a;
  const c = tripCost(a, s.recurring, t);
  const fmt = (v: number | null) =>
    v === null
      ? 'Not available'
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: a.currency }).format(v);
  const rows: [string, number | null][] = [
    ['Consumed fuel', c.fuel],
    ['Oil allowance', c.oil],
    ['Operating reserves', c.reserves],
    ['Fixed allocation', c.fixed],
    ['Optional economics', c.economic],
    ['Trip fees', c.fees],
    ['Incremental estimate', c.incremental],
    ['Fully loaded estimate', c.total],
    ['Informational cost / passenger', c.perPassenger],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:20mm}body{font:12px Arial;color:#172538}h1{font-size:28px}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}td:last-child{text-align:right}table{width:100%;border-collapse:collapse}tr{break-inside:avoid}</style></head><body><p>FLIGHTCOST / THE THRIFTY PILOT</p><h1>Trip cost summary</h1><h2>${escape(t.name)}</h2><p>${escape(a.name)} ${a.example ? '- FICTIONAL EXAMPLE' : ''} &middot; Trip date ${escape(t.date)} &middot; Generated ${new Date().toISOString().slice(0, 10)}</p><p>${t.legs.map((l) => `${escape(l.departure)} &rarr; ${escape(l.destination)} (${l.hours} h)`).join('<br>')}${t.roundTrip ? '<br>Return over the same legs included' : ''}</p><p>Total duration ${c.hours} h. Fuel consumed ${c.quantity ?? 'Unknown'} ${escape(a.unit)}. Reserve carried ${t.reserveFuel} ${escape(a.unit)} is not consumed.</p><table>${rows.map(([k, v]) => `<tr><td>${escape(k)}</td><td>${fmt(v)}</td></tr>`).join('')}</table><h2>Assumptions</h2><p>Burn ${t.fuelBurn ?? a.fuelBurn ?? 'Unknown'} ${escape(a.unit)}/h; price ${t.fuelPrice ?? a.fuelPrice ?? 'Unknown'} ${escape(a.currency)}/${escape(a.priceUnit)}. Taxi fuel ${t.taxi} ${escape(a.unit)} and fees are whole-trip totals. Expected annual utilization: ${a.annualHours ?? 'Unknown'} h. Assumptions captured ${escape(t.assumptions?.savedAt ?? 'not captured (legacy estimate)')}; plans active on the trip date.</p><p>Incremental includes consumed fuel, oil and fees. Fully loaded additionally includes operating reserves and fixed/economic allocation. These are estimates, not recorded cash payments. Passenger allocation is informational and does not establish permission to charge passengers. This is not a navigation, flight-planning or regulatory compliance product.</p><p>${escape(t.notes)}</p><p>Developed by The Thrifty Pilot</p></body></html>`;
}

export function reportHtml(
  s: Snapshot,
  a: Aircraft,
  from: string,
  to: string,
  kind: ReportKind = 'Annual Aircraft Ownership',
) {
  const r = createReport(s, a, from, to, kind);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(r.title)}</title><style>@page{size:A4;margin:18mm}body{font:11px Arial;color:#172538}h1{font-size:26px}h2{font-size:16px;margin-top:24px;break-after:avoid}p{line-height:1.45}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #ccd5df;overflow-wrap:anywhere}td:last-child{text-align:right}tr{break-inside:avoid}thead{display:table-header-group}.brand{color:#167d73;text-transform:uppercase;letter-spacing:2px}small{color:#526278}</style></head><body><p class="brand">FlightCost / The Thrifty Pilot</p><h1>${escape(r.title)}</h1><h2>${escape(r.aircraft)}</h2><p>${escape(a.manufacturer)} ${escape(a.model)} · ${escape(a.registration)} · ${escape(r.currency)}</p><p>Covered dates: ${escape(from)} through ${escape(to)} · Generated ${new Date().toISOString().slice(0, 10)}</p>${r.tables.map((t) => `<h2>${escape(t.title)}</h2><table><thead><tr>${t.columns.map((c) => `<th>${escape(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.length ? t.rows.map((row) => `<tr>${row.map((c) => `<td>${escape(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${t.columns.length}">No records in the selected scope.</td></tr>`}</tbody></table>`).join('')}<h2>Definitions and assumptions</h2>${r.notes.map((n) => `<p>${escape(n)}</p>`).join('')}<p><small>Developed by The Thrifty Pilot. Budgeting information only. Not an aircraft maintenance logbook, airworthiness assessment, or flight-planning tool.</small></p></body></html>`;
}
