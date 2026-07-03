// electron/preload.js — Context bridge (renderer ↔ main)
// Exposes ONLY specific, safe APIs to the renderer process.
// Node.js APIs are never directly exposed (contextIsolation: true).
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App metadata
  getVersion:  () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getUserData: () => ipcRenderer.invoke('app:userData'),

  // Utility: is this running inside Electron?
  isElectron: true,
});
