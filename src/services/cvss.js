// src/services/cvss.js
// Full CVSS v3.1 Base Score calculator per FIRST specification:
// https://www.first.org/cvss/v3.1/specification-document
//
// Formula:
//   ISCBase  = 1 - [(1-C) × (1-I) × (1-A)]
//   ISC (Unchanged scope) = 6.42 × ISCBase
//   ISC (Changed scope)   = 7.52 × [ISCBase - 0.029] - 3.25 × [ISCBase - 0.02]^15
//   Exploitability        = 8.22 × AV × AC × PR × UI
//   If ISC ≤ 0 → Score = 0
//   If Unchanged scope → Score = Roundup(min(ISC + Exploitability, 10))
//   If Changed scope   → Score = Roundup(min(1.08 × (ISC + Exploitability), 10))
//
// NASA JPL: no eval, all inputs validated with explicit enum checks

// ── Metric weights per CVSS v3.1 spec ────────────────────
export const METRIC_WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.20 },
  AC: { L: 0.77, H: 0.44 },
  // PR weights differ based on Scope (U vs C)
  PR: {
    U: { N: 0.85, L: 0.62, H: 0.27 },
    C: { N: 0.85, L: 0.50, H: 0.50 },
  },
  UI: { N: 0.85, R: 0.62 },
  C:  { H: 0.56, L: 0.22, N: 0.00 },
  I:  { H: 0.56, L: 0.22, N: 0.00 },
  A:  { H: 0.56, L: 0.22, N: 0.00 },
};

export const METRIC_LABELS = {
  AV: {
    N: 'Network',
    A: 'Adjacent',
    L: 'Local',
    P: 'Physical',
  },
  AC: { L: 'Low', H: 'High' },
  PR: { N: 'None', L: 'Low', H: 'High' },
  UI: { N: 'None', R: 'Required' },
  S:  { U: 'Unchanged', C: 'Changed' },
  C:  { H: 'High', L: 'Low', N: 'None' },
  I:  { H: 'High', L: 'Low', N: 'None' },
  A:  { H: 'High', L: 'Low', N: 'None' },
};

export const METRIC_DESCRIPTIONS = {
  AV: 'Attack Vector — How the vulnerability is exploited',
  AC: 'Attack Complexity — Conditions beyond attacker control',
  PR: 'Privileges Required — Level of access needed to exploit',
  UI: 'User Interaction — Whether a user must participate',
  S:  'Scope — Whether impact crosses a security boundary',
  C:  'Confidentiality Impact — Disclosure of sensitive information',
  I:  'Integrity Impact — Ability to modify data',
  A:  'Availability Impact — Disruption to legitimate users',
};

// ── CVSS v3.1 Roundup function ────────────────────────────
// Rounds up to nearest 0.1 (not standard rounding)
function roundup(x) {
  const i = Math.round(x * 100000);
  if (i % 10000 === 0) return i / 100000;
  return (Math.floor(i / 10000) + 1) / 10;
}

// ── Core CVSS v3.1 score calculator ──────────────────────
// @param {object} v — metric values { AV, AC, PR, UI, S, C, I, A }
// @returns {{ score: number, severity: string, vector: string, breakdown: object }}
export function calculateCVSS(v) {
  // Input validation — all 8 metrics required
  const required = ['AV','AC','PR','UI','S','C','I','A'];
  for (const m of required) {
    if (!v[m]) throw new Error(`Missing CVSS metric: ${m}`);
  }

  const av  = METRIC_WEIGHTS.AV[v.AV];
  const ac  = METRIC_WEIGHTS.AC[v.AC];
  const pr  = METRIC_WEIGHTS.PR[v.S][v.PR];  // PR weight depends on Scope
  const ui  = METRIC_WEIGHTS.UI[v.UI];
  const c   = METRIC_WEIGHTS.C[v.C];
  const i   = METRIC_WEIGHTS.I[v.I];
  const a   = METRIC_WEIGHTS.A[v.A];

  if ([av,ac,pr,ui,c,i,a].some(w => w === undefined)) {
    throw new Error('Invalid CVSS metric value');
  }

  // Impact sub-score
  const iscBase = 1 - (1 - c) * (1 - i) * (1 - a);
  let iss;
  if (v.S === 'U') {
    iss = 6.42 * iscBase;
  } else {
    iss = 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15);
  }

  if (iss <= 0) {
    return { score: 0.0, severity: 'none', vector: buildVector(v), breakdown: buildBreakdown(v, 0, 0) };
  }

  // Exploitability sub-score
  const ess = 8.22 * av * ac * pr * ui;

  let raw;
  if (v.S === 'U') {
    raw = Math.min(iss + ess, 10);
  } else {
    raw = Math.min(1.08 * (iss + ess), 10);
  }

  const score = roundup(raw);

  return {
    score,
    severity:    scoreSeverity(score),
    vector:      buildVector(v),
    impactScore: Math.round(iss * 10) / 10,
    exploitScore: Math.round(ess * 10) / 10,
    breakdown:   buildBreakdown(v, iss, ess),
  };
}

