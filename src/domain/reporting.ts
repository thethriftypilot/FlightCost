import { budgetResult, cash, div, economics, flightHours, reportRows, sum } from './finance';
import type { Aircraft, Snapshot } from './models';

export const reportKinds = [
  'Annual Aircraft Ownership',
  'Monthly Cost Summary',
  'Cost Per Flight Hour',
  'Fuel Expenses',
  'Maintenance Expenses',
  'Budget Versus Actual',
  'Multi-Year Ownership',
  'Aircraft Comparison',
] as const;
export type ReportKind = (typeof reportKinds)[number];
export type ReportTable = { title: string; columns: string[]; rows: string[][] };
export type ReportDocument = {
  title: string;
  aircraft: string;
  currency: string;
  from: string;
  to: string;
  notes: string[];
  tables: ReportTable[];
};
const maintenanceCategories = new Set([
  'Routine maintenance',
  'Unscheduled repairs',
  'Annual inspection',
  'Oil',
  'Tires',
  'Brakes',
  'Avionics',
  'Engine work',
  'Propeller work',
]);
const fmt = (n: number | null) =>
  n === null
    ? 'Not available'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(
        n,
      );

export function createReport(
  s: Snapshot,
  a: Aircraft,
  from: string,
  to: string,
  kind: ReportKind,
): ReportDocument {
  const payments = cash(s.expenses, a.id, from, to).rows.sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const flights = s.flights.filter((f) => f.aircraftId === a.id && f.date >= from && f.date <= to);
  const e = economics(a, s.recurring, to);
  const notes = [
    'Cash spending is recorded payments only. Principal and acquisitions are cash movements shown separately from operating payments. Reserves are estimates and never added to actual cash.',
    `Estimated economics use current assumptions and fixed plans active on ${to}, not frozen historical costs. Expected annual utilization: ${a.annualHours ?? 'Unknown'} hours. Fixed plans are an annual run rate, not prorated spending.`,
    `Fuel burn: ${a.fuelBurn ?? 'Unknown'} ${a.unit}/hour; price: ${a.fuelPrice ?? 'Unknown'} ${a.currency}/${a.priceUnit}. Oil: ${a.oil ?? 'Unknown'}/h; maintenance allowance: ${a.maintenance ?? 'Unknown'}/h; engine method: ${a.engineMethod}; manual engine rate: ${a.engine ?? 'Unknown'}/h; overhaul budget: ${a.overhaul ?? 'Unknown'}; remaining overhaul hours: ${a.remaining ?? 'Unknown'}.`,
    `Propeller allowance: ${a.propeller ?? 'Unknown'}/h; other use allowance: ${a.other ?? 'Unknown'}/h. Optional annual depreciation: ${a.depreciation ?? 'Excluded'}; interest: ${a.interest ?? 'Excluded'}; opportunity cost: ${a.opportunity ?? 'Excluded'}.`,
    `Missing required assumptions: ${e.missing.join(', ') || 'None'}. Currency amounts are ${a.currency} unless a row states another currency or hours.`,
  ];
  const tables: ReportTable[] = [];
  const detail = (rows: typeof payments) => ({
    title: 'Recorded payments',
    columns: ['Date', 'Description', 'Category', 'Classification', `Amount (${a.currency})`],
    rows: rows.map((x) => [x.date, x.description, x.category, x.kind, fmt(x.amount)]),
  });
  const grouped = (yearOnly: boolean) => {
    const periods = Array.from(
      new Set([
        ...payments.map((p) => p.date.slice(0, yearOnly ? 4 : 7)),
        ...flights.map((f) => f.date.slice(0, yearOnly ? 4 : 7)),
      ]),
    ).sort();
    return periods.map((period) => {
      const p = payments.filter((x) => x.date.startsWith(period)),
        h = sum(flights.filter((f) => f.date.startsWith(period)).map(flightHours)),
        operating = sum(p.filter((p) => p.kind === 'Operating').map((p) => p.amount));
      return [
        period,
        fmt(sum(p.map((x) => x.amount))),
        fmt(operating),
        fmt(h),
        fmt(div(operating, h)),
      ];
    });
  };
  if (kind === 'Fuel Expenses' || kind === 'Maintenance Expenses') {
    const rows = payments.filter((p) =>
      kind === 'Fuel Expenses' ? p.category === 'Fuel' : maintenanceCategories.has(p.category),
    );
    tables.push(
      {
        title: 'Cash summary',
        columns: ['Measure', a.currency],
        rows: [
          ['Recorded payments', fmt(sum(rows.map((p) => p.amount)))],
          ['Payment count', String(rows.length)],
        ],
      },
      detail(rows),
    );
    notes.push(
      kind === 'Fuel Expenses'
        ? 'Fuel purchases are cash spending. They need not match fuel consumed in this period. Quantity units remain on individual expense records.'
        : 'Maintenance category report includes the built-in maintenance categories. Custom categories remain in the full ownership report unless named to match a built-in category.',
    );
  } else if (kind === 'Budget Versus Actual') {
    const budgets = s.budgets.filter(
      (b) =>
        b.aircraftId === a.id &&
        b.year >= Number(from.slice(0, 4)) &&
        b.year <= Number(to.slice(0, 4)),
    );
    tables.push({
      title: 'Budget periods',
      columns: ['Period', 'Category', 'Budget', 'Actual cash', 'Remaining'],
      rows: budgets.map((b) => {
        const r = budgetResult(b, s.expenses);
        return [
          b.month ? `${b.year}-${String(b.month).padStart(2, '0')}` : `${b.year} annual`,
          b.category,
          fmt(b.amount),
          fmt(r.actual),
          fmt(r.remaining),
        ];
      }),
    });
    notes.push(
      'Budgets are evaluated for their entire configured year/month in the selected years, even if the report starts or ends mid-period. Annual, monthly and category budgets overlap and must not be added together.',
    );
  } else if (kind === 'Aircraft Comparison') {
    tables.push({
      title: 'Current operating assumptions',
      columns: [
        'Aircraft',
        'Currency',
        'Annual hours',
        'Fixed/year',
        'Variable/hour',
        'Fully loaded/hour',
      ],
      rows: s.aircraft
        .filter((x) => x.example === a.example && !x.archived)
        .map((x) => {
          const c = economics(x, s.recurring, to);
          return [
            x.name,
            x.currency,
            fmt(x.annualHours),
            fmt(c.fixed),
            fmt(c.variable),
            fmt(c.loaded),
          ];
        }),
    });
    notes.push(
      'Real aircraft and fictional examples are never combined in a comparison. Currencies are labeled and are not converted.',
    );
  } else if (kind === 'Monthly Cost Summary' || kind === 'Multi-Year Ownership') {
    tables.push({
      title:
        kind === 'Monthly Cost Summary'
          ? 'Monthly cash and utilization'
          : 'Annual cash and utilization',
      columns: ['Period', 'Cash spending', 'Operating cash', 'Logged hours', 'Operating cash/hour'],
      rows: grouped(kind === 'Multi-Year Ownership'),
    });
    notes.push(
      'Only periods with recorded activity appear. Zero logged hours produce Not available rather than a zero hourly cost.',
    );
  } else {
    tables.push({
      title: 'Ownership measures',
      columns: ['Measure', `Value (${a.currency} unless hours)`],
      rows: reportRows(a, s.recurring, s.expenses, s.flights, from, to).map(([k, v]) => [
        k,
        fmt(v),
      ]),
    });
    if (kind === 'Cost Per Flight Hour')
      tables.push({
        title: 'Annual utilization sensitivity',
        columns: ['Expected hours', 'Fixed/hour', 'Variable/hour', 'Fully loaded/hour'],
        rows: [25, 30, 50, 75, 100, 150, 200].map((h) => {
          const c = economics({ ...a, annualHours: h }, s.recurring, to);
          return [String(h), fmt(c.fixedHourly), fmt(c.variable), fmt(c.loaded)];
        }),
      });
    else tables.push(detail(payments));
  }
  return {
    title: kind + ' Report',
    aircraft: `${a.name}${a.example ? ' — FICTIONAL EXAMPLE' : ''}`,
    currency: a.currency,
    from,
    to,
    notes,
    tables,
  };
}

export function monthlyCash(s: Snapshot, a: Aircraft, from: string, to: string, category?: string) {
  const rows = cash(s.expenses, a.id, from, to).rows.filter(
    (e) => !category || e.category === category,
  );
  return Array.from(new Set(rows.map((e) => e.date.slice(0, 7))))
    .sort()
    .map((period) => ({
      period,
      value: sum(rows.filter((e) => e.date.startsWith(period)).map((e) => e.amount)),
    }));
}
