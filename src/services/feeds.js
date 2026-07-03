// src/services/feeds.js
// NASA JPL Institutional Coding Standard compliance:
//   - All inputs validated before use
//   - All promises wrapped in try/catch
//   - No eval(), no innerHTML, no dynamic code execution
//   - Explicit timeout on every network call
//   - Return type is always a defined shape
import { normalize } from './normalize.js';

const PROXY   = 'https://api.allorigins.win/get?url=';
const TIMEOUT = 14_000; // 14 s — explicit bounded wait

export const FEEDS = {
  hackernews: {
    key:   'hackernews',
    label: 'The Hacker News',
    url:   'https://feeds.feedburner.com/TheHackersNews',
    type:  'rss',
    desc:  'Leading cybersecurity news covering vulnerabilities, breaches, APTs, and emerging threats.',
    badge: 'News',
  },
  bleeping: {
    key:   'bleeping',
    label: 'Bleeping Computer',
    url:   'https://www.bleepingcomputer.com/feed/',
    type:  'rss',
    desc:  'Technical security publication covering malware, ransomware, data breaches, and security tools.',
    badge: 'News',
  },
  sans: {
    key:   'sans',
    label: 'SANS Internet Storm Center',
    url:   'https://isc.sans.edu/rssfeed_full.xml',
    type:  'rss',
    desc:  'Real-time threat monitoring diary from SANS security analysts with technical IOC data.',
    badge: 'Threat Intel',
  },
  cisa: {
    key:   'cisa',
    label: 'CISA Advisories',
    url:   'https://www.cisa.gov/uscert/ncas/all.xml',
    type:  'rss',
    desc:  'Official US government cybersecurity advisories, ICS alerts, and Known Exploited Vulnerability (KEV) updates.',
    badge: 'Gov Advisory',
  },
  krebs: {
    key:   'krebs',
    label: 'Krebs on Security',
    url:   'https://krebsonsecurity.com/feed/',
    type:  'rss',
    desc:  'Investigative journalism covering cybercrime, fraud, and threat actor activity.',
    badge: 'Investigative',
  },
  darkread: {
    key:   'darkread',
    label: 'Dark Reading',
    url:   'https://www.darkreading.com/rss.xml',
    type:  'rss',
    desc:  'Enterprise security research covering cloud, identity, and application security.',
    badge: 'Enterprise',
  },
  secweek: {
    key:   'secweek',
    label: 'Security Week',
    url:   'https://www.securityweek.com/feed/',
    type:  'rss',
    desc:  'Broad threat coverage including ICS/OT security, geopolitical threats, and vendor advisories.',
    badge: 'Broad Intel',
  },
  threatpost: {
    key:   'threatpost',
    label: 'Threatpost',
    url:   'https://threatpost.com/feed/',
    type:  'rss',
    desc:  'Vulnerability and exploit research covering threat actor campaigns.',
    badge: 'Research',
  },
};

// ── Fetch with hard timeout (AbortController) ────────────
async function fetchWithTimeout(url, ms) {
  if (typeof url !== 'string' || url.length === 0) {
    throw new TypeError('fetchWithTimeout: url must be a non-empty string');
  }
  if (typeof ms !== 'number' || ms <= 0) {
    throw new TypeError('fetchWithTimeout: ms must be a positive number');
  }
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal });
    clearTimeout(t);
    return r;
  } catch (err) {
    clearTimeout(t);
    throw err;
  }
}

// ── Safe text extractor — never throws ───────────────────
function safeText(node) {
  if (!node) return '';
  return (node.textContent ?? '').trim();
}

