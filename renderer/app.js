// Intax Planner – application controller: routing, binding, actions, search, summary panel.
'use strict';

const App = {
  async init() {
    const d = window.intax ? await window.intax.load() : { clients: [], settings: null, taxpacks: {}, appData: { practices: [], prefs: {} } };
    S.app = d.appData || { practices: [], prefs: {} }; S.app.practices = S.app.practices || [];
    S.prefs = E.deepMerge(E.clone(DEFAULT_PREFS), S.app.prefs || {}); S.app.prefs = S.prefs;
    Theme.apply();
    if (!S.app.practices.length) { await Practices.createExample(true); location.reload(); return; }
    S.practiceId = d.practiceId; S.app.current = S.practiceId;
    S.clients = d.clients || [];
    S.clients.forEach(c => Object.values(c.years || {}).forEach(y => E.migrateYear(y))); S.overrides = d.taxpacks || {}; refreshYears(); S.dataDir = d.dataDir || ''; S.version = d.version || '';
    S.settings = E.deepMerge(E.clone(DEFAULT_SETTINGS), d.settings || {});
    S.year = YEARS.includes(S.settings.lastYear) ? S.settings.lastYear : YEARS[YEARS.length - 1];
    S.clientId = S.clients.some(c => c.id === S.settings.lastClient) ? S.settings.lastClient : (S.clients[0] || {}).id || null;
    fillYearSelect();
    App.bind();
    App.route(S.prefs.defaultHome === 'client' && S.clientId ? 'dashboard' : 'practice');
    if (!S.prefs.welcomed || !S.clients.length) setTimeout(() => App.welcome(), 300);
    if (S.prefs.security.pinHash) App.lockScreen();
    App.idleWatch();
  },

  welcome() {
    const m = modal({ title: 'Welcome to Intax Planner', body: `<p class="wiz-intro">Plan individual income tax for your clients: provisional tax (IRP6) for August, February and the September top-up, and the final ITR12 – for the 2020 to 2027 tax years.</p><ol class="help-article"><li>Add your <b>practice details and logo</b> – they print on every report.</li><li>Create your first <b>client</b> with the client wizard.</li><li>Run the <b>guided set-up</b> to capture income and deductions.</li></ol>`, foot: `<button class="btn" id="wSet">Practice settings</button><button class="btn btn-primary" id="wNew">Create first client</button>` });
    m.el.querySelector('#wSet').onclick = () => { m.close(); App.go('settings'); };
    m.el.querySelector('#wNew').onclick = () => { m.close(); Wizard.open('newclient'); };
  },

  async lockScreen() {
    if (!S.prefs.security.pinHash) { toast('Set a PIN in Practice settings first.'); return; }
    const el = document.createElement('div');
    el.className = 'lock-screen';
    el.innerHTML = `<div class="lock-box"><div class="brand-mark" style="width:54px;height:54px;font-size:20px;margin:0 auto 12px">IT</div><h2>Intax Planner is locked</h2><p class="muted">${esc(S.settings.practice.name || '')}</p><input type="password" id="pinIn" placeholder="Enter PIN" autocomplete="off" style="text-align:center;font-size:18px;letter-spacing:6px"><div id="pinErr" class="muted" style="height:18px;margin-top:6px"></div><button class="btn btn-primary" id="pinGo" style="width:100%">Unlock</button></div>`;
    document.body.appendChild(el);
    const inp = el.querySelector('#pinIn'); inp.focus();
    const go = async () => { if (await sha256('intax:' + inp.value) === S.prefs.security.pinHash) el.remove(); else { el.querySelector('#pinErr').textContent = 'Incorrect PIN'; inp.value = ''; inp.focus(); } };
    el.querySelector('#pinGo').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  },
  idleWatch() {
    let last = Date.now();
    ['mousemove', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, () => { last = Date.now(); }, true));
    setInterval(() => { const m = E.n(S.prefs.security.lockMinutes); if (m && S.prefs.security.pinHash && Date.now() - last > m * 60000 && !document.querySelector('.lock-screen')) App.lockScreen(); }, 15000);
  },

  afterClientChange() { S.settings.lastClient = S.clientId; S.settings.lastYear = S.year; markDirty(); App.renderChrome(); },

  renderChrome() {
    const c = cur();
    document.getElementById('clientName').textContent = c ? clientName(c) : 'No client selected';
    document.getElementById('clientRef').textContent = c && c.taxRef ? 'Tax no. ' + c.taxRef : '';
    document.getElementById('yearSelect').value = S.year;
    document.getElementById('practiceName').textContent = S.settings.practice.name || 'Tax planning workstation';
    const y = c ? yd() : null;
    document.getElementById('sidebar').innerHTML = NAV.map(n => n.group ? `<div class="nav-group">${n.group}</div>` :
      `<div class="nav-item ${S.route === n.id ? 'active' : ''}" data-route="${n.id}"><span class="ni">${n.icon}</span><span>${n.label}</span>${n.flag && y && y.flags[n.flag] ? '<span class="dot"></span>' : ''}${n.id === 'clients' ? `<span class="badge">${S.clients.length}</span>` : ''}</div>`).join('');
    App.renderSummary();
  },

  renderSummary() {
    const el = document.getElementById('summary');
    const c = cur();
    if (!c) { el.innerHTML = `<div class="sum-title">Tax position</div><p class="muted">Select or create a client to see the live tax position.</p><button class="btn btn-primary" data-wizard="newclient">+ New client</button>`; return; }
    let r; try { r = result(); } catch (e) { el.innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; return; }
    const pv = r.provisional, y = yd();
    el.innerHTML = `<div class="sum-title">Live tax position · ${S.year}</div>
      <div class="sum-row"><span>Gross income</span><span>${money0(r.incomeTotal + r.cgt.taxableGain)}</span></div>
      <div class="sum-row"><span>Deductions</span><span>${money0(-(r.totalDeductions))}</span></div>
      <div class="sum-row"><span><b>Taxable income</b></span><span><b>${money0(r.taxableIncome)}</b></span></div>
      <div class="sum-row"><span>Tax before credits</span><span>${money0(r.grossTax - r.rebates)}</span></div>
      <div class="sum-row"><span>Medical credits</span><span>${money0(-(r.medical.mtcUsed + r.medical.additionalUsed))}</span></div>
      <div class="sum-row"><span>Lump sum tax</span><span>${money0(r.lump.total)}</span></div>
      <div class="sum-row"><span><b>Total liability</b></span><span><b>${money0(r.liability)}</b></span></div>
      <div class="sum-row"><span>PAYE</span><span>${money0(-r.paye)}</span></div>
      <div class="sum-row"><span>Provisional paid</span><span>${money0(-r.provisionalPaid)}</span></div>
      <div class="sum-row big"><span>${r.balance > 0 ? 'Payable' : 'Refund'}</span><span class="${r.balance > 0 ? 'neg' : ''}">${money0(Math.abs(r.balance))}</span></div>
      <div class="muted">Marginal ${pct(r.marginalRate)} · Effective ${r.effectiveRate}%</div>
      ${y.flags.provisional ? `<div class="sum-box"><div class="sum-title">IRP6 payments</div>
        <div class="sum-row" data-go="p1" style="cursor:pointer"><span>1st · ${dateLong(pv.dueDates.p1)}</span><span>${money0(pv.p1.due)}</span></div>
        <div class="sum-row" data-go="p2" style="cursor:pointer"><span>2nd · ${dateLong(pv.dueDates.p2)}</span><span>${money0(pv.p2.due)}</span></div>
        <div class="sum-row" data-go="p3" style="cursor:pointer"><span>Top-up · ${dateLong(pv.p3.dueDate)}</span><span>${money0(pv.p3.due)}</span></div>
        <div style="margin-top:6px">${pv.penalty.ok ? '<span class="pill ok">Penalty test passed</span>' : '<span class="pill bad">Penalty risk ' + money0(pv.penalty.amount) + '</span>'}</div></div>` : ''}
      <div class="sum-title" style="margin-top:14px">Review points</div>${r.warnings.slice(0, 6).map(w => `<div class="alert ${w.level}" style="font-size:12px"><span>${esc(w.text)}</span>${w.go ? `<button class="btn-link go" data-go="${w.go}">→</button>` : ''}</div>`).join('') || '<div class="muted">None</div>'}`;
  },

  route(r, opts) {
    if (NEEDS_CLIENT.has(r) && !cur()) { r = 'clients'; }
    S.route = r;
    const el = document.getElementById('content');
    try { el.innerHTML = SCREENS[r] ? SCREENS[r]() : '<p>Not found</p>'; }
    catch (e) { console.error(e); el.innerHTML = `<div class="alert bad">Error showing this screen: ${esc(e.message)}</div>`; }
    const y = cur() ? yd(false) : null;
    if (y && y.locked && NEEDS_CLIENT.has(r) && !UNLOCKED_SCREENS.has(r)) {
      el.querySelectorAll('input,select,textarea').forEach(i => { if (!i.closest('[data-allow]')) i.disabled = true; });
      el.querySelectorAll('[data-act="add"],[data-act="del"],[data-act="addcode"],[data-act="addexp"],[data-wizard]').forEach(b => b.disabled = true);
      el.insertAdjacentHTML('afterbegin', `<div class="alert info" style="margin-bottom:14px">🔒 The ${S.year} tax year is locked (status: ${esc(y.status || 'Submitted')}). <button class="btn-link go" data-act="unlockyear">Unlock to edit</button></div>`);
    }
    if (!opts || !opts.keepScroll) el.scrollTop = 0;
    App.renderChrome();
  },
  go(r, field) {
    App.route(r);
    if (field) setTimeout(() => {
      const el = document.querySelector(`[data-field="${field}"]`); if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash');
      const inp = el.querySelector('input,select'); if (inp) inp.focus();
      setTimeout(() => el.classList.remove('flash'), 1800);
    }, 60);
  },
  // Re-render the current screen without losing focus or scroll.
  refresh() {
    const ae = document.activeElement;
    const key = ae && ae.dataset && ae.dataset.p ? ae.dataset.p : (ae && ae.id) || null;
    const selStart = ae && 'selectionStart' in ae ? ae.selectionStart : null;
    const content = document.getElementById('content'), scroll = content.scrollTop;
    if (Wizard.active && document.contains(Wizard.active.m.el)) { const b = Wizard.active.m.body, s = b.scrollTop; Wizard.refresh(); b.scrollTop = s; }
    else App.route(S.route, { keepScroll: true });
    content.scrollTop = scroll;
    App.renderSummary();
    if (key) {
      const n = document.querySelector(`[data-p="${CSS.escape(key)}"]`) || document.getElementById(key);
      if (n) { n.focus(); try { if (selStart !== null && n.setSelectionRange) n.setSelectionRange(selStart, selStart); } catch (e) {} }
    }
  },

  setValue(el) {
    const p = el.dataset.p; let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.dataset.num) {
      if (el.value.trim() === '' && (p.endsWith('estimateTI') || p.endsWith('.paye') || p.endsWith('.upTo'))) v = null;
      else { v = parseNum(el.value); if (el.dataset.num === 'pct') v = v / 100; if (el.dataset.num === 'int') v = Math.round(v); }
    } else v = el.value;
    if (el.tagName === 'SELECT' && el.dataset.num) v = Number(v);
    if (el.dataset.tri) v = v === 'yes' ? true : v === 'no' ? false : null;
    if (p.startsWith('x.')) { // tax table override
      const [, yr, ...rest] = p.split('.');
      if (!S.overrides[yr]) S.overrides[yr] = E.clone(pack(Number(yr)));
      let o = S.overrides[yr]; for (let i = 0; i < rest.length - 1; i++) o = o[rest[i]];
      o[rest[rest.length - 1]] = v; markDirty(); return;
    }
    const before = getP(p);
    setP(p, v);
    if ((p.startsWith('y.') || p.startsWith('c.')) && before !== v && cur()) App.log(p, before, v);
    if (p.startsWith('a.')) Theme.apply();
    if (p === 'y.flags.provisional' || p.startsWith('s.') || p.startsWith('a.')) App.renderChrome();
    markDirty();
  },

  // Change log (audit trail) per client; consecutive edits of one field within a minute are merged.
  log(p, from, to) {
    const c = cur(); if (!c) return;
    c.log = c.log || [];
    const now = new Date().toISOString(), last = c.log[c.log.length - 1];
    const label = App.fieldLabel(p);
    if (last && last.p === p && last.year === S.year && (Date.parse(now) - Date.parse(last.t)) < 60000) { last.to = to; last.t = now; }
    else c.log.push({ t: now, year: p.startsWith('y.') ? S.year : null, p, label, from: from === undefined ? '' : from, to, user: S.settings.practice.practitioner || '' });
    if (c.log.length > 3000) c.log.splice(0, c.log.length - 3000);
  },
  fieldLabel(p) {
    const n = document.querySelector(`[data-field="${CSS.escape(p)}"] label`);
    if (n) return n.textContent.trim();
    const m = p.match(/irp5\.(\d+)\.codes\.(\d+)\.(\w+)/);
    if (m) { const cert = (yd().irp5 || [])[m[1]], l = cert && cert.codes[m[2]]; return `IRP5 ${Number(m[1]) + 1} ${l ? 'code ' + l.code : ''} ${m[3]}`; }
    return p.replace(/^[yc]\./, '').replace(/\./g, ' › ');
  },

  bind() {
    const doc = document;
    doc.addEventListener('change', e => {
      const el = e.target;
      if (el.id === 'yearSelect') { S.year = Number(el.value); App.afterClientChange(); App.route(S.route); return; }
      if (el.id === 'ttYear') { S.scratch.ttYear = Number(el.value); App.route('taxtables'); return; }
      if (el.dataset && el.dataset.p) { App.setValue(el); setTimeout(() => App.refresh(), 0); }
    });
    doc.addEventListener('input', e => {
      const el = e.target;
      if (el.id === 'clientFilter') { S.scratch.clientFilter = el.value; App.refresh(); }
      if (el.id === 'helpSearch') { S.scratch.helpQ = el.value; S.scratch.helpId = null; App.refresh(); }
    });
    doc.addEventListener('focusin', e => { const el = e.target; if (el.classList && el.classList.contains('num') && !el.readOnly) { el.value = el.value.replace(/\s/g, ''); setTimeout(() => el.select(), 0); } });
    doc.addEventListener('click', e => App.click(e));
    doc.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); App.clientPicker(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); doc.getElementById('globalSearch').focus(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && cur()) { e.preventDefault(); REPORTS.preview('computation'); }
    });
    doc.getElementById('clientSwitch').onclick = () => App.clientPicker();
    doc.getElementById('wizardBtn').onclick = () => Wizard.menu();
    doc.getElementById('reportsBtn').onclick = () => App.go('reports');
    doc.getElementById('lockBtn').onclick = () => App.lockScreen();
    App.bindSearch();
  },

  async click(e) {
    const t = e.target.closest('[data-route],[data-go],[data-wizard],[data-report],[data-help],[data-flag],[data-act],[data-open],[data-helpid],[data-codego]');
    if (!t) { if (!e.target.closest('.search-wrap')) document.getElementById('searchResults').classList.add('hidden'); return; }
    const ds = t.dataset;
    if (ds.route) return App.route(ds.route);
    if (ds.go) { const m = t.closest('.modal-back'); if (m) m.remove(); Wizard.active = null; return App.go(ds.go, ds.field); }
    if (ds.wizard) { Wizard.queue = []; return Wizard.open(ds.wizard); }
    if (ds.report) return REPORTS.preview(ds.report, ds.arg);
    if (ds.help) { S.scratch.helpId = ds.help; S.scratch.helpQ = ''; return App.route('help'); }
    if (ds.helpid) { S.scratch.helpId = ds.helpid; return App.refresh(); }
    if (ds.codego) return App.goCode(ds.codego);
    if (ds.open) { if (e.target.closest('button')) return; S.clientId = ds.open; App.afterClientChange(); return App.route('dashboard'); }
    if (ds.flag) { const y = yd(); y.flags[ds.flag] = !y.flags[ds.flag]; markDirty(); return App.refresh(); }
    if (ds.act) return App.action(ds.act, t);
  },

  goCode(code) {
    const c = codeList().find(x => x.code === code);
    const target = { travel: 'travel', retContrib: 'retirement', retFringe: 'retirement', medContrib: 'medical', medFringe: 'medical', donation: 'donations', lumpRet: 'lumps', lumpWd: 'lumps', savingsWd: 'lumps' }[c && c.treat] || 'employment';
    // Prefer the IRP5 line itself if it exists
    const y = yd(); let field = null;
    if (y) y.irp5.forEach((cert, i) => cert.codes.forEach((l, j) => { if (!field && l.code === code) field = `y.irp5.${i}.codes.${j}.amount`; }));
    App.go(field ? 'employment' : target, field);
    if (!field) toast(`Code ${code} – ${c ? c.name : ''}: add it on an IRP5 certificate.`);
  },

  async action(act, t) {
    const ds = t.dataset, y = yd();
    const TPL = {
      irp5: () => ({ employer: '', payeRef: '', from: pack().start, to: pack().end, codes: [{ code: '3601', amount: 0 }, { code: '4102', amount: 0 }] }),
      business: () => ({ name: '', kind: 'Sole proprietor', turnover: 0, otherIncome: 0, costOfSales: 0, wearTear: 0, homeOffice: 0, expenses: [] }),
      rental: () => ({ property: '', rent: 0, sharePct: 100, expenses: [] }),
      cgt: () => ({ desc: '', type: 'shares', date: '', proceeds: 0, baseCost: 0, costs: 0 }),
      other: () => ({ desc: '', amount: 0, type: 'taxable' })
    };
    if (window.ACTIONS2 && ACTIONS2[act]) return ACTIONS2[act](t, ds);
    switch (act) {
      case 'add': { const arr = getP(ds.p) || []; arr.push(TPL[ds.tpl]()); setP(ds.p, arr); const flag = { 'y.business': 'business', 'y.rental': 'rental', 'y.cgt.items': 'cgt', 'y.irp5': 'employment', 'y.other': 'other' }[ds.p]; if (flag) y.flags[flag] = true; markDirty(); App.refresh(); break; }
      case 'del': { if (!(await confirmBox('Remove this item?', 'Remove'))) return; const arr = getP(ds.p); arr.splice(Number(ds.i), 1); markDirty(); App.refresh(); break; }
      case 'addcode': { const cert = y.irp5[Number(ds.i)]; cert.codes.push({ code: ds.code || '3713', amount: 0 }); markDirty(); App.refresh(); const n = document.querySelector(`[data-p="y.irp5.${ds.i}.codes.${cert.codes.length - 1}.amount"]`); if (n) n.focus(); break; }
      case 'addexp': { const src = document.getElementById(ds.src); const arr = getP(ds.p) || []; arr.push({ desc: src.value || '', amount: 0 }); setP(ds.p, arr); markDirty(); App.refresh(); const n = document.querySelector(`[data-p="${ds.p}.${arr.length - 1}.${src.value ? 'amount' : 'desc'}"]`); if (n) n.focus(); break; }
      case 'useho': y.deductions.homeOffice = E.r2(Number(ds.v)); y.flags.homeOffice = true; markDirty(); App.refresh(); break;
      case 'wireset': S.scratch.wi = null; App.refresh(); break;
      case 'logo': { const img = await window.intax.pickImage(); if (img) { S.settings.practice.logo = img; markDirty(); App.refresh(); } break; }
      case 'nologo': S.settings.practice.logo = ''; markDirty(); App.refresh(); break;
      case 'opendata': window.intax.openDataDir(); break;
      case 'restore': App.restorePicker(); break;
      case 'exportall': { const p = await window.intax.exportJson({ app: 'Intax Planner', exported: new Date().toISOString(), clients: S.clients, settings: S.settings, taxpacks: S.overrides }, `Intax Planner export ${new Date().toISOString().slice(0, 10)}.json`); if (p) toast('Exported to ' + p); break; }
      case 'exportclient': { const c = S.clients.find(x => x.id === ds.id); const p = await window.intax.exportJson({ app: 'Intax Planner', client: c }, `${clientName(c)}.json`); if (p) toast('Exported'); break; }
      case 'importclient': {
        const d = await window.intax.importJson(); if (!d) return;
        const incoming = d.client ? [d.client] : (d.clients || []);
        incoming.forEach(c => { const ex = S.clients.findIndex(x => x.id === c.id); if (ex >= 0) S.clients[ex] = c; else S.clients.push(c); });
        if (d.taxpacks && Object.keys(d.taxpacks).length && await confirmBox('The file also contains edited tax tables. Import them too?', 'Import tables')) S.overrides = d.taxpacks;
        markDirty(); toast(`Imported ${incoming.length} client(s)`); App.refresh(); break;
      }
      case 'dupclient': { const c = E.clone(S.clients.find(x => x.id === ds.id)); c.id = E.emptyClient().id; c.firstName = (c.firstName || '') + ' (copy)'; S.clients.push(c); markDirty(); App.refresh(); break; }
      case 'delclient': { const c = S.clients.find(x => x.id === ds.id); if (!(await confirmBox(`Delete <b>${esc(clientName(c))}</b> and all tax years? A daily backup is kept in the Backups folder.`, 'Delete client'))) return; S.clients = S.clients.filter(x => x.id !== ds.id); if (S.clientId === ds.id) S.clientId = (S.clients[0] || {}).id || null; App.afterClientChange(); App.refresh(); break; }
      case 'ttreset': { if (!(await confirmBox(`Reset all ${ds.y} tables to the SARS defaults?`, 'Reset'))) return; delete S.overrides[ds.y]; markDirty(); App.refresh(); break; }
      case 'ttexport': { await window.intax.exportJson({ app: 'Intax Planner', taxpacks: Object.fromEntries(YEARS.map(y2 => [y2, pack(y2)])) }, 'Intax tax tables.json'); break; }
      case 'ttimport': { const d = await window.intax.importJson(); if (d && d.taxpacks) { Object.entries(d.taxpacks).forEach(([k, v]) => { S.overrides[k] = v; }); markDirty(); toast('Tax tables imported'); App.refresh(); } else if (d) toast('That file has no tax tables.'); break; }
    }
  },

  clientPicker() {
    const list = () => S.clients.filter(c => (clientName(c) + ' ' + c.taxRef).toLowerCase().includes((q.value || '').toLowerCase())).sort((a, b) => clientName(a).localeCompare(clientName(b)));
    const m = modal({ title: 'Select client', body: `<input type="text" id="cpQ" placeholder="Type a name or tax number…" style="margin-bottom:10px"><div id="cpList"></div>`, foot: `<button class="btn" data-route="clients" data-close>Client register</button><button class="btn btn-primary" id="cpNew">+ New client</button>` });
    const q = m.el.querySelector('#cpQ'), box = m.el.querySelector('#cpList');
    const draw = () => { box.innerHTML = `<table class="t"><tbody>${list().map(c => `<tr class="clickable" data-pick="${c.id}"><td><b>${esc(clientName(c))}</b></td><td>${esc(c.taxRef)}</td><td class="muted">${Object.keys(c.years).join(', ')}</td></tr>`).join('') || '<tr><td class="muted">No clients found.</td></tr>'}</tbody></table>`; };
    draw(); q.focus(); q.oninput = draw;
    q.onkeydown = e => { if (e.key === 'Enter') { const f1 = list()[0]; if (f1) pick(f1.id); } };
    const pick = (id) => { S.clientId = id; App.afterClientChange(); m.el.remove(); App.route(NEEDS_CLIENT.has(S.route) ? S.route : 'dashboard'); };
    box.onclick = e => { const r = e.target.closest('[data-pick]'); if (r) pick(r.dataset.pick); };
    m.el.querySelector('#cpNew').onclick = () => { m.el.remove(); Wizard.queue = []; Wizard.open('newclient'); };
  },

  async restorePicker() {
    const list = await window.intax.listBackups();
    const m = modal({ title: 'Restore a backup', body: list.length ? `<p class="muted">Restoring replaces all current data with the backup.</p><table class="t"><tbody>${list.map(b => `<tr><td>${esc(b)}</td><td class="r"><button class="btn btn-sm" data-restore="${esc(b)}">Restore</button></td></tr>`).join('')}</tbody></table>` : '<p>No backups yet.</p>' });
    m.body.onclick = async e => { const b = e.target.closest('[data-restore]'); if (!b) return; if (!(await confirmBox('Replace all current data with ' + esc(b.dataset.restore) + '?', 'Restore'))) return; await window.intax.restoreBackup(b.dataset.restore); location.reload(); };
  },

  bindSearch() {
    const inp = document.getElementById('globalSearch'), box = document.getElementById('searchResults');
    let items = [], idx = 0;
    const run = () => {
      const q = inp.value.trim(); if (!q) { box.classList.add('hidden'); return; }
      const res = window.IntaxHelp.search(q, codeList());
      const screens = NAV.filter(n => n.id && n.label.toLowerCase().includes(q.toLowerCase())).map(n => ({ type: 'screen', nav: n }));
      const clients = S.clients.filter(c => (clientName(c) + ' ' + c.taxRef).toLowerCase().includes(q.toLowerCase())).slice(0, 4).map(c => ({ type: 'client', c }));
      items = [...screens.slice(0, 4), ...clients, ...res].slice(0, 14); idx = 0;
      box.innerHTML = items.map((it, i) => {
        if (it.type === 'screen') return `<div class="sr-item" data-i="${i}"><span class="sr-kind screen">Screen</span><div><div class="sr-title">${esc(it.nav.label)}</div></div></div>`;
        if (it.type === 'client') return `<div class="sr-item" data-i="${i}"><span class="sr-kind">Client</span><div><div class="sr-title">${esc(clientName(it.c))}</div><div class="sr-sub">${esc(it.c.taxRef)}</div></div></div>`;
        if (it.type === 'code') return `<div class="sr-item" data-i="${i}"><span class="sr-kind code">${it.code.code}</span><div><div class="sr-title">${esc(it.code.name)}</div><div class="sr-sub">${treatLabel(it.code.treat)} · Go to capture</div></div></div>`;
        return `<div class="sr-item" data-i="${i}"><span class="sr-kind">Help</span><div style="flex:1"><div class="sr-title">${esc(it.article.title)} <button class="btn-link" data-gosr="${i}" style="float:right">Go to ${esc((NAV.find(n => n.id === it.article.go) || {}).label || '')} →</button></div><div class="sr-sub">${esc(it.article.body.replace(/<[^>]+>/g, ' ').slice(0, 110))}…</div></div></div>`;
      }).join('') || '<div class="sr-item muted">No matches</div>';
      box.classList.remove('hidden'); hl();
    };
    const hl = () => box.querySelectorAll('.sr-item').forEach((n, i) => n.classList.toggle('active', i === idx));
    const open = (it) => {
      box.classList.add('hidden'); inp.value = ''; inp.blur();
      if (it.type === 'screen') return App.route(it.nav.id);
      if (it.type === 'client') { S.clientId = it.c.id; App.afterClientChange(); return App.route('dashboard'); }
      if (it.type === 'code') return App.goCode(it.code.code);
      S.scratch.helpId = it.article.id; S.scratch.helpQ = ''; App.route('help');
    };
    inp.addEventListener('input', run);
    inp.addEventListener('focus', run);
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); hl(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); hl(); e.preventDefault(); }
      if (e.key === 'Enter' && items[idx]) open(items[idx]);
      if (e.key === 'Escape') { box.classList.add('hidden'); inp.blur(); }
    });
    box.addEventListener('mousedown', e => { const g = e.target.closest('[data-gosr]'); if (g) { e.preventDefault(); const it = items[Number(g.dataset.gosr)]; box.classList.add('hidden'); inp.value = ''; inp.blur(); return App.go(it.article.go); } const n = e.target.closest('[data-i]'); if (n) { e.preventDefault(); open(items[Number(n.dataset.i)]); } });
  }
};
window.App = App;

