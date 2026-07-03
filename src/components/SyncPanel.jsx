// src/components/SyncPanel.jsx
// Intelligence source toggles, custom URL ingest, sync controls, feed status table.
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { FEEDS } from '../services/feeds.js';
import { SyncIcon, InfoIcon, ChevronDownIcon } from '../assets/icons.jsx';
import Tooltip from './Tooltip.jsx';

const BADGE_COLORS = {
  'News':        'var(--text-tertiary)',
  'Threat Intel':'var(--c-medium)',
  'Gov Advisory':'var(--c-high)',
  'Investigative':'var(--blue)',
  'Enterprise':  'var(--text-secondary)',
  'Broad Intel': 'var(--text-secondary)',
  'Research':    'var(--blue)',
};

export default function SyncPanel() {
  const { state, dispatch, syncNow, manualIngest } = useApp();
  const [type,      setType]      = useState('rss');
  const [url,       setUrl]       = useState('');
  const [showTable, setShowTable] = useState(false);
  const [expanded,  setExpanded]  = useState(false);

  const { syncing, syncProgress, enabledFeeds, feedStatuses } = state;

  const lastSync = localStorage.getItem('ci_last_sync') || 'Never';
  const nextSync = state.settings.autoSyncEnabled
    ? `Scheduled daily at ${state.settings.syncTime || '08:00'}`
    : 'Auto-sync off — sync manually';

  const toggleFeed = key => {
    const next = new Set(enabledFeeds);
    next.has(key) ? next.delete(key) : next.add(key);
    dispatch({ type: 'SET_ENABLED_FEEDS', payload: next });
  };

  const selectAll   = () => dispatch({ type:'SET_ENABLED_FEEDS', payload: new Set(Object.keys(FEEDS)) });
  const deselectAll = () => dispatch({ type:'SET_ENABLED_FEEDS', payload: new Set() });

  const handleIngest = () => {
    if (!url.trim()) return;
    manualIngest(type, url.trim());
    setUrl('');
  };

  const statusColor = s =>
    ({ ok:'var(--green)', err:'var(--c-critical)', loading:'var(--blue)', idle:'var(--text-tertiary)' })[s ?? 'idle'];

  return (
    <section className="sync-panel" aria-label="Intelligence Sources">

      {/* ── Top row ── */}
      <div className="sync-header">
        <div className="flex-row" style={{ gap:8 }}>
          <span className="sync-title">Active Sources</span>
          <span style={{
            fontSize:10, fontWeight:600, padding:'2px 7px',
            background:'var(--blue-bg)', color:'var(--blue)',
            border:'1px solid var(--blue-glow)', borderRadius:12,
          }}>
            {enabledFeeds.size}/{Object.keys(FEEDS).length} active
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Tooltip tip="Timestamp of the last completed sync" placement="bottom">
            <span className="sync-last">Last: <strong>{lastSync}</strong></span>
          </Tooltip>
          <Tooltip tip={nextSync} placement="bottom">
            <span className={`sync-badge ${
              syncing               ? 'running'
              : syncProgress.status === 'done'  ? 'done'
              : syncProgress.status === 'error' ? 'error'
              : 'idle'
            }`}>
              {syncing ? 'Fetching…'
               : syncProgress.status === 'done'  ? 'Up to date'
               : syncProgress.status === 'error' ? 'Partial error'
               : 'Idle'}
            </span>
          </Tooltip>
        </div>
      </div>

      {/* ── Feed source cards ── */}
      <div style={{ marginBottom:10 }}>
        {/* Header row with select all / collapse */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={selectAll}>
            Select All
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={deselectAll}>
            Deselect All
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize:11, marginLeft:'auto', display:'flex', alignItems:'center', gap:4 }}
            onClick={() => setExpanded(v => !v)}
          >
            <ChevronDownIcon width={12} height={12}
              style={{ transform: expanded ? 'rotate(180deg)':'none', transition:'0.15s' }}/>
            {expanded ? 'Collapse' : 'Expand Details'}
          </button>
        </div>

        {/* Feed toggle grid */}
        <div className="feed-toggle-grid">
          {Object.values(FEEDS).map(f => {
            const on      = enabledFeeds.has(f.key);
            const fs      = feedStatuses[f.key] || {};
            const dotCol  = fs.status === 'ok'  ? 'var(--green)'
                          : fs.status === 'err' ? 'var(--c-critical)'
                          : fs.status === 'loading' ? 'var(--blue)'
                          : 'var(--text-tertiary)';
            const badgeCol = BADGE_COLORS[f.badge] ?? 'var(--text-tertiary)';
            return (
              <Tooltip key={f.key}
                tip={on
                  ? `Click to disable — ${f.desc}`
                  : `Click to enable — ${f.desc}`}
                placement="bottom"
              >
                <button
                  className={`feed-source-card${on ? ' enabled' : ''}`}
                  onClick={() => toggleFeed(f.key)}
                  aria-pressed={on}
                  aria-label={`${on ? 'Disable' : 'Enable'} ${f.label}`}
                >
                  {/* Checkbox visual */}
                  <span className={`feed-checkbox${on ? ' checked' : ''}`} aria-hidden="true">
                    {on && (
                      <svg viewBox="0 0 10 10" width="10" height="10" fill="none">
                        <polyline points="1.5,5 4,7.5 8.5,2.5"
                          stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <div className="feed-card-body">
                    <div className="feed-card-top">
                      <span className="feed-card-name">{f.label}</span>
                      <span className="feed-card-badge" style={{ color:badgeCol }}>
                        {f.badge}
                      </span>
                    </div>
                    {expanded && (
                      <div className="feed-card-desc">{f.desc}</div>
                    )}
                    <div className="feed-card-meta">
                      <span style={{ color:dotCol, fontSize:9 }}>●</span>
                      <span style={{ fontSize:10, color:'var(--text-tertiary)' }}>
                        {fs.status === 'ok'      ? `${fs.itemCount ?? 0} items · ${fs.lastSync}`
                         : fs.status === 'err'   ? `Failed — ${(fs.error||'').slice(0,30)}`
                         : fs.status === 'loading'? 'Fetching…'
                         : on ? 'Ready' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* ── Controls row ── */}
      <div className="ctrl-row">
        <Tooltip tip="Format of the URL to ingest" placement="bottom">
          <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
            <option value="rss">RSS / Atom</option>
            <option value="otx">AlienVault OTX</option>
          </select>
        </Tooltip>
        <Tooltip tip="Enter a public RSS/Atom URL to pull intelligence from immediately" placement="bottom">
          <input
            className="form-input url-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            aria-label="Custom feed URL"
            onKeyDown={e => e.key === 'Enter' && handleIngest()}
          />
        </Tooltip>
        <Tooltip tip="Fetch the URL above and ingest entries into the local database" placement="bottom">
          <button className="btn btn-primary" onClick={handleIngest}
            disabled={syncing || !url.trim()}>
            Ingest
          </button>
        </Tooltip>
        <Tooltip
          tip={`Retrieve the latest entries from all ${enabledFeeds.size} active sources and store them locally. No data leaves this device.`}
          placement="bottom"
        >
          <button className="btn btn-secondary" onClick={syncNow} disabled={syncing}>
            <SyncIcon width={13} height={13}
              style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Fetching…' : 'Fetch Intelligence'}
          </button>
        </Tooltip>
        <Tooltip tip="View per-feed sync status, item counts and error details" placement="bottom">
          <button className="btn btn-ghost" onClick={() => setShowTable(v => !v)}>
            <ChevronDownIcon width={13} height={13}
              style={{ transform: showTable ? 'rotate(180deg)':'none', transition:'0.15s' }} />
            Status
          </button>
        </Tooltip>
      </div>

      {/* ── Progress bar ── */}
      {syncing && (
        <div className="progress-wrap mt-2">
          <div className="progress-label">{syncProgress.label}</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${syncProgress.pct}%` }} />
          </div>
        </div>
      )}

      {/* ── Feed status table ── */}
      {showTable && (
        <div className="feed-info-table mt-2">
          <div className="feed-info-row header-row">
            <span>Feed</span><span>Badge</span><span>Items</span><span>Status</span>
          </div>
          {Object.values(FEEDS).map(f => {
            const s = feedStatuses[f.key] || {};
            return (
              <div key={f.key} className="feed-info-row">
                <span style={{ fontWeight:500,
                  color: enabledFeeds.has(f.key) ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {f.label}
                </span>
                <span style={{ color:'var(--text-tertiary)', fontSize:10 }}>{f.badge}</span>
                <span style={{ color:'var(--text-secondary)', fontVariantNumeric:'tabular-nums' }}>
                  {s.itemCount ?? '—'}
                </span>
                <span style={{ display:'flex', alignItems:'center', gap:5, color:statusColor(s.status) }}>
                  <span className={`feed-status-dot ${s.status||'idle'}`}/>
                  {s.status === 'ok'       ? s.lastSync
                   : s.status === 'err'    ? `Failed — ${(s.error||'').slice(0,32)}`
                   : s.status === 'loading'? 'Fetching…'
                   : enabledFeeds.has(f.key)? 'Ready'
                   : 'Disabled'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </section>
  );
}