// ── Strip HTML tags from a string ────────────────────────
function stripTags(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Extract CDATA-wrapped or plain link value ─────────────
function extractLink(entry, isAtom) {
  // Atom: <link href="…" rel="alternate"/>
  const atomLink = entry.querySelector('link[rel="alternate"]');
  if (atomLink) return atomLink.getAttribute('href') ?? '';

  // Atom fallback: <link href="…"/>
  const atomLinkAny = entry.querySelector('link[href]');
  if (atomLinkAny) return atomLinkAny.getAttribute('href') ?? '';

  // RSS: <link> text node
  const rssLink = entry.querySelector('link');
  if (rssLink) {
    const txt = safeText(rssLink);
    if (txt.startsWith('http')) return txt;
  }

  // RSS: <guid isPermaLink="true">
  const guid = entry.querySelector('guid');
  if (guid) {
    const isPerma = guid.getAttribute('isPermaLink');
    const val     = safeText(guid);
    if (isPerma !== 'false' && val.startsWith('http')) return val;
  }

  return '';
}

// ── Robust RSS / Atom / RDF parser ───────────────────────
// Handles:
//   RSS 0.9x, 1.0, 2.0
//   Atom 0.3, 1.0
//   Dublin Core (dc:) namespace
//   content:encoded namespace
//   Media RSS (media:) namespace
//   Feedburner extensions
//   CDATA sections (handled by DOMParser automatically)
export function parseRSS(xml, feedKey) {
  if (typeof xml !== 'string' || xml.length === 0) return [];

  let dom;
  try {
    dom = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return [];
  }

  // Check for parse error
  if (dom.querySelector('parsererror')) {
    // Try text/html fallback — some feeds return HTML on error
    try {
      dom = new DOMParser().parseFromString(xml, 'text/html');
    } catch {
      return [];
    }
  }

  const rootTag  = dom.documentElement?.localName ?? '';
  const isAtom   = rootTag === 'feed' || !!dom.querySelector('feed');
  const isRDF    = rootTag === 'RDF';

  // Channel title — used as source name
  const chanTitleEl = dom.querySelector(
    'channel > title, feed > title, rdf\\:RDF > channel > title'
  );
  const chanTitle = safeText(chanTitleEl) || (FEEDS[feedKey]?.label ?? feedKey ?? 'Unknown');

  // Select entry/item nodes
  let entries;
  if (isAtom)     entries = [...dom.querySelectorAll('entry')];
  else if (isRDF) entries = [...dom.querySelectorAll('item')];
  else            entries = [...dom.querySelectorAll('item')];

  if (entries.length === 0) return [];

  return entries
    .map(e => {
      /* ── Title ── */
      const titleEl = e.querySelector('title');
      const title   = stripTags(safeText(titleEl)) || 'Untitled';

      /* ── Body / description ──
         Priority: content:encoded > content > description > summary > media:description */
      const getBody = () => {
        // content:encoded (standard RSS extension)
        const selectors = [
          'encoded',              // content:encoded appears as just "encoded" in some parsers
          'content\\:encoded',
          'content',
          'description',
          'summary',
          'media\\:description',
        ];
        for (const sel of selectors) {
          try {
            const el = e.querySelector(sel);
            if (el && (el.textContent ?? '').trim()) return el.textContent.trim();
          } catch { /* ignore unsupported selectors */ }
        }
        return '';
      };
      const description = stripTags(getBody()).slice(0, 1200);

      /* ── Date ──
         Priority: pubDate > published > updated > dc:date > lastBuildDate */
      const getDate = () => {
        const selectors = ['pubDate','published','updated','date','lastBuildDate'];
        for (const sel of selectors) {
          try {
            const el = e.querySelector(sel);
            const v  = safeText(el);
            if (v) return v;
          } catch { /* ignore */ }
        }
        return '';
      };
      const date = getDate();

      /* ── Author ──
         Priority: author > name (Atom) > dc:creator > managingEditor */
      const getAuthor = () => {
        // Atom: <author><name>…</name></author>
        const authorName = e.querySelector('author > name, author name');
        if (authorName) return safeText(authorName);
        const selectors = ['creator','managingEditor','author'];
        for (const sel of selectors) {
          try {
            const el = e.querySelector(sel);
            const v  = safeText(el);
            if (v) return v;
          } catch { /* ignore */ }
        }
        return '';
      };
      const author = getAuthor();

      /* ── Link ── */
      const link = extractLink(e, isAtom);

      /* ── Categories / tags ── */
      const cats = [...e.querySelectorAll('category')]
        .map(c => {
          // Atom: <category term="foo"/>  RSS: <category>foo</category>
          const term = c.getAttribute('term') ?? safeText(c);
          return term.trim().toLowerCase();
        })
        .filter(v => v.length > 0 && v.length < 60)
        .slice(0, 8);

      return {
        title,
        description,
        date,
        source:  chanTitle,
        author,
        tags:    cats,
        link,
        feedKey: feedKey ?? 'unknown',
      };
    })
    .filter(item => item.title !== 'Untitled' || item.description.length > 0);
}

// ── Main public fetch function ────────────────────────────
export async function fetchFeed(feedKey, typeOverride, urlOverride) {
  // Input validation (NASA rule: validate ALL inputs at entry points)
  const cfg  = (feedKey && FEEDS[feedKey]) ? FEEDS[feedKey] : {};
  const url  = (typeof urlOverride === 'string' && urlOverride.trim())
                 ? urlOverride.trim()
                 : cfg.url ?? null;

  if (!url) throw new Error('No feed URL provided');

  // Reject non-HTTP(S) URLs to prevent SSRF-like misuse
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Feed URL must start with https:// or http://');
  }

  const proxyUrl = `${PROXY}${encodeURIComponent(url)}`;
  const res      = await fetchWithTimeout(proxyUrl, TIMEOUT);

  if (!res.ok) throw new Error(`HTTP ${res.status} from proxy`);

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Proxy returned invalid JSON');
  }

  const body = json?.contents;
  if (typeof body !== 'string' || body.length === 0) {
    throw new Error('Empty response from proxy — feed may be offline or rate-limited');
  }

  const raws = parseRSS(body, feedKey ?? urlOverride ?? 'custom');

  // Normalize each item — invalid items are silently dropped
  const items = [];
  for (const raw of raws) {
    try {
      const normalized = normalize(raw);
      if (normalized && typeof normalized.id === 'string') {
        items.push(normalized);
      }
    } catch {
      // Drop malformed items — do not abort the whole feed
    }
  }

  return items;
}