function buildVector(v) {
  return `CVSS:3.1/AV:${v.AV}/AC:${v.AC}/PR:${v.PR}/UI:${v.UI}/S:${v.S}/C:${v.C}/I:${v.I}/A:${v.A}`;
}

function buildBreakdown(v, iss, ess) {
  return {
    AV: { val: v.AV, label: METRIC_LABELS.AV[v.AV], weight: METRIC_WEIGHTS.AV[v.AV] },
    AC: { val: v.AC, label: METRIC_LABELS.AC[v.AC], weight: METRIC_WEIGHTS.AC[v.AC] },
    PR: { val: v.PR, label: METRIC_LABELS.PR[v.PR], weight: METRIC_WEIGHTS.PR[v.S]?.[v.PR] },
    UI: { val: v.UI, label: METRIC_LABELS.UI[v.UI], weight: METRIC_WEIGHTS.UI[v.UI] },
    S:  { val: v.S,  label: METRIC_LABELS.S[v.S]  },
    C:  { val: v.C,  label: METRIC_LABELS.C[v.C],  weight: METRIC_WEIGHTS.C[v.C] },
    I:  { val: v.I,  label: METRIC_LABELS.I[v.I],  weight: METRIC_WEIGHTS.I[v.I] },
    A:  { val: v.A,  label: METRIC_LABELS.A[v.A],  weight: METRIC_WEIGHTS.A[v.A] },
    impactScore:   iss,
    exploitScore:  ess,
  };
}

export function scoreSeverity(score) {
  if (score === 0.0)          return 'none';
  if (score < 4.0)            return 'low';
  if (score < 7.0)            return 'medium';
  if (score < 9.0)            return 'high';
  return 'critical';
}

// ── Parse a CVSS v3.x vector string ──────────────────────
// Accepts: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
// Returns: { AV, AC, PR, UI, S, C, I, A } or null
export function parseVector(vectorStr) {
  if (typeof vectorStr !== 'string') return null;
  const parts = vectorStr.split('/');
  const map = {};
  for (const part of parts) {
    const [k, v] = part.split(':');
    if (k && v) map[k] = v;
  }
  const required = ['AV','AC','PR','UI','S','C','I','A'];
  if (!required.every(k => map[k])) return null;
  return map;
}

