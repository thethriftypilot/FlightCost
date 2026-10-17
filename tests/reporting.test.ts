import { expect, it } from 'vitest';
import { flightCost, tripCost } from '../src/domain/finance';
import {
  type Expense,
  type Flight,
  newAircraft,
  newRecord,
  type Snapshot,
  type Trip,
} from '../src/domain/models';
import { createReport, reportKinds } from '../src/domain/reporting';

const a = {
  ...newAircraft(),
  name: 'Test',
  annualHours: 150,
  fixedConfirmed: true,
  fuelBurn: 9,
  fuelPrice: 6,
  oil: 0,
  maintenance: 15,
  engine: 20,
  propeller: 0,
  other: 0,
};
function fixture(): Snapshot {
  return {
    aircraft: [a],
    recurring: [],
    expenses: [
      {
        ...newRecord('expenses', a.id),
        date: '2026-01-01',
        description: 'Fuel',
        amount: 135,
        category: 'Fuel',
      } as Expense,
    ],
    flights: [],
    trips: [],
    budgets: [],
    maintenance: [],
    settings: {},
    attachments: [],
  };
}
it.each(reportKinds)('creates a structured %s report without inventing history', (kind) => {
  const s = fixture();
  const report = createReport(s, a, '2026-01-01', '2026-12-31', kind);
  expect(report.title).toContain(kind);
  expect(report.notes.join(' ')).toContain('not frozen historical costs');
  expect(report.tables.length).toBeGreaterThan(0);
});
it('filters fuel and maintenance independently', () => {
  const s = fixture();
  s.expenses.push({
    ...s.expenses[0],
    id: crypto.randomUUID(),
    category: 'Engine work',
    amount: 10000,
  });
  expect(createReport(s, a, '2026-01-01', '2026-12-31', 'Fuel Expenses').tables[0].rows[0][1]).toBe(
    '135.00',
  );
  expect(
    createReport(s, a, '2026-01-01', '2026-12-31', 'Maintenance Expenses').tables[0].rows[0][1],
  ).toBe('10,000.00');
});
it('never mixes fictional and real aircraft comparisons', () => {
  const s = fixture();
  s.aircraft.push({ ...a, id: crypto.randomUUID(), name: 'EXAMPLE', example: true });
  expect(
    createReport(s, a, '2026-01-01', '2026-12-31', 'Aircraft Comparison').tables[0].rows,
  ).toHaveLength(1);
});
it('uses measured consumption with its unit and adds only marked fees', () => {
  const s = fixture(),
    f = {
      ...newRecord('flights', a.id),
      duration: 2.5,
      fuelBurned: 37.85411784,
      fuelUnit: 'L',
    } as Flight;
  s.expenses = s.expenses.map((x) => ({ ...x, flightId: f.id }));
  s.expenses.push({
    ...s.expenses[0],
    id: crypto.randomUUID(),
    category: 'Landing fees',
    tripFee: true,
    amount: 10,
  });
  const c = flightCost(a, [], s.expenses, f);
  expect(c.fuel).toBe(60);
  expect(c.fees).toBe(10);
  expect(c.total).toBe(157.5);
  expect(c.cash).toBe(145);
});
it('uses frozen trip assumptions even if live aircraft costs change', () => {
  const t = {
    ...newRecord('trips', a.id),
    legs: [{ departure: 'A', destination: 'B', hours: 2.5 }],
    assumptions: { aircraft: a, plans: [], savedAt: new Date().toISOString() },
  } as Trip;
  expect(tripCost({ ...a, fuelPrice: 100 }, [], t).fuel).toBe(135);
});
