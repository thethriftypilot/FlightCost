import {
  BookOpen,
  ChartNoAxesCombined,
  Gauge,
  Plane,
  Plus,
  Receipt,
  Route,
  Settings as SettingsIcon,
  ShieldCheck,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from './api';
import { Empty, Panel } from './components/common';
import { RecordForm } from './components/RecordForm';
import { SetupWizard } from './components/SetupWizard';
import { type Entity, newRecord, type RecordValue, type Snapshot } from './domain/models';
import { Dashboard } from './pages/Dashboard';
import { Records } from './pages/Records';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const navigation = [
  ['Dashboard', Gauge],
  ['Aircraft', Plane],
  ['Flights', BookOpen],
  ['Expenses', Receipt],
  ['Trip Calculator', Route],
  ['Maintenance', Wrench],
  ['Budgets', Wallet],
  ['Reports', ChartNoAxesCombined],
  ['Settings', SettingsIcon],
] as const;
const pageEntities: Record<string, Entity> = {
  Aircraft: 'aircraft',
  Flights: 'flights',
  Expenses: 'expenses',
  'Trip Calculator': 'trips',
  Maintenance: 'maintenance',
  Budgets: 'budgets',
};
export function App() {
  const [s, setS] = useState<Snapshot | null>(null),
    [active, setActive] = useState(''),
    [page, setPage] = useState('Dashboard'),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState<{ entity: Entity; value: RecordValue } | null>(null),
    [expenseTab, setExpenseTab] = useState('Payments'),
    [setup, setSetup] = useState(false);
  async function refresh() {
    const data = await api.snapshot();
    setS(data);
    setActive((old) =>
      data.aircraft.some((a) => a.id === old)
        ? old
        : (data.aircraft.find((a) => a.id === data.settings.activeAircraft && !a.archived)?.id ??
          data.aircraft.find((a) => !a.archived)?.id ??
          ''),
    );
  }
  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = s?.settings.theme ?? 'dark';
  }, [s?.settings.theme]);
  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await fn();
      await refresh();
      setMessage(result === false || result === null ? 'Operation canceled' : msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const a = s?.aircraft.find((x) => x.id === active);
  function edit(entity: Entity, value: RecordValue) {
    setForm({ entity, value });
  }
  function add(entity: Entity) {
    const value = newRecord(entity, active);
    if (entity === 'flights' && a && 'basis' in value) {
      value.basis = a.basis;
      if ('fuelUnit' in value) value.fuelUnit = a.unit;
    }
    edit(entity, value);
  }
  const selectedEntity =
    page === 'Expenses' && expenseTab === 'Recurring plans' ? 'recurring' : pageEntities[page];
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Plane size={24} />
          </span>
          <div>
            FlightCost<small>THE THRIFTY PILOT</small>
          </div>
        </div>
        <p className="nav-label">OWNERSHIP DESK</p>
        <nav>
          {navigation.map(([label, Icon]) => (
            <button
              className={page === label ? 'nav active' : 'nav'}
              key={label}
              onClick={() => {
                setPage(label);
                setMessage('');
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="local">
          <ShieldCheck size={20} />
          <div>
            Local by design<small>Your records. Your computer.</small>
          </div>
        </div>
        <div className="version">0.9.0 · Preview</div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">FLIGHTCOST / {page.toUpperCase()}</p>
            <h1>{page}</h1>
          </div>
          <div className="aircraft-select">
            <span className="status-dot" />
            <label>
              <span>ACTIVE AIRCRAFT</span>
              <select
                aria-label="Active aircraft"
                value={active}
                onChange={(e) => {
                  setActive(e.target.value);
                  void api
                    .setting('activeAircraft', e.target.value)
                    .catch((e) => setError(String(e)));
                }}
              >
                <option value="" disabled>
                  Select aircraft
                </option>
                {s?.aircraft
                  .filter((x) => !x.archived || x.id === active)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.archived ? ' [ARCHIVED]' : ''}
                      {x.example ? ' [EXAMPLE]' : ''}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </header>
        <div className="content">
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => setError('')}>Dismiss</button>
            </div>
          )}
          {message && (
            <div role="status" className="success">
              {message}
            </div>
          )}
          {busy && (
            <div role="status" className="notice">
              Working…
            </div>
          )}
          {!s ? (
            <Empty>
              {error
                ? 'Unable to load data. Restart the application or consult the recovery instructions.'
                : 'Opening your local ownership records…'}
            </Empty>
          ) : (
            <>
              {a?.example && (
                <div className="example-banner">
                  FICTIONAL EXAMPLE · Assumed values, not verified aircraft specifications or market
                  costs. Reports remain separate from real profiles.
                </div>
              )}
              {!a && page !== 'Settings' && page !== 'Aircraft' && (
                <section className="welcome">
                  <p className="eyebrow">WELCOME ABOARD</p>
                  <h2>
                    A clearer picture of
                    <br />
                    aircraft ownership.
                  </h2>
                  <p>
                    Start with your aircraft. Add only what you know.
                    <br />
                    Your records stay on this computer, with no account required.
                  </p>
                  <div className="steps">
                    <span>01 · Aircraft profile</span>
                    <span>02 · Operating assumptions</span>
                    <span>03 · Fixed cost plans</span>
                  </div>
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => {
                        setSetup(true);
                      }}
                    >
                      Set up my aircraft
                    </button>
                    <button
                      onClick={() =>
                        run(async () => {
                          const id = await api.demo();
                          setActive(id);
                        }, 'Fictional example created')
                      }
                    >
                      Explore fictional Warrior
                    </button>
                  </div>
                </section>
              )}
              {page === 'Settings' && <Settings s={s} run={run} />}
              {page === 'Aircraft' && (
                <>
                  <div className="toolbar">
                    <p className="muted">Manage aircraft and explicit operating assumptions.</p>
                    <button className="primary" onClick={() => add('aircraft')}>
                      <Plus size={16} />
                      Add aircraft
                    </button>
                  </div>
                  {s.aircraft.map((x) => (
                    <Panel
                      key={x.id}
                      title={x.name}
                      sub={`${x.manufacturer} ${x.model} · ${x.currency} · ${x.example ? 'Fictional example' : 'Personal aircraft'}${x.archived ? ' · Archived' : ''}`}
                    >
                      <div className="actions">
                        <button onClick={() => edit('aircraft', x)}>
                          Edit profile & assumptions
                        </button>
                        <button
                          onClick={() =>
                            run(
                              () => api.save('aircraft', { ...x, archived: !x.archived }),
                              x.archived ? 'Aircraft restored' : 'Aircraft archived',
                            )
                          }
                        >
                          {x.archived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button
                          onClick={() =>
                            edit('aircraft', {
                              ...x,
                              id: crypto.randomUUID(),
                              name: `${x.name}{x.archived ? ' [ARCHIVED]' : ''} (copy)`,
                              fixedConfirmed: false,
                              archived: false,
                            })
                          }
                        >
                          Duplicate assumptions
                        </button>
                        <button
                          onClick={() => {
                            setActive(x.id);
                            setPage('Reports');
                          }}
                        >
                          View reports
                        </button>
                      </div>
                      <p className="muted">
                        Duplication copies aircraft assumptions only. It does not duplicate fixed
                        plans, payments or flight history.
                      </p>
                    </Panel>
                  ))}
                </>
              )}
              {a && page === 'Dashboard' && <Dashboard a={a} s={s} add={add} />}
              {a && page === 'Reports' && <Reports a={a} s={s} run={run} />}
              {a && selectedEntity && page !== 'Aircraft' && (
                <>
                  <div className="toolbar">
                    {page === 'Expenses' ? (
                      <div className="segments">
                        {['Payments', 'Recurring plans'].map((t) => (
                          <button
                            className={expenseTab === t ? 'selected' : ''}
                            key={t}
                            onClick={() => setExpenseTab(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">
                        {page === 'Trip Calculator'
                          ? 'Save a route and inspect its complete cost breakdown.'
                          : page === 'Maintenance'
                            ? 'Your own date and engine-hour reminders.'
                            : 'Records for the selected aircraft.'}
                      </p>
                    )}
                    <div className="actions">
                      {page === 'Expenses' && expenseTab === 'Payments' && (
                        <>
                          <button
                            onClick={() => run(() => api.importCsv(a.id), 'CSV import finished')}
                          >
                            Import CSV
                          </button>
                          <button
                            onClick={() => run(() => api.exportCsv(a.id), 'CSV export finished')}
                          >
                            Export CSV
                          </button>
                        </>
                      )}
                      <button className="primary" onClick={() => add(selectedEntity)}>
                        <Plus size={16} />
                        Add{' '}
                        {selectedEntity === 'recurring'
                          ? 'plan'
                          : selectedEntity === 'trips'
                            ? 'trip'
                            : selectedEntity === 'maintenance'
                              ? 'reminder'
                              : selectedEntity.slice(0, -1)}
                      </button>
                    </div>
                  </div>
                  <Records
                    key={selectedEntity + a.id}
                    entity={selectedEntity}
                    a={a}
                    s={s}
                    edit={edit}
                    remove={(e, id) => run(() => api.remove(e, id), 'Record deleted')}
                    action={(name, id) =>
                      run(
                        () =>
                          name === 'receipt'
                            ? api.receipt(id)
                            : name === 'tripReport'
                              ? api.tripReport(id, 'pdf')
                              : name === 'tripPrint'
                                ? api.tripReport(id, 'print')
                                : api.saveReceipt(id),
                        'File operation finished',
                      )
                    }
                  />
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            Developed by The Thrifty Pilot <span>Offline · Private · Portable</span>
          </footer>
        </div>
      </main>
      {setup && (
        <SetupWizard
          onClose={() => setSetup(false)}
          onSave={async (a, plans) => {
            const id = await api.setup(a, plans);
            setActive(id);
            setPage('Dashboard');
            await refresh();
            setMessage('Your aircraft and plans are saved. Welcome to FlightCost.');
          }}
        />
      )}
      {s && form && (
        <RecordForm
          key={form.value.id}
          entity={form.entity}
          initial={form.value}
          snapshot={s}
          onClose={() => setForm(null)}
          onSave={async (value) => {
            await api.save(form.entity, value);
            if (form.entity === 'aircraft') {
              setActive(value.id);
              await api.setting('activeAircraft', value.id);
              setMessage('Aircraft assumptions saved.');
            } else setMessage('Record saved');
            await refresh();
          }}
        />
      )}
    </div>
  );
}
