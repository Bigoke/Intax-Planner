'use strict';
const { contextBridge, ipcRenderer, webFrame } = require('electron');
contextBridge.exposeInMainWorld('intax', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (key, data, practiceId) => ipcRenderer.invoke('store:save', key, data, practiceId),
  writePractice: (id, clients, settings) => ipcRenderer.invoke('practice:write', id, clients, settings),
  removePractice: (id) => ipcRenderer.invoke('practice:remove', id),
  bundle: () => ipcRenderer.invoke('app:bundle'),
  setZoom: (f) => webFrame.setZoomFactor(f),
  pdf: (html, name, landscape) => ipcRenderer.invoke('report:pdf', html, name, landscape),
  pdfTo: (html, file, landscape) => ipcRenderer.invoke('report:pdfTo', html, file, landscape),
  print: (html) => ipcRenderer.invoke('report:print', html),
  exportJson: (data, name) => ipcRenderer.invoke('file:exportJson', data, name),
  importJson: () => ipcRenderer.invoke('file:importJson'),
  exportCsv: (text, name) => ipcRenderer.invoke('file:exportCsv', text, name),
  pickImage: () => ipcRenderer.invoke('file:pickImage'),
  openDataDir: () => ipcRenderer.invoke('app:openDataDir'),
  openUrl: (u) => ipcRenderer.invoke('app:openUrl', u),
  listBackups: () => ipcRenderer.invoke('app:listBackups'),
  restoreBackup: (n) => ipcRenderer.invoke('app:restoreBackup', n)
});
