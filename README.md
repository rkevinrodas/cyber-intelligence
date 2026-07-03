# CyberIntelligence

A lightweight, offline-first threat intelligence workstation that runs as a native desktop app. It pulls advisories and threat reports from well-known open-source security publishers, normalises the data locally, and gives you a clean interface to triage, search, and export what you find.

No accounts. No telemetry. Nothing leaves the machine.

---

## Getting Started

### What You Need

- [Node.js 18 or later](https://nodejs.org/en/download)

### Running the App

**macOS** — double-click `Launch CyberIntelligence.command` in Finder.  
**Windows** — double-click `Launch CyberIntelligence.bat` in Explorer.

The launcher handles everything on first run: installs packages, builds the app, and opens the window. Subsequent launches skip the build step and open almost instantly.

If you prefer the terminal:

```bash
npm install
npm run electron:start
```

> If macOS blocks the launcher, right-click → Open → Open to approve it once.  
> If Windows SmartScreen warns you, click "More info" → "Run anyway".

---

## Build Installers

Generate a distributable package for any platform:

```bash
npm run dist:mac     # .dmg + .zip (Intel and Apple Silicon)
npm run dist:win     # .exe installer via NSIS
npm run dist:linux   # .AppImage, .deb, .rpm
npm run dist:all     # all three at once
```

Output lands in the `release/` folder.

### macOS — signing

Unsigned builds will show a Gatekeeper warning. To dismiss it once:

```bash
xattr -cr /path/to/CyberIntelligence.app
```

Production releases should be signed and notarised through Apple's developer program to remove the warning entirely.

### Windows — signing

Unsigned `.exe` files trigger SmartScreen. A code-signing certificate from a recognised CA resolves this for end-users.

---

## App Icons

The included `public/icon.svg` is a source vector. Convert it before building installers:

| File | Platform | Size |
|---|---|---|
| `public/icon.icns` | macOS | 1024×1024 |
| `public/icon.ico` | Windows | 256×256 (multi-res) |
| `public/icon.png` | Linux | 512×512 |

Free tools: [cloudconvert.com](https://cloudconvert.com), [icoconvert.com](https://icoconvert.com).

---

## Project Layout

```
cyber-intelligence/
├── electron/
│   ├── main.js              Electron main process (ESM)
│   └── preload.cjs          Secure context bridge (CJS — required by Electron)
├── src/
│   ├── components/          All React UI components
│   ├── context/
│   │   └── AppContext.jsx   Global state (useReducer), sync logic, exports
│   ├── services/
│   │   ├── cvss.js          CVSS v3.1 calculator + metric inference
│   │   ├── db.js            IndexedDB wrapper (open, save, query, purge)
│   │   ├── feeds.js         Feed configurations + RSS/Atom parser
│   │   ├── normalize.js     Normalisation pipeline, IOC extraction, context enrichment
│   │   └── readStore.js     Read/unread state (localStorage)
│   └── styles/
│       ├── app.css          Component styles
│       └── theme.css        CSS variables — light and dark mode
├── public/                  Static assets and app icons
├── Launch CyberIntelligence.command   macOS double-click launcher
└── Launch CyberIntelligence.bat       Windows double-click launcher
```

---

## Intelligence Sources

| Source | Type |
|---|---|
| The Hacker News | Threat news |
| Bleeping Computer | Threat news + advisories |
| SANS Internet Storm Center | Daily threat diary |
| CISA Advisories | US government advisories |
| Krebs on Security | Investigative journalism |
| Dark Reading | Enterprise security news |
| Security Week | Broad threat intel |
| Threatpost | Research and advisories |

Custom RSS/Atom feeds can be added at any time through the Sources panel.

---

## Key Capabilities

### Normalisation and IOC Extraction
Every ingested article is parsed and normalised: HTML stripped, entities decoded, IOCs extracted (IPv4, IPv6, domains, MD5/SHA1/SHA256 hashes, CVEs, URLs, MITRE ATT&CK techniques, Bitcoin wallets). Private IP ranges and known CDN/analytics domains are filtered out automatically.

### Threat Contextualisation
Records are cross-referenced against a database of 70+ threat groups. Each record receives attributed threat actors (with origin and sponsor), MITRE ATT&CK technique tags, inferred affected sectors, exploitation status (active / PoC / patched), geopolitical origin, and a 1–5 confidence score.

### CVSS v3.1 Scoring
Implements the full CVSS v3.1 base score formula per the FIRST specification, including the Roundup function and scope-dependent Privileges Required weighting. When a known CVE score is present it is used directly. Otherwise, the eight base metrics are inferred from article text and a calculated score is generated (labelled "Estimated" in the UI).

### Read / Unread Tracking
Each record can be marked read or unread. The sidebar lets you filter by status. Records are auto-marked read when their detail view is opened. State is persisted in localStorage independently of the IndexedDB records.

### Configurable Retention
The record retention window is user-configurable (7–365 days) from Settings → Data. Expired records are purged automatically on startup.

### Filtered Export
JSON and CSV exports reflect whatever filter is currently active — severity, read status, and search query all apply. CSV output includes CVSS vector, exploit status, attributed threat actors, and affected sectors alongside the standard fields.

### Scheduled Auto-Fetch
An optional daily fetch can be configured to run at a specific time. A toast notification fires 60 seconds before the scheduled fetch runs.

---

## Security Practices

- `contextIsolation: true` — the renderer has no access to Node.js
- `nodeIntegration: false` — no direct OS access from the UI layer
- `sandbox: true` — additional Electron process isolation
- All network inputs validated before use
- No `eval()`, `innerHTML`, or dynamic code execution
- `AbortController` + explicit 14-second timeout on every network call
- Object URLs revoked immediately after use
- Single-instance lock prevents duplicate Electron processes
- External links open in the system browser, never in-app
