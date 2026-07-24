const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  otaStatus: () => ipcRenderer.invoke('desktop:ota-status'),
  saveOtaPassword: (password) => ipcRenderer.invoke('desktop:ota-save', password)
});
