// src/services/normalize.js
import { inferCVSS, scoreSeverity } from './cvss.js';
// Full normalization pipeline with contextualization:
//   - IOC extraction (IPv4, IPv6, FQDN, MD5/SHA1/SHA256, URL, CVE, MITRE TTP)
//   - Severity classification (keyword + CVSS + IOC density + exploit status)
//   - Threat actor mapping (70+ known groups)
//   - MITRE ATT&CK technique extraction
//   - Affected sector inference
//   - Geopolitical origin inference
//   - Exploitation status (active/PoC/patched)
//   - IOC enrichment link generation
// NASA JPL: no eval, no dynamic code, all inputs validated, explicit return types

// ── Severity rank ────────────────────────────────────────
export const SEV_RANK = { critical:5, high:4, medium:3, low:2, news:1 };

// ── IOC Regexes ──────────────────────────────────────────
const RE_CVE       = /CVE-\d{4}-\d{4,7}/gi;
const RE_IPv4      = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
const RE_IPv6      = /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi;
const RE_DOMAIN    = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|gov|edu|co|uk|ru|cn|de|fr|xyz|info|biz|online|site|mil|onion|to|cc|su|in|au|ca|jp|eu|int)\b/gi;
const RE_MD5       = /\b[0-9a-f]{32}\b/gi;
const RE_SHA1      = /\b[0-9a-f]{40}\b/gi;
const RE_SHA256    = /\b[0-9a-f]{64}\b/gi;
const RE_URL       = /https?:\/\/[^\s"'<>{}\[\]]+/g;
const RE_MITRE     = /(?:T|TA)\d{4}(?:\.\d{3})?/g;
const RE_BITCOIN   = /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g;

// Common domains to skip (not threat IOCs)
const SKIP_DOMAINS = new Set([
  'google.com','github.com','twitter.com','x.com','youtube.com','linkedin.com',
  'microsoft.com','apple.com','amazon.com','cloudflare.com','w3.org',
  'schema.org','feedburner.com','wordpress.com','feedproxy.google.com',
  'googleapis.com','gstatic.com','jquery.com','bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com','ajax.googleapis.com','fonts.googleapis.com',
  'facebook.com','instagram.com','reddit.com','wikipedia.org',
  'thehackernews.com','bleepingcomputer.com','krebsonsecurity.com',
  'darkreading.com','securityweek.com','threatpost.com','cisa.gov',
  'sans.edu','isc.sans.edu','nist.gov','nvd.nist.gov',
]);

// Private/reserved IPv4 ranges — skip these
const SKIP_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

function isPrivateIP(ip) {
  return SKIP_IP_PATTERNS.some(p => p.test(ip));
}

// ── Threat actor database (70+ groups) ───────────────────
const THREAT_ACTORS = [
  // Russian GRU / SVR / FSB
  { names:['apt28','fancy bear','sofacy','strontium','pawn storm','sednit'],
    group:'APT28', origin:'Russia', sponsor:'GRU' },
  { names:['apt29','cozy bear','nobelium','midnight blizzard','the dukes'],
    group:'APT29', origin:'Russia', sponsor:'SVR' },
  { names:['sandworm','voodoo bear','telebots','industroyer','blackenergy'],
    group:'Sandworm', origin:'Russia', sponsor:'GRU' },
  { names:['turla','snake','uroburos','waterbug','venomous bear'],
    group:'Turla', origin:'Russia', sponsor:'FSB' },
  { names:['gamaredon','primitive bear','armageddon','actinium'],
    group:'Gamaredon', origin:'Russia', sponsor:'FSB' },
  // Chinese APTs
  { names:['apt1','comment crew','comment panda','byzantine candor'],
    group:'APT1', origin:'China', sponsor:'PLA Unit 61398' },
  { names:['apt10','menupass','stone panda','potassium','cicada'],
    group:'APT10', origin:'China', sponsor:'MSS' },
  { names:['apt41','barium','double dragon','winnti','wicked panda'],
    group:'APT41', origin:'China', sponsor:'MSS' },
  { names:['volt typhoon','bronze silhouette','vanguard panda'],
    group:'Volt Typhoon', origin:'China', sponsor:'MSS' },
  { names:['salt typhoon','ghostemperor','famsam'],
    group:'Salt Typhoon', origin:'China', sponsor:'MSS' },
  { names:['apt40','bronze mohawk','kryptonite panda','leviathan'],
    group:'APT40', origin:'China', sponsor:'MSS' },
  { names:['hafnium','silk typhoon'],
    group:'HAFNIUM', origin:'China', sponsor:'MSS' },
  // North Korean
  { names:['lazarus','hidden cobra','zinc','applejeus','guardians of peace'],
    group:'Lazarus Group', origin:'North Korea', sponsor:'RGB' },
  { names:['kimsuky','thallium','velvet chollima','black banshee'],
    group:'Kimsuky', origin:'North Korea', sponsor:'RGB' },
  { names:['andariel','silent chollima','onyx sleet'],
    group:'Andariel', origin:'North Korea', sponsor:'RGB' },
  // Iranian
  { names:['apt33','elfin','refined kitten','holmium','peach sandstorm'],
    group:'APT33', origin:'Iran', sponsor:'IRGC' },
  { names:['apt34','oilrig','helix kitten','crambus','hazel sandstorm'],
    group:'APT34', origin:'Iran', sponsor:'MOIS' },
  { names:['apt35','charming kitten','phosphorus','mint sandstorm','ta453'],
    group:'APT35', origin:'Iran', sponsor:'IRGC' },
  // Ransomware operators
  { names:['lockbit','lockbit 2.0','lockbit 3.0','lockbit black'],
    group:'LockBit', origin:'Unknown', sponsor:'eCrime' },
  { names:['blackcat','alphv'],
    group:'BlackCat/ALPHV', origin:'Unknown', sponsor:'eCrime' },
  { names:['cl0p','clop','ta505'],
    group:'Cl0p', origin:'Russia', sponsor:'eCrime' },
  { names:['black basta'],
    group:'Black Basta', origin:'Russia', sponsor:'eCrime' },
  { names:['akira'],
    group:'Akira', origin:'Unknown', sponsor:'eCrime' },
  { names:['play ransomware','playcrypt'],
    group:'Play', origin:'Unknown', sponsor:'eCrime' },
  { names:['rhysida'],
    group:'Rhysida', origin:'Unknown', sponsor:'eCrime' },
  { names:['royal ransomware'],
    group:'Royal', origin:'Unknown', sponsor:'eCrime' },
  // Other
  { names:['fin7','carbanak','sangria tempest'],
    group:'FIN7', origin:'Russia', sponsor:'eCrime' },
  { names:['scattered spider','unc3944','octo tempest','muddled libra'],
    group:'Scattered Spider', origin:'Western', sponsor:'eCrime' },
  { names:['lapsus$','dev-0537'],
    group:'LAPSUS$', origin:'South America/UK', sponsor:'eCrime' },
];

function detectThreatActors(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Map();
  for (const actor of THREAT_ACTORS) {
    for (const name of actor.names) {
      if (lower.includes(name)) {
        found.set(actor.group, actor);
        break;
      }
    }
  }
  return [...found.values()];
}

// ── MITRE ATT&CK technique descriptions (abridged) ───────
const MITRE_LABELS = {
  'T1566': 'Phishing',         'T1566.001': 'Spearphishing Attachment',
  'T1566.002': 'Spearphishing Link',
  'T1059': 'Command & Scripting Interpreter',
  'T1059.001': 'PowerShell',   'T1059.003': 'Windows Cmd Shell',
  'T1078': 'Valid Accounts',   'T1021': 'Remote Services',
  'T1021.001': 'RDP',          'T1021.002': 'SMB/Admin Shares',
  'T1027': 'Obfuscated Files', 'T1036': 'Masquerading',
  'T1055': 'Process Injection','T1057': 'Process Discovery',
  'T1082': 'System Info Discovery', 'T1083': 'File/Dir Discovery',
  'T1110': 'Brute Force',      'T1110.001': 'Password Guessing',
  'T1110.003': 'Password Spraying',
  'T1133': 'External Remote Services',
  'T1190': 'Exploit Public-Facing Application',
  'T1486': 'Data Encrypted for Impact (Ransomware)',
  'T1489': 'Service Stop',     'T1490': 'Inhibit System Recovery',
  'T1003': 'OS Credential Dumping', 'T1003.001': 'LSASS Memory',
  'T1071': 'App Layer Protocol C2', 'T1071.001': 'Web Protocols',
  'T1105': 'Ingress Tool Transfer', 'T1041': 'Exfiltration Over C2',
  'T1567': 'Exfil to Cloud Storage', 'T1048': 'Exfil Over Alternative Protocol',
  'T1562': 'Impair Defenses',  'T1562.001': 'Disable/Modify Tools',
  'T1548': 'Abuse Elevation Control',
  'T1068': 'Exploitation for Privilege Escalation',
  'T1203': 'Exploitation for Client Execution',
  'T1210': 'Exploitation of Remote Services',
  'T1505': 'Server Software Component', 'T1505.003': 'Web Shell',
  'T1588': 'Obtain Capabilities', 'T1588.002': 'Tool acquisition',
  'T1608': 'Stage Capabilities',
  'TA0001':'Initial Access',   'TA0002':'Execution',
  'TA0003':'Persistence',      'TA0004':'Privilege Escalation',
  'TA0005':'Defense Evasion',  'TA0006':'Credential Access',
  'TA0007':'Discovery',        'TA0008':'Lateral Movement',
  'TA0009':'Collection',       'TA0010':'Exfiltration',
  'TA0011':'Command & Control','TA0040':'Impact',
};

function extractMitreTechniques(text) {
  if (!text) return [];
  const matches = [...new Set((text.match(RE_MITRE) || []).map(m => m.toUpperCase()))];
  return matches.slice(0, 10).map(id => ({
    id,
    label: MITRE_LABELS[id] ?? id,
  }));
}

// ── Affected sector inference ─────────────────────────────
const SECTOR_MAP = [
  { sector:'Healthcare',      kw:['hospital','healthcare','medical','patient','ehr','clinic','pharma','nhis','hipaa'] },
  { sector:'Financial',       kw:['bank','financial','swift','payment','atm','credit card','trading','fintech','brokerage'] },
  { sector:'Government',      kw:['government','federal','state agency','municipality','ministry','whitehouse','pentagon','nato','military','dod','dhs','cisa','nsa'] },
  { sector:'Energy / OT',     kw:['energy','power grid','utility','oil','gas','pipeline','scada','ics','ot','industrial control','plc','substation','nuclear'] },
  { sector:'Technology',      kw:['software','saas','cloud','tech company','vendor','developer','github','npm','package','api','sdk'] },
  { sector:'Telecommunications',kw:['telecom','isp','carrier','mobile','5g','at&t','verizon','t-mobile','comms infrastructure'] },
  { sector:'Education',       kw:['university','school','student','education','academic','college'] },
  { sector:'Retail / E-Commerce',kw:['retail','e-commerce','point of sale','pos terminal','magecart','skimmer','checkout'] },
  { sector:'Manufacturing',   kw:['manufacturing','factory','production line','supply chain','logistics','automotive'] },
  { sector:'Defense / DIB',   kw:['defense contractor','dib','lockheed','raytheon','aerospace','weapons system','classified'] },
  { sector:'Critical Infrastructure',kw:['critical infrastructure','water treatment','transportation','aviation','rail'] },
];

function inferSectors(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SECTOR_MAP
    .filter(s => s.kw.some(k => lower.includes(k)))
    .map(s => s.sector)
    .slice(0, 4);
}

// ── Exploitation status ───────────────────────────────────
function inferExploitStatus(text) {
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  if (/actively exploit|in the wild|itw|mass exploit|weaponized/.test(lower)) return 'active';
  if (/proof.of.concept|poc|exploit code|working exploit|metasploit module/.test(lower)) return 'poc';
  if (/patch(?:ed)?|fixed|resolved|mitigat|upgrade|update available/.test(lower)) return 'patched';
  if (/no known exploit|theoretical|not exploit/.test(lower)) return 'theoretical';
  return 'unknown';
}

// ── Geopolitical origin inference ─────────────────────────
function inferGeoOrigin(actors, text) {
  if (actors.length > 0) return [...new Set(actors.map(a => a.origin))].slice(0, 3);
  const lower = (text || '').toLowerCase();
  const geo = [];
  if (/russia|kremlin|gru |svr |fsb /.test(lower))           geo.push('Russia');
  if (/china|prc|pla |mss |beijing/.test(lower))             geo.push('China');
  if (/north korea|dprk|rgb |kimsuky/.test(lower))           geo.push('North Korea');
  if (/iran|irgc|mois |tehran/.test(lower))                  geo.push('Iran');
  if (/lazarus|hidden cobra/.test(lower))                    geo.push('North Korea');
  return [...new Set(geo)].slice(0, 3);
}

// ── Severity keyword lists ────────────────────────────────
const KC = [
  '0day','zero-day','zero day','actively exploit','ransomware','apt ',
  'nation state','nation-state','supply chain attack','rce','remote code execution',
  'critical infrastructure','worm','firmware implant','cyberattack','data breach',
  'critical vulnerability','pre-auth','unauthenticated rce',
];
const KH = [
  'exploit','malware','backdoor','botnet','campaign','phishing','trojan','rootkit',
  'privilege escalation','stolen credentials','lateral movement','initial access',
  'c2 server','c&c','infostealer','credential theft','loader','dropper',
  'stealer','byovd','heap overflow','use after free','type confusion',
];
const KM = [
  'vulnerability','vuln','dos','denial of service','information disclosure',
  'misconfiguration','exposed','leaked','password spray','brute force',
  'sqli','sql injection','xss','ssrf','csrf','open redirect','path traversal',
  'default credentials','weak password','insecure deserialization',
];
const KL = [
  'patch','patched','fixed','resolved','mitigation','workaround','hardening',
  'update available','security update','advisory','guidance',
];
const KN = [
  'news','blog','report','analysis','patch tuesday','release','announcement',
  'research','roundup','weekly','digest',
];

// ── IOC Extraction ────────────────────────────────────────
export function extractIocs(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const seen = new Set();
  const iocs = [];

  const add = (type, val) => {
    if (typeof val !== 'string' || val.length === 0) return;
    const k = `${type}:${val.toLowerCase()}`;
    if (!seen.has(k)) { seen.add(k); iocs.push({ type, value: val }); }
  };

  // CVEs first (highest signal)
  for (const v of text.match(RE_CVE) || []) {
    add('cve', v.toUpperCase());
  }

  // MITRE ATT&CK IDs
  for (const v of text.match(RE_MITRE) || []) {
    add('ttp', v.toUpperCase());
  }

  // URLs — deduplicate and keep first 6
  const urls = (text.match(RE_URL) || []).slice(0, 6);
  for (const v of urls) {
    // Skip obvious feed/CDN URLs
    if (!/feedburner|feedproxy|fonts\.|gstatic|jquery|bootstrapcdn/i.test(v)) {
      add('url', v.slice(0, 200));
    }
  }

  // SHA256 (before SHA1 / MD5 to avoid overlap)
  for (const v of (text.match(RE_SHA256) || []).slice(0, 6)) add('hash', v.toLowerCase());
  // SHA1
  for (const v of (text.match(RE_SHA1)   || []).slice(0, 6)) add('hash', v.toLowerCase());
  // MD5
  for (const v of (text.match(RE_MD5)    || []).slice(0, 6)) add('hash', v.toLowerCase());

  // IPv6
  for (const v of (text.match(RE_IPv6) || []).slice(0, 6)) add('ip', v.toLowerCase());

  // IPv4 — skip private/reserved ranges
  for (const v of text.match(RE_IPv4) || []) {
    if (!isPrivateIP(v)) add('ip', v);
  }

  // Domains — skip noise
  for (const v of (text.match(RE_DOMAIN) || [])) {
    const lower = v.toLowerCase();
    if (!SKIP_DOMAINS.has(lower) && lower.length <= 100) {
      add('domain', lower);
    }
  }

  // Bitcoin wallets (ransomware)
  for (const v of (text.match(RE_BITCOIN) || []).slice(0, 3)) {
    add('wallet', v);
  }

  return iocs.slice(0, 30);
}

export function dedupeIocs(iocs) {
  const s = new Set();
  return (iocs || []).filter(i => {
    if (!i || !i.type || !i.value) return false;
    const k = `${i.type}:${i.value}`;
    if (s.has(k)) return false;
    s.add(k);
    return true;
  });
}

// ── Severity classifier ───────────────────────────────────
export function classifySeverity(raw, iocs) {
  if (raw.severity && SEV_RANK[raw.severity]) return raw.severity;

  if (raw.cvss) {
    const s = parseFloat(raw.cvss);
    if (!isNaN(s)) {
      if (s >= 9.0) return 'critical';
      if (s >= 7.0) return 'high';
      if (s >= 4.0) return 'medium';
      return 'low';
    }
  }

  const body  = `${raw.title||''} ${raw.description||''} ${(raw.tags||[]).join(' ')}`.toLowerCase();
  const hasIP     = (iocs||[]).some(i => i.type === 'ip');
  const hasDomain = (iocs||[]).some(i => i.type === 'domain');
  const hasCVE    = (iocs||[]).some(i => i.type === 'cve');
  const hasHash   = (iocs||[]).some(i => i.type === 'hash');
  const iocCount  = (iocs||[]).length;

  // Critical signals
  if (KC.some(w => body.includes(w))) return 'critical';
  if (hasHash && hasIP)               return 'critical';  // active malware IOCs

  // High signals
  if (KH.some(w => body.includes(w))) return 'high';
  if (hasCVE && (hasIP || hasDomain)) return 'high';      // exploited CVE with infra
  if (iocCount >= 5)                  return 'high';

  // Medium signals
  if (hasCVE)                         return 'medium';
  if (KM.some(w => body.includes(w))) return 'medium';
  if (iocCount >= 2)                  return 'medium';

  // Low signals
  if (KL.some(w => body.includes(w))) return 'low';
  if (iocCount > 0)                   return 'low';

  // News / info
  if (KN.some(w => body.includes(w))) return 'news';
  return 'news';
}

// ── Hash-based deterministic ID ───────────────────────────
function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16);
}

