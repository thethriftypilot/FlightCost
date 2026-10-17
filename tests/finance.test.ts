import { describe, expect, it } from 'vitest';
import {
  annualize,
  cash,
  convert,
  dueDates,
  economics,
  flightHours,
  forecast,
  rounded,
  sum,
  tripCost,
} from '../src/domain/finance';
import {
  type Aircraft,
  date,
  type Expense,
  type Flight,
  newAircraft,
  newRecord,
  type Recurring,
  schemas,
  type Trip,
} from '../src/domain/models';
export const aircraft = (): Aircraft => ({
  ...newAircraft(),
  name: 'Test aircraft',
  fixedConfirmed: true,
  annualHours: 150,
  fuelBurn: 9,
  fuelPrice: 6,
  engine: 20,
  maintenance: 15,
  oil: 0,
  propeller: 0,
  other: 0,
});
export const plans = (a: Aircraft): Recurring[] =>
  [2400, 3600].map(
    (amount, i) =>
      ({
        ...newRecord('recurring', a.id),
        description: i ? 'Hangar' : 'Insurance',
        amount,
        frequency: 'Annual',
        start: '2024-01-01',
        end: null,
        fixed: true,
      }) as Recurring,
  );
describe('Financial contract', () => {
  it('rejects sub-cent payment values instead of silently rounding cash', () => {
    expect(
      schemas.expenses.safeParse({
        ...newRecord('expenses', aircraft().id),
        description: 'Invalid precision',
        amount: 1.005,
      }).success,
    ).toBe(false);
  });
  it('does not allocate principal plans as operating ownership costs', () => {
    const a = aircraft(),
      p = { ...plans(a)[0], fixed: false, kind: 'Principal' as const };
    expect(economics(a, [p], '2026-01-01').fixed).toBe(0);
    expect(schemas.recurring.safeParse({ ...p, fixed: true }).success).toBe(false);
  });
  it('requires resolving financing interest entered twice', () => {
    const a = { ...aircraft(), interest: 500 },
      p = { ...plans(a)[0], category: 'Loan interest' };
    expect(economics(a, [p], '2026-01-01').loaded).toBeNull();
  });
  it('rejects fuel purchases classified as trip fees', () => {
    expect(
      schemas.expenses.safeParse({
        ...newRecord('expenses', aircraft().id),
        description: 'Fuel',
        tripFee: true,
        flightId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
  it('matches all hourly reference figures', () => {
    const a = aircraft();
    expect(economics(a, plans(a), '2026-10-17')).toMatchObject({
      fixed: 6000,
      fixedHourly: 40,
      fuel: 54,
      variable: 89,
      loaded: 129,
    });
  });
  it('matches all trip reference figures', () => {
    const a = aircraft(),
      t = {
        ...newRecord('trips', a.id),
        date: '2026-10-17',
        legs: [{ departure: 'A', destination: 'B', hours: 2.5 }],
      } as Trip;
    expect(tripCost(a, plans(a), t)).toMatchObject({
      fuel: 135,
      reserves: 87.5,
      fixed: 100,
      total: 322.5,
      incremental: 135,
    });
  });
  it('allocates insurance by 30 versus 150 hours', () => {
    const a = aircraft(),
      p = plans(a).slice(0, 1);
    expect(economics({ ...a, annualHours: 30 }, p, '2026-01-01').fixedHourly).toBe(80);
    expect(economics(a, p, '2026-01-01').fixedHourly).toBe(16);
  });
  it.each([0, null])('handles missing/zero utilization %s', (h) => {
    const a = { ...aircraft(), annualHours: h };
    expect(economics(a, plans(a), '2026-01-01').loaded).toBeNull();
  });
  it('does not claim unknown fuel price is zero', () => {
    const a = { ...aircraft(), fuelPrice: null };
    expect(economics(a, plans(a), '2026-01-01').variable).toBeNull();
  });
  it('requires explicit fixed-plan completeness', () => {
    const a = { ...aircraft(), fixedConfirmed: false };
    expect(economics(a, [], '2026-01-01').fixed).toBeNull();
  });
  it('isolates multiple aircraft', () => {
    const a = aircraft(),
      b = aircraft();
    expect(economics(a, plans(b), '2026-01-01').fixed).toBe(0);
  });
  it('uses decimal-safe sums and half-up display', () => {
    expect(sum([0.1, 0.2])).toBe(0.3);
    expect(rounded(1.005)).toBe(1.01);
  });
  it('converts US gallons and liters exactly enough to round-trip', () => {
    expect(convert(1, 'US gal', 'L')).toBe(3.785411784);
    expect(convert(3.785411784, 'L', 'US gal')).toBe(1);
  });
  it('converts quantity before applying price', () => {
    const a = { ...aircraft(), priceUnit: 'L' as const, fuelPrice: 1 };
    expect(economics(a, [], '2026-01-01').fuel).toBe(34.068706056);
  });
  it.each([
    ['Monthly', 1200],
    ['Quarterly', 400],
    ['Annual', 100],
  ] as const)('annualizes %s', (frequency, expected) => {
    const p = { ...plans(aircraft())[0], amount: 100, frequency };
    expect(annualize(p)).toBe(expected);
  });
  it('derived engine reserve replaces manual rate', () => {
    const a = {
      ...aircraft(),
      engineMethod: 'Derived' as const,
      overhaul: 40000,
      remaining: 1000,
      engine: 999,
    };
    expect(economics(a, [], '2026-01-01').reserves).toBe(55);
  });
  it('zero remaining overhaul hours is unavailable', () => {
    const a = { ...aircraft(), engineMethod: 'Derived' as const, overhaul: 40000, remaining: 0 };
    expect(economics(a, [], '2026-01-01').reserves).toBeNull();
  });
  it('round trip doubles legs, not total taxi or fees, and excludes carried fuel', () => {
    const a = aircraft(),
      t = {
        ...newRecord('trips', a.id),
        legs: [{ departure: 'A', destination: 'B', hours: 1 }],
        roundTrip: true,
        taxi: 1,
        fees: 10,
        reserveFuel: 20,
      } as Trip;
    expect(tripCost(a, plans(a), t)).toMatchObject({
      hours: 2,
      quantity: 19,
      fuel: 114,
      incremental: 124,
      total: 274,
    });
  });
  it('clamps monthly due days across leap year boundaries', () => {
    const p = { ...plans(aircraft())[0], start: '2024-01-31', frequency: 'Monthly' as const };
    expect(dueDates(p, 2024).slice(0, 3)).toEqual(['2024-01-31', '2024-02-29', '2024-03-31']);
    expect(dueDates(p, 2025)[1]).toBe('2025-02-28');
  });
  it('reconciles partial recurring payment without double counting', () => {
    const a = aircraft(),
      p = plans(a)[0];
    const payment = {
      ...newRecord('expenses', a.id),
      description: 'Insurance',
      date: '2026-01-01',
      amount: 1000,
      planId: p.id,
      period: '2026-01',
    } as Expense;
    expect(forecast([p], [payment], a.id, 2026, '2026-10-17')).toMatchObject({
      actual: 1000,
      unpaid: 1400,
      total: 2400,
    });
  });
  it('prepaid prior-year payment covers next-year installment', () => {
    const a = aircraft(),
      p = plans(a)[0];
    const payment = {
      ...newRecord('expenses', a.id),
      date: '2025-12-01',
      amount: 2400,
      planId: p.id,
      period: '2026-01',
    } as Expense;
    expect(forecast([p], [payment], a.id, 2026, '2026-01-01').total).toBe(0);
  });
  it('cash never includes reserves and separates principal', () => {
    const a = aircraft();
    const e = {
      ...newRecord('expenses', a.id),
      date: '2026-01-01',
      amount: 200,
      kind: 'Principal',
    } as Expense;
    expect(cash([e], a.id, '2026-01-01', '2026-12-31')).toMatchObject({
      total: 200,
      operating: 0,
      principal: 200,
    });
  });
  it('keeps selected meter basis', () => {
    const f = {
      ...newRecord('flights', aircraft().id),
      basis: 'Tach',
      duration: 2,
      meterStart: 100,
      meterEnd: 101.4,
    } as Flight;
    expect(flightHours(f)).toBe(1.4);
  });
  it('rejects negative payments', () =>
    expect(
      schemas.expenses.safeParse({
        ...newRecord('expenses', aircraft().id),
        description: 'Bad',
        amount: -1,
      }).success,
    ).toBe(false));
  it('rejects impossible dates', () => {
    expect(date.safeParse('2025-02-29').success).toBe(false);
    expect(date.safeParse('2024-02-29').success).toBe(true);
  });
  it('rejects decreasing meter readings', () =>
    expect(
      schemas.flights.safeParse({
        ...newRecord('flights', aircraft().id),
        basis: 'Hobbs',
        meterStart: 20,
        meterEnd: 19,
      }).success,
    ).toBe(false));
  it('requires a covered period for a linked payment', () =>
    expect(
      schemas.expenses.safeParse({
        ...newRecord('expenses', aircraft().id),
        description: 'Payment',
        planId: crypto.randomUUID(),
      }).success,
    ).toBe(false));
});
