import { useState } from 'react';
import { api } from '../api';
import { Panel } from '../components/common';
import type { Snapshot } from '../domain/models';
export function Settings({
  s,
  run,
}: {
  s: Snapshot;
  run: (fn: () => Promise<unknown>, message: string) => void;
}) {
  const [support, setSupport] = useState(s.settings.supportUrl ?? '');
  return (
    <>
      <Panel
        title="Your data stays with you"
        sub="No accounts, cloud synchronization, telemetry, or subscriptions."
      >
        <p>
          Records and receipt files are stored together in a local SQLite database under your
          Windows application data folder (%APPDATA%/FlightCost). Backups are portable between
          compatible FlightCost installations.
        </p>
        <div className="actions">
          <button
            className="primary"
            onClick={() => run(() => api.backup(), 'Backup operation finished')}
          >
            Create verified backup
          </button>
          <button onClick={() => run(() => api.restore(), 'Restore operation finished')}>
            Restore backup…
          </button>
          <button onClick={() => run(() => api.exportData(), 'JSON export finished')}>
            Export all records (JSON)
          </button>
        </div>
        <p className="notice">
          Restore replaces current records after confirmation and creates a recovery backup first.
          JSON exports include receipt metadata; use a SQLite backup to preserve receipt files.
          Backups are not encrypted—store them somewhere private.
        </p>
      </Panel>
      <Panel title="Appearance">
        <div className="actions">
          {['dark', 'light'].map((theme) => (
            <button
              key={theme}
              className={s.settings.theme === theme ? 'primary' : ''}
              onClick={() => run(() => api.setting('theme', theme), 'Theme saved')}
            >
              {theme === 'dark' ? 'Dark cockpit' : 'Light mode'}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="About FlightCost">
        <p className="eyebrow">VERSION 0.9.0 · LOCAL PREVIEW</p>
        <h2>Know what your flying really costs.</h2>
        <p>Developed by The Thrifty Pilot</p>
        <button
          onClick={() =>
            run(() => api.external('https://www.thethriftypilot.com'), 'Website opened')
          }
        >
          Visit The Thrifty Pilot ↗
        </button>
        <p>
          FlightCost is a budgeting and ownership organization tool. It is not an official aircraft
          maintenance logbook or a source of airworthiness, regulatory, or navigation
          determinations.
        </p>
        <label>
          Optional support URL (HTTPS)
          <input
            type="url"
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            placeholder="No support link configured"
          />
        </label>
        <div className="actions">
          <button
            onClick={() => run(() => api.setting('supportUrl', support), 'Support link saved')}
          >
            Save link
          </button>
          {s.settings.supportUrl && (
            <button
              onClick={() => run(() => api.external(s.settings.supportUrl), 'Support link opened')}
            >
              Support this project ↗
            </button>
          )}
        </div>
      </Panel>
    </>
  );
}
