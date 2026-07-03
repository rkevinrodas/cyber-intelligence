// src/assets/icons.jsx — all app icons as React SVG components
const ic = (path, opts = {}) => {
  const { size = 16, viewBox = '0 0 24 24', fill = 'none',
          stroke = 'currentColor', sw = 2, ...rest } = opts;
  return (props) => (
    <svg width={size} height={size} viewBox={viewBox} fill={fill}
      stroke={stroke} strokeWidth={sw} strokeLinecap="round"
      strokeLinejoin="round" {...props}>
      {path}
    </svg>
  );
};

export const ShieldIcon      = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>);
export const SyncIcon        = ic(<><polyline points="23 4 23 10 17 10"/><path d="M1 20a10 10 0 0 0 17.07-5.4M23 4A10 10 0 0 0 5.93 9.4"/></>);
export const SearchIcon      = ic(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>);
export const FilterIcon      = ic(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>);
export const SettingsIcon    = ic(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>);
export const MailIcon        = ic(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>);
export const ChevronRightIcon= ic(<><polyline points="9 18 15 12 9 6"/></>);
export const ChevronDownIcon = ic(<><polyline points="6 9 12 15 18 9"/></>);
export const XIcon           = ic(<><path d="M18 6 6 18M6 6l12 12"/></>);
export const DatabaseIcon    = ic(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>);
export const AlertIcon       = ic(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>);
export const CheckIcon       = ic(<><polyline points="20 6 9 17 4 12"/></>);
export const InfoIcon        = ic(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>);
export const LinkIcon        = ic(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>);
export const CopyIcon        = ic(<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>);
export const ExternalLinkIcon= ic(<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>);
export const ClockIcon       = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>);
export const BellIcon        = ic(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>);
export const DownloadIcon    = ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>);
export const TrashIcon       = ic(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>);
export const TargetIcon      = ic(<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>);
export const GlobeIcon       = ic(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>);
export const SunIcon         = ic(<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>);
export const MoonIcon        = ic(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>);
export const VirusTotalIcon  = ic(<path d="M3 6l9-3 9 3v6a9 9 0 0 1-9 9 9 9 0 0 1-9-9V6z"/>, { fill:'none' });
export const KeyIcon         = ic(<><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>);
export const HardDriveIcon   = ic(<><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></>);

// Logo mark
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <polygon points="14,2 26,8 26,20 14,26 2,20 2,8"
        stroke="var(--blue)" strokeWidth="1.3" fill="var(--blue-bg)" />
      <polygon points="14,7 21,11 21,17 14,21 7,17 7,11"
        stroke="var(--blue)" strokeWidth="0.6" fill="none" opacity="0.4" />
      <circle cx="14" cy="14" r="3.2" fill="var(--blue)" />
      <circle cx="14" cy="14" r="1.5" fill="white" opacity="0.9" />
    </svg>
  );
}
