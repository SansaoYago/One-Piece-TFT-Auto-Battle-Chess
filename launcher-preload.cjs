const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherApi', {
  launch: () => ipcRenderer.invoke('launcher:launch'),
  install: () => ipcRenderer.invoke('launcher:install'),
  onStatus: (callback) => {
    ipcRenderer.on('launcher:status', (_event, payload) => callback(payload));
  },
});