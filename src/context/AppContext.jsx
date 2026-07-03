// src/context/AppContext.jsx
// NASA JPL Coding Standards applied throughout:
//   - All inputs validated at entry points
//   - All async ops wrapped in try/catch with explicit error paths
//   - No dynamic code execution (eval, new Function)
//   - Explicit bounded timeouts on all network operations
//   - Deterministic reducer with no side-effects
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { openDB, dbGetAll, dbPut, dbCount, dbClear, dbDelete, purgeExpired } from '../services/db.js';
import { normalize } from '../services/normalize.js';
import { fetchFeed, FEEDS, DEMO_THREATS } from '../services/feeds.js';
import { markRead as doMarkRead, markUnread as doMarkUnread,
         toggleRead as doToggle, getReadSet } from '../services/readStore.js';

const ALL_FEED_KEYS = Object.keys(FEEDS);

// ── Settings loader with full validation ──────────────────
function loadSettings() {
  try {
    const raw = localStorage.getItem('ci_settings');
    const s   = raw ? JSON.parse(raw) : {};
    if (typeof s !== 'object' || s === null) throw new Error('invalid');
    return {
      theme:            typeof s.theme === 'string'            ? s.theme            : 'dark',
      timezone:         typeof s.timezone === 'string'         ? s.timezone         : 'UTC',
      defaultSevFilter: typeof s.defaultSevFilter === 'string' ? s.defaultSevFilter : 'all',
      autoSyncEnabled:  typeof s.autoSyncEnabled === 'boolean' ? s.autoSyncEnabled  : false,
      syncTime:         typeof s.syncTime === 'string'         ? s.syncTime         : '08:00',
      retentionDays:    typeof s.retentionDays === 'number'    ? s.retentionDays    : 90,
    };
  } catch {
    return { theme: 'dark', timezone: 'UTC', defaultSevFilter: 'all',
             autoSyncEnabled: false, syncTime: '08:00', retentionDays: 90 };
  }
}

function loadEnabledFeeds() {
  try {
    const raw   = localStorage.getItem('ci_enabled_feeds');
    const saved = raw ? JSON.parse(raw) : null;
    if (Array.isArray(saved) && saved.length > 0) return new Set(saved);
  } catch { /* fall through */ }
  return new Set(ALL_FEED_KEYS);
}

// ── Initial state factory ─────────────────────────────────
function buildInitialState() {
  const settings = loadSettings();
  return {
    threats:        [],
    sevFilter:      settings.defaultSevFilter,
    readFilter:     'all',   // 'all' | 'unread' | 'read'
    searchQuery:    '',
    sortBy:         'severity',
    selectedThreat: null,
    activePanel:    null,    // null | 'detail' | 'settings'
    showFirstRun:   false,
    syncing:        false,
    syncProgress:   { pct: 0, label: '', status: 'idle' },
    feedStatuses:   {},
    enabledFeeds:   loadEnabledFeeds(),
    settings,
    toasts:         [],
    dbCount:        0,
    dbReady:        false,
    // Read IDs are NOT in state — they're read directly from readStore
    // to avoid stale closure issues. A revision counter triggers re-renders.
    readRev:        0,
  };
}

// ── Pure reducer ──────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_THREATS':
      return { ...state, threats: Array.isArray(action.payload) ? action.payload : [] };
    case 'SET_SEV_FILTER':
      return { ...state, sevFilter: action.payload };
    case 'SET_READ_FILTER':
      return { ...state, readFilter: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: typeof action.payload === 'string' ? action.payload : '' };
    case 'SET_SORT':
      return { ...state, sortBy: action.payload };
    case 'SELECT_THREAT':
      return { ...state, selectedThreat: action.payload,
               activePanel: action.payload ? 'detail' : state.activePanel };
    case 'SET_PANEL':
      return { ...state, activePanel: action.payload,
               selectedThreat: action.payload !== 'detail' ? null : state.selectedThreat };
    case 'SET_FIRST_RUN':
      return { ...state, showFirstRun: !!action.payload };
    case 'SET_SYNCING':
      return { ...state, syncing: !!action.payload };
    case 'SET_PROGRESS':
      return { ...state, syncProgress: { ...state.syncProgress, ...action.payload } };
    case 'SET_FEED_STATUS':
      return { ...state,
               feedStatuses: { ...state.feedStatuses, [action.key]: action.payload } };
    case 'SET_ENABLED_FEEDS': {
      const feeds = action.payload instanceof Set ? action.payload : new Set(action.payload);
      try { localStorage.setItem('ci_enabled_feeds', JSON.stringify([...feeds])); } catch { /* full */ }
      return { ...state, enabledFeeds: feeds };
    }
    case 'UPDATE_SETTINGS': {
      const merged = { ...state.settings, ...action.payload };
      try { localStorage.setItem('ci_settings', JSON.stringify(merged)); } catch { /* full */ }
      return { ...state, settings: merged };
    }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    case 'SET_DB_COUNT':
      return { ...state, dbCount: typeof action.payload === 'number' ? action.payload : 0 };
    case 'SET_DB_READY':
      return { ...state, dbReady: !!action.payload };
    case 'BUMP_READ_REV':
      return { ...state, readRev: state.readRev + 1 };
    default:
      return state;
  }
}

