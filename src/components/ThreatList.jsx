// src/components/ThreatList.jsx
import { useApp } from '../context/AppContext.jsx';
import { SEV_RANK } from '../services/normalize.js';
import { getReadSet } from '../services/readStore.js';
import ThreatCard from './ThreatCard.jsx';
import { SearchIcon, ShieldIcon } from '../assets/icons.jsx';
import Tooltip from './Tooltip.jsx';

export default function ThreatList() {
  const { state, dispatch } = useApp();

  // readRev ensures this component re-renders on read status change
  void state.readRev;
  const readSet = getReadSet();

  // ── Filter pipeline ───────────────────────────────────
  let items = state.threats;

  // 1. Severity filter
  if (state.sevFilter !== 'all') {
    items = items.filter(t => t.severity === state.sevFilter);
  }

  // 2. Read filter
  if (state.readFilter === 'unread') {
    items = items.filter(t => !readSet.has(String(t.id)));
  } else if (state.readFilter === 'read') {
    items = items.filter(t => readSet.has(String(t.id)));
  }

  // 3. Search
  const q = (state.searchQuery || '').toLowerCase().trim();
  if (q) {
    items = items.filter(t =>
      (t.title       || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.tags        || []).join(' ').toLowerCase().includes(q) ||
      (t.iocs        || []).some(i => i.value.toLowerCase().includes(q)) ||
      (t.source      || '').toLowerCase().includes(q)
    );
  }

  // 4. Sort
  items = [...items].sort((a, b) => {
    switch (state.sortBy) {
      case 'severity':  return (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0);
      case 'date':      return new Date(b.date) - new Date(a.date);
      case 'ioc_count': return (b.iocs?.length ?? 0) - (a.iocs?.length ?? 0);
      case 'title':     return (a.title ?? '').localeCompare(b.title ?? '');
      default:          return 0;
    }
  });

  // Unread count in current filtered view
  const unreadInView = items.filter(t => !readSet.has(String(t.id))).length;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="search-bar">
          <SearchIcon width={14} height={14} />
          <input
            value={state.searchQuery}
            onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
            placeholder="Search records, IOCs, CVEs, sources, tags…"
            aria-label="Search intel records"
          />
        </div>
        <div className="toolbar-right">
          <Tooltip tip="Change the sort order of the threat list" placement="bottom">
            <select
              className="form-select"
              style={{ fontSize:12 }}
              value={state.sortBy}
              onChange={e => dispatch({ type: 'SET_SORT', payload: e.target.value })}
              aria-label="Sort by"
            >
              <option value="severity">Sort: Severity</option>
              <option value="date">Sort: Date</option>
              <option value="ioc_count">Sort: IOC Count</option>
              <option value="title">Sort: Title A–Z</option>
            </select>
          </Tooltip>
          <span className="result-count">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {unreadInView > 0 && (
              <span style={{ marginLeft:6, color:'var(--blue)', fontWeight:600 }}>
                · {unreadInView} unread
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ── Cards or empty state ── */}
      <div className="threat-list">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ShieldIcon width={24} height={24} />
            </div>
            <div className="empty-title">
              {state.threats.length === 0 ? 'No Records Yet'
               : state.readFilter === 'unread' ? 'All Caught Up'
               : 'No Results'}
            </div>
            <div className="empty-body">
              {state.threats.length === 0
                ? <>Click <strong>Sync All Feeds Now</strong> to pull live intelligence, or load Demo Data from Settings.</>
                : state.readFilter === 'unread'
                ? 'All visible entries have been read.'
                : 'Try adjusting your search query or filters.'}
            </div>
          </div>
        ) : (
          items.map((t, i) => (
            <ThreatCard key={t.id} threat={t} delay={Math.min(i * 10, 100)} />
          ))
        )}
      </div>
    </div>
  );
}
