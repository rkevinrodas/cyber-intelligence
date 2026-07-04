// src/components/DetailPanel.jsx
// Centered modal dialog — readable, focused, accessible
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext.jsx';
import { iocEnrichmentLinks } from '../services/normalize.js';
import { getReadSet } from '../services/readStore.js';
import { XIcon, ExternalLinkIcon, CopyIcon, TrashIcon } from '../assets/icons.jsx';
import Tooltip from './Tooltip.jsx';

// ── URL scheme guard ─────────────────────────────────────
// Feed-derived URLs (t.link, references) are untrusted input.
// React does NOT block javascript: URIs in href — this does.
// Enrichment links are app-constructed and safe, but we guard
// every external href uniformly for defense in depth.
function safeHref(u) {
  if (typeof u !== 'string') return null;
  const trimmed = u.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

const SEV_COLORS = {
  critical: 'var(--c-critical)',
  high:     'var(--c-high)',
  medium:   'var(--c-medium)',
  low:      'var(--c-low)',
  news:     'var(--c-news)',
};

const SEV_LABELS = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
  news:     'News / Info',
};

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── IOC Row ───────────────────────────────────────────────
function IocRow({ ioc }) {
  const links = iocEnrichmentLinks(ioc);

  const copy = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(ioc.value).catch(() => {});
    }
  };

  return (
    <div className={`ioc-row t-${ioc.type}`}>
      <span className={`ioc-type-badge ioc-type-${ioc.type}`}>
        {ioc.type.toUpperCase()}
      </span>
      <span className="ioc-value" title={ioc.value}>{ioc.value}</span>
      <div className="ioc-actions">
        <Tooltip tip="Copy to clipboard" placement="bottom">
          <button className="ioc-action-btn" onClick={copy} aria-label="Copy IOC">
            <CopyIcon width={10} height={10} />
          </button>
        </Tooltip>
        {links.map(l => (
          <Tooltip key={l.label} tip={`Investigate on ${l.label}`} placement="bottom">
            <a
              href={safeHref(l.url) ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="ioc-action-btn"
              onClick={e => e.stopPropagation()}
            >
              {l.label}
            </a>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

// ── CVSS visual block ─────────────────────────────────────
const METRIC_FULL = {
  AV: { N:'Network', A:'Adjacent', L:'Local', P:'Physical' },
  AC: { L:'Low', H:'High' },
  PR: { N:'None', L:'Low', H:'High' },
  UI: { N:'None', R:'Required' },
  S:  { U:'Unchanged', C:'Changed' },
  C:  { H:'High', L:'Low', N:'None' },
  I:  { H:'High', L:'Low', N:'None' },
  A:  { H:'High', L:'Low', N:'None' },
};
const METRIC_NAMES = {
  AV:'Attack Vector', AC:'Attack Complexity', PR:'Privileges Required',
  UI:'User Interaction', S:'Scope', C:'Confidentiality', I:'Integrity', A:'Availability',
};
const METRIC_RISK = {
  AV:{ N:'red', A:'orange', L:'yellow', P:'green' },
  AC:{ L:'red', H:'green' },
  PR:{ N:'red', L:'orange', H:'green' },
  UI:{ N:'red', R:'green' },
  S: { U:'grey', C:'red' },
  C: { H:'red', L:'orange', N:'green' },
  I: { H:'red', L:'orange', N:'green' },
  A: { H:'red', L:'orange', N:'green' },
};
const RISK_COLORS = {
  red:'var(--c-critical)', orange:'var(--c-high)',
  yellow:'var(--c-medium)', green:'var(--green)', grey:'var(--text-tertiary)',
};

function MetricPill({ metric, val }) {
  const col = RISK_COLORS[METRIC_RISK[metric]?.[val]] ?? 'var(--text-secondary)';
  const lbl = METRIC_FULL[metric]?.[val] ?? val;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <span style={{ fontSize:9, fontWeight:700, color:'var(--text-tertiary)',
        textTransform:'uppercase', letterSpacing:'0.07em' }}>
        {METRIC_NAMES[metric]}
      </span>
      <span style={{
        fontSize:11, fontWeight:700, padding:'3px 9px',
        background:`${col}18`, border:`1px solid ${col}44`,
        borderRadius:5, color:col, whiteSpace:'nowrap',
      }}>
        {metric}:{val} · {lbl}
      </span>
    </div>
  );
}

function CvssBlock({ threat }) {
  const cvss  = threat?.cvss;
  const sev   = threat?.severity ?? 'news';
  const score = parseFloat(cvss);
  if (isNaN(score) || !cvss) return null;
  const pct = Math.round((score / 10) * 100);
  const col = SEV_COLORS[sev] ?? SEV_COLORS.news;
  const bd  = threat?.cvssBreakdown;
  const vec = threat?.cvssVector;

  const pills = {};
  if (bd) {
    ['AV','AC','PR','UI','S','C','I','A'].forEach(k => { if (bd[k]?.val) pills[k] = bd[k].val; });
  } else if (vec) {
    vec.split('/').forEach(part => {
      const [k,v] = part.split(':');
      if (METRIC_FULL[k] && v) pills[k] = v;
    });
  }
  const hasPills = Object.keys(pills).length === 8;

  return (
    <div className="cvss-card">
      <div className="cvss-header">
        <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
          <div>
            <div className="cvss-score-num" style={{ color:col }}>{score.toFixed(1)}</div>
            <div className="cvss-score-label" style={{ color:col }}>{SEV_LABELS[sev] ?? sev}</div>
          </div>
          <div style={{ paddingBottom:4 }}>
            {threat?.cvssInferred && (
              <Tooltip tip="Score estimated using CVSS v3.1 heuristics — not from an official NVD or vendor advisory. Treat as indicative only." placement="bottom">
                <span style={{ fontSize:10, color:'var(--text-tertiary)',
                  background:'var(--bg-surface)', border:'1px solid var(--border)',
                  borderRadius:4, padding:'2px 6px', cursor:'help' }}>
                  ⚠ Estimated
                </span>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="cvss-meta">
          <div style={{ fontWeight:600 }}>CVSS v3.1 Base Score</div>
          <div>
            {score >= 9.0 ? '🔴 Immediate action required'
             : score >= 7.0 ? '🟠 Prioritize patching'
             : score >= 4.0 ? '🟡 Schedule remediation'
             : '🟢 Low exploitability — monitor'}
          </div>
          {bd && (
            <div style={{ marginTop:4, fontSize:10, color:'var(--text-tertiary)' }}>
              Impact sub-score: {bd.impactScore?.toFixed(1) ?? '—'} ·
              Exploitability sub-score: {bd.exploitScore?.toFixed(1) ?? '—'}
            </div>
          )}
        </div>
      </div>

      <div className="cvss-bar-track" style={{ margin:'10px 0 4px' }}>
        <div className="cvss-bar-fill" style={{ width:`${pct}%`, background:col }}/>
      </div>
      <div className="cvss-ticks" style={{ marginBottom: hasPills ? 12 : 0 }}>
        {[0,2,4,6,8,10].map(n => <span key={n}>{n}</span>)}
      </div>

      {hasPills && (
        <>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tertiary)',
            textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
            Base Metric Vector
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:6 }}>
            {['AV','AC','PR','UI'].map(k => <MetricPill key={k} metric={k} val={pills[k]}/>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
            {['S','C','I','A'].map(k => <MetricPill key={k} metric={k} val={pills[k]}/>)}
          </div>
        </>
      )}

      {vec && (
        <div style={{ marginTop:10, padding:'6px 10px',
          background:'var(--bg-surface)', borderRadius:5,
          fontSize:10, fontFamily:'var(--font-mono)',
          color:'var(--text-tertiary)', wordBreak:'break-all',
          lineHeight:1.5 }}>
          {vec}
        </div>
      )}
    </div>
  );
}


// ── Main modal ────────────────────────────────────────────
export default function DetailPanel() {
  const { state, dispatch, dismissThreat, markRead, markUnread } = useApp();
  const isOpen = state.activePanel === 'detail';
  const t      = isOpen ? state.threats.find(x => x.id === state.selectedThreat) : null;

  const close = () => dispatch({ type: 'SET_PANEL', payload: null });

  // Mark as read when the panel opens
  useEffect(() => {
    if (isOpen && t) markRead(t.id);
  }, [isOpen, t?.id]);

  // Derive read status
  void state.readRev;
  const isRead = t ? getReadSet().has(String(t.id)) : false;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sev  = t?.severity ?? 'news';
  const iocs = t?.iocs ?? [];
  const col  = SEV_COLORS[sev] ?? SEV_COLORS.news;

  const copyJson = () => {
    if (!t) return;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(JSON.stringify(t, null, 2)).catch(() => {});
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Threat detail"
      style={{
        position:    'fixed',
        inset:       0,
        zIndex:      600,
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        padding:     '20px 16px',
        background:  'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{
        background:    'var(--bg)',
        border:        '1px solid var(--border-md)',
        borderRadius:  'var(--radius-lg, 16px)',
        boxShadow:     '0 24px 80px rgba(0,0,0,0.55)',
        width:         '100%',
        maxWidth:      680,
        maxHeight:     '88vh',
        display:       'flex',
        flexDirection: 'column',
        animation:     'detail-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        overflow:      'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:      '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink:   0,
        }}>
          {/* badges row */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
            <span className={`sev-badge badge-${sev}`}>{sev.toUpperCase()}</span>
            <span className={`tag tag-tlp-${t?.tlp ?? 'white'}`}>
              TLP:{(t?.tlp ?? 'WHITE').toUpperCase()}
            </span>
            {t?.cvss && (
              <Tooltip tip={`CVSS Base Score — ${parseFloat(t.cvss) >= 9 ? 'Critical, exploitable remotely with severe impact' : parseFloat(t.cvss) >= 7 ? 'High severity — patch promptly' : 'Moderate severity'}`} placement="bottom">
                <span style={{
                  fontSize: 11, fontWeight: 600, color: col,
                  padding: '2px 8px',
                  border: `1px solid ${col}44`,
                  borderRadius: 5,
                  background: `${col}14`,
                }}>
                  CVSS {t.cvss}
                </span>
              </Tooltip>
            )}
            <button
              onClick={close}
              aria-label="Close"
              style={{
                marginLeft:     'auto',
                width: 28, height: 28,
                borderRadius:   '50%',
                border:         '1px solid var(--border)',
                background:     'var(--bg-surface)',
                color:          'var(--text-secondary)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
                flexShrink:     0,
              }}
            >
              <XIcon width={14} height={14} />
            </button>
          </div>

          {/* title */}
          <h2 style={{
            fontSize:      20,
            fontWeight:    700,
            color:         'var(--text-primary)',
            lineHeight:    1.35,
            letterSpacing: '-0.4px',
            marginBottom:  8,
          }}>
            {t?.title ?? 'Unknown'}
          </h2>

          {/* meta row */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{fmtDate(t?.date)}</span>
            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{t?.source ?? '—'}</span>
            {t?.author && (
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>By {t.author}</span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Source link */}
          {safeHref(t?.link) && (
            <div>
              <div className="panel-section-title">Original Source</div>
              <a
                href={safeHref(t.link)}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link-banner"
              >
                <ExternalLinkIcon width={18} height={18} style={{ flexShrink:0 }} />
                <div className="slb-text">
                  <div className="slb-title">View on {t.source}</div>
                  <div className="slb-url">{t.link.length > 80 ? t.link.slice(0, 80) + '…' : t.link}</div>
                </div>
                <ExternalLinkIcon width={13} height={13} />
              </a>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="panel-section-title">Intelligence Summary</div>
            <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75 }}>
              {t?.description || 'No description available.'}
            </p>
          </div>

          {/* CVSS */}
          {t?.cvss && (
            <div>
              <div className="panel-section-title">Threat Severity Score</div>
              <CvssBlock threat={t} />
            </div>
          )}

          {/* IOCs */}
          <div>
            <div className="panel-section-title" style={{ display:'flex', justifyContent:'space-between' }}>
              <Tooltip tip="Indicators of Compromise — technical artifacts to detect, block, or hunt for this threat in your environment. Click any lookup button to open in an external threat intelligence platform." placement="bottom">
                <span>Indicators of Compromise ({iocs.length})</span>
              </Tooltip>
              {iocs.length > 0 && (
                <span style={{ fontSize:10, color:'var(--text-tertiary)', fontWeight:400 }}>
                  {Object.entries(
                    iocs.reduce((acc, i) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc; }, {})
                  ).map(([k, v]) => `${v} ${k}`).join(' · ')}
                </span>
              )}
            </div>
            {iocs.length > 0 ? (
              <>
                <div className="ioc-table">
                  {iocs.map((ioc, idx) => <IocRow key={`${ioc.type}-${idx}`} ioc={ioc} />)}
                </div>
                <p style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:8, lineHeight:1.6 }}>
                  Copy IOC values to use in SIEM searches, firewall blocklists, or EDR custom IOC feeds.
                </p>
              </>
            ) : (
              <p style={{ fontSize:13, color:'var(--text-tertiary)' }}>No IOCs automatically extracted.</p>
            )}
          </div>

          {/* Metadata grid */}
          <div>
            <div className="panel-section-title">Record Metadata</div>
            <div className="meta-grid">
              <div className="meta-kv">
                <div className="meta-kv-key">Feed Source</div>
                <div className="meta-kv-val blue">{t?.feedKey ?? 'manual'}</div>
              </div>
              <div className="meta-kv">
                <div className="meta-kv-key">Published</div>
                <div className="meta-kv-val">{fmtDate(t?.date)}</div>
              </div>
              <div className="meta-kv">
                <div className="meta-kv-key">Ingested At</div>
                <div className="meta-kv-val">{t?.ingestedAt ? new Date(t.ingestedAt).toLocaleString() : '—'}</div>
              </div>
              <div className="meta-kv">
                <div className="meta-kv-key">Expires (TTL 90d)</div>
                <Tooltip tip="This record is automatically deleted 90 days after ingestion" placement="bottom">
                  <div className="meta-kv-val warn">
                    {t?.ingestedAt
                      ? new Date(t.ingestedAt + 90 * 86400000).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
                      : '—'}
                  </div>
                </Tooltip>
              </div>
              <div className="meta-kv">
                <div className="meta-kv-key">TLP</div>
                <div className="meta-kv-val ok">{(t?.tlp ?? 'white').toUpperCase()}</div>
              </div>
              <div className="meta-kv">
                <div className="meta-kv-key">IOC Count</div>
                <div className="meta-kv-val blue">{iocs.length}</div>
              </div>
            </div>
          </div>

          {/* ── Context section ── */}
          {t?.context && (
            <div>
              <div className="panel-section-title">Threat Context</div>
              <div className="context-grid">

                {/* Confidence */}
                <div className="context-card">
                  <div className="context-card-label">Intel Confidence</div>
                  <div className="context-card-value" style={{
                    color: t.context.confidence >= 4 ? 'var(--c-critical)'
                         : t.context.confidence >= 3 ? 'var(--c-medium)'
                         : 'var(--text-secondary)',
                    fontWeight: 700,
                  }}>
                    {t.context.confidenceLabel}
                    <span style={{ fontSize:10, fontWeight:400, marginLeft:6, opacity:0.7 }}>
                      ({t.context.confidence}/5)
                    </span>
                  </div>
                </div>

                {/* Exploit status */}
                <div className="context-card">
                  <div className="context-card-label">Exploitation Status</div>
                  <div className="context-card-value" style={{
                    color: t.context.exploitStatus === 'active'      ? 'var(--c-critical)'
                         : t.context.exploitStatus === 'poc'         ? 'var(--c-high)'
                         : t.context.exploitStatus === 'patched'     ? 'var(--green)'
                         : t.context.exploitStatus === 'theoretical' ? 'var(--c-low)'
                         : 'var(--text-tertiary)',
                    fontWeight: 600, textTransform: 'capitalize',
                  }}>
                    {t.context.exploitStatus === 'active'      ? '🔴 Actively Exploited'
                     : t.context.exploitStatus === 'poc'       ? '🟠 PoC Available'
                     : t.context.exploitStatus === 'patched'   ? '🟢 Patched'
                     : t.context.exploitStatus === 'theoretical'? '⚪ Theoretical'
                     : '⚫ Unknown'}
                  </div>
                </div>

                {/* Geo origin */}
                {t.context.geoOrigin.length > 0 && (
                  <div className="context-card">
                    <div className="context-card-label">Attributed Origin</div>
                    <div className="context-card-value">
                      {t.context.geoOrigin.join(' · ')}
                    </div>
                  </div>
                )}

                {/* Affected sectors */}
                {t.context.affectedSectors.length > 0 && (
                  <div className="context-card">
                    <div className="context-card-label">Affected Sectors</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
                      {t.context.affectedSectors.map(s => (
                        <span key={s} style={{
                          fontSize:11, padding:'2px 8px',
                          background:'var(--bg-surface)',
                          border:'1px solid var(--border)',
                          borderRadius:4, color:'var(--text-secondary)',
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Threat Actors */}
              {t.context.threatActors.length > 0 && (
                <div style={{ marginTop:12 }}>
                  <div className="context-sub-title">Attributed Threat Actor(s)</div>
                  {t.context.threatActors.map(a => (
                    <div key={a.group} className="actor-card">
                      <div className="actor-name">{a.group}</div>
                      <div className="actor-meta">
                        <span className="actor-badge origin">{a.origin}</span>
                        <span className="actor-badge sponsor">{a.sponsor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MITRE ATT&CK */}
              {t.context.mitreTechniques.length > 0 && (
                <div style={{ marginTop:12 }}>
                  <div className="context-sub-title">MITRE ATT&CK Techniques</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:5 }}>
                    {t.context.mitreTechniques.map(ttp => (
                      <Tooltip key={ttp.id} tip={`${ttp.id}: ${ttp.label} — click to open ATT&CK Navigator`} placement="bottom">
                        <a
                          href={`https://attack.mitre.org/techniques/${ttp.id.replace('.','/').replace('TA','tactics/TA')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display:'inline-flex', alignItems:'center', gap:4,
                            fontSize:11, padding:'3px 9px',
                            background:'var(--blue-bg)',
                            border:'1px solid var(--blue-glow)',
                            borderRadius:5, color:'var(--blue)',
                            textDecoration:'none', fontWeight:600,
                            transition:'all var(--tr)',
                          }}
                        >
                          {ttp.id}
                          <span style={{ fontWeight:400, opacity:0.75, fontSize:10 }}>
                            {ttp.label}
                          </span>
                        </a>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {(t?.tags ?? []).length > 0 && (
            <div>
              <div className="panel-section-title">Tags</div>
              <div className="panel-tags">
                {t.tags.map(tag => (
                  <span key={tag} className="panel-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {(t?.references ?? []).length > 0 && (
            <div>
              <div className="panel-section-title">External References</div>
              {t.references.filter(r => safeHref(r)).map((r, i) => (
                <a key={i} href={safeHref(r)} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', fontSize:12, color:'var(--blue)', marginBottom:6, wordBreak:'break-all', opacity:0.85 }}>
                  ↗ {r.length > 90 ? r.slice(0, 90) + '…' : r}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding:     '12px 24px',
          borderTop:   '1px solid var(--border)',
          display:     'flex',
          gap:          8,
          flexShrink:   0,
          background:   'var(--bg-raised)',
          flexWrap:     'wrap',
        }}>
          <Tooltip tip="Copy full JSON record to clipboard" placement="bottom">
            <button className="btn btn-ghost btn-sm" onClick={copyJson}>
              <CopyIcon width={12} height={12} /> Copy JSON
            </button>
          </Tooltip>
          <Tooltip tip={isRead ? 'Mark this record as unread' : 'Mark as read'} placement="bottom">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => isRead ? markUnread(t.id) : markRead(t.id)}
            >
              {isRead ? '○ Mark Unread' : '● Mark Read'}
            </button>
          </Tooltip>
          {safeHref(t?.link) && (
            <a
              href={safeHref(t.link)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <ExternalLinkIcon width={12} height={12} /> Open Source ↗
            </a>
          )}
          <Tooltip tip="Permanently remove this record from the local database" placement="bottom">
            <button
              className="btn btn-danger btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => t && dismissThreat(t.id)}
            >
              <TrashIcon width={12} height={12} /> Dismiss
            </button>
          </Tooltip>
        </div>

      </div>

      <style>{`
        @keyframes detail-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
