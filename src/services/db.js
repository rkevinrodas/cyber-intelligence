// src/services/db.js — IndexedDB operations
const DB_NAME = 'cyber_intel_v1';
const DB_VER  = 1;
const STORE   = 'threats';
const DEFAULT_TTL_DAYS = 90;
const TTL_MS  = DEFAULT_TTL_DAYS * 86_400_000;

let db = null;

export function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (d.objectStoreNames.contains(STORE)) d.deleteObjectStore(STORE);
      const st = d.createObjectStore(STORE, { keyPath: 'id' });
      ['severity','date','source','ingestedAt'].forEach(k =>
        st.createIndex(k, k, { unique: false })
      );
    };
    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror   = e => rej(e.target.error);
  });
}

export function dbPut(items) {
  return new Promise((res, rej) => {
    if (!items.length) { res(0); return; }
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    let n = 0;
    items.forEach(item => {
      const r = st.put(item);
      r.onsuccess = r.onerror = () => { if (++n === items.length) res(n); };
    });
    tx.onerror = e => rej(e.target.error);
  });
}

export function dbGetAll() {
  return new Promise((res, rej) => {
    const r = db.transaction(STORE,'readonly').objectStore(STORE).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror   = e => rej(e.target.error);
  });
}

export function dbCount() {
  return new Promise((res, rej) => {
    const r = db.transaction(STORE,'readonly').objectStore(STORE).count();
    r.onsuccess = () => res(r.result);
    r.onerror   = e => rej(e.target.error);
  });
}

export function dbDelete(id) {
  return new Promise((res, rej) => {
    const r = db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);
    r.onsuccess = () => res();
    r.onerror   = e => rej(e.target.error);
  });
}

export function dbClear() {
  return new Promise((res, rej) => {
    const r = db.transaction(STORE,'readwrite').objectStore(STORE).clear();
    r.onsuccess = () => res();
    r.onerror   = e => rej(e.target.error);
  });
}

export function purgeExpired(retentionDays = DEFAULT_TTL_DAYS) {
  return new Promise(res => {
    if (!db) { res(0); return; }
    const ttl    = (retentionDays > 0 ? retentionDays : DEFAULT_TTL_DAYS) * 86_400_000;
    const cutoff = Date.now() - ttl;
    const tx  = db.transaction(STORE, 'readwrite');
    const idx = tx.objectStore(STORE).index('ingestedAt');
    let cnt   = 0;
    const req = idx.openCursor(IDBKeyRange.upperBound(cutoff));
    req.onsuccess = e => {
      const cur = e.target.result;
      if (cur) { cur.delete(); cnt++; cur.continue(); }
      else res(cnt);
    };
  });
}

// Return browser-specific IndexedDB storage path info for the UI
export function getDbPathInfo() {
  const ua = navigator.userAgent;
  const isChrome  = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isEdge    = /Edg\//.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari  = /Safari/.test(ua) && !isChrome;

  const info = { browser: 'Unknown', windows: null, mac: null, linux: null };
  if (isChrome) {
    info.browser = 'Google Chrome';
    info.windows = '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\IndexedDB';
    info.mac     = '~/Library/Application Support/Google/Chrome/Default/IndexedDB';
    info.linux   = '~/.config/google-chrome/Default/IndexedDB';
  } else if (isEdge) {
    info.browser = 'Microsoft Edge';
    info.windows = '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\IndexedDB';
    info.mac     = '~/Library/Application Support/Microsoft Edge/Default/IndexedDB';
  } else if (isFirefox) {
    info.browser = 'Mozilla Firefox';
    info.windows = '%APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\storage\\default';
    info.mac     = '~/Library/Application Support/Firefox/Profiles/<profile>/storage/default';
    info.linux   = '~/.mozilla/firefox/<profile>/storage/default';
  } else if (isSafari) {
    info.browser = 'Apple Safari';
    info.mac     = '~/Library/Safari/databases/';
  }
  return info;
}

export const DB_NAME_EXPORT = DB_NAME;
export const STORE_EXPORT   = STORE;
export const TTL_MS_EXPORT  = TTL_MS;
