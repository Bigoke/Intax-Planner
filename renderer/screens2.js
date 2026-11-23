// Intax Planner 1.1 – practice features: practice dashboard, deadlines, documents, time records,
// change log, company car, SARS assessment, joint estate, TFSA, roll-forward, year lock and charts.
'use strict';

// ---------- navigation ----------
NAV.length = 0;
NAV.push(
  { group: 'Practice' },
  { id: 'practice', label: 'Practice dashboard', icon: '◫' },
  { id: 'clients', label: 'Client register', icon: '☰' },
  { id: 'deadlines', label: 'Deadlines & payments', icon: '⏰' },
  { id: 'timesummary', label: 'Time records', icon: '⌚' },
  { group: 'Client' },
  { id: 'dashboard', label: 'Client dashboard', icon: '▦' },
  { id: 'client', label: 'Taxpayer details', icon: '👤' },
  { id: 'checklist', label: 'Income & deduction checklist', icon: '☑' },
  { id: 'documents', label: 'Documents checklist', icon: '📄' },
  { id: 'fees', label: 'Time records', icon: '⌚' },
  { id: 'auditlog', label: 'Change log', icon: '🕘' },
  { group: 'Income' },
  { id: 'employment', label: 'Employment (IRP5)', icon: '🏢', flag: 'employment' },
  { id: 'companycar', label: 'Company car benefit', icon: '🚙', flag: 'companyCar' },
  { id: 'business', label: 'Business & freelance', icon: '💼', flag: 'business' },
  { id: 'rental', label: 'Rental property', icon: '🏠', flag: 'rental' },
  { id: 'investments', label: 'Interest, dividends & TFSA', icon: '📈', flag: 'investments' },
  { id: 'cgt', label: 'Capital gains (shares, crypto…)', icon: '⇅', flag: 'cgt' },
  { id: 'lumps', label: 'Lump sums & two-pot', icon: '🏦', flag: 'lumpSums' },
  { id: 'foreign', label: 'Foreign income', icon: '🌍', flag: 'foreign' },
  { id: 'other', label: 'Other income', icon: '＋', flag: 'other' },
  { group: 'Deductions & credits' },
  { id: 'retirement', label: 'Retirement contributions', icon: '⛱', flag: 'retirement' },
  { id: 'medical', label: 'Medical aid & expenses', icon: '✚', flag: 'medical' },
  { id: 'travel', label: 'Travel (logbook)', icon: '🚗', flag: 'travel' },
  { id: 'donations', label: 'Donations (s18A)', icon: '♥', flag: 'donations' },
  { id: 'deductions', label: 'Home office & other', icon: '⌂', flag: 'homeOffice' },
  { group: 'Provisional tax (IRP6)' },
  { id: 'provisional', label: 'Overview & basic amount', icon: '◷' },
  { id: 'p1', label: '1st payment – August', icon: '①' },
  { id: 'p2', label: '2nd payment – February', icon: '②' },
  { id: 'p3', label: '3rd top-up – September', icon: '③' },
  { group: 'Final' },
  { id: 'final', label: 'ITR12 & computation', icon: '✔' },
  { id: 'assessment', label: 'SARS assessment (ITA34)', icon: '⚖' },
  { id: 'whatif', label: 'What-if planner', icon: '⇄' },
  { id: 'reports', label: 'Reports', icon: '🖨' },
  { group: 'Tools' },
  { id: 'taxtables', label: 'Tax tables', icon: '▤' },
  { id: 'help', label: 'Tax help & search', icon: '?' },
  { id: 'settings', label: 'Practice settings', icon: '⚙' }
);
['documents', 'fees', 'auditlog', 'companycar', 'assessment'].forEach(r => NEEDS_CLIENT.add(r));
const UNLOCKED_SCREENS = new Set(['dashboard', 'client', 'documents', 'fees', 'auditlog', 'assessment', 'whatif', 'reports']);
window.UNLOCKED_SCREENS = UNLOCKED_SCREENS;
CHECK_TILES.splice(1, 0, ['companyCar', '🚙', 'Company car', 'Employer-provided vehicle (fringe benefit 3802)']);
FLAG_ROUTE.companyCar = 'companycar';

