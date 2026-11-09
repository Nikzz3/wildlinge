const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wildlingeNative', {
  readSave: () => ipcRenderer.sendSync('save:read'),
  writeSave: (json) => ipcRenderer.sendSync('save:write', json),
});
