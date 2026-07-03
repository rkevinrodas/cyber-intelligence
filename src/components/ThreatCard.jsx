// src/components/ThreatCard.jsx
import { useApp } from '../context/AppContext.jsx';
import { getReadSet } from '../services/readStore.js';
import { TargetIcon, ChevronRightIcon } from '../assets/icons.jsx';
import Tooltip from './Tooltip.jsx';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB',
      { day:'2-digit', month:'short', year:'numeric' });
  } catch { return iso; }
}

export default function ThreatCard({ threat, delay = 0 }) {
  const { dispatch, markRead, toggleRead, state } = useApp();

  // readRev in state ensures card re-renders when read status changes
  void state.readRev;
  const isRead = getReadSet().has(String(threat.id));
  const sev    = threat.severity || 'news';
  const iocs   = threat.iocs || [];

  const handleClick = () => {
    // Mark as read when opened
    if (!isRead) markRead(threat.id);
    dispatch({ type: 'SELECT_THREAT', payload: threat.id });
  };

  const handleToggleRead = (e) => {
    e.stopPropagation();
    toggleRead(threat.id);
  };

  return (
    <div
      className={`threat-card sev-${sev}${isRead ? ' card-read' : ' card-unread'}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={handleClick}
    >
      {/* Unread indicator dot */}
      {!isRead && (
        <span
          className="unread-dot"
          title="Unread — click card to mark as read"
        />
      )}

      <div className="card-inner">
        <span className={`sev-badge badge-${sev}`}>{sev.toUpperCase()}</span>

        <div className="card-content">
          <div className="card-title" style={{ opacity: isRead ? 0.65 : 1 }}>
            {threat.title}
          </div>
          <div className="card-meta">
            <span className="meta-item">{fmtDate(threat.date)}</span>
            <span className="meta-item">{threat.source}</span>
            {threat.author && <span className="meta-item">{threat.author}</span>}
            {threat.cvss && (
              <span className="meta-item" style={{ color:`var(--c-${sev})`, fontWeight:600 }}>
                CVSS {threat.cvss}
              </span>
            )}
          </div>
          <div className="card-tags">
            {(threat.tags || []).slice(0,4).map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
            <span className={`tag tag-tlp-${threat.tlp || 'white'}`}>
              TLP:{(threat.tlp || 'WHITE').toUpperCase()}
            </span>
            {iocs.length > 0 && (
              <span className="tag ioc-count-tag"
                title={`${iocs.length} indicator${iocs.length !== 1 ? 's' : ''} of compromise`}>
                <TargetIcon width={9} height={9} />
                {iocs.length} IOC{iocs.length !== 1 ? 's' : ''}
              </span>
            )}
            {isRead && (
              <span className="tag read-badge">Read</span>
            )}
            {/* Exploit status */}
            {threat.context?.exploitStatus === 'active' && (
              <span className="tag" style={{
                background:'rgba(215,0,21,0.1)', color:'var(--c-critical)',
                border:'1px solid rgba(215,0,21,0.25)', fontWeight:600
              }}>
                🔴 In-the-Wild
              </span>
            )}
            {threat.context?.exploitStatus === 'poc' && (
              <span className="tag" style={{
                background:'rgba(224,80,0,0.09)', color:'var(--c-high)',
                border:'1px solid rgba(224,80,0,0.25)'
              }}>
                🟠 PoC
              </span>
            )}
            {/* Threat actor if known */}
            {(threat.context?.threatActors ?? []).slice(0,1).map(a => (
              <span key={a.group} className="tag" style={{
                background:'var(--blue-bg)', color:'var(--blue)',
                border:'1px solid var(--blue-glow)'
              }}>
                {a.group}
              </span>
            ))}
            {/* First affected sector */}
            {threat.context?.affectedSectors?.[0] && (
              <span className="tag" style={{ color:'var(--text-secondary)' }}>
                {threat.context.affectedSectors[0]}
              </span>
            )}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <ChevronRightIcon className="card-arrow" width={14} height={14} />
          {/* Quick read/unread toggle */}
          <Tooltip tip={isRead ? 'Mark as unread' : 'Mark as read'} placement="left">
            <button
              className="read-toggle-btn"
              onClick={handleToggleRead}
              aria-label={isRead ? 'Mark unread' : 'Mark read'}
            >
              {isRead ? '○' : '●'}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
