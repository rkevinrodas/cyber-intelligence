// electron/main.js — ESM Electron main process
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Single instance lock ──────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

// isDev = true ONLY when the Vite dev server is explicitly requested
// Running "electron ." directly (electron:start) always loads from dist/
const isDev = process.env.ELECTRON_DEV === '1';

function getAppUrl() {
  if (isDev) return 'http://localhost:3000';
  // Production / electron:start — load built index.html via file://
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  return `file://${distIndex}`;
}

function getIconPath() {
  const base = path.join(__dirname, '..', 'public');
  if (process.platform === 'win32') {
    const ico = path.join(base, 'icon.ico');
    return fs.existsSync(ico) ? ico : undefined;
  }
  if (process.platform === 'darwin') {
    const icns = path.join(base, 'icon.icns');
    return fs.existsSync(icns) ? icns : undefined;
  }
  const png = path.join(base, 'icon.png');
  return fs.existsSync(png) ? png : undefined;
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 900, minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0000',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          true,
      webSecurity:      true,
      allowRunningInsecureContent: false,
    },
    icon: getIconPath(),
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.loadURL(getAppUrl()).catch(err => {
    console.error('[Electron] Failed to load:', err.message);
    // Show a helpful error page if dist/ hasn't been built yet
    mainWindow.loadURL(`data:text/html,
      <body style="background:#0a0000;color:#ff3333;font-family:monospace;padding:40px">
        <h2>Build required</h2>
        <p>Run <code style="background:#1a0303;padding:4px 8px;border-radius:4px">npm run build</code>
        before launching Electron, or use
        <code style="background:#1a0303;padding:4px 8px;border-radius:4px">npm run electron:start</code>
        which builds automatically.</p>
        <p style="color:#666;font-size:12px">Error: ${err.message}</p>
      </body>`);
  });

  // Open external links in system browser, never in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

ipcMain.handle('app:version',  () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:userData', () => app.getPath('userData'));

app.on('web-contents-created', (_e, contents) => {
  contents.session.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(['notifications', 'clipboard-read'].includes(permission));
  });
});
