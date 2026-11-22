// Intax Planner – shared UI state and helpers.
'use strict';
const E = window.IntaxEngine;
const PACKS = window.IntaxPacks.TAX_PACKS;
const YEARS = window.IntaxPacks.YEARS;

const S = {
  clients: [], settings: null, overrides: {}, clientId: null, year: 2027, route: 'dashboard', tab: null, dataDir: '', version: '',
  scratch: {} // temporary UI state (what-if inputs, selected help article, etc.)
};
const DEFAULT_SETTINGS = {
  practice: { name: '', practitioner: '', prNumber: '', regBody: '', address: '', phone: '', email: '', website: '', logo: '', disclaimer: 'This computation is an estimate prepared for tax planning purposes from information supplied by the taxpayer. Final liability is determined by SARS on assessment.' },
  lastClient: null, lastYear: 2027, interestRate: 10.5, codes: null, reportAccent: '#0b7a75',
  billing: { defaultRate: 950, paymentTerms: 30, engagementFee: '' },
  security: { pinHash: '', lockMinutes: 0 },
  defaultHome: 'practice'
};

// ---------- data access ----------
function cur() { return S.clients.find(c => c.id === S.clientId) || null; }
function codeList() { return (S.settings && S.settings.codes) || window.IntaxCodes.CODES; }
function yd(create = true) {
  const c = cur(); if (!c) return null;
  if (!c.years[S.year] && create) {
    const y = E.emptyYear(S.year);
    const prev = c.years[S.year - 1];
    if (prev) { // roll forward stable settings and carry-forwards
      y.flags = E.clone(prev.flags);
      y.medical = Object.assign(E.clone(prev.medical), { qme: 0 });
      E.migrateYear(prev);
      y.travel = { enabled: prev.travel.enabled, vehicles: prev.travel.vehicles.map(v => Object.assign(E.clone(v), { totalKm: 0, businessKm: 0, daysUsed: 365 })) };
      y.companyCars = prev.companyCars.map(c => Object.assign(E.clone(c), { totalKm: 0, businessKm: 0, months: 12, irp5Value: null }));
      y.homeOffice = Object.assign(E.clone(prev.homeOffice), { otherCosts: [] });
      try {
        const r = E.compute(c, prev, pack(S.year - 1), codeList());
        y.deductions.raCarryForward = r.ra.carryForward; y.deductions.donationsCarryForward = r.donations.carryForward;
        y.deductions.assessedLossBF = r.assessedLossCF; y.cgt.lossBF = r.cgt.lossCF;
        y.provisional.basicAmount = { lastAssessedYear: S.year - 1, lastAssessedTI: r.taxableIncome, lessCapitalGain: r.cgt.taxableGain, lessLumpSums: 0 };
      } catch (e) {}
    }
    c.years[S.year] = y;
  }
  return c.years[S.year] || null;
}
function pack(year) { return E.getPack(PACKS, year || S.year, S.overrides); }
function result() { const c = cur(), y = yd(); if (!c || !y) return null; return E.compute(c, y, pack(), codeList()); }

function rootFor(p) {
  if (p.startsWith('y.')) return [yd(), p.slice(2)];
  if (p.startsWith('c.')) return [cur(), p.slice(2)];
  if (p.startsWith('s.')) return [S.settings, p.slice(2)];
  if (p.startsWith('t.')) return [S.scratch, p.slice(2)];
  return [null, p];
}
function getP(p) {
  const [root, rest] = rootFor(p); if (!root) return undefined;
  return rest.split('.').reduce((o, k) => (o == null ? undefined : o[k]), root);
}
function setP(p, v) {
  const [root, rest] = rootFor(p); if (!root) return;
  const keys = rest.split('.'); let o = root;
  for (let i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {}; o = o[keys[i]]; }
  o[keys[keys.length - 1]] = v;
}

// ---------- saving ----------
let saveTimer = null;
function markDirty(what) {
  const c = cur(); if (c) c.modified = new Date().toISOString();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveAll(what), 400);
}
async function saveAll() {
  if (!window.intax) return;
  await window.intax.save('clients', S.clients);
  await window.intax.save('settings', S.settings);
  await window.intax.save('taxpacks', S.overrides);
}