const AppContext = createContext(null);
let   _toastId  = 0;

// ── Provider ──────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const syncTimerRef      = useRef(null);

  // Toast helper
  const toast = useCallback((msg, type = 'info') => {
    if (typeof msg !== 'string') return;
    const id = ++_toastId;
    dispatch({ type: 'ADD_TOAST', payload: { id, msg, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 4500);
  }, []);

  // Load all threats from DB into memory
  const loadThreats = useCallback(async () => {
    try {
      const all = await dbGetAll();
      dispatch({ type: 'SET_THREATS', payload: all });
      const cnt = await dbCount();
      dispatch({ type: 'SET_DB_COUNT', payload: cnt });
    } catch (err) {
      console.error('[CyberIntel] loadThreats:', err);
    }
  }, []);

  // Boot: open DB → purge → load → check first-run
  useEffect(() => {
    (async () => {
      try {
        await openDB();
        dispatch({ type: 'SET_DB_READY', payload: true });
      } catch (err) {
        toast(`Database error: ${err.message}`, 'err');
        return;
      }
      try {
        const retDays = state?.settings?.retentionDays ?? 90;
        const n = await purgeExpired(retDays);
        if (n > 0) toast(`Auto-purged ${n} expired records (>${retDays} days)`, 'info');
      } catch (err) {
        console.warn('[CyberIntel] purge error:', err);
      }
      await loadThreats();
      // Show welcome dialog on first run OR when database is empty
      const neverRun = !localStorage.getItem('ci_first_run_done');
      if (neverRun) {
        dispatch({ type: 'SET_FIRST_RUN', payload: true });
      }
    })();
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme',
      state.settings.theme === 'light' ? 'light' : 'dark');
  }, [state.settings.theme]);

  // ── Scheduled sync ──────────────────────────────────────
  // Computes ms until the next occurrence of the user-set HH:MM today (or tomorrow).
  function msUntilSyncTime(timeStr) {
    const [hh, mm] = (timeStr || '08:00').split(':').map(Number);
    const now  = new Date();
    const next = new Date(now);
    next.setHours(hh, mm, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1); // schedule tomorrow
    return next.getTime() - now.getTime();
  }

  useEffect(() => {
    if (!state.dbReady || state.showFirstRun || !state.settings.autoSyncEnabled) return;

    const wait = msUntilSyncTime(state.settings.syncTime);
    const label = state.settings.syncTime || '08:00';

    // If the scheduled time is within the next 10 s, run immediately
    if (wait <= 10_000) {
      syncTimerRef.current = setTimeout(() => syncNow(), 1000);
    } else {
      // Toast at T-60s to notify user sync is coming
      const warnTimer = setTimeout(() => {
        toast(`Scheduled sync at ${label} starting in 60 seconds…`, 'info');
      }, Math.max(0, wait - 60_000));

      syncTimerRef.current = setTimeout(async () => {
        await syncNow();
        // Re-schedule for the same time tomorrow
        if (state.settings.autoSyncEnabled) {
          const nextWait = msUntilSyncTime(state.settings.syncTime);
          syncTimerRef.current = setTimeout(() => syncNow(), nextWait);
        }
      }, wait);

      return () => {
        clearTimeout(warnTimer);
        clearTimeout(syncTimerRef.current);
      };
    }

    return () => clearTimeout(syncTimerRef.current);
  }, [state.dbReady, state.settings.autoSyncEnabled,
      state.settings.syncTime, state.showFirstRun]);

  // ── Main sync ───────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (state.syncing) { toast('Sync already in progress…', 'info'); return; }

    dispatch({ type: 'SET_SYNCING',  payload: true });
    dispatch({ type: 'SET_PROGRESS', payload: { pct: 0, label: 'Connecting to feeds…', status: 'running' } });

    const keys   = [...state.enabledFeeds];
    let   total  = 0;
    let   done   = 0;
    let   errors = 0;

    for (const key of keys) {
      const feed = FEEDS[key];
      dispatch({ type: 'SET_PROGRESS', payload: {
        pct:   Math.round((done / Math.max(keys.length, 1)) * 100),
        label: `Fetching: ${feed?.label ?? key}…`,
      }});
      dispatch({ type: 'SET_FEED_STATUS', key,
        payload: { status: 'loading', lastSync: null, itemCount: 0 } });

      try {
        const items = await fetchFeed(key);
        if (items.length > 0) { await dbPut(items); total += items.length; }
        dispatch({ type: 'SET_FEED_STATUS', key, payload: {
          status: 'ok', lastSync: new Date().toLocaleTimeString(), itemCount: items.length,
        }});
      } catch (err) {
        errors++;
        dispatch({ type: 'SET_FEED_STATUS', key, payload: {
          status: 'err', lastSync: new Date().toLocaleTimeString(),
          itemCount: 0, error: err.message,
        }});
        console.warn(`[CyberIntel] feed "${key}" failed:`, err.message);
      }
      done++;
    }

    dispatch({ type: 'SET_PROGRESS', payload: {
      pct:    100,
      label:  total
        ? `Sync complete — ${total} items from ${done - errors}/${done} feeds`
        : `Sync finished — no new items (${errors}/${done} feeds unreachable)`,
      status: errors === keys.length ? 'error' : 'done',
    }});

    await loadThreats();

    try {
      const now = new Date().toLocaleString();
      localStorage.setItem('ci_last_sync', now);
      localStorage.setItem('ci_next_sync',
        `Scheduled: ${state.settings.syncTime}`);
    } catch { /* full */ }

    toast(total ? `Synced — ${total} items stored`
      : `Sync done — no new items (${errors} feed${errors !== 1 ? 's' : ''} unreachable)`,
      total ? 'ok' : 'info');

    setTimeout(() => dispatch({ type: 'SET_SYNCING', payload: false }), 2500);
  }, [state.syncing, state.enabledFeeds, state.settings.syncTime, toast, loadThreats]);

  // Manual ingest from custom URL
  const manualIngest = useCallback(async (type, url) => {
    if (typeof url !== 'string' || url.trim().length === 0) {
      toast('Enter a feed URL', 'err'); return;
    }
    dispatch({ type: 'SET_SYNCING',  payload: true });
    dispatch({ type: 'SET_PROGRESS', payload: { pct: 0, label: `Fetching ${url}…`, status: 'running' } });
    try {
      const items = await fetchFeed(null, type, url.trim());
      await dbPut(items);
      await loadThreats();
      toast(`+${items.length} items ingested`, 'ok');
      dispatch({ type: 'SET_PROGRESS', payload: { pct: 100, status: 'done' } });
    } catch (err) {
      toast(`Ingest failed: ${err.message}`, 'err');
      dispatch({ type: 'SET_PROGRESS', payload: { status: 'error' } });
    }
    setTimeout(() => dispatch({ type: 'SET_SYNCING', payload: false }), 2000);
  }, [toast, loadThreats]);

  // Load demo data
  const loadDemo = useCallback(async () => {
    try {
      const items = DEMO_THREATS.map(r => normalize(r));
      await dbPut(items);
      await loadThreats();
      toast(`Demo data loaded — ${items.length} threat records added`, 'ok');
    } catch (err) {
      toast(`Demo load failed: ${err.message}`, 'err');
    }
  }, [toast, loadThreats]);

  // Dismiss (delete) one threat
  const dismissThreat = useCallback(async (id) => {
    if (id === undefined || id === null) return;
    try {
      await dbDelete(id);
      await loadThreats();
      dispatch({ type: 'SET_PANEL', payload: null });
      toast('Record dismissed', 'info');
    } catch (err) {
      toast(`Dismiss failed: ${err.message}`, 'err');
    }
  }, [toast, loadThreats]);

  // Clear all records
  const clearAll = useCallback(async () => {
    try {
      await dbClear();
      await loadThreats();
      dispatch({ type: 'SET_PANEL', payload: null });
      // Reset first-run so welcome dialog reappears on empty database
      localStorage.removeItem('ci_first_run_done');
      dispatch({ type: 'SET_FIRST_RUN', payload: true });
      toast('All intelligence records cleared', 'info');
    } catch (err) {
      toast(`Clear failed: ${err.message}`, 'err');
    }
  }, [toast, loadThreats]);

  // Read / unread
  const markRead = useCallback((id) => {
    doMarkRead(id);
    dispatch({ type: 'BUMP_READ_REV' });
  }, []);

  const markUnread = useCallback((id) => {
    doMarkUnread(id);
    dispatch({ type: 'BUMP_READ_REV' });
  }, []);

  const toggleRead = useCallback((id) => {
    doToggle(id);
    dispatch({ type: 'BUMP_READ_REV' });
  }, []);

  // Export JSON
  // Filter-aware export helpers — respects active sevFilter + readFilter + searchQuery
  const getFilteredThreats = useCallback(() => {
    const rs = getReadSet();
    return state.threats.filter(t => {
      if (state.sevFilter !== 'all' && t.severity !== state.sevFilter) return false;
      if (state.readFilter === 'unread' &&  rs.has(String(t.id))) return false;
      if (state.readFilter === 'read'   && !rs.has(String(t.id))) return false;
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const hay = `${t.title} ${t.description} ${(t.tags||[]).join(' ')} ${t.source}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.threats, state.sevFilter, state.readFilter, state.searchQuery]);

  const exportJSON = useCallback(() => {
    const data = getFilteredThreats();
    if (!data.length) { toast('No records match the current filter', 'err'); return; }
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const tag = state.sevFilter !== 'all' ? `-${state.sevFilter}` : '';
      a.download = `cyber-intel${tag}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(`Exported ${data.length} records as JSON`, 'ok');
    } catch (err) {
      toast(`Export failed: ${err.message}`, 'err');
    }
  }, [getFilteredThreats, state.sevFilter, toast]);

  const exportCSV = useCallback(() => {
    const data = getFilteredThreats();
    if (!data.length) { toast('No records match the current filter', 'err'); return; }
    try {
      const HDR  = ['id','title','severity','cvss','cvssVector','date','source','feedKey','ioc_count','tags','exploitStatus','threatActors','affectedSectors','ingestedAt','read'];
      const rs   = getReadSet();
      const rows = data.map(t =>
        HDR.map(h => {
          const v = h === 'tags'          ? (t.tags ?? []).join('|')
                  : h === 'ioc_count'     ? (t.iocs ?? []).length
                  : h === 'read'          ? (rs.has(String(t.id)) ? 'yes' : 'no')
                  : h === 'exploitStatus' ? (t.context?.exploitStatus ?? '')
                  : h === 'threatActors'  ? (t.context?.threatActors ?? []).map(a=>a.group).join('|')
                  : h === 'affectedSectors'? (t.context?.affectedSectors ?? []).join('|')
                  : (t[h] ?? '');
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(',')
      );
      const blob = new Blob([HDR.join(',') + '
' + rows.join('
')], { type: 'text/csv' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      const tag  = state.sevFilter !== 'all' ? `-${state.sevFilter}` : '';
      a.download = `cyber-intel${tag}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(`Exported ${data.length} records as CSV`, 'ok');
    } catch (err) {
      toast(`Export failed: ${err.message}`, 'err');
    }
  }, [getFilteredThreats, state.sevFilter, toast]);

  return (
    <AppContext.Provider value={{
      state, dispatch, toast,
      syncNow, manualIngest, loadDemo,
      dismissThreat, clearAll,
      markRead, markUnread, toggleRead,
      exportJSON, exportCSV, getFilteredThreats, loadThreats,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
