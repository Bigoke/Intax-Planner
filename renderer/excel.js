// Intax Planner 1.5 – Export to Excel: a live working paper (formulas) for the client, plus any report or screen table.
'use strict';
(function () {
const WP = window.IntaxWorkpaper, PN = window.IntaxPenalties;

function workpaper() {
  const c = cur(), y = yd(); if (!c || !y) return null;
  y.penalties = Object.assign(PN.emptyPenaltyInputs(), y.penalties || {});
  return WP.clientWorkpaper({ client: c, y, pack: pack(), res: result(), pen: penalties(), rates: interestRates(), practice: S.settings.practice.name || '', E, clientName: clientName(c), ADMIN_TABLE: PN.ADMIN_TABLE, UNDERSTATEMENT: PN.UNDERSTATEMENT, UNDERSTATEMENT_CASES: PN.UNDERSTATEMENT_CASES });
}

const cellText = (td) => { const d = document.createElement('div'); d.innerHTML = td.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/>/g, '> ').replace(/</g, ' <'); d.querySelectorAll('button,script,style').forEach(x => x.remove()); return d.textContent; };
// Read HTML tables into rows of {text, num, head, total, bold}
function readTables(root, skipInputs) {
  const out = [];
  root.querySelectorAll('table').forEach((tb, ti) => {
    if (tb.closest('.modal') && !root.contains(tb)) return;
    let title = '';
    for (let el = tb; el && !title && el !== root; el = el.parentElement) { let p = el.previousElementSibling; while (p && !title) { if (/^H[1-4]$/.test(p.tagName)) title = p.textContent.trim(); p = p.previousElementSibling; } const h = el.querySelector && el.querySelector(':scope > h2, :scope > .card-head h2'); if (!title && h && h.compareDocumentPosition(tb) & 4) title = h.textContent.trim(); }
    const rows = [];
    tb.querySelectorAll('tr').forEach(tr => {
      const cells = []; let any = false;
      tr.querySelectorAll('th,td').forEach(td => {
        const inp = td.querySelector('input,select');
        let text = inp && !skipInputs ? (inp.type === 'checkbox' ? (inp.checked ? 'Yes' : 'No') : inp.tagName === 'SELECT' ? (inp.selectedOptions[0] ? inp.selectedOptions[0].textContent : '') : inp.value) : cellText(td);
        text = String(text || '').replace(/\s+/g, ' ').trim();
        if (/^[✕✎→]$/.test(text)) text = '';
        const head = td.tagName === 'TH';
        const amt = head ? null : WP.parseAmount(text);
        cells.push({ text, num: amt ? amt.num : null, fmt: amt ? amt.fmt : undefined, head, bold: !!td.querySelector('b,strong') || getComputedStyle(td).fontWeight >= 600 });
        for (let k = 1; k < (td.colSpan || 1); k++) cells.push(null);
        if (text) any = true;
      });
      if (!any) return;
      const total = /(^|\s)(tot|total|sub)(\s|$)/.test(tr.className) || /^(total|totals|grand total)\b/i.test((cells[0] && cells[0].text) || '');
      if (total) cells.forEach(c => c && (c.total = true));
      rows.push(cells);
    });
    if (rows.length) out.push({ title: title || `Table ${ti + 1}`, rows });
  });
  return out;
}

// Combine sheets from several books (renaming clashes)
function merge(main, extra) {
  if (!extra) return main;
  const used = new Set(main.sheets.map(s => s.name.toLowerCase()));
  for (const s of extra.sheets) { let nm = s.name, i = 2; while (used.has(nm.toLowerCase())) nm = s.name.slice(0, 26) + ' ' + i++; used.add(nm.toLowerCase()); s.name = nm; main.sheets.push(s); }
  main.names.push(...extra.names); return main;
}
async function save(spec, name) {
  const p = await window.intax.exportExcel(JSON.parse(JSON.stringify(spec)), name.replace(/\.pdf$/i, '.xlsx'), true);
  if (p) toast('Excel workbook saved: ' + p);
  return p;
}
const safe = (s) => String(s).replace(/[\\/:*?"<>|]/g, '');

window.XL = {
  workpaper,
  readTables,
  // Client working paper on its own
  async client() { const w = workpaper(); if (!w) return toast('Select a client first.'); return save(w, safe(w.fileName)); },
  // A report: its tables (with SUM formulas on total rows) followed by the full working paper for client reports
  async report(id, arg, rep) {
    rep = rep || REPORTS.build(id, arg);
    const doc = new DOMParser().parseFromString(rep.html, 'text/html');
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px'; holder.innerHTML = doc.body.innerHTML; document.body.appendChild(holder);
    let tables; try { tables = readTables(holder, true); } finally { holder.remove(); }
    const def = REPORTS.LIST.find(r => r.id === id) || {};
    const c = cur();
    const book = WP.tablesWorkbook(rep.title, tables.length ? tables : [{ title: rep.title, rows: [[{ text: 'This report has no tables.' }]] }], { oneSheet: true, subtitle: [c && !/practice/i.test(def.cat || '') ? clientName(c) : S.settings.practice.name, pack().label].filter(Boolean).join(' · ') });
    book.sheets[0].name = safe(rep.title).slice(0, 31);
    if (c && !/practice/i.test(def.cat || '')) merge(book, workpaper());
    return save(book, safe(/practice/i.test(def.cat || '') ? `${rep.title} - ${S.year}.xlsx` : (rep.fileName || REPORTS.fileName(rep.title)).replace(/\.pdf$/i, '.xlsx')));
  },
  // The current screen: its tables, plus the working paper on client screens
  async screen() {
    const root = document.getElementById('content');
    const title = (root.querySelector('.page-head h1') || {}).textContent || 'Intax export';
    const tables = readTables(root, false);
    const c = cur(), clientScreen = c && NEEDS_CLIENT.has(S.route);
    if (!tables.length && !clientScreen) return toast('There is no table on this screen to export.');
    let book = tables.length ? WP.tablesWorkbook(title, tables, { oneSheet: true, subtitle: [clientScreen ? clientName(c) : S.settings.practice.name, clientScreen ? pack().label : ''].filter(Boolean).join(' · ') }) : null;
    if (book) book.sheets[0].name = safe(title).slice(0, 31);
    if (clientScreen) book = book ? merge(book, workpaper()) : workpaper();
    return save(book, safe(`${title}${clientScreen ? (title.trim() === clientName(c) ? '' : ' - ' + clientName(c)) + ' - ' + S.year : ''}.xlsx`));
  }
};

ACTIONS2.xlsx = (t, ds) => ds.what === 'client' ? XL.client() : XL.screen();

// Every screen gets an "Export to Excel" button in its header
const addBtn = () => {
  const row = document.querySelector('#content .page-head .btn-row');
  if (!row || row.querySelector('[data-act="xlsx"]')) return;
  const b = document.createElement('button'); b.className = 'btn'; b.dataset.act = 'xlsx'; b.dataset.what = 'screen'; b.title = 'Export this screen to an Excel workbook with working formulas'; b.textContent = 'Excel';
  row.insertBefore(b, row.firstChild);
};
new MutationObserver(addBtn).observe(document.getElementById('content') || document.body, { childList: true, subtree: false });
document.addEventListener('DOMContentLoaded', addBtn);
})();