// ---------- formatting ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function money(v, dec = 2) { const x = Number(v) || 0; const s = E.fmt(Math.abs(x), dec); return (x < 0 ? '-' : '') + 'R ' + s; }
function money0(v) { return money(v, 0); }
function moneyCell(v, dec = 2) { const x = Number(v) || 0; return `<span class="${x < 0 ? 'neg' : ''}">${x < 0 ? '(' + E.fmt(-x, dec) + ')' : E.fmt(x, dec)}</span>`; }
function pct(v) { return (Math.round((Number(v) || 0) * 10000) / 100).toLocaleString('en-ZA') + '%'; }
function dateLong(iso) { if (!iso) return ''; const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')); return isNaN(d) ? iso : d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }); }
function clientName(c) { return c ? ([c.firstName, c.surname].filter(Boolean).join(' ') || 'Unnamed client') : ''; }
function fmtInput(v) { if (v === null || v === undefined || v === '') return ''; const x = Number(v); return isFinite(x) ? E.fmt(x, Number.isInteger(x) ? 0 : 2) : v; }

// ---------- field builder ----------
// f({ p, label, type, code, hint, options, placeholder, readonly, value, cls })
function f(o) {
  const v = o.value !== undefined ? o.value : getP(o.p);
  const id = 'f_' + String(o.p).replace(/[^\w]/g, '_');
  const code = o.code ? `<span class="code-tag">${esc(o.code)}</span>` : '';
  const hint = o.hint ? `<div class="hint">${o.hint}</div>` : '';
  const ro = o.readonly ? 'readonly tabindex="-1"' : '';
  let input;
  switch (o.type) {
    case 'check':
      return `<div class="field ${o.cls || ''}" data-field="${esc(o.p)}"><label class="check"><input type="checkbox" id="${id}" data-p="${esc(o.p)}" ${v ? 'checked' : ''}> ${esc(o.label)} ${code}</label>${hint}</div>`;
    case 'select':
      input = `<select id="${id}" data-p="${esc(o.p)}" ${o.num ? 'data-num="1"' : ''}>${(o.options || []).map(op => { const [val, lab] = Array.isArray(op) ? op : [op, op]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`; break;
    case 'textarea': input = `<textarea id="${id}" data-p="${esc(o.p)}" placeholder="${esc(o.placeholder || '')}">${esc(v || '')}</textarea>`; break;
    case 'date': input = `<input type="date" id="${id}" data-p="${esc(o.p)}" value="${esc(v || '')}">`; break;
    case 'money': case 'int': case 'dec':
      input = `<input type="text" inputmode="decimal" class="num ${o.readonly ? 'calc' : ''}" id="${id}" data-p="${esc(o.p)}" data-num="${o.type}" value="${esc(fmtInput(v))}" placeholder="${esc(o.placeholder ?? (o.type === 'money' ? '0' : ''))}" ${ro}>`; break;
    default: input = `<input type="text" id="${id}" data-p="${esc(o.p)}" value="${esc(v ?? '')}" placeholder="${esc(o.placeholder || '')}" ${ro}>`;
  }
  return `<div class="field ${o.cls || ''}" data-field="${esc(o.p)}"><label for="${id}">${esc(o.label)} ${code}</label>${input}${hint}</div>`;
}
function parseNum(s) { if (s === '' || s === null || s === undefined) return 0; const x = Number(String(s).replace(/[\sR,]/g, '').replace(/^\((.*)\)$/, '-$1')); return isFinite(x) ? x : 0; }

// ---------- modal / toast ----------
function modal({ title, body, foot, wide, onClose }) {
  const root = document.getElementById('modalRoot');
  const el = document.createElement('div');
  el.className = 'modal-back';
  el.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="modal-head"><h2>${title}</h2><button class="x" data-close>×</button></div><div class="modal-body">${body || ''}</div>${foot !== undefined ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  root.appendChild(el);
  const close = () => { el.remove(); onClose && onClose(); };
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) close(); });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  return { el, close, body: el.querySelector('.modal-body'), foot: el.querySelector('.modal-foot') };
}
function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2600);
}
function confirmBox(msg, okLabel = 'OK') {
  return new Promise(res => {
    const m = modal({ title: 'Please confirm', body: `<p>${msg}</p>`, foot: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="cbOk">${esc(okLabel)}</button>`, onClose: () => res(false) });
    m.el.querySelector('#cbOk').onclick = () => { res(true); m.el.remove(); };
  });
}
function addDays(iso, d) { const x = new Date(iso + 'T00:00:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }
function daysUntil(iso) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(iso + 'T00:00:00') - t) / 86400000); }

// ---------- charts (pure SVG, print-safe) ----------
const CHART_COLORS = ['#0b7a75', '#13305a', '#b7862b', '#5b8fd1', '#8a5cb8', '#c2410c', '#2f855a', '#7a8699'];
function svgDonut(items, size = 170, opts = {}) {
  const data = items.filter(d => d.value > 0);
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return `<div class="muted">No data</div>`;
  const r = size / 2 - 6, ri = r * 0.62, cx = size / 2, cy = size / 2;
  let a0 = -Math.PI / 2, paths = '';
  data.forEach((d, i) => {
    const frac = d.value / total, a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (rad, ang) => `${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`;
    if (frac >= 0.9999) paths += `<circle cx="${cx}" cy="${cy}" r="${(r + ri) / 2}" fill="none" stroke="${d.color || CHART_COLORS[i % 8]}" stroke-width="${r - ri}"/>`;
    else paths += `<path d="M${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} L${p(ri, a1)} A${ri},${ri} 0 ${large} 0 ${p(ri, a0)} Z" fill="${d.color || CHART_COLORS[i % 8]}"><title>${esc(d.label)}: ${E.fmt(d.value)}</title></path>`;
    a0 = a1;
  });
  const legend = data.map((d, i) => `<div style="display:flex;gap:7px;align-items:center;margin:3px 0;font-size:12px"><span style="width:10px;height:10px;border-radius:2px;background:${d.color || CHART_COLORS[i % 8]};flex:none"></span><span style="flex:1">${esc(d.label)}</span><b style="font-variant-numeric:tabular-nums">${Math.round(d.value / total * 100)}%</b></div>`).join('');
  return `<div style="display:flex;gap:18px;align-items:center"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="11" fill="#7a8699">${esc(opts.center || 'Total')}</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="14" font-weight="700" fill="#0d2340">R ${E.fmt(total / 1000)}k</text></svg><div style="flex:1;min-width:150px">${legend}</div></div>`;
}
function svgBars(cats, series, opts = {}) {
  const W = opts.width || 520, H = opts.height || 200, padL = 56, padB = 26, padT = 10;
  const max = Math.max(1, ...series.flatMap(s => s.values.map(v => Math.max(0, v))));
  const nice = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / nice) * nice;
  const gw = (W - padL - 8) / cats.length, bw = Math.min(26, (gw - 10) / series.length);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = top * i / 4, yy = H - padB - (H - padB - padT) * i / 4; g += `<line x1="${padL}" x2="${W - 4}" y1="${yy}" y2="${yy}" stroke="#e6eaf0"/><text x="${padL - 6}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#7a8699">${v >= 1e6 ? (v / 1e6).toFixed(1) + 'm' : Math.round(v / 1000) + 'k'}</text>`; }
  cats.forEach((c, ci) => {
    const x0 = padL + gw * ci + (gw - bw * series.length) / 2;
    series.forEach((s, si) => { const v = Math.max(0, s.values[ci] || 0), h = (H - padB - padT) * v / top; g += `<rect x="${(x0 + si * bw).toFixed(1)}" y="${(H - padB - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${s.color || CHART_COLORS[si]}"><title>${esc(s.name)} ${esc(c)}: ${E.fmt(v)}</title></rect>`; });
    g += `<text x="${padL + gw * ci + gw / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#4a5568">${esc(c)}</text>`;
  });
  const legend = series.map((s, i) => `<span style="display:inline-flex;gap:6px;align-items:center;margin-right:14px;font-size:12px"><span style="width:10px;height:10px;border-radius:2px;background:${s.color || CHART_COLORS[i]}"></span>${esc(s.name)}</span>`).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="max-width:${W}px">${g}</svg><div>${legend}</div>`;
}
function svgBracketBar(brackets, opts = {}) {
  const used = brackets.filter(b => b.amount > 0), total = used.reduce((a, b) => a + b.amount, 0);
  if (!total) return '<div class="muted">No taxable income</div>';
  const W = opts.width || 520; let x = 0;
  const shades = ['#cfe8e6', '#9fd2ce', '#6fbab4', '#3f9f98', '#0b7a75', '#0a5f5b', '#0d2340'];
  const parts = used.map((b, i) => { const w = W * b.amount / total; const s = `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="30" fill="${shades[brackets.indexOf(b)]}"><title>${Math.round(b.rate * 100)}%: R ${E.fmt(b.amount)}</title></rect>${w > 34 ? `<text x="${(x + w / 2).toFixed(1)}" y="20" text-anchor="middle" font-size="11" font-weight="700" fill="${brackets.indexOf(b) > 3 ? '#fff' : '#0d2340'}">${Math.round(b.rate * 100)}%</text>` : ''}`; x += w; return s; }).join('');
  return `<svg width="100%" viewBox="0 0 ${W} 30" style="max-width:${W}px;border-radius:4px">${parts}</svg>`;
}
function incomeMix(r) {
  return [
    { label: 'Employment', value: r.employment }, { label: 'Business', value: r.businessNet }, { label: 'Rental', value: r.rentalNet },
    { label: 'Interest & dividends', value: r.interest.local + r.interest.foreign + r.dividends.local + r.dividends.reit + r.dividends.foreign },
    { label: 'Capital gains (taxable)', value: r.cgt.taxableGain }, { label: 'Foreign', value: r.foreignEmployment }, { label: 'Other', value: r.otherIncome + r.savingsWithdrawal }
  ];
}
function toCsv(rows) { return rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n'); }
async function sha256(text) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
