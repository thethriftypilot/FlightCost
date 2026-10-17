import Decimal from 'decimal.js';
import type { Aircraft, Budget, Expense, Flight, Recurring, Trip } from './models';

const D = (v: number) => new Decimal(v);
export const sum = (values: number[]) => values.reduce((s, v) => s.plus(v), D(0)).toNumber();
export const mul = (a: number, b: number) => D(a).times(b).toNumber();
export const div = (a: number, b: number) => (b > 0 ? D(a).div(b).toNumber() : null);
export const rounded = (n: number) => D(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
export const convert = (n: number, from: string, to: string) =>
  from === to ? n : from === 'US gal' ? mul(n, 3.785411784) : D(n).div('3.785411784').toNumber();
export const annualize = (r: Recurring) =>
  mul(r.amount, r.frequency === 'Monthly' ? 12 : r.frequency === 'Quarterly' ? 4 : 1);
const completeSum = (v: (number | null)[]) =>
  v.some((x) => x === null) ? null : sum(v as number[]);
export function economics(a: Aircraft, plans: Recurring[], asOf: string) {
  const activeFixed = plans.filter(
    (p) =>
      p.aircraftId === a.id &&
      p.fixed &&
      p.kind === 'Operating' &&
      p.start <= asOf &&
      (!p.end || p.end >= asOf),
  );
  const fixed = a.fixedConfirmed ? sum(activeFixed.map(annualize)) : null;
  const engine =
    a.engineMethod === 'Manual'
      ? a.engine
      : a.overhaul !== null && a.remaining !== null
        ? div(a.overhaul, a.remaining)
        : null;
  const fuel =
    a.fuelBurn !== null && a.fuelPrice !== null
      ? mul(convert(a.fuelBurn, a.unit, a.priceUnit), a.fuelPrice)
      : null;
  const reserves = completeSum([a.maintenance, engine, a.propeller, a.other]);
  const variable = completeSum([fuel, a.oil, reserves]);
  const economic = sum([a.depreciation ?? 0, a.interest ?? 0, a.opportunity ?? 0]);
  const duplicateInterest =
    (a.interest ?? 0) > 0 && activeFixed.some((p) => p.category === 'Loan interest');
  const fixedHourly = fixed === null ? null : div(fixed, a.annualHours ?? 0),
    economicHourly = duplicateInterest ? null : div(economic, a.annualHours ?? 0);
  const loaded = completeSum([fixedHourly, variable, economicHourly]);
  const missing = [
    ['fuel burn', a.fuelBurn],
    ['fuel price', a.fuelPrice],
    ['oil allowance', a.oil],
    ['maintenance allowance', a.maintenance],
    ['engine reserve', engine],
    ['propeller reserve', a.propeller],
    ['other allowance', a.other],
  ]
    .filter(([, v]) => v === null)
    .map(([k]) => String(k));
  if (!a.annualHours) missing.push('annual utilization');
  if (!a.fixedConfirmed) missing.push('confirmed fixed cost plans');
  if (duplicateInterest)
    missing.push('resolve financing interest entered in both fixed plans and optional economics');
  return {
    fixed,
    fixedHourly,
    fuel,
    reserves,
    variable,
    economic,
    economicHourly,
    loaded,
    missing,
  };
}
export function tripCost(a: Aircraft, plans: Recurring[], trip: Trip) {
  if (trip.assumptions) {
    a = trip.assumptions.aircraft;
    plans = trip.assumptions.plans;
  }
  const e = economics(
    { ...a, fuelBurn: trip.fuelBurn ?? a.fuelBurn, fuelPrice: trip.fuelPrice ?? a.fuelPrice },
    plans,
    trip.date,
  );
  const hours = mul(sum(trip.legs.map((l) => l.hours)), trip.roundTrip ? 2 : 1);
  const burn = trip.fuelBurn ?? a.fuelBurn,
    price = trip.fuelPrice ?? a.fuelPrice;
  const quantity = burn === null ? null : sum([mul(hours, burn), trip.taxi]);
  const fuel =
    quantity === null || price === null ? null : mul(convert(quantity, a.unit, a.priceUnit), price);
  const reserves = e.reserves === null ? null : mul(e.reserves, hours),
    oil = a.oil === null ? null : mul(a.oil, hours);
  const fixed = e.fixedHourly === null ? null : mul(e.fixedHourly, hours),
    economic = e.economicHourly === null ? null : mul(e.economicHourly, hours);
  const incremental = completeSum([fuel, oil, trip.fees]),
    variable = completeSum([fuel, oil, reserves]);
  const total = completeSum([incremental, reserves, fixed, economic]);
  return {
    hours,
    quantity,
    fuel,
    oil,
    reserves,
    fixed,
    economic,
    fees: trip.fees,
    incremental,
    variable,
    total,
    perPassenger: total !== null && trip.passengers > 0 ? div(total, trip.passengers) : null,
  };
}
export const flightHours = (f: Flight) =>
  f.basis === 'Manual' ? (f.duration ?? 0) : sum([f.meterEnd ?? 0, -(f.meterStart ?? 0)]);
export function cash(expenses: Expense[], aircraftId: string, from: string, to: string) {
  const rows = expenses.filter(
    (e) => e.aircraftId === aircraftId && e.date >= from && e.date <= to,
  );
  return {
    total: sum(rows.map((e) => e.amount)),
    operating: sum(rows.filter((e) => e.kind === 'Operating').map((e) => e.amount)),
    principal: sum(rows.filter((e) => e.kind === 'Principal').map((e) => e.amount)),
    acquisition: sum(rows.filter((e) => e.kind === 'Acquisition').map((e) => e.amount)),
    rows,
  };
}
export function dueDates(p: Recurring, year: number) {
  const dates: string[] = [];
  const start = new Date(p.start + 'T00:00:00Z');
  const step = p.frequency === 'Monthly' ? 1 : p.frequency === 'Quarterly' ? 3 : 12;
  for (let m = start.getUTCMonth(), y = start.getUTCFullYear(); y <= year; ) {
    if (y === year) {
      const day = Math.min(start.getUTCDate(), new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
      const d = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!p.end || d <= p.end) dates.push(d);
    }
    m += step;
    y += Math.floor(m / 12);
    m %= 12;
  }
  return dates;
}
// Linked payments reconcile a due period even when prepaid or paid after the due date.
export function forecast(
  plans: Recurring[],
  expenses: Expense[],
  aircraftId: string,
  year: number,
  asOf: string,
) {
  const selected = expenses.filter((e) => e.aircraftId === aircraftId);
  const actual = cash(selected, aircraftId, `${year}-01-01`, `${year}-12-31`).total;
  const unpaid = sum(
    plans
      .filter((p) => p.aircraftId === aircraftId)
      .flatMap((p) =>
        dueDates(p, year).map((d) =>
          Math.max(
            0,
            sum([
              p.amount,
              -sum(
                selected
                  .filter((e) => e.planId === p.id && e.period === d.slice(0, 7))
                  .map((e) => e.amount),
              ),
            ]),
          ),
        ),
      ),
  );
  return { actual, unpaid, total: sum([actual, unpaid]), asOf };
}
export function budgetResult(b: Budget, expenses: Expense[]) {
  const rows = expenses.filter(
    (e) =>
      e.aircraftId === b.aircraftId &&
      Number(e.date.slice(0, 4)) === b.year &&
      (b.month === 0 || Number(e.date.slice(5, 7)) === b.month) &&
      (b.category === 'All' || e.category === b.category),
  );
  const actual = sum(rows.map((e) => e.amount));
  return { actual, remaining: sum([b.amount, -actual]) };
}
export function reportRows(
  a: Aircraft,
  plans: Recurring[],
  expenses: Expense[],
  flights: Flight[],
  from: string,
  to: string,
) {
  const e = economics(a, plans, to),
    c = cash(expenses, a.id, from, to);
  const hours = sum(
    flights.filter((f) => f.aircraftId === a.id && f.date >= from && f.date <= to).map(flightHours),
  );
  return [
    ['Cash spending', c.total],
    ['Operating cash payments', c.operating],
    ['Principal cash movements', c.principal],
    ['Acquisition cash movements', c.acquisition],
    ['Logged hours', hours],
    ['Actual operating cash / logged hour', div(c.operating, hours)],
    ['Annual fixed run rate', e.fixed],
    ['Expected annual hours', a.annualHours],
    ['Estimated variable / hour', e.variable],
    ['Estimated fully loaded / hour', e.loaded],
  ] as [string, number | null][];
}

export function flightCost(a: Aircraft, plans: Recurring[], expenses: Expense[], f: Flight) {
  const hours = flightHours(f),
    e = economics(a, plans, f.date);
  const fuel =
    f.fuelBurned !== null
      ? a.fuelPrice === null
        ? null
        : mul(convert(f.fuelBurned, f.fuelUnit, a.priceUnit), a.fuelPrice)
      : e.fuel === null
        ? null
        : mul(e.fuel, hours);
  const oil = a.oil === null ? null : mul(a.oil, hours),
    reserves = e.reserves === null ? null : mul(e.reserves, hours),
    fixed = e.fixedHourly === null ? null : mul(e.fixedHourly, hours),
    economic = e.economicHourly === null ? null : mul(e.economicHourly, hours);
  const linked = expenses.filter((x) => x.aircraftId === a.id && x.flightId === f.id),
    fees = sum(
      linked
        .filter((x) => x.tripFee && x.kind === 'Operating' && x.category !== 'Fuel')
        .map((x) => x.amount),
    );
  const variable = completeSum([fuel, oil, reserves]);
  return {
    hours,
    fuel,
    oil,
    reserves,
    fixed,
    economic,
    fees,
    variable,
    total: completeSum([variable, fixed, economic, fees]),
    cash: sum(linked.map((x) => x.amount)),
  };
}
