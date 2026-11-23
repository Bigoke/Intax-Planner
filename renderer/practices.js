// Intax Planner 1.3 – multiple practices, example practice, themes & text size, menu headings, custom tax years.
'use strict';

// ---------- logo (minimal "i" mark) ----------
const LOGO_SVG = (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#0d2340"/><rect x="26.5" y="27" width="11" height="25" rx="5.5" fill="#ffffff"/><circle cx="32" cy="15.5" r="6.5" fill="var(--logo-dot, #19a89f)"/></svg>`;

// ---------- themes, accent colours and text size ----------
const THEMES = [['light', 'Light', '#f4f6f9', '#ffffff', '#0d2340'], ['slate', 'Slate', '#eef1f5', '#ffffff', '#1e293b'], ['sand', 'Warm', '#f6f2ea', '#fffdf8', '#3b2f22'], ['dark', 'Dark', '#0f1722', '#172231', '#0a1220']];
const ACCENTS = { teal: ['#0b7a75', '#0e9a93', 'Teal'], blue: ['#1f5fbf', '#2f74d9', 'Blue'], green: ['#2f7d32', '#3d9a41', 'Green'], purple: ['#6b46c1', '#805ad5', 'Purple'], burgundy: ['#9b2c4a', '#b83a5c', 'Burgundy'], orange: ['#b9541c', '#d9692a', 'Orange'], graphite: ['#3f4a5a', '#566273', 'Graphite'] };
const TEXT_SIZES = [[85, 'Small'], [100, 'Normal'], [115, 'Large'], [130, 'Extra large']];
const hexRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
const Theme = {
  apply() {
    const P = S.prefs || DEFAULT_PREFS, root = document.documentElement;
    root.dataset.theme = P.theme || 'light';
    const a = ACCENTS[P.accent] || ACCENTS.teal;
    root.style.setProperty('--accent', a[0]); root.style.setProperty('--accent-2', a[1]);
    root.style.setProperty('--accent-rgb', hexRgb(a[0]));
    root.style.setProperty('--logo-dot', a[1]);
    Theme.zoom();
  },
  factor() {
    const P = S.prefs || DEFAULT_PREFS;
    const auto = P.autofit ? Math.min(1.35, Math.max(0.85, (window.outerWidth || 1440) / 1600)) : 1;
    return Math.min(2, Math.max(0.6, auto * (E.n(P.textSize) || 100) / 100));
  },
  zoom() { if (window.intax && window.intax.setZoom) window.intax.setZoom(Theme.factor()); },
  bump(d) { S.prefs.textSize = d === 0 ? 100 : Math.min(160, Math.max(70, (E.n(S.prefs.textSize) || 100) + d)); Theme.apply(); markDirty(); toast(`Text size ${S.prefs.textSize}%${S.prefs.autofit ? ' (auto-fit on)' : ''}`); },
  panel() {
    const P = S.prefs;
    const m = modal({ title: 'Appearance', body: Theme.controls(), foot: '<button class="btn btn-primary" data-close>Done</button>' });
    m.el.addEventListener('click', () => setTimeout(() => { const b = m.el.querySelector('.modal-body'); if (b) b.innerHTML = Theme.controls(); }, 0));
  },
  controls() {
    const P = S.prefs;
    return `<h3 style="margin-top:0">Theme</h3><div class="theme-tiles">${THEMES.map(([id, label, bg, card, side]) => `<button class="theme-tile ${P.theme === id ? 'on' : ''}" data-act="settheme" data-v="${id}"><span class="tt-prev" style="background:${bg}"><span style="background:${side}"></span><span style="background:${card}"></span></span>${label}</button>`).join('')}</div>
    <h3>Accent colour</h3><div class="btn-row">${Object.entries(ACCENTS).map(([id, a]) => `<button class="swatch ${P.accent === id ? 'on' : ''}" data-act="setaccent" data-v="${id}" title="${a[2]}" style="background:${a[0]}"></button>`).join('')}</div>
    <h3>Text size</h3><div class="btn-row"><div class="seg">${TEXT_SIZES.map(([v, l]) => `<button data-act="settext" data-v="${v}" class="${E.n(P.textSize) === v ? 'on' : ''}">${l}</button>`).join('')}</div><span class="muted">${E.n(P.textSize)}% · Ctrl + / Ctrl − / Ctrl 0</span></div>
    <label class="check" style="margin-top:12px"><input type="checkbox" data-p="a.autofit" ${P.autofit ? 'checked' : ''}> Auto-fit text to the window and screen size</label>
    <div class="muted" style="margin-top:6px">Current scale: ${Math.round(Theme.factor() * 100)}%</div>`;
  }
};
window.Theme = Theme;
let _zoomT; window.addEventListener('resize', () => { if (S.prefs && S.prefs.autofit) { clearTimeout(_zoomT); _zoomT = setTimeout(() => Theme.zoom(), 200); } });
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); Theme.bump(5); }
  if (e.key === '-') { e.preventDefault(); Theme.bump(-5); }
  if (e.key === '0') { e.preventDefault(); Theme.bump(0); }
});

