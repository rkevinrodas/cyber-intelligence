// src/services/readStore.js
// Manages the read/unread state for threat records.
// Stored in localStorage as a JSON-encoded Set of IDs.
// Kept separate from IndexedDB to avoid schema migrations.

const STORAGE_KEY = 'ci_read_ids';

// Prototype-pollution-safe parse: drops __proto__/constructor/prototype
// keys and enforces that the result is an array of strings only.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw, (key, value) =>
      FORBIDDEN_KEYS.has(key) ? undefined : value
    );
    if (!Array.isArray(arr)) return new Set();
    // Only string IDs are valid — silently drop anything else
    return new Set(arr.filter(v => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function save(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* storage full — silent */ }
}

export function isRead(id) {
  return load().has(String(id));
}

export function markRead(id) {
  if (!id) return;
  const s = load();
  s.add(String(id));
  save(s);
}

export function markUnread(id) {
  if (!id) return;
  const s = load();
  s.delete(String(id));
  save(s);
}

export function toggleRead(id) {
  if (!id) return;
  const s = load();
  s.has(String(id)) ? s.delete(String(id)) : s.add(String(id));
  save(s);
  return s.has(String(id));
}

export function getReadSet() {
  return load();
}

export function countUnread(threats) {
  if (!Array.isArray(threats)) return 0;
  const s = load();
  return threats.filter(t => !s.has(String(t.id))).length;
}
