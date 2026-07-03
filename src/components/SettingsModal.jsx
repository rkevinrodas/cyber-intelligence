// src/components/SettingsModal.jsx
// NASA JPL coding standards: validated inputs, no dynamic code, explicit error handling.
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { getDbPathInfo, DB_NAME_EXPORT } from '../services/db.js';
import { XIcon, HardDriveIcon, SettingsIcon, InfoIcon,
         DatabaseIcon, SyncIcon, ShieldIcon, DownloadIcon } from '../assets/icons.jsx';
import Tooltip from './Tooltip.jsx';

const TIMEZONES = ['UTC','EST','CST','MST','PST','GMT','CET','IST','JST','AEST'];

export default function SettingsModal() {
  const { state, dispatch, clearAll, exportJSON, exportCSV, loadDemo, toast } = useApp();
  const { settings } = state;

  const isOpen = state.activePanel === 'settings';
  const close  = () => dispatch({ type: 'SET_PANEL', payload: null });
  const dbInfo = getDbPathInfo();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDbPath,       setShowDbPath]       = useState(false);
  const [activeTab,        setActiveTab]        = useState('general'); // 'general' | 'sync' | 'database' | 'data'

  const set = (key, val) => {
    if (typeof key !== 'string') return;
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: val } });
  };

  if (!isOpen) return null;

  const lastSync = localStorage.getItem('ci_last_sync') || 'Never';
  const nextInfo = settings.autoSyncEnabled
    ? `Daily at ${settings.syncTime || '08:00'}`
    : 'Disabled — sync manually';

  const TABS = [
    { key:'general',  label:'General',  icon:<SettingsIcon width={13} height={13}/> },
    { key:'sync',     label:'Sync',     icon:<SyncIcon width={13} height={13}/> },
    { key:'database', label:'Database', icon:<DatabaseIcon width={13} height={13}/> },
    { key:'data',     label:'Data',     icon:<DownloadIcon width={13} height={13}/> },
  ];

  return (
    <div
      className="modal-overlay open"
      onClick={e => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="settings-modal">

        {/* Header */}
        <div className="settings-header">
          <span className="settings-title flex-row" style={{ gap:8 }}>
            <SettingsIcon width={16} height={16} />
            Settings
          </span>
          <button className="panel-close" onClick={close} aria-label="Close settings">
            <XIcon width={14} height={14} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{
          display:'flex', borderBottom:'1px solid var(--border)',
          background:'var(--bg-raised)', padding:'0 20px', gap:2, flexShrink:0,
        }}>
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'10px 14px', fontSize:12, fontWeight:500,
                background:'none', border:'none', cursor:'pointer',
                color: activeTab === t.key ? 'var(--blue)' : 'var(--text-secondary)',
                borderBottom: activeTab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom:'-1px', transition:'color 0.15s',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="settings-body">

          {/* ── GENERAL TAB ── */}
          {activeTab === 'general' && (
            <div className="settings-section" style={{ marginBottom:0 }}>
              <div className="settings-section-title">Appearance</div>

              <div className="settings-row">
                <div className="settings-row-left">
                  <div className="settings-row-label">Theme</div>
                  <div className="settings-row-hint">Dark mode is recommended for security operations environments</div>
                </div>
                <Tooltip tip="Switch between dark and light interface modes" placement="bottom">
                  <select className="form-select" value={settings.theme} onChange={e => set('theme', e.target.value)}>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </Tooltip>
              </div>

              <div className="settings-row">
                <div className="settings-row-left">
                  <div className="settings-row-label">Default Severity Filter</div>
                  <div className="settings-row-hint">Which severity is pre-selected on every app load</div>
                </div>
                <Tooltip tip="This severity filter is applied automatically when the app starts" placement="bottom">
                  <select className="form-select" value={settings.defaultSevFilter}
                    onChange={e => set('defaultSevFilter', e.target.value)}>
                    <option value="all">All Threats</option>
                    <option value="critical">Critical Only</option>
                    <option value="high">High &amp; Above</option>
                    <option value="medium">Medium &amp; Above</option>
                  </select>
                </Tooltip>
              </div>

              <div className="settings-row">
                <div className="settings-row-left">
                  <div className="settings-row-label">Timezone Display</div>
                  <div className="settings-row-hint">Applies to all timestamps. Also changeable via the clock in the header.</div>
                </div>
                <Tooltip tip="Choose your preferred timezone for all dates and times shown in the app" placement="bottom">
                  <select className="form-select" value={settings.timezone}
                    onChange={e => set('timezone', e.target.value)}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </Tooltip>
              </div>
            </div>
          )}

          {/* ── SYNC TAB ── */}
          {activeTab === 'sync' && (
            <div className="settings-section" style={{ marginBottom:0 }}>
              <div className="settings-section-title">Automatic Sync</div>

              <div className="settings-row">
                <div className="settings-row-left">
                  <div className="settings-row-label">Enable Auto-Sync</div>
                  <div className="settings-row-hint">
                    When on, all enabled feeds are automatically fetched once per day at your chosen time.
                    Disabled by default — sync manually anytime using the button above.
                  </div>
                </div>
                <Tooltip tip="Auto-sync runs once daily at the time you set below. You can always sync manually regardless." placement="bottom">
                  <label className="toggle">
                    <input type="checkbox" checked={settings.autoSyncEnabled}
                      onChange={e => set('autoSyncEnabled', e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </Tooltip>
              </div>

              {settings.autoSyncEnabled && (
                <div className="settings-row">
                  <div className="settings-row-left">
                    <div className="settings-row-label">Scheduled Sync Time</div>
                    <div className="settings-row-hint">
                      Time of day to run the automatic sync (your local time).
                      Currently scheduled for <strong>{settings.syncTime || '08:00'}</strong>.
                    </div>
                  </div>
                  <Tooltip tip="Pick the exact time each day for the automatic feed sync to run" placement="bottom">
                    <input
                      type="time"
                      className="form-input"
                      style={{ width:110, fontFamily:'var(--font-mono)', fontSize:14 }}
                      value={settings.syncTime || '08:00'}
                      onChange={e => set('syncTime', e.target.value)}
                    />
                  </Tooltip>
                </div>
              )}

              {/* Sync status info */}
              <div style={{
                background:'var(--bg-surface)', border:'1px solid var(--border)',
                borderRadius:'var(--radius)', padding:'12px 14px', marginTop:8,
              }}>
                <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'6px 12px', fontSize:12 }}>
                  <span style={{ color:'var(--text-tertiary)' }}>Last sync</span>
                  <span style={{ color:'var(--text-primary)' }}>{lastSync}</span>
                  <span style={{ color:'var(--text-tertiary)' }}>Next sync</span>
                  <span style={{ color: settings.autoSyncEnabled ? 'var(--blue)' : 'var(--text-tertiary)' }}>
                    {nextInfo}
                  </span>
                  <span style={{ color:'var(--text-tertiary)' }}>Enabled feeds</span>
                  <span style={{ color:'var(--text-primary)' }}>{state.enabledFeeds.size} of 8</span>
                </div>
              </div>

              <div className="settings-section-title" style={{ marginTop:20 }}>Custom Feed Ingestion</div>
              <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:10 }}>
                To add a custom RSS/Atom source, use the URL bar in the <strong>Intelligence Sources</strong> bar at the top of the dashboard. Click "Ingest" to pull and store items immediately.
              </p>
            </div>
          )}

          {/* ── DATABASE TAB ── */}
          {activeTab === 'database' && (
            <div className="settings-section" style={{ marginBottom:0 }}>
              <div className="settings-section-title flex-row" style={{ gap:6 }}>
                <HardDriveIcon width={12} height={12} />
                Local Database
                <Tooltip tip="Intelligence data is stored exclusively in your browser's IndexedDB. It never leaves this device." placement="bottom">
                  <InfoIcon width={11} height={11} style={{ color:'var(--blue)', cursor:'help' }} />
                </Tooltip>
              </div>

              {/* Info cards */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  { label:'Storage Engine', value:'IndexedDB',  cls:'ok',
                    tip:'IndexedDB is a built-in browser database. Data persists across page refreshes.' },
                  { label:'Records Stored', value:state.dbCount, cls:'blue',
                    tip:'Total threat records currently in the local database.' },
                  { label:'Auto-Expiry', value:`${settings.retentionDays ?? 90} days`, cls:'',
                    tip:`Records older than ${settings.retentionDays ?? 90} days are removed on startup. Adjust below.` },
                  { label:'Privacy',        value:'100% local', cls:'ok',
                    tip:'No data is ever sent to a remote server.' },
                  { label:'Detected Browser', value:dbInfo.browser, cls:'',
                    tip:'Storage path varies by browser — see below.' },
                  { label:'Database Name',  value:DB_NAME_EXPORT, cls:'blue',
                    tip:'The identifier used in IndexedDB — inspect via DevTools → Application → IndexedDB.' },
                ].map(item => (
                  <Tooltip key={item.label} tip={item.tip} placement="bottom">
                    <div style={{
                      background:'var(--bg-surface)', border:'1px solid var(--border)',
                      borderRadius:'var(--radius-sm)', padding:'10px 12px',
                    }}>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--text-tertiary)',
                        textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize:12, fontWeight:500,
                        color: item.cls === 'ok' ? 'var(--green)'
                             : item.cls === 'blue' ? 'var(--blue)'
                             : 'var(--text-primary)',
                        fontFamily: item.label === 'Database Name' ? 'var(--font-mono)' : 'inherit',
                        wordBreak:'break-all',
                      }}>
                        {String(item.value)}
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </div>

              {/* DevTools tip */}
              <div style={{
                padding:'10px 12px', background:'var(--blue-bg)',
                border:'1px solid rgba(0,122,255,0.18)', borderRadius:'var(--radius-sm)',
                fontSize:12, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:12,
              }}>
                <strong style={{ color:'var(--text-primary)' }}>Inspect in browser:</strong>{' '}
                Open DevTools (F12) → Application tab → IndexedDB → <code style={{
                  fontFamily:'var(--font-mono)', fontSize:11, color:'var(--blue)',
                  background:'var(--blue-bg-md)', padding:'1px 5px', borderRadius:3,
                }}>{DB_NAME_EXPORT}</code> → threats
              </div>

              {/* File path disclosure */}
              <button
                className="btn btn-ghost btn-sm btn-full"
                style={{ fontSize:11, justifyContent:'flex-start', marginBottom:6 }}
                onClick={() => setShowDbPath(v => !v)}
              >
                {showDbPath ? '▾' : '▸'} Show file system storage location
              </button>

              {showDbPath && (
                <div className="db-path-note">
                  <p style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:8 }}>
                    Data stored inside <strong>{dbInfo.browser}</strong>'s IndexedDB directory:
                  </p>
                  {dbInfo.windows && (
                    <p style={{ marginBottom:5 }}>
                      🪟 <strong>Windows:</strong>{' '}
                      <code style={{ fontFamily:'var(--font-mono)', fontSize:10,
                        color:'var(--blue)', background:'var(--blue-bg)',
                        padding:'2px 5px', borderRadius:3, wordBreak:'break-all' }}>
                        {dbInfo.windows}
                      </code>
                    </p>
                  )}
                  {dbInfo.mac && (
                    <p style={{ marginBottom:5 }}>
                      🍎 <strong>macOS:</strong>{' '}
                      <code style={{ fontFamily:'var(--font-mono)', fontSize:10,
                        color:'var(--blue)', background:'var(--blue-bg)',
                        padding:'2px 5px', borderRadius:3, wordBreak:'break-all' }}>
                        {dbInfo.mac}
                      </code>
                    </p>
                  )}
                  {dbInfo.linux && (
                    <p>
                      🐧 <strong>Linux:</strong>{' '}
                      <code style={{ fontFamily:'var(--font-mono)', fontSize:10,
                        color:'var(--blue)', background:'var(--blue-bg)',
                        padding:'2px 5px', borderRadius:3, wordBreak:'break-all' }}>
                        {dbInfo.linux}
                      </code>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── DATA TAB ── */}
          {activeTab === 'data' && (
            <div className="settings-section" style={{ marginBottom:0 }}>

              {/* Demo data */}
              <div className="settings-section-title flex-row" style={{ gap:6 }}>
                <ShieldIcon width={12} height={12} />
                Demo Data
              </div>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:12 }}>
                Load 8 pre-built, realistic threat records to explore the platform without needing an internet connection. Covers APT campaigns, ransomware, CVEs, phishing, and CISA advisories.
              </p>
              <Tooltip tip="Adds 8 realistic demo threat records to your local database for exploring the UI" placement="bottom">
                <button className="btn btn-secondary btn-full" onClick={() => { loadDemo(); close(); }}>
                  <ShieldIcon width={13} height={13} />
                  Load Demo Data
                </button>
              </Tooltip>

              <div className="divider" style={{ margin:'20px 0' }} />

              {/* Export */}
              <div className="settings-section-title flex-row" style={{ gap:6 }}>
                <DownloadIcon width={12} height={12} />
                Export Intelligence
              </div>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:12 }}>
                Download your local database as a portable file. JSON preserves all fields including IOCs and metadata. CSV includes read status and is suitable for spreadsheet import.
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <Tooltip tip="Download all records as structured JSON — full fidelity, all fields preserved" placement="bottom">
                  <button className="btn btn-secondary" onClick={exportJSON}>Export JSON</button>
                </Tooltip>
                <Tooltip tip="Download a CSV summary with title, severity, CVSS, IOC count, and read status" placement="bottom">
                  <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
                </Tooltip>
              </div>

              <div className="divider" style={{ margin:'20px 0' }} />

              {/* Retention period */}
              <div className="settings-section-title">Record Retention Period</div>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:12 }}>
                Intelligence records older than this threshold are automatically removed at startup.
                Shorter windows keep the database lean; longer windows preserve more historical context.
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                <input
                  type="range" min={7} max={365} step={1}
                  value={settings.retentionDays ?? 90}
                  onChange={e => set('retentionDays', Number(e.target.value))}
                  style={{ flex:1, accentColor:'var(--blue)' }}
                />
                <span style={{
                  minWidth:70, textAlign:'right', fontSize:14, fontWeight:700,
                  color:'var(--blue)', fontVariantNumeric:'tabular-nums',
                }}>
                  {settings.retentionDays ?? 90} days
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between',
                fontSize:10, color:'var(--text-tertiary)', marginBottom:4 }}>
                <span>7 days</span>
                <span>30</span>
                <span>90</span>
                <span>180</span>
                <span>365 days</span>
              </div>
              {[7,14,30,60,90,180,365].map(d => (
                <button key={d}
                  className={`btn btn-sm ${(settings.retentionDays ?? 90) === d ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ marginRight:6, marginBottom:4, fontSize:11 }}
                  onClick={() => set('retentionDays', d)}
                >{d}d</button>
              ))}

              <div className="divider" style={{ margin:'20px 0' }} />

              {/* Clear */}
              <div className="settings-section-title" style={{ color:'var(--c-critical)' }}>
                Danger Zone
              </div>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:12 }}>
                Permanently delete all threat records from the local database. Export your data first if you want to keep a backup.
              </p>
              {!showClearConfirm ? (
                <Tooltip tip="Permanently delete all records — this cannot be undone" placement="bottom">
                  <button className="btn btn-danger" onClick={() => setShowClearConfirm(true)}>
                    Clear All Records
                  </button>
                </Tooltip>
              ) : (
                <div style={{
                  padding:'14px', background:'rgba(255,59,48,0.06)',
                  border:'1px solid rgba(255,59,48,0.25)', borderRadius:'var(--radius)',
                }}>
                  <p style={{ fontSize:13, color:'var(--c-critical)', fontWeight:600, marginBottom:10 }}>
                    Delete {state.dbCount} records permanently?
                  </p>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-danger"
                      onClick={() => { clearAll(); setShowClearConfirm(false); close(); }}>
                      Yes, Delete All
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowClearConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="settings-footer">
          <p style={{ fontSize:11, color:'var(--text-tertiary)', lineHeight:1.65 }}>
            Settings are saved to <code>localStorage</code> and persist across sessions.
            All intelligence data lives separately in <code>IndexedDB</code> and never leaves this device.
          </p>
        </div>

      </div>
    </div>
  );
}