// ---------- practices ----------
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const Practices = {
  current() { return (S.app.practices || []).find(p => p.id === S.practiceId) || null; },
  isExample() { const p = Practices.current(); return !!(p && p.example); },
  async create(name, data, example) {
    const id = newId();
    const settings = data ? data.settings : E.deepMerge(E.clone(DEFAULT_SETTINGS), { practice: { name } });
    settings.lastClient = data ? settings.lastClient : null;
    await window.intax.writePractice(id, data ? data.clients : [], settings);
    S.app.practices.push({ id, name, example: !!example, created: new Date().toISOString() });
    return id;
  },
  async createExample(open) {
    const ex = window.IntaxExample.buildExample(E);
    const id = await Practices.create('Example Tax Practice (demo)', ex, true);
    if (open || !S.app.current) S.app.current = id;
    await window.intax.save('app', S.app);
    return id;
  },
  async open(id) { if (S.practiceId) await flushSave(); S.app.current = id; await window.intax.save('app', S.app); location.reload(); },
  async newPractice(openAfter = true) {
    const m = modal({ title: 'New practice', body: `<p class="wiz-intro">Each practice has its own clients, letterhead, logo and practitioner details. Tax tables, theme and PIN are shared.</p><div class="field"><label>Practice name</label><input type="text" id="npName" placeholder="e.g. Smith Tax Consultants"></div>`, foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="npOk">Create practice</button>' });
    const i = m.el.querySelector('#npName'); i.focus();
    const go = async () => { const name = i.value.trim(); if (!name) return toast('Enter a name.'); m.el.remove(); await flushSave(); const id = await Practices.create(name, null, false); await window.intax.save('app', S.app); if (openAfter) Practices.open(id); else App.refresh(); };
    m.el.querySelector('#npOk').onclick = go; i.onkeydown = e => { if (e.key === 'Enter') go(); };
  },
  rename(id) {
    const p = S.app.practices.find(x => x.id === id);
    const m = modal({ title: 'Rename practice', body: `<div class="field"><label>Name in the practice list</label><input type="text" id="rnName" value="${esc(p.name)}"></div>${id === S.practiceId ? '<p class="muted">The name printed on reports is set under Practice details below.</p>' : ''}`, foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="rnOk">Save</button>' });
    const i = m.el.querySelector('#rnName'); i.focus(); i.select();
    m.el.querySelector('#rnOk').onclick = async () => { if (!i.value.trim()) return; p.name = i.value.trim(); m.el.remove(); await window.intax.save('app', S.app); App.renderChrome(); App.refresh(); };
  },
  async remove(id) {
    const p = S.app.practices.find(x => x.id === id);
    if (!(await confirmBox(`Delete the practice <b>${esc(p.name)}</b> and all its clients?<br><span class="muted">${p.example ? 'This is example data.' : 'The folder is moved to Backups\\Deleted practices, so it can be recovered.'}</span>`, 'Delete practice'))) return;
    if (id === S.practiceId) { clearTimeout(saveTimer); }
    else await flushSave();
    await window.intax.removePractice(id);
    S.app.practices = S.app.practices.filter(x => x.id !== id);
    if (!S.app.practices.length) { const nid = await Practices.create('My practice', null, false); S.app.current = nid; }
    if (id === S.practiceId || !S.app.practices.some(x => x.id === S.app.current)) { S.app.current = S.app.practices[0].id; await window.intax.save('app', S.app); location.reload(); return; }
    await window.intax.save('app', S.app); App.renderChrome(); App.refresh(); toast('Practice deleted');
  },
  menu() {
    const m = modal({ title: 'Practices', body: `<table class="t"><tbody>${S.app.practices.map(p => `<tr class="${p.id === S.practiceId ? 'sub' : 'clickable'}" ${p.id === S.practiceId ? '' : `data-popen="${p.id}"`}><td><b>${esc(p.name)}</b>${p.example ? ' <span class="chip">example</span>' : ''}</td><td class="r">${p.id === S.practiceId ? '<span class="pill ok">Open</span>' : '<span class="btn-link">Open →</span>'}</td></tr>`).join('')}</tbody></table>`, foot: `<button class="btn" data-route="settings" data-close>Manage practices</button><button class="btn" id="pmEx">+ Example practice</button><button class="btn btn-primary" id="pmNew">+ New practice</button>` });
    m.body.onclick = e => { const r = e.target.closest('[data-popen]'); if (r) Practices.open(r.dataset.popen); };
    m.el.querySelector('#pmNew').onclick = () => { m.el.remove(); Practices.newPractice(); };
    m.el.querySelector('#pmEx').onclick = async () => { m.el.remove(); await flushSave(); const id = await Practices.createExample(false); Practices.open(id); };
  }
};
window.Practices = Practices;

// ---------- chrome: brand, collapsible menu headings ----------
const _renderChrome = App.renderChrome;
App.renderChrome = function () {
  _renderChrome.call(App);
  const p = Practices.current();
  document.getElementById('practiceName').textContent = (p ? p.name : '') || S.settings.practice.name || 'Tax planning workstation';
  document.getElementById('brandMark').innerHTML = LOGO_SVG(34);
  const y = cur() ? yd(false) : null, col = (S.prefs && S.prefs.navCollapsed) || {};
  let html = '', group = null;
  for (const n of NAV) {
    if (n.group) { group = n.group; const c = col[group] && !NAV.some(x => x.id === S.route && groupOf(x.id) === group); html += `<div class="nav-group ${c ? 'collapsed' : ''}" data-navgroup="${esc(group)}"><span>${esc(group)}</span><span class="caret">▾</span></div>`; continue; }
    const hidden = col[group] && S.route !== n.id;
    if (hidden) continue;
    html += `<div class="nav-item ${S.route === n.id ? 'active' : ''}" data-route="${n.id}"><span class="ni">${n.icon}</span><span>${n.label}</span>${n.flag && y && y.flags && y.flags[n.flag] ? '<span class="dot"></span>' : ''}${n.id === 'clients' ? `<span class="badge">${S.clients.length}</span>` : ''}</div>`;
  }
  document.getElementById('sidebar').innerHTML = html;
};
function groupOf(id) { let g = null; for (const n of NAV) { if (n.group) g = n.group; else if (n.id === id) return g; } return null; }

const _bind = App.bind;
App.bind = function () {
  _bind.call(App);
  document.getElementById('practiceSwitch').onclick = () => Practices.menu();
  document.getElementById('appearanceBtn').onclick = () => Theme.panel();
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-navgroup]');
    if (g) { const k = g.dataset.navgroup; S.prefs.navCollapsed = S.prefs.navCollapsed || {}; S.prefs.navCollapsed[k] = !S.prefs.navCollapsed[k]; markDirty(); App.renderChrome(); }
  });
};

// Lock screen uses the logo
const _lock = App.lockScreen;
App.lockScreen = async function () { await _lock.call(App); const b = document.querySelector('.lock-box .brand-mark'); if (b) { b.outerHTML = `<div style="margin:0 auto 12px;width:56px">${LOGO_SVG(56)}</div>`; } };

// Welcome
App.welcome = function () {
  if (Practices.isExample()) {
    const m = modal({ title: 'Welcome to Intax Planner', body: `<div style="display:flex;gap:16px;align-items:flex-start">${LOGO_SVG(56)}<div><p class="wiz-intro" style="margin-top:0">You are looking at an <b>example practice</b> with three fictional clients, so you can see every screen and report with real-looking figures.</p><ul class="help-article"><li><b>Thandi Mokoena</b> – salary, consulting business, rental, shares and crypto, two vehicles, working from home.</li><li><b>Johan van der Merwe</b> – pensioner, 65+, interest and medical expenses.</li><li><b>Pieter Nel</b> – married in community of property, two company cars, rental and a TFSA.</li></ul><p class="muted">The example practice can be deleted at any time from the practice menu (top left) or Practice settings.</p></div></div>`, foot: `<button class="btn" id="wEx">Explore the example</button><button class="btn btn-primary" id="wNew">Create my own practice</button>` });
    m.el.querySelector('#wEx').onclick = () => { m.close(); };
    m.el.querySelector('#wNew').onclick = () => { m.close(); Practices.newPractice(); };
  } else {
    const m = modal({ title: 'Your practice is ready', body: `<p class="wiz-intro">Plan individual income tax for your clients: provisional tax (IRP6) for August, February and the September top-up, and the final ITR12.</p><ol class="help-article"><li>Add your <b>practice details and logo</b> – they print on every report.</li><li>Create your first <b>client</b> with the client wizard.</li><li>Run the <b>guided set-up</b> to capture income and deductions.</li></ol>`, foot: `<button class="btn" id="wSet">Practice settings</button><button class="btn btn-primary" id="wNew">Create first client</button>` });
    m.el.querySelector('#wSet').onclick = () => { m.close(); App.go('settings'); };
    m.el.querySelector('#wNew').onclick = () => { m.close(); Wizard.open('newclient'); };
  }
  S.prefs.welcomed = true; markDirty();
};

// ---------- example banner on the practice dashboard ----------
const exampleBanner = () => Practices.isExample() ? `<div class="alert warn" style="margin-bottom:14px;align-items:center">📘 <span><b>Example practice</b> – three fictional clients for exploring the app. Delete it when you no longer need it.</span><span style="margin-left:auto" class="btn-row"><button class="btn btn-sm" data-act="newpractice">Create my practice</button><button class="btn btn-sm btn-danger" data-act="delpractice" data-id="${S.practiceId}">Delete example</button></span></div>` : '';
const _practiceScreen = SCREENS.practice;
SCREENS.practice = () => exampleBanner() + _practiceScreen();
const _clientsScreen = SCREENS.clients;
SCREENS.clients = () => exampleBanner() + _clientsScreen();

// ---------- settings: practices + appearance ----------
const _settings4 = SCREENS.settings;
SCREENS.settings = () => {
  const list = S.app.practices;
  return _settings4().replace('<div class="page-sub">Your practice details print on every report.</div>', `<div class="page-sub">Settings for <b>${esc((Practices.current() || {}).name || '')}</b>. Practice details print on every report.</div>`) +
  `<div class="grid g2"><div class="card"><div class="card-head"><h2>Practices</h2><button class="btn btn-sm" data-act="addexample">+ Example practice</button><button class="btn btn-sm btn-primary" data-act="newpractice">+ New practice</button></div>
    <p class="muted">Each practice has its own clients, letterhead and practitioner. Tax tables, appearance and the PIN are shared.</p>
    <table class="t"><thead><tr><th>Practice</th><th class="r">Clients</th><th></th></tr></thead><tbody>${list.map(p => `<tr><td><b>${esc(p.name)}</b>${p.example ? ' <span class="chip">example</span>' : ''}${p.id === S.practiceId ? ' <span class="pill ok">Open</span>' : ''}</td><td class="r">${p.id === S.practiceId ? S.clients.length : ''}</td><td><div class="btn-row" style="justify-content:flex-end">${p.id === S.practiceId ? '' : `<button class="btn btn-sm" data-act="openpractice" data-id="${p.id}">Open</button>`}<button class="btn btn-sm" data-act="renamepractice" data-id="${p.id}">Rename</button><button class="btn btn-sm btn-danger" data-act="delpractice" data-id="${p.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h2>Appearance</h2>${Theme.controls()}</div></div>`;
};

// ---------- tax tables: custom years, more fields, add/remove rows ----------
const ensureOv = (yr) => { if (!S.overrides[yr]) S.overrides[yr] = E.clone(pack(yr)); return S.overrides[yr]; };
SCREENS.taxtables = () => {
  const yr = YEARS.includes(S.scratch.ttYear) ? S.scratch.ttYear : S.year; S.scratch.ttYear = yr;
  const P = pack(yr), custom = !PACKS[yr];
  const status = custom ? '<span class="pill warn">Custom year</span>' : S.overrides[yr] ? '<span class="pill warn">Edited</span>' : '<span class="pill ok">SARS defaults</span>';
  const get = (k) => k.split('.').reduce((o, x) => (o == null ? undefined : o[x]), P);
  const tf = (k, label, type) => f({ p: `x.${yr}.${k}`, label, type: type || 'money', value: get(k) });
  const tp = (k, label) => f({ p: `x.${yr}.${k}`, label: label + ' (%)', type: 'pct', value: E.r2((get(k) || 0) * 100) });
  const rowBtns = (k, i) => `<td style="width:40px"><button class="btn btn-sm btn-danger" data-act="ttrowdel" data-k="${k}" data-i="${i}" title="Remove row">✕</button></td>`;
  return head('Tax tables', 'All rates and limits used by the planner. Update them after each Budget, or add a new tax year and fill it in yourself.', `<select id="ttYear">${YEARS.slice().reverse().map(y => `<option ${y === yr ? 'selected' : ''} value="${y}">${pack(y).label}${PACKS[y] ? '' : ' – custom'}</option>`).join('')}</select>${status}<button class="btn btn-primary" data-act="ttaddyear">+ Add tax year</button><button class="btn" data-act="ttexport">Export</button><button class="btn" data-act="ttimport">Import</button>${custom ? `<button class="btn btn-danger" data-act="ttdelyear" data-y="${yr}">Delete year</button>` : `<button class="btn btn-danger" data-act="ttreset" data-y="${yr}">Reset to SARS</button>`}<button class="btn" data-report="tables">Print tables</button>`) +
  (custom ? `<div class="alert warn">✎ <span><b>Custom tax year ${yr}</b>${P.copiedFrom ? ` – values were copied from ${P.copiedFrom}` : ''}. Replace them with the figures from the Budget Review or SARS tables: brackets, rebates, thresholds, medical credits and the travel table are the ones that change most years.</span></div>` : '') +
  `<div class="grid g2"><div class="card"><div class="card-head"><h2>Income tax brackets</h2><button class="btn btn-sm" data-act="ttrowadd" data-k="brackets">+ Row</button></div><table class="t"><thead><tr><th class="r">Taxable income above</th><th class="r">Base tax</th><th class="r">Rate %</th><th></th></tr></thead><tbody>${P.brackets.map((b, i) => `<tr><td><input class="num" data-num="money" data-p="x.${yr}.brackets.${i}.from" value="${fmtInput(b.from)}"></td><td><input class="num" data-num="money" data-p="x.${yr}.brackets.${i}.base" value="${fmtInput(b.base)}"></td><td><input class="num" data-num="pct" data-p="x.${yr}.brackets.${i}.rate" value="${(b.rate * 100).toFixed(2)}"></td>${P.brackets.length > 1 ? rowBtns('brackets', i) : '<td></td>'}</tr>`).join('')}</tbody></table>
    <div class="btn-row" style="margin-top:8px"><button class="btn btn-sm" data-act="ttcalcbase" data-y="${yr}" title="Work out each base tax from the bracket limits and rates">Recalculate base tax from rates</button></div></div>
  <div class="card"><h2>Rebates, thresholds & credits</h2><div class="grid g3">${tf('rebates.primary', 'Primary rebate')}${tf('rebates.secondary', 'Secondary (65+)')}${tf('rebates.tertiary', 'Tertiary (75+)')}${tf('thresholds.under65', 'Threshold < 65')}${tf('thresholds.age65', 'Threshold 65–74')}${tf('thresholds.age75', 'Threshold 75+')}${tf('medicalCredits.main', 'Medical credit – main')}${tf('medicalCredits.first', '– first dependant')}${tf('medicalCredits.additional', '– each additional')}${tf('interestExemption.under65', 'Interest exemption < 65')}${tf('interestExemption.over65', 'Interest exemption 65+')}${tf('travel.prescribedRate', 'Prescribed rate per km', 'dec')}${tf('subsistence.meals', 'Subsistence – meals & incidentals')}${tf('subsistence.incidental', 'Subsistence – incidentals')}</div>
    <div style="margin-top:8px"><button class="btn btn-sm" data-act="ttcalcthr" data-y="${yr}">Recalculate thresholds from brackets and rebates</button></div></div></div>
  <div class="card"><h2>Other limits & rates</h2><div class="grid g4">${tf('retirement.cap', 'Retirement deduction cap')}${tp('retirement.pct', 'Retirement deduction')}${tf('cgt.annualExclusion', 'CGT annual exclusion')}${tf('cgt.deathExclusion', 'CGT exclusion in year of death')}${tf('cgt.primaryResidence', 'Primary residence exclusion')}${tp('cgt.inclusionRate', 'CGT inclusion rate')}${tf('cgt.smallBusinessExclusion', 'Small business exclusion')}${tp('donationsPct', 'Donations limit')}${tf('tfsa.annual', 'TFSA annual limit')}${tf('tfsa.lifetime', 'TFSA lifetime limit')}${tp('dividendsTaxRate', 'Dividends tax')}${tf('foreignEmploymentExemption', 'Foreign employment exemption')}${tp('companyCar.standard', 'Company car monthly rate')}${tp('companyCar.maintenancePlan', 'Company car rate – maintenance plan')}${tp('provisional.penaltyRate', 'Underestimation penalty')}${tp('provisional.basicUplift', 'Basic amount uplift p.a.')}</div></div>
  <div class="grid g2"><div class="card"><div class="card-head"><h2>Travel cost scale</h2><button class="btn btn-sm" data-act="ttrowadd" data-k="travel.scale">+ Row</button></div><table class="t"><thead><tr><th class="r">Value up to</th><th class="r">Fixed R</th><th class="r">Fuel c</th><th class="r">Maint c</th><th></th></tr></thead><tbody>${P.travel.scale.map((b, i) => `<tr><td><input class="num" data-num="money" data-p="x.${yr}.travel.scale.${i}.upTo" value="${b.upTo === null ? '' : fmtInput(b.upTo)}" placeholder="no limit"></td><td><input class="num" data-num="money" data-p="x.${yr}.travel.scale.${i}.fixed" value="${fmtInput(b.fixed)}"></td><td><input class="num" data-num="dec" data-p="x.${yr}.travel.scale.${i}.fuel" value="${b.fuel}"></td><td><input class="num" data-num="dec" data-p="x.${yr}.travel.scale.${i}.maint" value="${b.maint}"></td>${P.travel.scale.length > 1 ? rowBtns('travel.scale', i) : '<td></td>'}</tr>`).join('')}</tbody></table><p class="muted">Leave "value up to" empty on the last row (no upper limit).</p></div>
  <div class="card"><h2>Retirement lump sum tables</h2>${['lumpSumWithdrawal', 'lumpSumRetirement'].map(k => `<h3>${k === 'lumpSumWithdrawal' ? 'Withdrawal benefits' : 'Retirement / severance benefits'}</h3><table class="t"><thead><tr><th class="r">Above</th><th class="r">Base tax</th><th class="r">Rate %</th></tr></thead><tbody>${P[k].map((b, i) => `<tr><td><input class="num" data-num="money" data-p="x.${yr}.${k}.${i}.from" value="${fmtInput(b.from)}"></td><td><input class="num" data-num="money" data-p="x.${yr}.${k}.${i}.base" value="${fmtInput(b.base)}"></td><td><input class="num" data-num="pct" data-p="x.${yr}.${k}.${i}.rate" value="${(b.rate * 100).toFixed(2)}"></td></tr>`).join('')}</tbody></table>`).join('')}
  <h3>Notes for this year</h3>${f({ p: `x.${yr}.notes`, label: 'Notes', type: 'textarea', value: P.notes || '' })}</div></div>`;
};

Object.assign(ACTIONS2, {
  newpractice() { Practices.newPractice(); },
  async addexample() { await flushSave(); const id = await Practices.createExample(false); if (await confirmBox('Example practice added. Open it now?', 'Open')) Practices.open(id); else App.refresh(); },
  openpractice(t, ds) { Practices.open(ds.id); },
  renamepractice(t, ds) { Practices.rename(ds.id); },
  delpractice(t, ds) { Practices.remove(ds.id); },
  settheme(t, ds) { S.prefs.theme = ds.v; Theme.apply(); markDirty(); App.refresh(); },
  setaccent(t, ds) { S.prefs.accent = ds.v; Theme.apply(); markDirty(); App.refresh(); },
  settext(t, ds) { S.prefs.textSize = Number(ds.v); Theme.apply(); markDirty(); App.refresh(); },
  ttaddyear() {
    const next = Math.max(...YEARS) + 1;
    const m = modal({ title: 'Add a tax year', body: `<p class="wiz-intro">Add a tax year that is not built in yet (for example after a new Budget). The tables are copied from an existing year so you only change what is new.</p><div class="grid g2"><div class="field"><label>Tax year (year it ends in February)</label><input type="text" class="num" id="nyYear" value="${next}"></div><div class="field"><label>Copy tables from</label><select id="nyFrom">${YEARS.slice().reverse().map(y => `<option value="${y}">${pack(y).label}</option>`).join('')}</select></div></div><div class="muted" id="nyLbl" style="margin-top:8px"></div>`, foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="nyOk">Add year</button>' });
    const yi = m.el.querySelector('#nyYear'), lbl = m.el.querySelector('#nyLbl');
    const show = () => { const y = parseInt(yi.value, 10); lbl.textContent = y > 1990 && y < 2200 ? window.IntaxPacks.yearMeta(y).label + (YEARS.includes(y) ? ' – already exists' : '') : ''; };
    yi.oninput = show; show();
    m.el.querySelector('#nyOk').onclick = () => {
      const y = parseInt(yi.value, 10), from = Number(m.el.querySelector('#nyFrom').value);
      if (!(y > 1990 && y < 2200)) return toast('Enter a valid year.');
      if (YEARS.includes(y)) return toast(`${y} already exists.`);
      S.overrides[y] = Object.assign(E.clone(pack(from)), window.IntaxPacks.yearMeta(y), { custom: true, copiedFrom: from, notes: `Custom tax year added on ${new Date().toISOString().slice(0, 10)}, copied from ${from}.` });
      refreshYears(); fillYearSelect(); S.scratch.ttYear = y; markDirty(); m.el.remove(); App.refresh(); toast(`${y} added – update the figures`);
    };
  },
  async ttdelyear(t, ds) {
    const y = Number(ds.y), used = S.clients.filter(c => c.years && c.years[y]).length;
    if (!(await confirmBox(`Delete the custom tax year ${y}?${used ? `<br><b>${used} client(s) in this practice have ${y} data</b> – it is kept but cannot be opened until the year is added again.` : ''}`, 'Delete year'))) return;
    delete S.overrides[y]; refreshYears(); if (S.year === y) S.year = Math.max(...YEARS.filter(x => x !== y)); S.scratch.ttYear = S.year; fillYearSelect(); markDirty(); App.renderChrome(); App.refresh();
  },
  ttrowadd(t, ds) {
    const o = ensureOv(S.scratch.ttYear); const arr = ds.k.split('.').reduce((x, k) => x[k], o);
    if (ds.k === 'brackets') { const last = arr[arr.length - 1]; arr.push({ from: last.from + 100000, base: 0, rate: last.rate }); }
    else { const last = arr[arr.length - 1]; const prev = arr[arr.length - 2]; if (last.upTo === null) last.upTo = (prev ? prev.upTo : 0) + 100000; arr.push({ upTo: null, fixed: last.fixed, fuel: last.fuel, maint: last.maint }); }
    markDirty(); App.refresh();
  },
  ttrowdel(t, ds) { const o = ensureOv(S.scratch.ttYear); const arr = ds.k.split('.').reduce((x, k) => x[k], o); arr.splice(Number(ds.i), 1); if (ds.k === 'travel.scale' && arr.length) arr[arr.length - 1].upTo = null; markDirty(); App.refresh(); },
  ttcalcbase(t, ds) { const o = ensureOv(Number(ds.y)); const b = o.brackets; b[0].base = 0; for (let i = 1; i < b.length; i++) b[i].base = Math.round(b[i - 1].base + b[i - 1].rate * (b[i].from - b[i - 1].from)); markDirty(); App.refresh(); toast('Base tax recalculated'); },
  ttcalcthr(t, ds) {
    const o = ensureOv(Number(ds.y)), b = o.brackets;
    const thr = (reb) => { for (let i = 0; i < b.length; i++) { const to = i + 1 < b.length ? b[i + 1].from : Infinity; const atTop = b[i].base + b[i].rate * (to - b[i].from); if (atTop >= reb || to === Infinity) return Math.round(b[i].from + (reb - b[i].base) / b[i].rate); } return 0; };
    o.thresholds = { under65: thr(o.rebates.primary), age65: thr(o.rebates.primary + o.rebates.secondary), age75: thr(o.rebates.primary + o.rebates.secondary + o.rebates.tertiary) };
    markDirty(); App.refresh(); toast('Thresholds recalculated');
  }
});
// Importing tax tables may bring custom years
const _ttimport = App.action;
App.action = async function (act, t) { const r = await _ttimport.call(App, act, t); if (act === 'ttimport' || act === 'ttreset') { refreshYears(); fillYearSelect(); } return r; };