// ── Infer CVSS metrics from article text + context ────────
// Provides the best-guess metric vector when no CVE score is available.
// Each heuristic is documented with its rationale.
export function inferCVSSMetrics(raw, iocs, context) {
  const text = `${raw.title||''} ${raw.description||''}`.toLowerCase();
  const exploitStatus = context?.exploitStatus ?? 'unknown';

  // ── Attack Vector ─────────────────────────────────────
  // Network: exploitable over internet (most web/service vulns)
  // Adjacent: requires LAN/Bluetooth proximity
  // Local: requires local shell access
  // Physical: requires physical presence
  let AV = 'N';
  if (/physical access|usb|hardware|firmware|serial port|jtag/.test(text)) AV = 'P';
  else if (/local exploit|local privilege|local attacker|local shell|requires.*local|sandbox escape/.test(text)) AV = 'L';
  else if (/adjacent|bluetooth|wifi|arp|local network|lan-based|proximity/.test(text)) AV = 'A';

  // ── Attack Complexity ─────────────────────────────────
  // Low: no special conditions (most exploits)
  // High: requires race condition, specific config, auth bypass, etc.
  let AC = 'L';
  if (/race condition|heap spray|specific configuration|non-default|complex|requires.*interaction|man.in.the.middle|timing/.test(text)) AC = 'H';

  // ── Privileges Required ───────────────────────────────
  // None: unauthenticated exploitation
  // Low: any valid user account
  // High: admin/root required
  let PR = 'N';
  if (/requires.*admin|privileged account|root access|administrator.*required|high.*privilege|authenticated.*admin/.test(text)) PR = 'H';
  else if (/authenticated|logged.in|valid account|requires.*login|low.*privilege|regular user/.test(text)) PR = 'L';
  // Unauthenticated RCE always N
  if (/unauthenticated|pre-auth|no.*auth|without.*auth/.test(text)) PR = 'N';

  // ── User Interaction ──────────────────────────────────
  // None: exploitable without user action
  // Required: victim must click/open/visit something
  let UI = 'N';
  if (/user.*click|victim.*open|phishing|social engineering|user.*visit|user.*interact|lure/.test(text)) UI = 'R';

  // ── Scope ─────────────────────────────────────────────
  // Changed: impact crosses security boundary (container escape, hypervisor, browser sandbox)
  // Unchanged: stays within same authorization scope
  let S = 'U';
  if (/container escape|vm escape|hypervisor|browser sandbox|privilege.*escalat|cross.*boundary|out-of-scope|kernel.*exploit/.test(text)) S = 'C';

  // ── CIA Impact ────────────────────────────────────────
  // Default assumes significant impact for threat intel articles
  let C = 'H', I = 'H', A = 'H';

  // Reduce C if primarily availability attack
  if (/dos |denial.of.service|ddos|crash|reboot|disruption/.test(text)) {
    C = 'N'; I = 'N'; A = 'H';
  }
  // Info disclosure only
  if (/information disclosure|data leak|secret.*expos|config.*expos|read.*only|sensitive.*data/.test(text)) {
    C = 'H'; I = 'N'; A = 'N';
  }
  // Write-only injection (SQLi write, file write)
  if (/sql injection|file write|arbitrary write/.test(text) && !/dump|exfil|steal/.test(text)) {
    C = 'L'; I = 'H'; A = 'L';
  }
  // Full RCE/ransomware → High all
  if (/remote code execution|rce|ransomware|backdoor|webshell|web shell/.test(text)) {
    C = 'H'; I = 'H'; A = 'H';
  }
  // Patch/advisory with no active exploit — lower availability
  if (exploitStatus === 'patched' && exploitStatus !== 'active') {
    A = A === 'H' ? 'L' : A;
  }

  return { AV, AC, PR, UI, S, C, I, A };
}

// ── Full inferred CVSS score for an article ───────────────
// Returns { score, severity, vector, breakdown, inferred: true }
// or null if a known CVE score should be used instead.
export function inferCVSS(raw, iocs, context) {
  // If raw score is provided and valid, recalculate from vector if present
  if (raw.cvssVector) {
    const parsed = parseVector(raw.cvssVector);
    if (parsed) {
      try {
        return { ...calculateCVSS(parsed), inferred: false };
      } catch { /* fall through */ }
    }
  }
  if (raw.cvss && parseFloat(raw.cvss) > 0) {
    // Use the provided score as-is (e.g. from NVD feed)
    return {
      score:    parseFloat(raw.cvss),
      severity: scoreSeverity(parseFloat(raw.cvss)),
      inferred: false,
      vector:   raw.cvssVector ?? null,
      breakdown: null,
    };
  }

  // No known score — infer from content
  const sev = context?.exploitStatus;
  // Skip inference for pure news/advisory articles
  if (!raw.title) return null;
  const text = `${raw.title||''} ${raw.description||''}`.toLowerCase();
  const isVuln = /cve-|vulnerability|exploit|rce|bypass|injection|overflow|disclosure|denial.of.service|malware|ransomware/.test(text);
  if (!isVuln) return null;

  try {
    const metrics = inferCVSSMetrics(raw, iocs, context);
    return { ...calculateCVSS(metrics), inferred: true };
  } catch {
    return null;
  }
}
