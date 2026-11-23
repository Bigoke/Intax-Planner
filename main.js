// Intax Planner – Electron main process: window, local storage, backups, PDF and printing.
'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('lang', 'en-ZA');
const DATA_DIR = process.env.INTAX_DATA_DIR || path.join(app.getPath('documents'), 'Intax Planner');
const BACKUP_DIR = path.join(DATA_DIR, 'Backups');
// Storage layout (v2):
//   app.json                  – practices list, current practice, app preferences (theme, text size, PIN)
//   taxpacks.json             – tax table edits and custom tax years (shared by all practices)
//   Practices/<id>/clients.json, settings.json – one folder per practice
const PRACTICES_DIR = path.join(DATA_DIR, 'Practices');
const FILES = { clients: 'clients.json', settings: 'settings.json' };

function ensureDirs() { for (const d of [DATA_DIR, BACKUP_DIR, PRACTICES_DIR]) fs.mkdirSync(d, { recursive: true }); }
function readFile(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; } }
function writeFile(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 1)); fs.renameSync(tmp, file); }
const readJson = (name, fallback) => readFile(path.join(DATA_DIR, name), fallback);
const writeJson = (name, data) => writeFile(path.join(DATA_DIR, name), data);
const safeId = (id) => String(id || '').replace(/[^\w-]/g, '');
const practiceDir = (id) => path.join(PRACTICES_DIR, safeId(id));

function readApp() { return readJson('app.json', null); }
// Upgrade a single-practice data folder (versions 1.0–1.2) to the practices layout.
function migrate() {
  let appData = readApp();
  if (appData) return { appData, firstRun: false };
  const oldClients = path.join(DATA_DIR, 'clients.json');
  if (fs.existsSync(oldClients)) {
    const settings = readJson('settings.json', {}) || {};
    const id = 'p' + Date.now().toString(36);
    fs.mkdirSync(practiceDir(id), { recursive: true });
    fs.copyFileSync(oldClients, path.join(practiceDir(id), 'clients.json'));
    writeFile(path.join(practiceDir(id), 'settings.json'), settings);
    appData = { version: 2, practices: [{ id, name: (settings.practice && settings.practice.name) || 'My practice' }], current: id, prefs: { security: settings.security || { pinHash: '', lockMinutes: 0 }, defaultHome: settings.defaultHome || 'practice' } };
    writeJson('app.json', appData);
    try { fs.renameSync(oldClients, oldClients + '.v1-backup'); fs.renameSync(path.join(DATA_DIR, 'settings.json'), path.join(DATA_DIR, 'settings.json.v1-backup')); } catch (e) {}
    return { appData, firstRun: false };
  }
  appData = { version: 2, practices: [], current: null, prefs: {} };
  writeJson('app.json', appData);
  return { appData, firstRun: true };
}
function bundle() {
  const appData = readApp() || {};
  const b = { app: 'Intax Planner', format: 2, created: new Date().toISOString(), appData, taxpacks: readJson('taxpacks.json', {}), practices: {} };
  for (const p of appData.practices || []) b.practices[p.id] = { clients: readFile(path.join(practiceDir(p.id), 'clients.json'), []), settings: readFile(path.join(practiceDir(p.id), 'settings.json'), null) };
  return b;
}
function dailyBackup() {
  try {
    const stamp = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, `IntaxPlanner-${stamp}.json`);
    const appData = readApp();
    if (!fs.existsSync(target) && appData && (appData.practices || []).length) fs.writeFileSync(target, JSON.stringify(bundle()));
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

let firstRun = false;
ipcMain.handle('store:load', () => {
  const appData = readApp() || { practices: [], prefs: {} };
  const cur = (appData.practices || []).find(p => p.id === appData.current) || (appData.practices || [])[0];
  return {
    appData, firstRun, practiceId: cur ? cur.id : null,
    clients: cur ? readFile(path.join(practiceDir(cur.id), 'clients.json'), []) : [],
    settings: cur ? readFile(path.join(practiceDir(cur.id), 'settings.json'), null) : null,
    taxpacks: readJson('taxpacks.json', {}), dataDir: DATA_DIR, version: app.getVersion()
  };
});
ipcMain.handle('store:save', (e, key, data, practiceId) => {
  if (key === 'app') { writeJson('app.json', data); return true; }
  if (key === 'taxpacks') { writeJson('taxpacks.json', data); return true; }
  if (!FILES[key] || !practiceId) throw new Error('bad key');
  writeFile(path.join(practiceDir(practiceId), FILES[key]), data); return true;
});
ipcMain.handle('practice:write', (e, id, clients, settings) => { writeFile(path.join(practiceDir(id), 'clients.json'), clients || []); writeFile(path.join(practiceDir(id), 'settings.json'), settings || {}); return true; });
ipcMain.handle('practice:remove', (e, id) => {
  const dir = practiceDir(id); if (!fs.existsSync(dir)) return true;
  const dest = path.join(BACKUP_DIR, 'Deleted practices', `${safeId(id)}-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.renameSync(dir, dest); return dest;
});

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
  if (b.format === 2) {
    writeJson('app.json', b.appData); writeJson('taxpacks.json', b.taxpacks || {});
    for (const [id, d] of Object.entries(b.practices || {})) { writeFile(path.join(practiceDir(id), 'clients.json'), d.clients || []); writeFile(path.join(practiceDir(id), 'settings.json'), d.settings || {}); }
  } else { // single-practice backup from version 1.x: restore into the current practice
    const appData = readApp(); const id = appData && appData.current;
    if (!id) throw new Error('No practice to restore into');
    writeFile(path.join(practiceDir(id), 'clients.json'), b.clients || []); if (b.settings) writeFile(path.join(practiceDir(id), 'settings.json'), b.settings); if (b.taxpacks) writeJson('taxpacks.json', b.taxpacks);
  }
  return true;
});
ipcMain.handle('app:bundle', () => bundle());

app.whenReady().then(() => { ensureDirs(); firstRun = migrate().firstRun; dailyBackup(); createWindow(); });
app.on('window-all-closed', () => app.quit());
module.exports = { htmlToPdfBuffer };
// Zoom (text size) shortcuts are handled in the renderer.
