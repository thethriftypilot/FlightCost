import Decimal from 'decimal.js';
import { z } from 'zod';

const text = z.string().trim().max(2000);
const money = z.number().finite().min(0).max(1e10);
const payment = money.refine(
  (v) => new Decimal(v).decimalPlaces() <= 2,
  'Payment amounts support at most two decimal places',
);
const optional = money.nullable();
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Enter a valid calendar date',
  );
const id = z.string().uuid();
const base = { id, aircraftId: id };
export const aircraftSchema = z.object({
  id,
  name: text.min(1),
  manufacturer: text,
  model: text,
  year: z.number().int().min(1900).max(2200).nullable(),
  registration: text,
  category: text,
  engineType: text,
  engines: z.number().int().min(1).max(8),
  fuelType: text,
  capacity: optional,
  unit: z.enum(['US gal', 'L']),
  priceUnit: z.enum(['US gal', 'L']),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']),
  basis: z.enum(['Manual', 'Hobbs', 'Tach']),
  purchasePrice: optional,
  startDate: date.nullable(),
  fixedConfirmed: z.boolean(),
  annualHours: optional,
  fuelBurn: optional,
  fuelPrice: optional,
  oil: optional,
  maintenance: optional,
  engineMethod: z.enum(['Manual', 'Derived']),
  engine: optional,
  overhaul: optional,
  remaining: optional,
  propeller: optional,
  other: optional,
  depreciation: optional,
  interest: optional,
  opportunity: optional,
  engineHours: optional,
  archived: z.boolean(),
  example: z.boolean(),
});
export const recurringSchema = z
  .object({
    ...base,
    description: text.min(1),
    category: text.min(1),
    amount: payment,
    frequency: z.enum(['Monthly', 'Quarterly', 'Annual']),
    start: date,
    end: date.nullable(),
    fixed: z.boolean(),
    kind: z.enum(['Operating', 'Principal', 'Acquisition']).default('Operating'),
  })
  .refine((v) => !v.end || v.end >= v.start, 'End date must follow start')
  .refine(
    (v) => !v.fixed || v.kind === 'Operating',
    'Only operating plans may contribute to fixed ownership economics',
  );
export const expenseSchema = z
  .object({
    ...base,
    date,
    description: text.min(1),
    category: text.min(1),
    amount: payment,
    vendor: text,
    notes: text,
    payment: text,
    kind: z.enum(['Operating', 'Principal', 'Acquisition']),
    flightId: id.nullable(),
    planId: id.nullable(),
    period: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .nullable(),
    tripFee: z.boolean().default(false),
    fuelQuantity: optional,
    fuelUnit: z.enum(['US gal', 'L']),
  })
  .refine(
    (v) => !v.planId || v.period !== null,
    'Linked planned payment requires covered period (YYYY-MM)',
  )
  .refine(
    (v) => !v.tripFee || (v.flightId !== null && v.kind === 'Operating' && v.category !== 'Fuel'),
    'A trip fee must link to a flight and be an operating payment other than Fuel',
  );
export const flightSchema = z
  .object({
    ...base,
    date,
    departure: text,
    destination: text,
    stops: text,
    basis: z.enum(['Manual', 'Hobbs', 'Tach']),
    duration: optional,
    meterStart: optional,
    meterEnd: optional,
    fuelBurned: optional,
    fuelUnit: z.enum(['US gal', 'L']).default('US gal'),
    notes: text,
  })
  .refine(
    (v) =>
      v.basis === 'Manual'
        ? v.duration !== null && v.duration > 0
        : v.meterStart !== null && v.meterEnd !== null && v.meterEnd > v.meterStart,
    'Enter positive manual duration or increasing readings from the selected meter',
  );
