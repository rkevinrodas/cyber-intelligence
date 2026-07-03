// src/components/FirstRunDialog.jsx
// Shown on first launch or whenever the database is empty.
import { useApp } from '../context/AppContext.jsx';
import { ShieldIcon, DatabaseIcon, SyncIcon, GlobeIcon } from '../assets/icons.jsx';

export default function FirstRunDialog() {
  const { state, dispatch, syncNow, loadDemo } = useApp();

  if (!state.showFirstRun) return null;

  const dismiss = () => {
    try { localStorage.setItem('ci_first_run_done', '1'); } catch { /* storage full */ }
    dispatch({ type: 'SET_FIRST_RUN', payload: false });
  };

  const handleSync = () => { dismiss(); syncNow(); };
  const handleDemo = () => { dismiss(); loadDemo(); };

  const isEmpty = state.threats.length === 0 && localStorage.getItem('ci_first_run_done') === '1';

  return (
    <div className="first-run-overlay">
      <div className="first-run-dialog" role="dialog" aria-modal="true" aria-label="Welcome">

        <div className="first-run-header">
          <div className="first-run-icon">
            <ShieldIcon width={28} height={28} />
          </div>
          <h1 className="first-run-title">
            {isEmpty ? 'Database is Empty' : 'Welcome to CyberIntelligence'}
          </h1>
          <p className="first-run-sub">
            {isEmpty
              ? 'This dialog appears when there is no data in the database or when running for the first time. Pull a fresh set of intelligence records to get started again.'
              : 'A local, open-source threat intelligence workstation. Every record stays on this device — nothing leaves your machine.'}
          </p>
        </div>

        <div className="first-run-body">
          <div className="first-run-feature">
            <div className="first-run-feature-icon"><GlobeIcon width={16} height={16} /></div>
            <div className="first-run-feature-text">
              <strong>Eight live intelligence sources</strong>
              <span>Pulls advisories and threat reports from CISA, SANS ISC, Bleeping Computer, Krebs on Security, and others — always from the original publishers.</span>
            </div>
          </div>
          <div className="first-run-feature">
            <div className="first-run-feature-icon"><DatabaseIcon width={16} height={16} /></div>
            <div className="first-run-feature-text">
              <strong>Fully local storage</strong>
              <span>Records are kept in your browser's built-in IndexedDB. They persist across sessions and are removed automatically once they pass your configured retention window.</span>
            </div>
          </div>
          <div className="first-run-feature">
            <div className="first-run-feature-icon"><SyncIcon width={16} height={16} /></div>
            <div className="first-run-feature-text">
              <strong>You control every fetch</strong>
              <span>Kick off a refresh whenever you like, or enable scheduled fetching in Settings to run it quietly at a set time each day.</span>
            </div>
          </div>
        </div>

        <div className="first-run-footer">
          <button className="btn btn-primary btn-full" onClick={handleSync}>
            <SyncIcon width={14} height={14} />
            Fetch Live Intelligence
          </button>
          <button className="btn btn-secondary btn-full" onClick={handleDemo}>
            Load Sample Records — Explore First
          </button>
          <button className="btn btn-ghost btn-full" style={{ fontSize:12 }} onClick={dismiss}>
            Skip — I'll fetch records manually
          </button>
          <p className="first-run-privacy">
            🔒 This dialog appears on first run and whenever the database is empty. Your settings and feed preferences are preserved across sessions.
          </p>
        </div>

      </div>
    </div>
  );
}
