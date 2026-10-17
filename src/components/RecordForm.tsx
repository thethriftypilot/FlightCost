import { useEffect, useRef, useState } from 'react';
import {
  categories,
  type Entity,
  type RecordValue,
  type Snapshot,
  schemas,
  type Trip,
} from '../domain/models';

const labels: Record<string, string> = {
  name: 'Name',
  tripFee: 'Include as trip-specific fee in linked flight estimate',
  annualHours: 'Expected annual hours',
  fuelBurn: 'Cruise fuel burn / hour',
  fuelPrice: 'Fuel price / price unit',
  unit: 'Fuel quantity unit',
  priceUnit: 'Fuel price unit',
  oil: 'Oil allowance / hour',
  maintenance: 'Maintenance allowance / hour',
  engine: 'Manual engine reserve / hour',
  overhaul: 'Estimated overhaul budget',
  remaining: 'Remaining hours to overhaul',
  propeller: 'Propeller reserve / hour',
  other: 'Other use-based allowance / hour',
  depreciation: 'Optional annual depreciation',
  interest: 'Optional annual financing interest',
  opportunity: 'Optional annual opportunity cost',
  fixedConfirmed: 'I have reviewed all fixed plans (including any intentional zero)',
  startDate: 'Ownership start date',
  purchasePrice: 'Purchase price (not an operating cost)',
  basis: 'Flight-hour basis',
  period: 'Covered payment month (YYYY-MM)',
  planId: 'Related recurring plan',
  flightId: 'Related flight',
  fuelQuantity: 'Fuel purchased (not burned)',
  fuelUnit: 'Recorded fuel quantity unit',
  duration: 'Manual duration (hours)',
  meterStart: 'Selected meter start',
  meterEnd: 'Selected meter end',
  fuelBurned: 'Fuel consumed (quantity unit)',
  fees: 'Total landing / parking / handling / other fees',
  taxi: 'Taxi fuel consumed (total trip)',
  reserveFuel: 'Fuel carried in reserve (not burned)',
  passengers: 'Passenger count (informational)',
  roundTrip: 'Return over the same legs',
  engineHours: 'Current engine hours',
  month: 'Budget month (0 = annual, 1–12 = month)',
  fixed: 'Include in fixed ownership run rate',
  amount: 'Amount',
  engineMethod: 'Engine reserve method',
  dueHours: 'Due at engine hours',
  lastHours: 'Last completed at engine hours',
  dueDate: 'Due date',
  lastDate: 'Last completed date',
};
const choices: Record<string, string[]> = {
  unit: ['US gal', 'L'],
  priceUnit: ['US gal', 'L'],
  fuelUnit: ['US gal', 'L'],
  currency: ['USD', 'CAD', 'EUR', 'GBP'],
  basis: ['Manual', 'Hobbs', 'Tach'],
  engineMethod: ['Manual', 'Derived'],
  frequency: ['Monthly', 'Quarterly', 'Annual'],
  kind: ['Operating', 'Principal', 'Acquisition'],
};
const numberKeys = new Set([
  'year',
  'engines',
  'capacity',
  'purchasePrice',
  'annualHours',
  'fuelBurn',
  'fuelPrice',
  'oil',
  'maintenance',
  'engine',
  'overhaul',
  'remaining',
  'propeller',
  'other',
  'depreciation',
  'interest',
  'opportunity',
  'engineHours',
  'amount',
  'fuelQuantity',
  'duration',
  'meterStart',
  'meterEnd',
  'fuelBurned',
  'taxi',
  'fees',
  'reserveFuel',
  'passengers',
  'lastHours',
  'dueHours',
  'month',
]);
const dateKeys = new Set(['date', 'startDate', 'start', 'end', 'lastDate', 'dueDate']);
const readable = (key: string) =>
  labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
