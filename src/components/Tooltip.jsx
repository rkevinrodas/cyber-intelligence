// src/components/Tooltip.jsx
// Portal-based tooltip: uses getBoundingClientRect + fixed positioning
// so it never overlaps the sticky nav bar or bleeds off screen.
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const GAP      = 8;
const MAX_W    = 240;
const EST_H    = 38;

export default function Tooltip({ children, tip, placement = 'bottom' }) {
  const [rect, setRect] = useState(null);
  const ref             = useRef(null);

  const show = useCallback(() => {
    if (!ref.current || !tip) return;
    setRect({ r: ref.current.getBoundingClientRect(), p: placement });
  }, [tip, placement]);

  const hide = useCallback(() => setRect(null), []);

  if (!tip) return <>{children}</>;

  return (
    <>
      <span
        ref={ref}
        style={{ display: 'inline-flex' }}
        onMouseEnter={show}
        onFocus={show}
        onMouseLeave={hide}
        onBlur={hide}
      >
        {children}
      </span>
      {rect && createPortal(<TipBox rect={rect.r} placement={rect.p} tip={tip} />, document.body)}
    </>
  );
}

function TipBox({ rect, placement, tip }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top, left;

  if (placement === 'top') {
    top  = rect.top - EST_H - GAP;
    left = rect.left + rect.width / 2;
    if (top < 60) top = rect.bottom + GAP;          // flip down if near nav
  } else if (placement === 'left') {
    top  = rect.top + rect.height / 2 - EST_H / 2;
    left = rect.left - MAX_W - GAP;
    if (left < 8) left = rect.right + GAP;
  } else if (placement === 'right') {
    top  = rect.top + rect.height / 2 - EST_H / 2;
    left = rect.right + GAP;
  } else {
    // default: bottom — preferred so tooltips open downward, away from nav
    top  = rect.bottom + GAP;
    left = rect.left + rect.width / 2;
    if (top + EST_H > vh - 8) top = rect.top - EST_H - GAP; // flip up only if no room
    if (top < 60) top = rect.bottom + GAP;                  // never overlap nav
  }

  const clampedLeft = Math.min(Math.max(left - MAX_W / 2, 8), vw - MAX_W - 8);

  return (
    <div style={{
      position:     'fixed',
      top:          Math.round(top),
      left:         Math.round(clampedLeft),
      zIndex:       99999,
      maxWidth:     MAX_W,
      background:   'var(--bg-active, #1c1c1e)',
      color:        'var(--text-primary, #f5f5f7)',
      fontSize:     12,
      lineHeight:   1.5,
      padding:      '6px 10px',
      borderRadius: 6,
      border:       '1px solid var(--border-md, rgba(255,255,255,0.13))',
      boxShadow:    '0 4px 16px rgba(0,0,0,0.35)',
      pointerEvents:'none',
      whiteSpace:   'normal',
      wordBreak:    'break-word',
    }}>
      {tip}
    </div>
  );
}
