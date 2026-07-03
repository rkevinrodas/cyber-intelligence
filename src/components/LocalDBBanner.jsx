// src/components/LocalDBBanner.jsx
import { useState } from 'react';
import { HardDriveIcon, XIcon } from '../assets/icons.jsx';

export default function LocalDBBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('ci_banner_dismissed') === '1'
  );
  if (dismissed) return null;
  return (
    <div className="local-db-banner">
      <HardDriveIcon width={14} height={14} />
      <span>
        <strong>100% local storage</strong> — all intelligence is saved to your browser's IndexedDB on this device only. Nothing is sent to any server. Data persists across sessions and auto-expires after 90 days.
      </span>
      <button
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', marginLeft:'auto', padding:'0 2px' }}
        onClick={() => { localStorage.setItem('ci_banner_dismissed','1'); setDismissed(true); }}
        aria-label="Dismiss">
        <XIcon width={13} height={13} />
      </button>
    </div>
  );
}