const STATUSES = ['Not started', 'Gathering documents', 'In progress', 'Review', 'Submitted', 'Assessed'];
const segBtns = (key, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="seg" data-key="${key}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const safeResult = (c, yr) => { try { const y = c.years[yr]; return y ? E.compute(c, y, pack(yr), codeList(), { interestRate: S.settings.interestRate }) : null; } catch (e) { return null; } };

// Pass the interest rate into every computation.
window.result = function () { const c = cur(), y = yd(); if (!c || !y) return null; return E.compute(c, y, pack(), codeList(), { interestRate: S.settings.interestRate }); };

// ---------- deadlines across the practice ----------
function allDeadlines() {
  const out = [], today = new Date().toISOString().slice(0, 10);
  for (const c of S.clients) {
    for (const yr of Object.keys(c.years).map(Number)) {
      const y = c.years[yr]; if (!YEARS.includes(yr)) continue;
      const r = safeResult(c, yr); if (!r) continue;
      const pv = r.provisional;
      if (y.flags.provisional) {
        [['p1', '1st provisional payment', pv.dueDates.p1, pv.p1.due, pv.p1.paid], ['p2', '2nd provisional payment', pv.dueDates.p2, pv.p2.due, pv.p2.paid], ['p3', '3rd top-up payment', pv.p3.dueDate, pv.p3.due, pv.p3.paid]]
          .forEach(([k, label, date, due, paid]) => { if (k === 'p3' && due < 1 && !paid) return; out.push({ c, yr, kind: k, label, date, amount: due, paid, route: k, done: due < 1 || (paid > 0 && paid >= due - 1) }); });
      }
      if (r.recon && r.recon.entered && r.recon.objectionDeadline) out.push({ c, yr, kind: 'obj', label: 'Objection deadline (80 business days)', date: r.recon.objectionDeadline, amount: null, paid: 0, route: 'assessment', done: !!y.assessment.objectionLodged });
      if (y.assessment && y.assessment.paymentDue && E.n(y.assessment.balance) > 0) out.push({ c, yr, kind: 'asspay', label: 'Assessment payment due', date: y.assessment.paymentDue, amount: E.n(y.assessment.balance), paid: E.n(y.assessment.paid), route: 'assessment', done: E.n(y.assessment.paid) >= E.n(y.assessment.balance) - 1 });
    }
  }
  out.forEach(d => { d.days = daysUntil(d.date); d.overdue = !d.done && d.date < today; });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
window.allDeadlines = allDeadlines;
const dlStatus = (d) => d.done ? '<span class="pill ok">Done</span>' : d.overdue ? `<span class="pill bad">Overdue ${-d.days}d</span>` : d.days <= 14 ? `<span class="pill warn">${d.days} days</span>` : `<span class="pill info">${d.days} days</span>`;
const dlRow = (d) => `<tr class="clickable ${d.done ? 'done' : ''}" data-act="openc" data-id="${d.c.id}" data-year="${d.yr}" data-route="${d.route}"><td>${dateLong(d.date)}</td><td><b>${esc(clientName(d.c))}</b></td><td>${esc(d.label)}<span class="chip">${d.yr}</span></td><td class="r">${d.amount === null ? '' : moneyCell(d.amount)}</td><td class="r">${d.paid ? moneyCell(d.paid) : ''}</td><td>${dlStatus(d)}</td></tr>`;
const dlHead = '<thead><tr><th>Date</th><th>Client</th><th>Item</th><th class="r">Amount</th><th class="r">Paid</th><th>Status</th></tr></thead>';

// ---------- Practice dashboard ----------
SCREENS.practice = () => {
  const p = S.settings.practice, dl = allDeadlines();
  const open = dl.filter(d => !d.done);
  const next30 = open.filter(d => !d.overdue && d.days <= 30), overdue = open.filter(d => d.overdue);
  const sumAmt = (l) => l.reduce((a, d) => a + (d.amount || 0) - (d.paid || 0), 0);
  const timeY = S.clients.flatMap(c => c.fees || []).filter(f => Number(f.year) === S.year);
  const timeH = timeY.reduce((a, f) => a + E.n(f.hours), 0), timeV = timeY.reduce((a, f) => a + E.n(f.amount), 0);
  const statusCount = {}; STATUSES.forEach(s => statusCount[s] = 0);
  let prov = 0, refunds = 0, payable = 0;
  S.clients.forEach(c => { const y = c.years[S.year]; statusCount[(y && y.status) || 'Not started'] = (statusCount[(y && y.status) || 'Not started'] || 0) + 1; if (y && y.flags.provisional) prov++; const r = safeResult(c, S.year); if (r) { if (r.balance < 0) refunds += -r.balance; else payable += r.balance; } });
  const recent = S.clients.slice().sort((a, b) => (b.modified || '').localeCompare(a.modified || '')).slice(0, 6);
  return head(esc(p.name || 'Practice dashboard'), `${S.clients.length} clients · tax year ${pack().label} · ${dateLong(new Date().toISOString().slice(0, 10))}`, `<button class="btn" data-report="deadlines">Deadlines report</button><button class="btn" data-report="wip">Work in progress</button><button class="btn btn-primary" data-wizard="newclient">+ New client</button>`) +
  `<div class="kpis">
    <div class="kpi accent"><div class="k-label">Clients</div><div class="k-val">${S.clients.length}</div><div class="k-sub">${prov} provisional taxpayers in ${S.year}</div></div>
    <div class="kpi gold"><div class="k-label">Due in next 30 days</div><div class="k-val">${money0(sumAmt(next30))}</div><div class="k-sub">${next30.length} payment(s) / deadline(s)</div></div>
    <div class="kpi ${overdue.length ? 'red' : 'green'}"><div class="k-label">Overdue</div><div class="k-val">${overdue.length}</div><div class="k-sub">${money0(sumAmt(overdue))} outstanding</div></div>
    <div class="kpi"><div class="k-label">Time recorded – ${S.year}</div><div class="k-val">${E.fmt(timeH, 1)} h</div><div class="k-sub">value ${money0(timeV)}</div></div>
  </div>
  <div class="card"><div class="card-head"><h2>Work status – ${S.year}</h2><span class="muted">Payable on assessment ${money0(payable)} · refunds ${money0(refunds)}</span></div><div class="pipeline">${STATUSES.map(s => `<div class="pipe"><b>${statusCount[s] || 0}</b><span>${s}</span></div>`).join('')}</div></div>
  <div><div class="card"><div class="card-head"><h2>Next deadlines</h2><button class="btn btn-sm" data-route="deadlines">All deadlines →</button></div><table class="t">${dlHead}<tbody>${[...overdue, ...open.filter(d => !d.overdue)].slice(0, 10).map(dlRow).join('') || '<tr><td colspan="6" class="muted">No open deadlines.</td></tr>'}</tbody></table></div>
  <div class="card"><div class="card-head"><h2>Recently worked on</h2></div><table class="t"><tbody>${recent.map(c => { const y = c.years[S.year]; return `<tr class="clickable" data-open="${c.id}"><td><b>${esc(clientName(c))}</b><div class="muted">${esc(c.taxRef || '')}</div></td><td>${esc((y && y.status) || 'Not started')}</td><td class="muted r">${c.modified ? new Date(c.modified).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</td></tr>`; }).join('') || '<tr><td class="muted">No clients yet.</td></tr>'}</tbody></table></div></div>`;
};

// ---------- Deadlines ----------
SCREENS.deadlines = () => {
  const flt = S.scratch.dlf || 'open';
  let list = allDeadlines();
  if (flt === 'overdue') list = list.filter(d => d.overdue);
  if (flt === '30') list = list.filter(d => !d.done && !d.overdue && d.days <= 30);
  if (flt === '90') list = list.filter(d => !d.done && !d.overdue && d.days <= 90);
  if (flt === 'open') list = list.filter(d => !d.done);
  return head('Deadlines & payments', 'Provisional tax payments, top-ups, objection deadlines and assessment payments for every client.', `<button class="btn" data-act="csv" data-what="deadlines">Export CSV</button><button class="btn btn-primary" data-report="deadlines">Deadlines PDF</button>`) +
  `<div class="btn-row" style="margin-bottom:12px">${segBtns('dlf', [['open', 'All open'], ['overdue', 'Overdue'], ['30', 'Next 30 days'], ['90', 'Next 90 days'], ['all', 'Everything']], flt)}<span class="muted">${list.length} item(s)</span></div>
  <div class="card"><table class="t">${dlHead}<tbody>${list.map(dlRow).join('') || '<tr><td colspan="6" class="empty">Nothing here.</td></tr>'}</tbody></table></div>`;
};

// ---------- Documents checklist ----------
function docList(c, y) {
  const L = [];
  const add = (key, label, why) => L.push({ key, label, why });
  (y.irp5 || []).forEach((cert, i) => add('irp5:' + i, `IRP5 / IT3(a) – ${cert.employer || 'employer ' + (i + 1)}`, 'Employment income and PAYE'));
  if (y.flags.employment && !(y.irp5 || []).length) add('irp5', 'IRP5 / IT3(a) from every employer', 'Employment income and PAYE');
  if (y.flags.companyCar) add('car', `Company car${(y.companyCars || []).length > 1 ? 's' : ''}: determined value from employer and logbook`, 'Fringe benefit reduction');
  if (y.flags.business) add('business', 'Business records: income, expenses, bank statements / financial statements', 'Business income');
  if (y.flags.business) add('assets', 'Asset register / invoices for wear-and-tear', 'Business deductions');
  if (y.flags.rental) add('rental', 'Rental schedule, lease, bond statement (interest), rates and expense invoices', 'Rental income');
  if (y.flags.investments) add('it3b', 'IT3(b) certificates from banks and investment houses', 'Interest and dividends');
  if (y.flags.investments) add('tfsa', 'Tax-free savings account statements (contributions)', 'TFSA limits');
  if (y.flags.cgt) add('it3c', 'IT3(c) / broker tax certificates and purchase records (base cost)', 'Capital gains');
  if (y.flags.lumpSums) add('directive', 'Fund tax directive(s) and IRP5 for lump sums', 'Lump sum tax');
  if (y.flags.foreign) add('foreign', 'Foreign income statements, days-outside-SA record, foreign tax certificates', 'Foreign income and credits');
  if (y.flags.retirement) add('it3f', 'Retirement annuity certificates (IT3(f))', 'Retirement deduction');
  if (y.flags.medical) add('medcert', 'Medical scheme tax certificate', 'Medical credits');
  if (y.flags.medical) add('medrec', 'Receipts for out-of-pocket medical expenses', 'Additional medical credit');
  if (y.medical && y.medical.disability) add('itrdd', 'ITR-DD confirmation of disability', 'Disability medical credit');
  if (y.flags.travel) ((y.travel && y.travel.vehicles && y.travel.vehicles.length) ? y.travel.vehicles : [{ name: '' }]).forEach((v, i) => add('logbook' + (i ? ':' + i : ''), `Travel logbook${v.name ? ' – ' + v.name : ''}: odometer readings, purchase invoice, fuel and maintenance records`, 'Travel deduction'));
  if (y.flags.donations) add('s18a', 'Section 18A donation receipts', 'Donations deduction');
  if (y.flags.homeOffice) add('homeoffice', 'Home office: floor plan, home running cost statements (bond/rent, rates, electricity)', 'Home office deduction');
  if (y.flags.homeOffice && y.homeOffice && y.homeOffice.basis !== 'business') add('holetter', 'Employer letter confirming the requirement / arrangement to work from home', 'Home office deduction');
  if (y.flags.homeOffice && y.homeOffice && (y.homeOffice.assets || []).length) add('hoassets', 'Purchase invoices for work equipment (laptop, furniture…)', 'Wear-and-tear'); 
  if (y.flags.provisional) add('ita34', 'Latest ITA34 assessment (basic amount)', 'Provisional tax estimates');
  if (y.flags.provisional) add('irp6pay', 'Proof of provisional tax payments (IRP6)', 'Credits on assessment');
  add('bank', 'Bank details for refunds (confirmation letter)', 'SARS registered details');
  (y.docsCustom || []).forEach((d, i) => add('custom:' + i, d.label, 'Custom request'));
  return L.map(d => Object.assign(d, (y.docs || {})[d.key] || {}));
}
window.docList = docList;
SCREENS.documents = () => {
  const c = cur(), y = yd(), list = docList(c, y);
  const got = list.filter(d => d.received).length;
  return head('Documents checklist', `Generated from this client's income and deductions for ${pack().label}. Tick documents as they arrive.`, `<button class="btn" data-act="docadd">+ Custom item</button><button class="btn btn-primary" data-report="docrequest">Document request letter</button>`) +
  `<div class="card"><div class="card-head"><h2>${got} of ${list.length} received</h2><div style="flex:0 0 260px;height:8px;background:var(--line-2);border-radius:4px;overflow:hidden"><div style="width:${list.length ? got / list.length * 100 : 0}%;height:100%;background:var(--accent)"></div></div></div>
  <table class="t"><thead><tr><th style="width:40px">✓</th><th>Document</th><th>Needed for</th><th style="width:160px">Date received</th><th>Note</th><th></th></tr></thead><tbody>
  ${list.map(d => { const k = d.key.replace(/[:]/g, '_'); return `<tr class="${d.received ? 'done' : ''}" data-allow><td><input type="checkbox" data-p="y.docs.${k}.received" ${d.received ? 'checked' : ''}></td><td>${esc(d.label)}</td><td class="muted">${esc(d.why)}</td><td><input type="date" data-p="y.docs.${k}.date" value="${esc(d.date || '')}"></td><td><input type="text" data-p="y.docs.${k}.note" value="${esc(d.note || '')}"></td><td>${d.key.startsWith('custom:') ? `<button class="btn btn-sm btn-danger" data-act="del" data-p="y.docsCustom" data-i="${d.key.split(':')[1]}">✕</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>`;
};
// docs keys with ':' are stored with '_' – keep docList lookups consistent
const _docList = docList;
window.docList = function (c, y) { return _docList(c, y).map(d => Object.assign(d, (y.docs || {})[d.key.replace(/[:]/g, '_')] || {})); };

// ---------- Change log ----------
SCREENS.auditlog = () => {
  const c = cur(), q = (S.scratch.logQ || '').toLowerCase(), yf = S.scratch.logYear || 'this';
  let log = (c.log || []).slice().reverse();
  if (yf === 'this') log = log.filter(l => l.year === S.year || l.year === null);
  if (q) log = log.filter(l => (l.label + ' ' + l.p + ' ' + l.from + ' ' + l.to).toLowerCase().includes(q));
  const show = (v) => typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'number' ? E.fmt(v, Number.isInteger(v) ? 0 : 2) : esc(v ?? '');
  return head('Change log', 'Every change made to this client, with date, time and old and new values – an audit trail for review and SARS queries.', `<button class="btn btn-primary" data-report="auditlog">Change log PDF</button>`) +
  `<div class="btn-row" style="margin-bottom:12px">${segBtns('logYear', [['this', S.year + ' + personal'], ['all', 'All years']], yf)}<input type="text" id="logQ" placeholder="Filter…" value="${esc(S.scratch.logQ || '')}" style="max-width:280px"><span class="muted">${log.length} change(s)</span></div>
  <div class="card"><table class="t"><thead><tr><th style="width:170px">When</th><th style="width:60px">Year</th><th>Field</th><th class="r">From</th><th class="r">To</th></tr></thead><tbody>${log.slice(0, 500).map(l => `<tr><td class="muted">${new Date(l.t).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>${l.year || ''}</td><td>${esc(l.label)}</td><td class="r muted">${show(l.from)}</td><td class="r"><b>${show(l.to)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="muted">No changes recorded yet.</td></tr>'}</tbody></table></div>`;
};

// ---------- Company car ----------
SCREENS.companycar = () => {
  const r = result(), cc = r.companyCar, y = yd(), P = pack();
  return head('Company car fringe benefit', 'Employer-owned vehicle (codes 3802/3816). With a logbook the taxable value is reduced on assessment for business kilometres and private costs you paid.', helpBtn('company-car')) +
  `<div class="grid g2"><div class="card"><h2>Vehicle</h2><div class="grid g2">${f({ p: 'y.companyCar.enabled', label: 'Calculate / reduce the company car benefit', type: 'check' })}<div class="field"><label>Value on IRP5 <span class="code-tag">3802/3816</span></label><input class="num calc" readonly value="${fmtInput(E.n(r.irp5.byCode['3802']) + E.n(r.irp5.byCode['3816']))}"></div>
    ${f({ p: 'y.companyCar.determinedValue', label: 'Determined value (cost excl. finance, incl. VAT)', type: 'money' })}${f({ p: 'y.companyCar.months', label: 'Months available', type: 'int' })}
    ${f({ p: 'y.companyCar.maintenancePlan', label: 'Sold with a maintenance plan (3.25%)', type: 'check' })}<div></div>
    ${f({ p: 'y.companyCar.totalKm', label: 'Total kilometres', type: 'int' })}${f({ p: 'y.companyCar.businessKm', label: 'Business kilometres (logbook)', type: 'int' })}
    ${f({ p: 'y.companyCar.fuelBorne', label: 'I paid all fuel for private travel', type: 'check' })}${f({ p: 'y.companyCar.maintBorne', label: 'I paid all maintenance for private travel', type: 'check' })}
    ${f({ p: 'y.companyCar.insurance', label: 'Insurance paid personally', type: 'money' })}${f({ p: 'y.companyCar.licence', label: 'Licence paid personally', type: 'money' })}</div></div>
  <div class="card"><h2>Calculation</h2>${cc.enabled ? `${line(`Monthly rate`, pct(cc.rate))}${line('Calculated value (determined value × rate × months)', money(cc.calculated))}${line(cc.fromIrp5 ? 'Value used (from IRP5)' : 'Value used (calculated – added to income)', money(cc.value))}${line('Reduction: business km portion', money(-cc.businessPart))}${line('Reduction: private fuel (cost-scale rate)', money(-cc.fuelPart))}${line('Reduction: private maintenance', money(-cc.maintPart))}${line('Reduction: insurance and licence paid', money(-cc.otherPart))}${line('Total reduction on assessment', money(-cc.reduction), 'total')}${line('Taxable value after reduction', money(cc.value - cc.reduction))}${(cc.notes || []).map(n => `<div class="alert info">${esc(n)}</div>`).join('')}` : '<p class="muted">Tick the box to calculate the benefit and the logbook reduction.</p>'}
  <p class="muted" style="margin-top:10px">Rates ${pct(P.companyCar.standard)} / ${pct(P.companyCar.maintenancePlan)} per month. Fuel and maintenance per km from the ${P.label} cost scale.</p></div></div>`;
};

// ---------- SARS assessment ----------
SCREENS.assessment = () => {
  const r = result(), rc = r.recon, y = yd(), A = y.assessment;
  return head('SARS assessment (ITA34)', 'Capture the notice of assessment, compare it with the plan and track the objection and payment deadlines.', helpBtn('ita34') + `<button class="btn btn-primary" data-report="assessment">Reconciliation PDF</button>`) +
  `<div class="grid g2"><div class="card" data-allow><h2>Notice of assessment</h2><div class="grid g2">${f({ p: 'y.assessment.date', label: 'Assessment date', type: 'date' })}${f({ p: 'y.assessment.reference', label: 'Document / reference number' })}
    ${f({ p: 'y.assessment.taxableIncome', label: 'Taxable income per SARS', type: 'money', placeholder: '' })}${f({ p: 'y.assessment.normalTax', label: 'Normal tax (after rebates & credits)', type: 'money', placeholder: '' })}
    ${f({ p: 'y.assessment.paye', label: 'Employees’ tax per SARS', type: 'money', placeholder: '' })}${f({ p: 'y.assessment.provisional', label: 'Provisional tax per SARS', type: 'money', placeholder: '' })}
    ${f({ p: 'y.assessment.interest', label: 'Interest charged', type: 'money' })}${f({ p: 'y.assessment.penalties', label: 'Penalties charged', type: 'money' })}
    ${f({ p: 'y.assessment.balance', label: 'Amount payable / (refund)', type: 'money', placeholder: '', hint: 'Enter a refund as a negative amount.' })}${f({ p: 'y.assessment.paymentDue', label: 'Payment due date', type: 'date' })}
    ${f({ p: 'y.assessment.paid', label: 'Amount paid to SARS', type: 'money' })}${f({ p: 'y.assessment.objectionLodged', label: 'Objection / correction lodged', type: 'check' })}</div>
    <div style="margin-top:10px">${f({ p: 'y.assessment.notes', label: 'Notes', type: 'textarea' })}</div></div>
  <div class="card"><h2>Plan vs SARS</h2>${rc.entered ? `<table class="t"><thead><tr><th></th><th class="r">Plan</th><th class="r">SARS</th><th class="r">Difference</th></tr></thead><tbody>${rc.rows.map(x => `<tr><td>${x.label}</td><td class="r">${moneyCell(x.plan)}</td><td class="r">${x.sars === null ? '—' : moneyCell(x.sars)}</td><td class="r">${x.diff === null ? '' : `<b class="${Math.abs(x.diff) > 100 ? 'neg' : ''}">${moneyCell(x.diff)}</b>`}</td></tr>`).join('')}</tbody></table>
    ${rc.material ? '<div class="alert warn">⚠ Material differences – check SARS’ adjustments (e.g. missing certificates or disallowed deductions). Request reasons or object within the deadline.</div>' : '<div class="alert tip">✓ The assessment agrees with the plan.</div>'}
    ${line('Objection deadline (80 business days)', rc.objectionDeadline ? `<b>${dateLong(rc.objectionDeadline)}</b> · ${daysUntil(rc.objectionDeadline)} days` : 'Enter the assessment date')}${line('Interest and penalties charged', money(rc.interest + rc.penalties))}` : '<p class="muted">Enter the figures from the ITA34 to compare them with the plan.</p>'}
    <h3>Expected interest (s89quat)</h3>${f({ p: 'y.finalOpts.expectedAssessmentDate', label: 'Expected assessment date (if not yet assessed)', type: 'date' })}${r.interest89.applies ? `<div class="sum-box">${line('Tax owing after PAYE and provisional payments', money(r.interest89.owing))}${line(`Interest at ${r.interest89.rate}% from ${dateLong(r.interest89.effectiveDate)} (${r.interest89.days} days)`, money(r.interest89.amount), 'total')}</div>` : '<p class="muted">No interest expected (or not a provisional taxpayer / no date).</p>'}</div></div>`;
};

// ---------- extend existing screens ----------
const _client = SCREENS.client;
SCREENS.client = () => {
  const y = yd(), tri = y.cop === true ? 'yes' : y.cop === false ? 'no' : 'auto';
  return _client() + `<div class="card" data-allow><h2>Joint estate, lock & roll forward</h2><div class="grid g3">
  <div class="field"><label>Married in community of property – split 50/50</label><select data-p="y.cop" data-tri="1"><option value="auto" ${tri === 'auto' ? 'selected' : ''}>Automatic (from marital status)</option><option value="yes" ${tri === 'yes' ? 'selected' : ''}>Yes – tax 50% of joint income</option><option value="no" ${tri === 'no' ? 'selected' : ''}>No – tax 100%</option></select><div class="hint">Interest, dividends, rental and capital gains from joint assets are split between spouses. Mark a property as separate on the Rental screen.</div></div>
  <div class="field"><label>Lock this tax year</label><div class="btn-row">${y.locked ? '<button class="btn" data-act="unlockyear">🔓 Unlock year</button>' : '<button class="btn" data-act="lockyear">🔒 Lock year</button>'}</div><div class="hint">Prevents accidental changes after submission. Documents, fees, notes and the assessment stay editable.</div></div>
  <div class="field"><label>Roll forward</label><div class="btn-row"><button class="btn" data-act="rollforward" ${YEARS.includes(S.year + 1) ? '' : 'disabled'}>Roll forward to ${S.year + 1}…</button></div><div class="hint">Copy employers, businesses, properties and settings to next year with a growth factor – a quick base for next year's provisional estimates.</div></div></div></div>`;
};
const _investments = SCREENS.investments;
SCREENS.investments = () => {
  const r = result(), t = r.tfsa;
  return _investments() + `<div class="card"><h2>Tax-free savings accounts</h2><div class="grid g4">${f({ p: 'y.tfsa.contributions', label: 'Contributions this tax year', type: 'money' })}${f({ p: 'y.tfsa.priorTotal', label: 'Total contributed in earlier years', type: 'money' })}<div class="field"><label>Annual room left</label><input class="num calc" readonly value="${fmtInput(t.annualRoom)}"></div><div class="field"><label>Lifetime room left</label><input class="num calc" readonly value="${fmtInput(t.lifetimeRoom)}"></div></div>
  ${t.excess ? `<div class="alert bad">⚠ Excess contribution of ${money(t.excess)} – tax of 40% (${money(t.tax)}) is added to the liability.</div>` : `<div class="muted" style="margin-top:8px">Limits for ${pack().label}: ${money0(t.annualLimit)} a year, ${money0(t.lifetimeLimit)} lifetime. Growth inside a TFSA is not declared.</div>`}</div>`;
};
const _rental = SCREENS.rental;
SCREENS.rental = () => {
  const y = yd(), r = result();
  let html = _rental();
  if (r.cop && (y.rental || []).length) html += `<div class="card"><h2>Joint estate</h2><p class="muted">50% of each property in the joint estate is taxed here. Tick properties excluded from the joint estate (taxed 100%).</p>${(y.rental || []).map((p, i) => f({ p: `y.rental.${i}.separateProperty`, label: `${p.property || 'Property ' + (i + 1)} is excluded from the joint estate`, type: 'check' })).join('')}</div>`;
  return html;
};
const _final = SCREENS.final;
SCREENS.final = () => {
  const r = result();
  return _final().replace('<button class="btn" data-report="itr12">', '<button class="btn" data-act="csv" data-what="computation">Export CSV</button><button class="btn" data-report="comparative">Compare with last year</button><button class="btn" data-report="itr12">') +
  `<div class="grid g2"><div class="card"><h2>Tax by bracket</h2>${svgBracketBar(r.brackets)}<table class="t" style="margin-top:10px"><thead><tr><th>Band</th><th class="r">Rate</th><th class="r">Income in band</th><th class="r">Tax</th></tr></thead><tbody>${r.brackets.filter(b => b.amount > 0).map(b => `<tr><td>${money0(b.from)} – ${b.to ? money0(b.to) : 'and above'}</td><td class="r">${Math.round(b.rate * 100)}%</td><td class="r">${moneyCell(b.amount)}</td><td class="r">${moneyCell(b.tax)}</td></tr>`).join('')}<tr class="total"><td colspan="2">Tax before rebates</td><td class="r">${moneyCell(r.taxableIncome)}</td><td class="r">${moneyCell(r.grossTax)}</td></tr></tbody></table></div>
  <div class="card"><h2>Other amounts on assessment</h2>${line('Tax-free savings excess tax (40%)', money(r.tfsa.tax))}${line('Company car reduction claimed', money(r.companyCar.reduction))}${line('Expected s89quat interest', r.interest89.applies ? money(r.interest89.amount) : '—')}<p class="muted">Set the expected assessment date on the <button class="btn-link" data-go="assessment">SARS assessment</button> screen to estimate interest.</p></div></div>`;
};
const _p1 = SCREENS.p1;
SCREENS.p1 = () => {
  const A = S.scratch.ann || (S.scratch.ann = { months: 5, ytd: 0, other: 0 });
  const ann = E.n(A.months) ? E.n(A.ytd) * 12 / E.n(A.months) + E.n(A.other) : 0;
  return _p1() + `<div class="card"><h2>Annualise year-to-date figures</h2><p class="muted">Use actual taxable income to date to project the full year (e.g. from management accounts at the end of July).</p><div class="grid g4">${f({ p: 't.ann.months', label: 'Months elapsed', type: 'int' })}${f({ p: 't.ann.ytd', label: 'Taxable income to date', type: 'money' })}${f({ p: 't.ann.other', label: 'Plus once-off amounts expected', type: 'money' })}<div class="field"><label>Annualised estimate</label><input class="num calc" readonly value="${fmtInput(E.r2(ann))}"></div></div><div class="btn-row" style="margin-top:10px"><button class="btn" data-act="useann" data-k="p1" data-v="${E.r2(ann)}" ${ann ? '' : 'disabled'}>Use for 1st period</button><button class="btn" data-act="useann" data-k="p2" data-v="${E.r2(ann)}" ${ann ? '' : 'disabled'}>Use for 2nd period</button></div></div>`;
};
const _dashboard = SCREENS.dashboard;
SCREENS.dashboard = () => {
  const c = cur(), r = result();
  const yrs = Object.keys(c.years).map(Number).filter(y => YEARS.includes(y)).sort().slice(-6);
  const rs = yrs.map(yr => safeResult(c, yr));
  const multi = yrs.length > 1 ? svgBars(yrs.map(String), [{ name: 'Taxable income', values: rs.map(x => x ? x.taxableIncome : 0) }, { name: 'Tax liability', values: rs.map(x => x ? x.liability : 0) }, { name: 'PAYE + IRP6 paid', values: rs.map(x => x ? x.credits : 0) }], { width: 520, height: 190 }) : '<p class="muted">Capture more tax years to see the trend.</p>';
  const docs = window.docList(c, yd()); const got = docs.filter(d => d.received).length;
  return _dashboard().replace('<div class="card"><div class="card-head"><h2>Review points', `<div class="grid g2"><div class="card"><h2>Income mix</h2>${svgDonut(incomeMix(r), 170, { center: 'Income' })}</div><div class="card"><h2>Year-on-year</h2>${multi}</div></div>
  <div class="card"><div class="card-head"><h2>Engagement</h2><button class="btn btn-sm" data-route="documents">Documents →</button><button class="btn btn-sm" data-route="fees">Time →</button></div><div class="pipeline"><div class="pipe"><b>${esc(yd().status || 'Not started')}</b><span>Status</span></div><div class="pipe"><b>${got}/${docs.length}</b><span>Documents received</span></div><div class="pipe"><b>${E.fmt((c.fees || []).filter(f => Number(f.year) === S.year).reduce((a, f) => a + E.n(f.hours), 0), 1)} h</b><span>Time recorded ${S.year}</span></div><div class="pipe"><b>${yd().locked ? '🔒 Locked' : 'Open'}</b><span>Year</span></div></div></div>
  <div class="card"><div class="card-head"><h2>Review points`);
};
const _employment = SCREENS.employment;
SCREENS.employment = () => { const r = result(); const car = E.n(r.irp5.byCode['3802']) + E.n(r.irp5.byCode['3816']); return (car && !yd().companyCar.enabled ? `<div class="alert tip">💡 This IRP5 includes a company car benefit of ${money0(car)}. <button class="btn-link go" data-go="companycar">Reduce it with a logbook →</button></div>` : '') + _employment(); };
const _clients = SCREENS.clients;
SCREENS.clients = () => _clients().replace('<button class="btn" data-report="register">Register PDF</button>', '<button class="btn" data-act="csv" data-what="register">Export CSV</button><button class="btn" data-report="register">Register PDF</button>');
const _settings = SCREENS.settings;
SCREENS.settings = () => {
  const sec = S.prefs.security;
  return _settings() + `<div class="grid g2"><div class="card"><h2>Fees (time records & engagement letters)</h2><div class="grid g3">${f({ p: 's.billing.defaultRate', label: 'Default hourly rate', type: 'money' })}${f({ p: 's.billing.paymentTerms', label: 'Payment terms in engagement letters (days)', type: 'int' })}<div></div></div><div style="margin-top:12px">${f({ p: 's.billing.engagementFee', label: 'Fee basis for engagement letters', placeholder: 'e.g. R950 per hour' })}</div></div>
  <div class="card"><h2>Security & start-up</h2><p class="muted">Client files contain personal information (POPIA). Protect the app with a PIN.</p><div class="btn-row">${sec.pinHash ? '<span class="pill ok">PIN set</span><button class="btn" data-act="setpin">Change PIN</button><button class="btn btn-danger" data-act="clearpin">Remove PIN</button>' : '<button class="btn btn-primary" data-act="setpin">Set a PIN</button>'}</div><div class="grid g2" style="margin-top:12px">${f({ p: 'a.security.lockMinutes', label: 'Auto-lock after minutes idle (0 = never)', type: 'int' })}${f({ p: 'a.defaultHome', label: 'Start-up screen', type: 'select', options: [['practice', 'Practice dashboard'], ['client', 'Last client']] })}</div></div></div>`;
};

// Reports screen grouped by category
SCREENS.reports = () => {
  const cats = {}; REPORTS.list().forEach(rp => (cats[rp.cat || 'Client reports'] = cats[rp.cat || 'Client reports'] || []).push(rp));
  return head('Reports', 'Professional reports on your practice letterhead. Preview, save as PDF or print.', `<button class="btn btn-primary" data-report="pack">Full client pack (PDF)</button>`) +
    Object.entries(cats).map(([c, list]) => `<h3>${c}</h3><div class="wiz-list" style="grid-template-columns:repeat(3,1fr)">${list.map(rp => `<div class="wiz-card" data-report="${rp.id}"><b>${rp.title}</b><span>${rp.desc}</span></div>`).join('')}</div>`).join('');
};

// ---------- actions ----------
const ACTIONS2 = {
  seg(t, ds) { S.scratch[ds.key] = ds.v; App.refresh(); },
  openc(t, ds) { S.clientId = ds.id; if (ds.year) S.year = Number(ds.year); App.afterClientChange(); App.route(ds.route || 'dashboard'); },
  lockyear() { const y = yd(); y.locked = true; if (!['Submitted', 'Assessed'].includes(y.status)) y.status = 'Submitted'; App.log('y.locked', false, true); markDirty(); App.refresh(); toast(`${S.year} locked`); },
  async unlockyear() { if (!(await confirmBox(`Unlock the ${S.year} tax year for editing?`, 'Unlock'))) return; yd().locked = false; App.log('y.locked', true, false); markDirty(); App.refresh(); },
  docadd() { const m = modal({ title: 'Add document request', body: '<input type="text" id="docLbl" placeholder="e.g. Letter from employer confirming home office requirement">', foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="docOk">Add</button>' }); const i = m.el.querySelector('#docLbl'); i.focus(); const ok = () => { if (i.value.trim()) { yd().docsCustom = yd().docsCustom || []; yd().docsCustom.push({ label: i.value.trim() }); markDirty(); } m.el.remove(); App.refresh(); }; m.el.querySelector('#docOk').onclick = ok; i.onkeydown = e => { if (e.key === 'Enter') ok(); }; },
  addfee() { const c = cur(); c.fees = c.fees || []; c.fees.push({ id: 'f' + Date.now().toString(36), date: new Date().toISOString().slice(0, 10), year: S.year, desc: '', hours: 0, rate: E.n(S.settings.billing.defaultRate), amount: 0 }); markDirty(); App.refresh(); const n = document.querySelector(`[data-p="c.fees.${c.fees.length - 1}.desc"]`); if (n) n.focus(); },
  useann(t, ds) { const v = Number(ds.v); setP(`y.provisional.${ds.k}.estimateTI`, v); if (ds.k === 'p1') yd().provisional.p1.useBasic = false; App.log(`y.provisional.${ds.k}.estimateTI`, null, v); markDirty(); App.refresh(); toast('Estimate updated'); },
  async setpin() {
    const m = modal({ title: 'Set PIN', body: '<div class="grid g2"><div class="field"><label>New PIN (4+ digits)</label><input type="password" id="pin1"></div><div class="field"><label>Repeat PIN</label><input type="password" id="pin2"></div></div>', foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="pinOk">Save PIN</button>' });
    m.el.querySelector('#pin1').focus();
    m.el.querySelector('#pinOk').onclick = async () => { const a = m.el.querySelector('#pin1').value, b = m.el.querySelector('#pin2').value; if (a.length < 4) return toast('Use at least 4 characters.'); if (a !== b) return toast('PINs do not match.'); S.prefs.security.pinHash = await sha256('intax:' + a); markDirty(); m.el.remove(); App.refresh(); toast('PIN saved – use 🔒 to lock'); };
  },
  async clearpin() { if (!(await confirmBox('Remove the PIN?', 'Remove'))) return; S.prefs.security.pinHash = ''; markDirty(); App.refresh(); },
  async csv(t, ds) {
    let rows = [], name = 'export.csv';
    if (ds.what === 'computation') { const r = result(), c = cur(); name = `Computation ${clientName(c)} ${S.year}.csv`; rows = [['Section', 'Code', 'Description', 'Amount']].concat(r.lines.map(l => [l.section, l.code, l.label, l.kind === 'note' ? '' : l.amount])); rows.push(['', '', 'Taxable income', r.taxableIncome], ['', '', 'Normal tax', r.normalTax], ['', '', 'Lump sum tax', r.lump.total], ['', '', 'Total liability', r.liability], ['', '4102', 'PAYE', -r.paye], ['', '', 'Provisional paid', -r.provisionalPaid], ['', '', 'Balance', r.balance]); }
    if (ds.what === 'register') { name = `Client register ${S.year}.csv`; rows = [['Client', 'Tax number', 'ID number', 'Email', 'Phone', 'Provisional', 'Status', 'Taxable income', 'Liability', 'Balance']].concat(S.clients.map(c => { const y = c.years[S.year], r = safeResult(c, S.year); return [clientName(c), c.taxRef, c.idNumber, c.email, c.phone, y && y.flags.provisional ? 'Yes' : 'No', (y && y.status) || '', r ? r.taxableIncome : '', r ? r.liability : '', r ? r.balance : '']; })); }
    if (ds.what === 'deadlines') { name = 'Deadlines.csv'; rows = [['Date', 'Client', 'Tax number', 'Year', 'Item', 'Amount', 'Paid', 'Status']].concat(allDeadlines().map(d => [d.date, clientName(d.c), d.c.taxRef, d.yr, d.label, d.amount ?? '', d.paid || '', d.done ? 'Done' : d.overdue ? 'Overdue' : 'Open'])); }
    if (ds.what === 'fees') { name = 'Time records.csv'; rows = [['Client', 'Tax number', 'Date', 'Tax year', 'Work done', 'Hours', 'Rate', 'Value']].concat(S.clients.flatMap(c => (c.fees || []).map(f => [clientName(c), c.taxRef, f.date, f.year, f.desc, f.hours, f.rate, f.amount]))); }
    const p = await window.intax.exportCsv(toCsv(rows), name.replace(/[\\/:*?"<>|]/g, ''));
    if (p) toast('Saved ' + p);
  },
  async rollforward() {
    const c = cur(), from = yd(), to = S.year + 1;
    const m = modal({ title: `Roll forward ${S.year} → ${to}`, body: `<p class="wiz-intro">Creates the ${to} tax year from this year's figures as a planning base. Payments, assessment and documents are not copied.</p><div class="grid g2"><div class="field"><label>Growth applied to income and expenses (%)</label><input type="text" class="num" id="rfG" value="5"></div><div class="field"><label>Also copy</label><label class="check"><input type="checkbox" id="rfAmt" checked> Amounts (otherwise structure only, amounts zero)</label></div></div>${c.years[to] ? `<div class="alert warn">⚠ ${to} already exists and will be replaced.</div>` : ''}`, foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="rfOk">Roll forward</button>' });
    m.el.querySelector('#rfOk').onclick = () => {
      const g = 1 + E.n(m.el.querySelector('#rfG').value) / 100, keep = m.el.querySelector('#rfAmt').checked;
      const sc = (v) => keep ? E.r2(E.n(v) * g) : 0;
      const base = E.emptyYear(to), r = safeResult(c, S.year), Pn = pack(to);
      base.flags = E.clone(from.flags);
      base.irp5 = from.irp5.map(cert => ({ employer: cert.employer, payeRef: cert.payeRef, from: Pn.start, to: Pn.end, codes: cert.codes.map(l => ({ code: l.code, amount: sc(l.amount) })) }));
      base.business = from.business.map(b => Object.assign(E.clone(b), { turnover: sc(b.turnover), otherIncome: sc(b.otherIncome), costOfSales: sc(b.costOfSales), wearTear: keep ? E.n(b.wearTear) : 0, homeOffice: sc(b.homeOffice), expenses: (b.expenses || []).map(e => ({ desc: e.desc, amount: sc(e.amount) })) }));
      base.rental = from.rental.map(p => Object.assign(E.clone(p), { rent: sc(p.rent), expenses: (p.expenses || []).map(e => ({ desc: e.desc, amount: sc(e.amount) })) }));
      Object.keys(base.investments).forEach(k => base.investments[k] = sc(from.investments[k]));
      base.medical = Object.assign(E.clone(from.medical), { contributions: sc(from.medical.contributions), qme: sc(from.medical.qme) });
      base.other = (from.other || []).map(o => Object.assign(E.clone(o), { amount: sc(o.amount) }));
      base.deductions.raContrib = sc(from.deductions.raContrib); base.deductions.donations = sc(from.deductions.donations); base.deductions.homeOffice = sc(from.deductions.homeOffice);
      base.deductions.other = (from.deductions.other || []).map(o => ({ desc: o.desc, amount: sc(o.amount) }));
      base.cop = from.cop; base.tfsa = { contributions: keep ? E.n(from.tfsa && from.tfsa.contributions) : 0, priorTotal: E.n(from.tfsa && from.tfsa.priorTotal) + E.n(from.tfsa && from.tfsa.contributions) };
      if (r) { base.deductions.raCarryForward = r.ra.carryForward; base.deductions.donationsCarryForward = r.donations.carryForward; base.deductions.assessedLossBF = r.assessedLossCF; base.cgt.lossBF = r.cgt.lossCF; base.provisional.basicAmount = { lastAssessedYear: S.year, lastAssessedTI: E.n(from.assessment && from.assessment.taxableIncome) || r.taxableIncome, lessCapitalGain: r.cgt.taxableGain, lessLumpSums: 0 }; }
      base.status = 'Not started'; base.notes = `Rolled forward from ${S.year} with ${E.n(m.el.querySelector('#rfG').value)}% growth on ${new Date().toISOString().slice(0, 10)}.`;
      c.years[to] = base; S.year = to; App.log('y.rollforward', '', `from ${to - 1}`); m.el.remove(); App.afterClientChange(); App.route('dashboard'); toast(`${to} created`);
    };
  }
};
window.ACTIONS2 = ACTIONS2;

// fee amount = hours × rate whenever hours or rate change
document.addEventListener('change', e => {
  const p = e.target.dataset && e.target.dataset.p; if (!p) return;
  const m = p.match(/^c\.fees\.(\d+)\.(hours|rate)$/);
  if (m) setTimeout(() => { const fe = cur().fees[Number(m[1])]; if (fe && E.n(fe.hours) && E.n(fe.rate)) { fe.amount = E.r2(E.n(fe.hours) * E.n(fe.rate)); markDirty(); App.refresh(); } }, 0);
}, true);
document.addEventListener('input', e => { if (e.target.id === 'logQ') { S.scratch.logQ = e.target.value; App.refresh(); } });
