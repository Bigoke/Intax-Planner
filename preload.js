'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('intax', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (key, data) => ipcRenderer.invoke('store:save', key, data),
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