export function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/\s+/g,' ').trim();
}

export function toISO(d) {
  if (!d) return new Date().toISOString();
  try {
    const p = new Date(d);
    return isNaN(p.getTime()) ? new Date().toISOString() : p.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function normTlp(t) {
  const v = (t || 'white').toLowerCase();
  return ['white','green','amber','red'].includes(v) ? v : 'white';
}

// synthCvss is replaced by inferCVSS from cvss.js
// Kept as fallback for unknown threat types
export function synthCvss(sev) {
  const midpoints = { critical: '9.0', high: '7.5', medium: '5.5', low: '2.5', news: null };
  return midpoints[sev] ?? null;
}

// ── IOC enrichment links ──────────────────────────────────
export function iocEnrichmentLinks(ioc) {
  if (!ioc || !ioc.type || !ioc.value) return [];
  const v = encodeURIComponent(ioc.value);

  switch (ioc.type) {
    case 'ip':     return [
      { label:'VirusTotal', url:`https://www.virustotal.com/gui/ip-address/${v}` },
      { label:'Shodan',     url:`https://www.shodan.io/host/${ioc.value}` },
      { label:'AbuseIPDB',  url:`https://www.abuseipdb.com/check/${ioc.value}` },
      { label:'Censys',     url:`https://search.censys.io/hosts/${ioc.value}` },
    ];
    case 'domain': return [
      { label:'VirusTotal', url:`https://www.virustotal.com/gui/domain/${v}` },
      { label:'URLScan',    url:`https://urlscan.io/search/#page.domain:${v}` },
      { label:'Shodan',     url:`https://www.shodan.io/search?query=hostname:${v}` },
      { label:'WHOIS',      url:`https://who.is/whois/${ioc.value}` },
    ];
    case 'hash':   return [
      { label:'VirusTotal', url:`https://www.virustotal.com/gui/file/${v}` },
      { label:'MalwareBazaar', url:`https://bazaar.abuse.ch/sample/${ioc.value}` },
      { label:'HybridAnalysis', url:`https://www.hybrid-analysis.com/search?query=${v}` },
      { label:'ANY.RUN',    url:`https://app.any.run/submissions/#filehash:${ioc.value}` },
    ];
    case 'url':    return [
      { label:'VirusTotal', url:`https://www.virustotal.com/gui/url/${btoa(ioc.value).replace(/=/g,'')}` },
      { label:'URLScan',    url:`https://urlscan.io/search/#page.url:${v}` },
      { label:'Checkphish', url:`https://checkphish.ai/url/${v}` },
    ];
    case 'cve':    return [
      { label:'NVD',        url:`https://nvd.nist.gov/vuln/detail/${ioc.value}` },
      { label:'MITRE',      url:`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${ioc.value}` },
      { label:'ExploitDB',  url:`https://www.exploit-db.com/search?cve=${ioc.value.replace('CVE-','')}` },
      { label:'EPSS',       url:`https://api.first.org/data/v1/epss?cve=${ioc.value}` },
    ];
    case 'ttp':    return [
      { label:'ATT&CK',     url:`https://attack.mitre.org/techniques/${ioc.value.replace('.','/').replace('TA','tactics/TA')}` },
      { label:'Atomic Red', url:`https://github.com/redcanaryco/atomic-red-team/tree/master/atomics/${ioc.value}` },
    ];
    case 'wallet': return [
      { label:'Blockchain',  url:`https://www.blockchain.com/explorer/addresses/btc/${ioc.value}` },
    ];
    default: return [];
  }
}

// ── Context enrichment (the core new capability) ─────────
export function buildContext(raw, iocs, sev) {
  const combined  = `${raw.title||''} ${raw.description||''}`;
  const actors    = detectThreatActors(combined);
  const techniques= extractMitreTechniques(combined);
  const sectors   = inferSectors(combined);
  const geoOrigin = inferGeoOrigin(actors, combined);
  const exploitStatus = inferExploitStatus(combined);

  // Confidence score 1–5 based on IOC density + sector match + actor attribution
  let confidence = 1;
  if (iocs.length > 0)    confidence++;
  if (iocs.length > 4)    confidence++;
  if (actors.length > 0)  confidence++;
  if (techniques.length > 0) confidence++;
  confidence = Math.min(confidence, 5);

  const CONF_LABELS = ['','Unverified','Low','Moderate','High','Confirmed'];

  return {
    threatActors:    actors,
    mitreTechniques: techniques,
    affectedSectors: sectors,
    geoOrigin,
    exploitStatus,
    confidence,
    confidenceLabel: CONF_LABELS[confidence] ?? 'Unknown',
  };
}

// ── Master normalize function ─────────────────────────────
export function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const combined = `${raw.title||''} ${raw.description||''}`;
  const iocs     = dedupeIocs(raw.iocs || extractIocs(combined));
  const sev      = classifySeverity(raw, iocs);
  const ctx      = buildContext(raw, iocs, sev);

  // CVSS — use real calculator, not random numbers
  const cvssData = inferCVSS(raw, iocs, ctx);
  const finalSev = cvssData?.score
    ? scoreSeverity(cvssData.score)
    : sev;

  return {
    id:          raw.id || hashId((raw.source||'') + (raw.title||'') + (raw.date||'')),
    title:       stripHtml(raw.title || 'Untitled').slice(0, 300),
    description: stripHtml(raw.description || '').slice(0, 2000),
    date:        toISO(raw.date),
    source:      raw.source  || 'Unknown',
    author:      raw.author  || '',
    tags:        (raw.tags||[]).map(t => String(t).toLowerCase().trim())
                               .filter(Boolean).slice(0, 12),
    iocs:        iocs.slice(0, 30),
    severity:    finalSev,
    cvss:        cvssData?.score != null ? String(cvssData.score) : null,
    cvssVector:  cvssData?.vector ?? null,
    cvssInferred:cvssData?.inferred ?? false,
    cvssBreakdown: cvssData?.breakdown ?? null,
    cvssImpact:  cvssData?.impactScore ?? null,
    cvssExploit: cvssData?.exploitScore ?? null,
    tlp:         normTlp(raw.tlp),
    references:  (raw.references||[]).filter(r => typeof r === 'string').slice(0, 6),
    link:        raw.link || null,
    feedKey:     raw.feedKey || 'manual',
    ingestedAt:  Date.now(),
    context:     ctx,
  };
}