export function RecordForm({
  entity,
  initial,
  snapshot,
  onSave,
  onClose,
}: {
  entity: Entity;
  initial: RecordValue;
  snapshot: Snapshot;
  onSave: (v: RecordValue) => Promise<void>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    node?.querySelector<HTMLInputElement>('input,select,textarea')?.focus();
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && node) {
        const items = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)',
          ),
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    node?.addEventListener('keydown', keyboard);
    return () => {
      node?.removeEventListener('keydown', keyboard);
      previous?.focus();
    };
  }, []);
  const [value, setValue] = useState<Record<string, unknown>>({ ...initial });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (k: string, v: unknown) => setValue((x) => ({ ...x, [k]: v }));
  const fields = Object.keys(initial).filter(
    (k) => !['id', 'aircraftId', 'example', 'archived', 'legs', 'assumptions'].includes(k),
  );
  return (
    <div className="overlay">
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${entity}`}
      >
        <header>
          <div>
            <p className="eyebrow">LOCAL RECORD</p>
            <h2>{entity === 'aircraft' ? 'Aircraft & assumptions' : `Edit ${entity}`}</h2>
          </div>
          <button onClick={onClose} aria-label="Close form">
            ×
          </button>
        </header>
        <p className="muted">
          Blank optional values remain unknown. Enter 0 only when zero is intentional. Currency
          amounts use the selected aircraft currency.
        </p>
        {entity === 'aircraft' && (
          <p className="notice">
            Add insurance, hangar and other fixed costs under Expenses → Recurring plans. Confirm
            the fixed-plan review only when those assumptions are complete. Blank optional
            depreciation, interest and opportunity costs are excluded.
          </p>
        )}
        {entity === 'flights' && (
          <p className="notice">
            Only the selected time basis is used. Record actual fuel purchases and trip fees
            separately in Expenses and link them to this flight.
          </p>
        )}
        {entity === 'trips' && (
          <p className="notice">
            Blank burn or price uses the aircraft assumption. Taxi fuel and fees are totals for the
            entire trip, including return. Reserve fuel is carried, not consumed. Saving captures
            the current aircraft and fixed-plan assumptions; editing and saving refreshes that
            snapshot.
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError('');
            try {
              const parsed = schemas[entity].safeParse(value);
              if (!parsed.success)
                throw Error(
                  parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'),
                );
              await onSave(parsed.data);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Save failed');
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="form-grid">
            {fields.map((k) => {
              const v = value[k];
              const linked =
                k === 'flightId'
                  ? snapshot.flights
                      .filter((f) => f.aircraftId === value.aircraftId)
                      .map((f) => ({
                        id: f.id,
                        label: `${f.date} ${f.departure} → ${f.destination}`,
                      }))
                  : k === 'planId'
                    ? snapshot.recurring
                        .filter((p) => p.aircraftId === value.aircraftId)
                        .map((p) => ({ id: p.id, label: p.description }))
                    : null;
              return (
                <label key={k} className={typeof v === 'boolean' ? 'check-field' : ''}>
                  <span>{readable(k)}</span>
                  {typeof v === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={v}
                      onChange={(e) => update(k, e.target.checked)}
                    />
                  ) : linked ? (
                    <select
                      value={String(v ?? '')}
                      onChange={(e) => update(k, e.target.value || null)}
                    >
                      <option value="">None</option>
                      {linked.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : choices[k] ? (
                    <select value={String(v ?? '')} onChange={(e) => update(k, e.target.value)}>
                      {choices[k].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : k === 'notes' ? (
                    <textarea value={String(v ?? '')} onChange={(e) => update(k, e.target.value)} />
                  ) : (
                    <input
                      aria-label={readable(k)}
                      type={numberKeys.has(k) ? 'number' : dateKeys.has(k) ? 'date' : 'text'}
                      step={numberKeys.has(k) ? 'any' : undefined}
                      min={numberKeys.has(k) ? 0 : undefined}
                      list={k === 'category' ? 'category-list' : undefined}
                      placeholder={v === null ? 'Unknown / not configured' : undefined}
                      value={String(v ?? '')}
                      onChange={(e) =>
                        update(
                          k,
                          numberKeys.has(k)
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : dateKeys.has(k) || k === 'period'
                              ? e.target.value || null
                              : e.target.value,
                        )
                      }
                    />
                  )}
                </label>
              );
            })}
          </div>
          <datalist id="category-list">
            {['All', ...categories].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </datalist>
          {entity === 'trips' && (
            <div className="legs">
              <h3>Flight legs</h3>
              {(value.legs as Trip['legs']).map((l, i) => (
                <div className="leg" key={i}>
                  {(['departure', 'destination', 'hours'] as const).map((k) => (
                    <label key={k}>
                      {readable(k)}
                      <input
                        aria-label={`Leg ${i + 1} ${k}`}
                        type={k === 'hours' ? 'number' : 'text'}
                        min={0.01}
                        step="any"
                        value={l[k]}
                        onChange={(e) =>
                          update(
                            'legs',
                            (value.legs as Trip['legs']).map((x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    [k]: k === 'hours' ? Number(e.target.value) : e.target.value,
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={(value.legs as Trip['legs']).length === 1}
                    onClick={() =>
                      update(
                        'legs',
                        (value.legs as Trip['legs']).filter((_, j) => i !== j),
                      )
                    }
                  >
                    Remove leg
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update('legs', [
                    ...(value.legs as Trip['legs']),
                    { departure: '', destination: '', hours: 1 },
                  ])
                }
              >
                Add leg
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save record'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
