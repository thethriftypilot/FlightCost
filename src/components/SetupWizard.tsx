import { useState } from 'react';
import { economics } from '../domain/finance';
import {
  type Aircraft,
  aircraftSchema,
  newAircraft,
  type Recurring,
  recurringSchema,
  today,
} from '../domain/models';
import { money } from './common';

type SetupCosts = {
  insurance: number | null;
  hangar: number | null;
  maintenance: number | null;
  other: number | null;
};
export function SetupWizard({
  onSave,
  onClose,
}: {
  onSave: (a: Aircraft, plans: Recurring[]) => Promise<void>;
  onClose: () => void;
}) {
  const [a, setA] = useState(newAircraft),
    [step, setStep] = useState(0),
    [costs, setCosts] = useState<SetupCosts>({
      insurance: null,
      hangar: null,
      maintenance: null,
      other: null,
    }),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const set = (key: keyof Aircraft, value: unknown) => setA((old) => ({ ...old, [key]: value }));
  const numberField = (label: string, key: keyof Aircraft) => (
    <label key={key}>
      {label}
      <input
        type="number"
        min="0"
        step="any"
        value={String(a[key] ?? '')}
        placeholder="Unknown / skip"
        onChange={(e) => set(key, e.target.value === '' ? null : Number(e.target.value))}
      />
    </label>
  );
  const textField = (label: string, key: keyof Aircraft, type = 'text') => (
    <label key={key}>
      {label}
      <input
        type={type}
        value={String(a[key] ?? '')}
        onChange={(e) => set(key, type === 'date' ? e.target.value || null : e.target.value)}
      />
    </label>
  );
  const selectField = (label: string, key: keyof Aircraft, options: string[]) => (
    <label key={key}>
      {label}
      <select value={String(a[key])} onChange={(e) => set(key, e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  const plans = (
    [
      ['insurance', 'Insurance', 'Annual', true],
      ['hangar', 'Hangar', 'Monthly', true],
      ['maintenance', 'Routine maintenance', 'Annual', false],
      ['other', 'Other ownership', 'Annual', true],
    ] as const
  ).flatMap(([key, description, frequency, fixed]) =>
    costs[key] === null
      ? []
      : [
          {
            id: crypto.randomUUID(),
            aircraftId: a.id,
            description,
            category: description,
            amount: costs[key]!,
            frequency,
            start: `${today().slice(0, 4)}-01-01`,
            end: null,
            fixed,
            kind: 'Operating' as const,
          },
        ],
  );
  const estimates = economics(a, plans, today());
  return (
    <div className="overlay">
      <section className="modal" role="dialog" aria-modal="true" aria-label="Aircraft setup">
        <header>
          <div>
            <p className="eyebrow">WELCOME ABOARD · YOUR DATA STAYS LOCAL</p>
            <h2>
              {
                [
                  'Your aircraft',
                  'Ownership & operating assumptions',
                  'Review your starting point',
                ][step]
              }
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close setup">
            ×
          </button>
        </header>
        <div className="steps">
          {['Aircraft', 'Ownership', 'Review'].map((s, i) => (
            <span key={s} style={{ opacity: i === step ? 1 : 0.5 }}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
        <p className="muted">
          Only the aircraft name is required. Blank costs remain unknown. You can edit every
          assumption later.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (step < 2) {
              if (!a.name.trim()) {
                setError('Enter an aircraft name.');
                return;
              }
              setStep(step + 1);
              return;
            }
            setSaving(true);
            try {
              const parsed = aircraftSchema.parse(a),
                checked = plans.map((p) => recurringSchema.parse(p));
              await onSave(parsed, checked);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Setup could not be saved.');
            } finally {
              setSaving(false);
            }
          }}
        >
          {step === 0 && (
            <div className="form-grid">
              {textField('Aircraft nickname', 'name')}
              {textField('Manufacturer', 'manufacturer')}
              {textField('Model', 'model')}
              {numberField('Year', 'year')}
              {textField('Registration (optional)', 'registration')}
              {textField('Category', 'category')}
              {textField('Engine type (optional)', 'engineType')}
              {numberField('Number of engines', 'engines')}
              {textField('Fuel type', 'fuelType')}
              {numberField('Fuel capacity (optional)', 'capacity')}
              {numberField('Typical cruise fuel burn / hour', 'fuelBurn')}
              {selectField('Fuel quantity unit', 'unit', ['US gal', 'L'])}
              {selectField('Preferred flight-hour basis', 'basis', ['Manual', 'Hobbs', 'Tach'])}
              {selectField('Currency', 'currency', ['USD', 'CAD', 'EUR', 'GBP'])}
            </div>
          )}
          {step === 1 && (
            <>
              <div className="form-grid">
                {numberField('Purchase price (optional)', 'purchasePrice')}
                {textField('Ownership start date', 'startDate', 'date')}
                {numberField('Expected annual flight hours', 'annualHours')}
                {numberField('Typical fuel price', 'fuelPrice')}
                {selectField('Fuel price unit', 'priceUnit', ['US gal', 'L'])}
                {numberField('Oil allowance / hour', 'oil')}
                {numberField('Maintenance allowance / hour', 'maintenance')}
                {numberField('Engine reserve / hour', 'engine')}
                {numberField('Propeller reserve / hour', 'propeller')}
                {numberField('Other use-based allowance / hour', 'other')}
                {(
                  [
                    ['insurance', 'Annual insurance'],
                    ['hangar', 'Monthly hangar / tie-down'],
                    ['maintenance', 'Planned annual maintenance cash'],
                    ['other', 'Other annual fixed expenses'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unknown / skip"
                      value={costs[key] ?? ''}
                      onChange={(e) =>
                        setCosts((old) => ({
                          ...old,
                          [key]: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="notice">
                Entered fixed costs become recurring plans starting January 1 of the current year;
                you can change their dates afterward. Planned maintenance cash is separate from
                hourly maintenance economics. No actual payments are created.
              </p>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={a.fixedConfirmed}
                  onChange={(e) => set('fixedConfirmed', e.target.checked)}
                />
                These fixed ownership assumptions are complete, including any intentional zeros.
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <dl>
                <div>
                  <dt>Aircraft</dt>
                  <dd>
                    {a.name} · {a.manufacturer} {a.model}
                  </dd>
                </div>
                <div>
                  <dt>Currency / quantity unit</dt>
                  <dd>
                    {a.currency} / {a.unit}
                  </dd>
                </div>
                <div>
                  <dt>Expected annual hours</dt>
                  <dd>{a.annualHours ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt>Recurring plans to create</dt>
                  <dd>{plans.length}</dd>
                </div>
                <div>
                  <dt>Annual fixed run rate</dt>
                  <dd>{money(estimates.fixed, a.currency)}</dd>
                </div>
                <div>
                  <dt>Estimated fully loaded / hour</dt>
                  <dd>{money(estimates.loaded, a.currency)}</dd>
                </div>
              </dl>
              <p className="notice">
                {estimates.missing.length
                  ? `Still unknown: ${estimates.missing.join(', ')}. You can finish now and fill these in later.`
                  : 'Your initial operating assumptions are complete.'}
              </p>
              <p className="muted">
                Finish creates your profile and plans together in the local database. No example
                payments or flight history will be added.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer>
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" disabled={saving}>
              {saving ? 'Saving…' : step === 2 ? 'Finish setup' : 'Next'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