// ── Demo dataset ─────────────────────────────────────────
export const DEMO_THREATS = [
  {
    title: 'APT29 Cozy Bear — Active Spearphishing Campaign Exploiting CVE-2024-30040',
    description: 'Nation-state actor APT29 (Cozy Bear) has launched a targeted spearphishing campaign exploiting CVE-2024-30040 to deliver a custom backdoor dropper. The campaign leverages diplomatic-themed lure documents distributed via compromised third-party email infrastructure. Lateral movement observed using pass-the-hash and LDAP enumeration.',
    date: '2024-11-15T09:00:00Z', source: 'AlienVault OTX', author: 'ThreatIntelTeam',
    tags: ['apt', 'nation-state', 'spearphishing', 'russia', 'cozy-bear'],
    cvss: '9.8', tlp: 'amber',
    iocs: [
      { type: 'ip',     value: '185.220.101.47' },
      { type: 'ip',     value: '194.165.16.74' },
      { type: 'domain', value: 'update-microsoft-cdn.com' },
      { type: 'hash',   value: 'a3f5d9e7b2c1084f6a9d5e8c2b7f1a4d' },
      { type: 'cve',    value: 'CVE-2024-30040' },
    ],
    references: ['https://unit42.paloaltonetworks.com/apt29'],
    link: 'https://thehackernews.com', feedKey: 'hackernews',
  },
  {
    title: 'LockBit 3.0 BYOVD Variant Actively Targeting Healthcare Networks',
    description: 'A new LockBit 3.0 variant targets hospital networks using BYOVD (Bring Your Own Vulnerable Driver) to disable EDR solutions. Ransom demands range from $500K–$3M. Initial access via exposed RDP and credential stuffing from infostealer logs.',
    date: '2024-11-14T14:30:00Z', source: 'Bleeping Computer', author: 'CERT-EU',
    tags: ['ransomware', 'lockbit', 'healthcare', 'byovd', 'rdp'],
    cvss: '9.3', tlp: 'amber',
    iocs: [
      { type: 'hash',   value: 'e4b9c8f1a5d2e7c3b6a9d4f8e1b5c2a7' },
      { type: 'ip',     value: '10.200.145.33' },
      { type: 'domain', value: 'lockbit3-decryptor.onion.cab' },
    ],
    link: 'https://bleepingcomputer.com', feedKey: 'bleeping',
  },
  {
    title: 'Critical RCE in Apache Struts — CVE-2024-53677 Actively Exploited',
    description: 'A critical RCE in Apache Struts 2 (CVE-2024-53677) allows unauthenticated OS command execution via malicious file upload. Patches in Struts 2.5.33 and 6.3.0.2. Post-exploitation includes web shell deployment.',
    date: '2024-11-13T08:15:00Z', source: 'CISA', author: 'NVD',
    tags: ['rce', 'apache', 'struts', 'web-application', 'exploit'],
    cvss: '9.5', tlp: 'white',
    iocs: [{ type: 'cve', value: 'CVE-2024-53677' }],
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-53677'],
    link: 'https://www.cisa.gov/uscert/ncas/all.xml', feedKey: 'cisa',
  },
  {
    title: 'AiTM Phishing — DocuSign Lure Harvesting O365 Tokens via Evilginx2',
    description: 'Widespread phishing campaign using DocuSign emails to AiTM Office 365 pages via Evilginx2. 12,000+ mailboxes targeted in 72 hours. Session cookies bypass hardware MFA and are replayed within minutes of capture.',
    date: '2024-11-12T11:45:00Z', source: 'Cofense', author: 'Cofense Research',
    tags: ['phishing', 'o365', 'aitm', 'credential-theft', 'mfa-bypass'],
    cvss: '8.2',
    iocs: [
      { type: 'domain', value: 'docusign-verify-auth.net' },
      { type: 'ip',     value: '45.155.205.233' },
    ],
    link: 'https://krebsonsecurity.com', feedKey: 'krebs',
  },
  {
    title: 'Mirai Botnet Variant — Mass IoT Telnet Brute-Force for DDoS Recruitment',
    description: 'New Mirai variant scanning Telnet IoT devices across ports 23/2323 with 80+ default credential profiles. 200,000+ devices compromised. Recruited for volumetric DDoS against gaming and CDN infrastructure.',
    date: '2024-11-11T16:00:00Z', source: 'AlienVault OTX', author: 'MalwareMustDie',
    tags: ['botnet', 'mirai', 'iot', 'ddos', 'telnet'],
    cvss: '7.8',
    iocs: [
      { type: 'ip',     value: '91.92.241.18' },
      { type: 'hash',   value: 'f7d3c9e5a1b8f4d2c6e9b3a7f5d1c8e4' },
      { type: 'domain', value: 'mirai-c2-update.xyz' },
    ],
    link: 'https://thehackernews.com', feedKey: 'hackernews',
  },
  {
    title: 'Microsoft November 2024 Patch Tuesday — 3 Zero-Days Actively Exploited',
    description: '87 CVEs addressed. Three zero-days actively exploited: CVE-2024-43451 (NTLM Hash Disclosure), CVE-2024-49039 (Task Scheduler PrivEsc to SYSTEM), CVE-2024-49040 (Exchange Server spoofing enabling phishing). Immediate deployment recommended.',
    date: '2024-11-12T18:00:00Z', source: 'Microsoft MSRC', author: 'Microsoft',
    tags: ['patch-tuesday', 'microsoft', 'zero-day', 'windows', 'exchange'],
    iocs: [
      { type: 'cve', value: 'CVE-2024-43451' },
      { type: 'cve', value: 'CVE-2024-49039' },
      { type: 'cve', value: 'CVE-2024-49040' },
    ],
    references: ['https://msrc.microsoft.com/update-guide/releaseNote/2024-Nov'],
    link: 'https://isc.sans.edu', feedKey: 'sans',
  },
  {
    title: 'CISA Advisory — Volt Typhoon PRC Pre-Positioning in US Critical Infrastructure',
    description: 'Joint CISA/NSA/FBI advisory: Volt Typhoon pre-positioned in US energy, water, transportation, and communications OT/ICS. TTPs include living-off-the-land techniques and Cisco/Fortinet edge device implants.',
    date: '2024-11-07T15:00:00Z', source: 'CISA', author: 'CISA/NSA/FBI',
    tags: ['ics', 'ot', 'critical-infrastructure', 'volt-typhoon', 'prc'],
    references: ['https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-317a'],
    link: 'https://www.cisa.gov/uscert/ncas/all.xml', feedKey: 'cisa',
  },
  {
    title: 'Dark Web IAB — VPN Credentials for 50+ Fortune 500 Companies Listed',
    description: 'Initial access broker listing VPN credentials sourced from Lumma, Vidar, and RedLine infostealers. Access priced $200–$15,000. Finance, manufacturing, and tech sectors affected. Several credentials independently verified as active.',
    date: '2024-11-06T09:00:00Z', source: 'Threat Intelligence', author: 'Unknown',
    tags: ['credentials', 'vpn', 'dark-web', 'infostealer', 'initial-access-broker'],
    cvss: '7.5',
    iocs: [{ type: 'domain', value: 'mega-breach-market.onion.cab' }],
    link: 'https://krebsonsecurity.com', feedKey: 'krebs',
  },
];
