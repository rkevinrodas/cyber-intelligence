// src/components/Header.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { LogoMark, SettingsIcon, SunIcon, MoonIcon } from '../assets/icons.jsx';
import Tooltip from './Tooltip.jsx';

const TIMEZONES = [
  { label:'UTC',  tz:'UTC',                offset:'+0:00' },
  { label:'EST',  tz:'America/New_York',   offset:'-5:00' },
  { label:'CST',  tz:'America/Chicago',    offset:'-6:00' },
  { label:'MST',  tz:'America/Denver',     offset:'-7:00' },
  { label:'PST',  tz:'America/Los_Angeles',offset:'-8:00' },
  { label:'GMT',  tz:'Europe/London',      offset:'+0:00' },
  { label:'CET',  tz:'Europe/Berlin',      offset:'+1:00' },
  { label:'IST',  tz:'Asia/Kolkata',       offset:'+5:30' },
  { label:'JST',  tz:'Asia/Tokyo',         offset:'+9:00' },
  { label:'AEST', tz:'Australia/Sydney',   offset:'+10:00' },
];

export default function Header() {
  const { state, dispatch } = useApp();
  const { settings }        = state;
  const [time, setTime]     = useState('');
  const [tzOpen, setTzOpen] = useState(false);
  const tzRef               = useRef(null);

  /* live clock — updates every second */
  useEffect(() => {
    const tick = () => {
      const tz  = TIMEZONES.find(t => t.label === settings.timezone)?.tz ?? 'UTC';
      const now = new Date().toLocaleString('en-GB', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).replace(',', '');
      setTime(now);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [settings.timezone]);

  /* close TZ picker on outside click */
  useEffect(() => {
    const h = e => {
      if (tzRef.current && !tzRef.current.contains(e.target)) setTzOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggleTheme = () =>
    dispatch({ type: 'UPDATE_SETTINGS',
      payload: { theme: settings.theme === 'dark' ? 'light' : 'dark' } });

  return (
    <header className="header">
      <div className="header-left">
        {/* Logo */}
        <a href="#" className="logo">
          <LogoMark size={28} />
          <span className="logo-name">
            Cyber<span>Intelligence</span>
          </span>
        </a>

        <div className="header-divider" />

        {/* Clock + timezone picker */}
        <div className="clock-wrap" ref={tzRef} style={{ position: 'relative' }}>
          <span className="clock-display">{time}</span>
          {' '}
          <Tooltip tip="Click to change your preferred timezone" placement="bottom">
            <span className="clock-tz" onClick={() => setTzOpen(v => !v)}>
              {settings.timezone}
            </span>
          </Tooltip>

          {tzOpen && (
            <div className="tz-picker">
              {TIMEZONES.map(t => (
                <div
                  key={t.label}
                  className={`tz-picker-item${settings.timezone === t.label ? ' active' : ''}`}
                  onClick={() => {
                    dispatch({ type: 'UPDATE_SETTINGS', payload: { timezone: t.label } });
                    setTzOpen(false);
                  }}
                >
                  <span>{t.label}</span>
                  <span className="tz-offset">UTC{t.offset}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <Tooltip tip={`${state.threats.length} records stored locally in IndexedDB on this device`} placement="bottom">
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {state.threats.length} records · local
          </span>
        </Tooltip>

        <Tooltip tip={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`} placement="bottom">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {settings.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </Tooltip>

        <Tooltip tip="Open settings — appearance, sync, database info and data management" placement="bottom">
          <button
            className={`icon-btn${state.activePanel === 'settings' ? ' active' : ''}`}
            onClick={() =>
              dispatch({ type: 'SET_PANEL',
                payload: state.activePanel === 'settings' ? null : 'settings' })}
            aria-label="Settings"
          >
            <SettingsIcon />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
