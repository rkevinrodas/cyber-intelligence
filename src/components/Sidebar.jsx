// src/components/Sidebar.jsx
// Focused sidebar: severity filters + read/unread filter + export only.
// DB info lives exclusively in Settings.
import { useApp } from '../context/AppContext.jsx';
import { getReadSet } from '../services/readStore.js';
import { DownloadIcon } from '../assets/icons.jsx';
import Tooltip from './Tooltip.jsx';

const SEV_FILTERS = [
  { key:'all',      label:'All Intel',  dot:'d-all',  activeClass:'active-all' },
  { key:'critical', label:'Critical',     dot:'d-crit', activeClass:'active-critical' },
  { key:'high',     label:'High',         dot:'d-high', activeClass:'active-high' },
  { key:'medium',   label:'Medium',       dot:'d-med',  activeClass:'active-medium' },
  { key:'low',      label:'Low',          dot:'d-low',  activeClass:'active-low' },
  { key:'news',     label:'News / Intel', dot:'d-news', activeClass:'active-news' },
];

const READ_FILTERS = [
  { key:'all',    label:'All Entries',  icon:'⊙' },
  { key:'unread', label:'Unread Only',  icon:'●' },
  { key:'read',   label:'Read Only',    icon:'○' },
];

export default function Sidebar() {
  const { state, dispatch, exportJSON, exportCSV } = useApp();

  // Severity counts
  const counts = { all: state.threats.length, critical:0, high:0, medium:0, low:0, news:0 };
  state.threats.forEach(t => { if (counts[t.severity] !== undefined) counts[t.severity]++; });

  // Read/unread counts — derived from readStore each render (readRev drives re-render)
  const readSet   = getReadSet();
  const readCount   = state.threats.filter(t => readSet.has(String(t.id))).length;
  const unreadCount = state.threats.length - readCount;

  return (
    <aside className="sidebar">

      {/* ── Severity ── */}
      <div>
        <div className="sidebar-section-title">Severity</div>
        {SEV_FILTERS.map(f => (
          <Tooltip key={f.key} tip={`Show ${f.label.toLowerCase()}`} placement="right">
            <button
              className={`filter-btn${state.sevFilter === f.key ? ` ${f.activeClass}` : ''}`}
              onClick={() => dispatch({ type: 'SET_SEV_FILTER', payload: f.key })}
            >
              <span className="filter-label">
                <span className={`filter-dot ${f.dot}`} />
                {f.label}
              </span>
              <span className="filter-count">{counts[f.key] ?? 0}</span>
            </button>
          </Tooltip>
        ))}
      </div>

      {/* ── Read Status ── */}
      <div>
        <div className="sidebar-section-title">Read Status</div>
        {READ_FILTERS.map(f => (
          <Tooltip key={f.key}
            tip={f.key === 'all'    ? 'Show all intel records regardless of read status'
               : f.key === 'unread' ? 'Show only entries you have not yet opened'
               : 'Show only entries you have already read'}
            placement="right"
          >
            <button
              className={`filter-btn${state.readFilter === f.key ? ' active-all' : ''}`}
              onClick={() => dispatch({ type: 'SET_READ_FILTER', payload: f.key })}
            >
              <span className="filter-label">
                <span style={{
                  fontSize: 10, width: 7, height: 7,
                  color: f.key === 'unread' ? 'var(--blue)' : f.key === 'read' ? 'var(--text-tertiary)' : 'var(--blue)',
                  flexShrink: 0,
                }}>{f.icon}</span>
                {f.label}
              </span>
              <span className="filter-count">
                {f.key === 'all' ? state.threats.length
                 : f.key === 'unread' ? unreadCount
                 : readCount}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>

      {/* ── Export ── */}
      <div>
        <div className="sidebar-section-title flex-row" style={{ gap:5 }}>
          <DownloadIcon width={11} height={11} />
          Export
        </div>
        <Tooltip tip="Export intel records matching the current filter as JSON" placement="right">
          <button className="btn btn-secondary btn-full btn-sm" onClick={exportJSON}>
            Export Filtered JSON
          </button>
        </Tooltip>
        <Tooltip tip="Export intel records matching the current filter as CSV (includes CVSS, IOCs, threat actors)" placement="right">
          <button className="btn btn-secondary btn-full btn-sm mt-2" onClick={exportCSV}>
            Export Filtered CSV
          </button>
        </Tooltip>
      </div>

    </aside>
  );
}
