// src/components/StatsBar.jsx
import { useApp } from '../context/AppContext.jsx';
import Tooltip from './Tooltip.jsx';

const CELLS = [
  { key:'all',      label:'All Threats', vClass:'v-all',      bClass:'b-all',      tip:'Total intelligence records in local database. Click to show all.' },
  { key:'critical', label:'Critical',    vClass:'v-critical',  bClass:'b-critical', tip:'CVSS ≥9.0 or confirmed active exploitation. Immediate action required.' },
  { key:'high',     label:'High',        vClass:'v-high',      bClass:'b-high',     tip:'CVSS 7.0–8.9 — significant risk. Patch or mitigate promptly.' },
  { key:'medium',   label:'Medium',      vClass:'v-medium',    bClass:'b-medium',   tip:'CVSS 4.0–6.9 — moderate risk. Schedule for upcoming maintenance window.' },
  { key:'low',      label:'Low',         vClass:'v-low',       bClass:'b-low',      tip:'CVSS < 4.0 — low immediate risk. Monitor and patch in routine cycle.' },
  { key:'news',     label:'News / Intel',vClass:'v-news',      bClass:'b-news',     tip:'Informational intelligence and security news with no confirmed CVE or exploit.' },
];

export default function StatsBar() {
  const { state, dispatch } = useApp();

  const counts = { all: state.threats.length, critical:0, high:0, medium:0, low:0, news:0 };
  state.threats.forEach(t => { if (counts[t.severity] !== undefined) counts[t.severity]++; });
  const tot = counts.all || 1;

  const setFilter = key => dispatch({ type:'SET_SEV_FILTER', payload: key });

  return (
    <div className="stats-bar">
      {CELLS.map(c => (
        <Tooltip key={c.key} tip={c.tip}>
          <div
            className={`stat-cell${state.sevFilter === c.key ? ' selected' : ''}`}
            onClick={() => setFilter(c.key)}>
            <div className="stat-label">{c.label}</div>
            <div className={`stat-value ${c.vClass}`}>{counts[c.key] ?? 0}</div>
            <div className="stat-track">
              <div className={`stat-bar ${c.bClass}`}
                style={{ width: c.key === 'all' ? '100%' : `${Math.round((counts[c.key]/tot)*100)}%` }} />
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
