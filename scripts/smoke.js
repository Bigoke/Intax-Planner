// Smoke test: runs the real app with demo data, visits every screen, runs every wizard,
// builds every report as PDF and screenshots everything into smoke-out/.
// Usage: xvfb-run -a npx electron scripts/smoke.js
'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const OUT = path.join(__dirname, '..', 'smoke-out');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
process.env.INTAX_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'intax-'));
const { app, BrowserWindow } = require('electron');
const { htmlToPdfBuffer } = require('../main.js');
const demo = require('./demo-data.js');
fs.writeFileSync(path.join(process.env.INTAX_DATA_DIR, 'clients.json'), JSON.stringify(demo.clients));
fs.writeFileSync(path.join(process.env.INTAX_DATA_DIR, 'settings.json'), JSON.stringify(demo.settings));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  await sleep(2500);
  const win = BrowserWindow.getAllWindows()[0];
  win.setSize(1600, 1000);
  const errors = [];
  win.webContents.on('console-message', (e, level, msg) => { if (level >= 2) errors.push(msg); });
  const js = (code) => { console.log('JS', code.slice(0, 70).replace(/\n/g,' ')); return Promise.race([win.webContents.executeJavaScript(code), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + code.slice(0, 80))), 15000))]); };
  const shot = async (name) => { await sleep(250); const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(OUT, name + '.png'), img.toPNG()); };
  const bad = async (where) => { const t = await js(`document.body.innerText`); if (/\bNaN\b|undefined|\[object Object\]|Infinity/.test(t)) errors.push(`${where}: suspicious text: ` + (t.match(/.{0,40}(\bNaN\b|undefined|\[object Object\]|Infinity).{0,40}/) || [])[0]); };

  await js(`document.querySelectorAll('.modal-back').forEach(m=>m.remove())`);
  const routes = await js(`NAV.filter(n=>n.id).map(n=>n.id)`);
  for (const r of routes) { await js(`App.route('${r}')`); await shot('screen-' + r); await bad('screen ' + r); }

  // edit a field through the UI like a user would
  await js(`App.route('investments'); const i=document.querySelector('[data-p="y.investments.localInterest"]'); i.focus(); i.value='50000'; i.dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(200);
  const ti = await js(`result().interest.local`);
  if (ti !== 50000) errors.push('binding failed: interest=' + ti);

  // wizards
  const wizards = await js(`Object.keys(WIZ)`);
  for (const w of wizards) {
    if (w === 'checklist') continue;
    await js(`Wizard.queue=[]; Wizard.open('${w}')`); await sleep(150);
    if (w === 'newclient') await js(`S.scratch.nc.firstName='Wizard'; S.scratch.nc.surname='Test'; S.scratch.nc.dob='1990-01-01'`);
    if (w === 'irp5') await js(`S.scratch.irp.employer='Wizard Employer'; S.scratch.irp.codes['3601']=100000; S.scratch.irp.codes['4102']=12000;`);
    if (w === 'business') await js(`S.scratch.bus.name='Wizard Biz'; S.scratch.bus.turnover=50000;`);
    for (let k = 0; k < 8; k++) {
      await js(`Wizard.refresh && Wizard.active && Wizard.refresh()`);
      if (k === 1) await shot('wizard-' + w);
      await bad('wizard ' + w);
      const more = await js(`(()=>{const b=document.getElementById('wzNext'); if(!b) return false; b.click(); return true;})()`);
      await sleep(120);
      if (!more) break;
    }
    await js(`Wizard.queue=[]; document.querySelectorAll('.modal-back').forEach(m=>m.remove())`);
  }
  // practice features
  await js(`S.clientId='demo1'; S.year=2027; App.route('fees')`);
  const nv = await js(`result().travel.vehicles.length`); if (nv !== 2) errors.push('expected 2 vehicles, got ' + nv);
  await js(`App.route('travel')`); await shot('screen-travel-2vehicles');
  await js(`App.route('homeoffice')`); await shot('screen-homeoffice'); await js(`document.getElementById('content').scrollTop = 99999; true`); await shot('screen-homeoffice-bottom');
  await js(`ACTIONS2.addvehicle(); true`); await sleep(150); const nv3 = await js(`yd().travel.vehicles.length`); if (nv3 !== 3) errors.push('add vehicle failed'); await js(`yd().travel.vehicles.pop(); App.refresh(); true`);
  await js(`App.route('timesummary')`); await shot('screen-timesummary');
  await js(`App.route('fees')`); await shot('screen-fees');
  await js(`S.year=2026; App.route('employment')`); await shot('screen-locked-2026');
  const dis = await js(`document.querySelectorAll('#content input:disabled').length`); if (!dis) errors.push('locked year inputs not disabled');
  await js(`App.route('assessment')`); await shot('screen-assessment-2026');
  await js(`S.year=2027; App.route('final')`); await shot('screen-final-2027');
  await js(`S.clientId='demo3'; App.route('companycar')`); await shot('screen-companycar');
  await js(`App.route('dashboard')`); await shot('screen-dashboard-demo3'); await bad('demo3 dashboard');
  await js(`App.route('investments')`); await shot('screen-investments-demo3');
  // edit and check change log
  await js(`App.route('investments'); { const i2=document.querySelector('[data-p="y.investments.localInterest"]'); i2.value='70000'; i2.dispatchEvent(new Event('change',{bubbles:true})); } true`); await sleep(200);
  const logn = await js(`(cur().log||[]).length`); if (!logn) errors.push('change log empty');
  await js(`App.route('auditlog')`); await shot('screen-auditlog');
  // roll forward is only possible to years that exist in the tables; 2027 is the last -> roll 2026 of demo1 instead
  await js(`S.clientId='demo2'; S.year=2026; yd(); S.year=2026; ACTIONS2.rollforward(); true`); await sleep(200); await js(`document.getElementById('rfOk').click()`); await sleep(300);
  const rolled = await js(`S.year`); if (rolled !== 2027) errors.push('roll forward did not switch year: ' + rolled);
  await js(`S.clientId='demo1'; S.year=2027; App.route('practice')`); await shot('screen-practice-after');
  await js(`App.route('deadlines')`); await shot('screen-deadlines');
  for (const r of ['practice','deadlines','timesummary','documents','fees','auditlog','companycar','assessment','homeoffice','travel','deductions','settings']) { await js(`App.route('${r}')`); await bad('v1.1 ' + r); }

  // back to demo client for reports
  await js(`S.clientId='demo1'; S.year=2027; App.route('whatif'); S.scratch.wi={ra:40000,donation:0,income:0,bonus:0,expenses:0,medical:0,businessKm:0,gain:0}; App.refresh();`);
  await shot('screen-whatif-scenario');
  await js(`App.route('help'); S.scratch.helpQ='car'; App.refresh();`); await shot('help-search-car');
  await js(`const g=document.getElementById('globalSearch'); g.value='3701'; g.dispatchEvent(new Event('input'));`); await shot('global-search-3701');
  await js(`document.getElementById('searchResults').classList.add('hidden')`);

  const reports = await js(`REPORTS.list().map(r=>r.id).concat(['pack'])`);
  for (const id of reports) {
    const rep = await js(`(()=>{try{ if('${id}'==='companycar'){S.clientId='demo3'} else {S.clientId='demo1'}; S.year = '${id}'==='assessment' ? 2026 : 2027; return REPORTS.build('${id}')}catch(e){return {error:e.message}}})()`);
    if (rep.error) { errors.push('report ' + id + ': ' + rep.error); continue; }
    if (/\bNaN\b|undefined|\[object Object\]/.test(rep.html.replace(/<[^>]+>/g, ' '))) errors.push('report ' + id + ' has NaN/undefined');
    fs.writeFileSync(path.join(OUT, 'report-' + id + '.pdf'), await htmlToPdfBuffer(rep.html));
  }
  await js(`REPORTS.preview('computation')`); await sleep(600); await shot('report-preview');

  fs.writeFileSync(path.join(OUT, 'errors.txt'), errors.join('\n') || 'none');
  console.log('SMOKE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
  app.exit(0);
});