export const legSchema = z.object({
  departure: text,
  destination: text,
  hours: money.refine((v) => v > 0),
});
export const tripSchema = z.object({
  ...base,
  name: text.min(1),
  date,
  legs: z.array(legSchema).min(1).max(30),
  roundTrip: z.boolean(),
  fuelBurn: optional,
  fuelPrice: optional,
  taxi: money,
  fees: money,
  reserveFuel: money,
  passengers: z.number().int().min(0).max(1000),
  notes: text,
  assumptions: z
    .object({
      aircraft: aircraftSchema,
      plans: z.array(recurringSchema),
      savedAt: z.string().datetime(),
    })
    .nullable()
    .default(null),
});
export const maintenanceSchema = z.object({
  ...base,
  description: text.min(1),
  lastDate: date.nullable(),
  dueDate: date.nullable(),
  lastHours: optional,
  dueHours: optional,
  notes: text,
});
export const budgetSchema = z.object({
  ...base,
  year: z.number().int().min(1900).max(2200),
  category: text,
  month: z.number().int().min(0).max(12),
  amount: payment,
});
export const schemas = {
  aircraft: aircraftSchema,
  expenses: expenseSchema,
  flights: flightSchema,
  recurring: recurringSchema,
  trips: tripSchema,
  maintenance: maintenanceSchema,
  budgets: budgetSchema,
};
export type Entity = keyof typeof schemas;
export type Aircraft = z.infer<typeof aircraftSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Flight = z.infer<typeof flightSchema>;
export type Recurring = z.infer<typeof recurringSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type Maintenance = z.infer<typeof maintenanceSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type RecordValue = Aircraft | Expense | Flight | Recurring | Trip | Maintenance | Budget;
export type Snapshot = {
  aircraft: Aircraft[];
  expenses: Expense[];
  flights: Flight[];
  recurring: Recurring[];
  trips: Trip[];
  maintenance: Maintenance[];
  budgets: Budget[];
  settings: Record<string, string>;
  attachments: { id: string; expenseId: string; name: string }[];
};
export const categories = [
  'Fuel',
  'Routine maintenance',
  'Unscheduled repairs',
  'Annual inspection',
  'Oil',
  'Tires',
  'Brakes',
  'Avionics',
  'Engine work',
  'Propeller work',
  'Insurance',
  'Hangar',
  'Tie-down',
  'Registration',
  'Subscriptions',
  'Charts',
  'Taxes',
  'Loan interest',
  'Landing fees',
  'Parking',
  'Handling',
  'Other',
];
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function newAircraft(): Aircraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    manufacturer: '',
    model: '',
    year: null,
    registration: '',
    category: 'Single-engine piston',
    engineType: '',
    engines: 1,
    fuelType: 'Avgas',
    capacity: null,
    unit: 'US gal',
    priceUnit: 'US gal',
    currency: 'USD',
    basis: 'Manual',
    purchasePrice: null,
    startDate: null,
    fixedConfirmed: false,
    annualHours: null,
    fuelBurn: null,
    fuelPrice: null,
    oil: null,
    maintenance: null,
    engineMethod: 'Manual',
    engine: null,
    overhaul: null,
    remaining: null,
    propeller: null,
    other: null,
    depreciation: null,
    interest: null,
    opportunity: null,
    engineHours: null,
    archived: false,
    example: false,
  };
}
export function newRecord(entity: Entity, aircraftId: string): RecordValue {
  const b = { id: crypto.randomUUID(), aircraftId };
  switch (entity) {
    case 'aircraft':
      return newAircraft();
    case 'expenses':
      return {
        ...b,
        date: today(),
        description: '',
        category: 'Fuel',
        amount: 0,
        vendor: '',
        notes: '',
        payment: '',
        kind: 'Operating',
        flightId: null,
        planId: null,
        period: null,
        tripFee: false,
        fuelQuantity: null,
        fuelUnit: 'US gal',
      };
    case 'flights':
      return {
        ...b,
        date: today(),
        departure: '',
        destination: '',
        stops: '',
        basis: 'Manual',
        duration: null,
        meterStart: null,
        meterEnd: null,
        fuelBurned: null,
        fuelUnit: 'US gal',
        notes: '',
      };
    case 'recurring':
      return {
        ...b,
        description: '',
        category: 'Insurance',
        amount: 0,
        frequency: 'Annual',
        start: today(),
        end: null,
        fixed: true,
        kind: 'Operating',
      };
    case 'trips':
      return {
        ...b,
        name: '',
        date: today(),
        legs: [{ departure: '', destination: '', hours: 1 }],
        roundTrip: false,
        fuelBurn: null,
        fuelPrice: null,
        taxi: 0,
        fees: 0,
        reserveFuel: 0,
        passengers: 0,
        notes: '',
        assumptions: null,
      };
    case 'maintenance':
      return {
        ...b,
        description: '',
        lastDate: null,
        dueDate: null,
        lastHours: null,
        dueHours: null,
        notes: '',
      };
    case 'budgets':
      return { ...b, year: new Date().getFullYear(), category: 'All', month: 0, amount: 0 };
  }
}
