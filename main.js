// Intax Planner – Electron main process: window, local storage, backups, PDF and printing.
'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('lang', 'en-ZA');
const DATA_DIR = process.env.INTAX_DATA_DIR || path.join(app.getPath('documents'), 'Intax Planner');
const BACKUP_DIR = path.join(DATA_DIR, 'Backups');
const FILES = { clients: 'clients.json', settings: 'settings.json', taxpacks: 'taxpacks.json' };

function ensureDirs() { for (const d of [DATA_DIR, BACKUP_DIR]) fs.mkdirSync(d, { recursive: true }); }
function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); } catch (e) { return fallback; }
}
function writeJson(name, data) {
  const file = path.join(DATA_DIR, name), tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file);
}
function dailyBackup() {
  try {
    const stamp = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, `IntaxPlanner-${stamp}.json`);
    if (!fs.existsSync(target) && fs.existsSync(path.join(DATA_DIR, FILES.clients))) {
      const bundle = { app: 'Intax Planner', created: new Date().toISOString() };
      for (const k of Object.keys(FILES)) bundle[k] = readJson(FILES[k], null);
      fs.writeFileSync(target, JSON.stringify(bundle));
    }
    const all = fs.readdirSync(BACKUP_DIR).filter(f => /^IntaxPlanner-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    while (all.length > 60) fs.unlinkSync(path.join(BACKUP_DIR, all.shift()));
  } catch (e) { /* backup is best-effort */ }
}

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: 'Intax Planner', backgroundColor: '#f4f6f9', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

ipcMain.handle('store:load', () => ({
  clients: readJson(FILES.clients, []), settings: readJson(FILES.settings, null), taxpacks: readJson(FILES.taxpacks, {}), dataDir: DATA_DIR, version: app.getVersion()
}));
ipcMain.handle('store:save', (e, key, data) => { if (!FILES[key]) throw new Error('bad key'); writeJson(FILES[key], data); return true; });

async function htmlToPdfBuffer(html, landscape) {
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const buf = await w.webContents.printToPDF({ pageSize: 'A4', landscape: !!landscape, printBackground: true, margins: { marginType: 'custom', top: 0.4, bottom: 0.5, left: 0.4, right: 0.4 }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:7pt;color:#667;width:100%;text-align:center;font-family:Segoe UI,Arial">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
  w.destroy();
  return buf;
}
ipcMain.handle('report:pdf', async (e, html, suggestedName, landscape) => {
  const res = await dialog.showSaveDialog(win, { title: 'Save report as PDF', defaultPath: path.join(app.getPath('documents'), suggestedName || 'Report.pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (res.canceled || !res.filePath) return null;
  fs.writeFileSync(res.filePath, await htmlToPdfBuffer(html, landscape));
  shell.openPath(res.filePath);
  return res.filePath;
});
ipcMain.handle('report:pdfTo', async (e, html, filePath, landscape) => { fs.writeFileSync(filePath, await htmlToPdfBuffer(html, landscape)); return filePath; });
ipcMain.handle('report:print', async (e, html) => {
  const w = new BrowserWindow({ show: false });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  return new Promise(res => w.webContents.print({ printBackground: true }, (ok) => { w.destroy(); res(ok); }));
});
ipcMain.handle('file:exportJson', async (e, data, name) => {
  const res = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (res.canceled) return null; fs.writeFileSync(res.filePath, JSON.stringify(data, null, 1)); return res.filePath;
});
ipcMain.handle('file:importJson', async () => {
  const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (res.canceled || !res.filePaths[0]) return null;
  return JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'));
});
ipcMain.handle('file:pickImage', async () => {
  const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }] });
  if (res.canceled || !res.filePaths[0]) return null;
  const f = res.filePaths[0], ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,` + fs.readFileSync(f).toString('base64');
});
ipcMain.handle('file:exportCsv', async (e, text, name) => {
  const res = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (res.canceled) return null; fs.writeFileSync(res.filePath, '﻿' + text); return res.filePath;
});
ipcMain.handle('app:openDataDir', () => shell.openPath(DATA_DIR));
ipcMain.handle('app:openUrl', (e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
ipcMain.handle('app:listBackups', () => { try { return fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse(); } catch (e) { return []; } });
ipcMain.handle('app:restoreBackup', (e, name) => {
  const b = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, path.basename(name)), 'utf8'));
  for (const k of Object.keys(FILES)) if (b[k] !== undefined && b[k] !== null) writeJson(FILES[k], b[k]);
  return true;
});

app.whenReady().then(() => { ensureDirs(); dailyBackup(); createWindow(); });
app.on('window-all-closed', () => app.quit());
module.exports = { htmlToPdfBuffer };
