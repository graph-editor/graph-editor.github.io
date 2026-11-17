const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  onOpenShortcuts: callback => ipcRenderer.on('open-shortcuts-modal', callback),
});
