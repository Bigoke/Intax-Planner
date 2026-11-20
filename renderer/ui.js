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
  lastClient: null, lastYear: 2027, interestRate: 10.5, codes: null, reportAccent: '#0b7a75'
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
      y.travel = Object.assign(E.clone(prev.travel), { totalKm: 0, businessKm: 0 });
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
