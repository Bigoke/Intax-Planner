// Intax Planner – screens. Each screen returns HTML; inputs with data-p are bound automatically by app.js.
'use strict';

const NAV = [
  { group: 'Overview' },
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'client', label: 'Taxpayer details', icon: '👤' },
  { id: 'checklist', label: 'Income & deduction checklist', icon: '☑' },
  { group: 'Income' },
  { id: 'employment', label: 'Employment (IRP5)', icon: '🏢', flag: 'employment' },
  { id: 'business', label: 'Business & freelance', icon: '💼', flag: 'business' },
  { id: 'rental', label: 'Rental property', icon: '🏠', flag: 'rental' },
  { id: 'investments', label: 'Interest & dividends', icon: '📈', flag: 'investments' },
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
  { id: 'final', label: 'ITR12 & assessment', icon: '✔' },
  { id: 'whatif', label: 'What-if planner', icon: '⚖' },
  { id: 'reports', label: 'Reports', icon: '🖨' },
  { group: 'Practice' },
  { id: 'clients', label: 'Client register', icon: '☰' },
  { id: 'taxtables', label: 'Tax tables', icon: '▤' },
  { id: 'help', label: 'Tax help & search', icon: '?' },
  { id: 'settings', label: 'Practice settings', icon: '⚙' }
];
const NEEDS_CLIENT = new Set(['dashboard', 'client', 'checklist', 'employment', 'business', 'rental', 'investments', 'cgt', 'lumps', 'foreign', 'other', 'retirement', 'medical', 'travel', 'donations', 'deductions', 'provisional', 'p1', 'p2', 'p3', 'final', 'whatif']);

const head = (title, sub, actions) => `<div class="page-head"><div class="grow"><h1>${title}</h1><div class="page-sub">${sub || ''}</div></div><div class="btn-row">${actions || ''}</div></div>`;
const wizBtn = (id, label) => `<button class="btn" data-wizard="${id}">✦ ${label || 'Wizard'}</button>`;
const helpBtn = (id) => `<button class="btn btn-sm" data-help="${id}">? Help</button>`;
const line = (lbl, val, cls) => `<div class="calc-line ${cls || ''}"><span class="lbl">${lbl}</span><span>${val}</span></div>`;
const alerts = (list) => (list || []).map(w => `<div class="alert ${w.level}"><span>${w.level === 'warn' ? '⚠' : w.level === 'tip' ? '💡' : 'ℹ'}</span><span>${esc(w.text)}</span>${w.go ? `<button class="btn-link go" data-go="${w.go}">Go to →</button>` : ''}</div>`).join('');

const SCREENS = {};

// ---------------- Dashboard ----------------
SCREENS.dashboard = () => {
  const c = cur(), y = yd(), r = result(), pv = r.provisional, P = pack();
  const bal = r.balance;
  const pStatus = (due, paid, date) => {
    if (paid > 0 && paid >= due - 1) return '<span class="pill ok">Paid</span>';
    if (paid > 0) return '<span class="pill warn">Part paid</span>';
    const d = daysUntil(date);
    return d < 0 ? '<span class="pill bad">Overdue</span>' : `<span class="pill info">Due in ${d} days</span>`;
  };
  const isProv = y.flags.provisional;
  const income = [
    ['Employment (IRP5)', r.employment, 'employment'], ['Foreign income (taxable)', r.foreignEmployment - r.foreignExempt, 'foreign'], ['Business / trade', r.businessNet, 'business'], ['Rental', r.rentalNet, 'rental'],
    ['Interest & dividends (taxable)', r.investNet, 'investments'], ['Other income', r.otherIncome + r.savingsWithdrawal, 'other'], ['Taxable capital gain', r.cgt.taxableGain, 'cgt']
  ].filter(x => x[1]);
  return head(`${esc(clientName(c))}`, `${P.label} &nbsp;·&nbsp; Age ${r.age ?? '—'} at year end &nbsp;·&nbsp; ${isProv ? '<span class="pill info">Provisional taxpayer</span>' : '<span class="pill ok">Non-provisional</span>'}`,
    `${wizBtn('checklist', 'Start guided set-up')}<button class="btn btn-primary" data-report="computation">Tax computation</button>`) +
  `<div class="kpis">
    <div class="kpi accent"><div class="k-label">Taxable income</div><div class="k-val">${money0(r.taxableIncome)}</div><div class="k-sub">Marginal rate ${pct(r.marginalRate)}</div></div>
    <div class="kpi gold"><div class="k-label">Total tax liability</div><div class="k-val">${money0(r.liability)}</div><div class="k-sub">Effective rate ${r.effectiveRate}%</div></div>
    <div class="kpi"><div class="k-label">PAYE & payments</div><div class="k-val">${money0(r.credits)}</div><div class="k-sub">PAYE ${money0(r.paye)} · IRP6 ${money0(r.provisionalPaid)}</div></div>
    <div class="kpi ${bal > 0 ? 'red' : 'green'}"><div class="k-label">${bal > 0 ? 'Estimated payable' : 'Estimated refund'}</div><div class="k-val">${money0(Math.abs(bal))}</div><div class="k-sub">On assessment (ITR12)</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-head"><h2>Provisional tax schedule</h2>${isProv ? '' : '<span class="pill">Not flagged as provisional</span>'}</div>
      <table class="t"><thead><tr><th>Payment</th><th>Due date</th><th class="r">Amount due</th><th class="r">Paid</th><th>Status</th></tr></thead><tbody>
        <tr class="clickable" data-go="p1"><td>1st – IRP6 period 1</td><td>${dateLong(pv.dueDates.p1)}</td><td class="r">${moneyCell(pv.p1.due)}</td><td class="r">${moneyCell(pv.p1.paid)}</td><td>${pStatus(pv.p1.due, pv.p1.paid, pv.dueDates.p1)}</td></tr>
        <tr class="clickable" data-go="p2"><td>2nd – IRP6 period 2</td><td>${dateLong(pv.dueDates.p2)}</td><td class="r">${moneyCell(pv.p2.due)}</td><td class="r">${moneyCell(pv.p2.paid)}</td><td>${pStatus(pv.p2.due, pv.p2.paid, pv.dueDates.p2)}</td></tr>
        <tr class="clickable" data-go="p3"><td>3rd – top-up (voluntary)</td><td>${dateLong(pv.p3.dueDate)}</td><td class="r">${moneyCell(pv.p3.due)}</td><td class="r">${moneyCell(pv.p3.paid)}</td><td>${pv.p3.due < 1 ? '<span class="pill ok">Not needed</span>' : pStatus(pv.p3.due, pv.p3.paid, pv.p3.dueDate)}</td></tr>
        <tr class="clickable" data-go="final"><td>Final – ITR12 assessment</td><td>Filing season</td><td class="r" colspan="2">${bal > 0 ? 'Payable ' + money(bal) : 'Refund ' + money(-bal)}</td><td></td></tr>
      </tbody></table>
      <div style="margin-top:10px">${pv.penalty.ok ? '<span class="pill ok">2nd estimate passes the underestimation test</span>' : `<span class="pill bad">Underestimation risk – penalty ${money0(pv.penalty.amount)}</span>`}</div>
    </div>
    <div class="card"><div class="card-head"><h2>Income by source</h2></div>
      <table class="t"><tbody>${income.map(i => `<tr class="clickable" data-go="${i[2]}"><td>${i[0]}</td><td class="r">${moneyCell(i[1])}</td></tr>`).join('') || '<tr><td class="muted">No income captured yet – use the checklist or a wizard.</td></tr>'}
      <tr class="sub"><td>Gross income (after exemptions)</td><td class="r">${moneyCell(r.incomeTotal + r.cgt.taxableGain)}</td></tr>
      <tr><td>Less deductions</td><td class="r">${moneyCell(-(r.travel.chosen + r.homeOffice + r.otherDeductions + r.assessedLossBF + r.ra.allowed + r.donations.allowed))}</td></tr>
      <tr class="total"><td>Taxable income</td><td class="r">${moneyCell(r.taxableIncome)}</td></tr></tbody></table>
    </div>
  </div>
  <div class="card"><div class="card-head"><h2>Review points & planning opportunities</h2></div>${alerts(r.warnings) || '<div class="muted">No issues found.</div>'}</div>`;
};

// ---------------- Client ----------------
SCREENS.client = () => {
  const c = cur(), r = result();
  return head('Taxpayer details', 'Personal details used on every report. Age is measured on the last day of the tax year.', wizBtn('newclient', 'Client wizard')) +
  `<div class="card"><h2>Taxpayer</h2><div class="grid g3">
    ${f({ p: 'c.firstName', label: 'First names' })}${f({ p: 'c.surname', label: 'Surname' })}${f({ p: 'c.taxRef', label: 'Income tax reference number', placeholder: '10 digits' })}
    ${f({ p: 'c.idNumber', label: 'ID / passport number' })}${f({ p: 'c.dob', label: 'Date of birth', type: 'date', hint: r ? `Age on ${dateLong(pack().end)}: <b>${r.age ?? '—'}</b>` : '' })}
    ${f({ p: 'c.maritalStatus', label: 'Marital status', type: 'select', options: ['', 'Single', 'Married in community of property', 'Married out of community', 'Divorced', 'Widowed'] })}
    ${f({ p: 'c.email', label: 'Email' })}${f({ p: 'c.phone', label: 'Phone' })}${f({ p: 'c.employer', label: 'Main employer / business' })}
  </div><div class="grid g2" style="margin-top:12px">${f({ p: 'c.address', label: 'Postal address', type: 'textarea' })}${f({ p: 'c.notes', label: 'Practitioner notes (internal)', type: 'textarea' })}</div></div>
  <div class="card"><h2>${pack().label}</h2><div class="grid g3">
    ${f({ p: 'y.flags.provisional', label: 'Registered provisional taxpayer (IRP6)', type: 'check', hint: 'Must submit two IRP6 returns a year.' })}
    ${f({ p: 'y.engagement', label: 'Engagement / file reference' })}
    ${f({ p: 'y.status', label: 'Work status', type: 'select', options: ['Not started', 'Gathering documents', 'In progress', 'Review', 'Submitted', 'Assessed'] })}
  </div><div style="margin-top:12px">${f({ p: 'y.notes', label: 'Notes for this tax year', type: 'textarea' })}</div></div>`;
};

// ---------------- Checklist ----------------
const CHECK_TILES = [
  ['employment', '🏢', 'Salary / IRP5', 'Employment income, bonus, allowances, fringe benefits'],
  ['business', '💼', 'Business or freelance', 'Sole proprietor, side income, commission work'],
  ['rental', '🏠', 'Rental property', 'Rent from residential or commercial property'],
  ['investments', '📈', 'Interest & dividends', 'Bank interest, unit trusts, REITs, foreign dividends'],
  ['cgt', '⇅', 'Sold assets', 'Shares, crypto, property or other capital assets'],
  ['lumpSums', '🏦', 'Retirement payouts', 'Lump sums, resignations, two-pot withdrawals'],
  ['foreign', '🌍', 'Foreign income', 'Work abroad, foreign income, foreign tax paid'],
  ['other', '＋', 'Other income', 'Royalties, prizes, other taxable income'],
  ['retirement', '⛱', 'Retirement contributions', 'Retirement annuities, pension and provident funds'],
  ['medical', '✚', 'Medical aid', 'Scheme contributions and out-of-pocket medical costs'],
  ['travel', '🚗', 'Travel allowance', 'Business travel with a logbook'],
  ['donations', '♥', 'Donations', 'Donations with section 18A certificates'],
  ['homeOffice', '⌂', 'Home office & other', 'Home office, assessed losses, other deductions'],
  ['provisional', '◷', 'Provisional taxpayer', 'Submits IRP6 returns in August and February']
];
const FLAG_ROUTE = { employment: 'employment', business: 'business', rental: 'rental', investments: 'investments', cgt: 'cgt', lumpSums: 'lumps', foreign: 'foreign', other: 'other', retirement: 'retirement', medical: 'medical', travel: 'travel', donations: 'donations', homeOffice: 'deductions', provisional: 'provisional' };
SCREENS.checklist = () => {
  const y = yd();
  return head('Income & deduction checklist', 'Tick everything that applies this year. Ticked items appear in the menu with a dot and are covered by the guided set-up.', wizBtn('checklist', 'Run guided set-up')) +
  `<div class="tiles">${CHECK_TILES.map(([k, ic, t, s]) => `<div class="tile ${y.flags[k] ? 'on' : ''}" data-flag="${k}"><span class="ti-check">${y.flags[k] ? '✓' : ''}</span><div class="ti-icon">${ic}</div><div class="ti-title">${t}</div><div class="ti-sub">${s}</div>${y.flags[k] ? `<div style="margin-top:8px"><button class="btn-link" data-go="${FLAG_ROUTE[k]}">Open →</button></div>` : ''}</div>`).join('')}</div>`;
};

// ---------------- Employment ----------------
const QUICK_CODES = ['3601', '3605', '3606', '3701', '3713', '3802', '3810', '3817', '4001', '4005', '4006', '4102', '4116', '4141'];
function codeOptions(selected) {
  const groups = {};
  codeList().forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
  let known = codeList().some(c => c.code === selected);
  return (known || !selected ? '' : `<option value="${esc(selected)}" selected>${esc(selected)} – (custom)</option>`) + Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(c => `<option value="${c.code}" ${c.code === selected ? 'selected' : ''}>${c.code} – ${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
}
SCREENS.employment = () => {
  const y = yd(), r = result();
  const certs = y.irp5.map((cert, i) => {
    const tot = (t) => cert.codes.filter(l => { const c = codeList().find(x => x.code === l.code); return c && t.includes(c.treat); }).reduce((a, l) => a + E.n(l.amount), 0);
    return `<div class="card" data-field="y.irp5.${i}"><div class="card-head"><h2>IRP5 ${i + 1}: ${esc(cert.employer || 'Employer')}</h2><button class="btn btn-sm btn-danger" data-act="del" data-p="y.irp5" data-i="${i}">Remove certificate</button></div>
      <div class="grid g4">${f({ p: `y.irp5.${i}.employer`, label: 'Employer' })}${f({ p: `y.irp5.${i}.payeRef`, label: 'Employer PAYE ref (7…)' })}${f({ p: `y.irp5.${i}.from`, label: 'Period from', type: 'date' })}${f({ p: `y.irp5.${i}.to`, label: 'Period to', type: 'date' })}</div>
      <table class="t" style="margin-top:12px"><thead><tr><th style="width:52%">Source code</th><th class="r">Amount (R)</th><th>Treatment</th><th></th></tr></thead><tbody>
      ${cert.codes.map((l, j) => { const c = codeList().find(x => x.code === l.code); return `<tr data-field="y.irp5.${i}.codes.${j}.amount"><td><select data-p="y.irp5.${i}.codes.${j}.code">${codeOptions(l.code)}</select></td><td><input type="text" class="num" data-num="money" data-p="y.irp5.${i}.codes.${j}.amount" value="${esc(fmtInput(l.amount))}"></td><td class="muted">${c ? treatLabel(c.treat) : 'Taxable income'}</td><td><button class="btn btn-sm btn-danger" data-act="del" data-p="y.irp5.${i}.codes" data-i="${j}">✕</button></td></tr>`; }).join('')}
      <tr class="sub"><td>Taxable remuneration on this certificate</td><td class="r">${moneyCell(tot(['income', 'pension', 'travel', 'fringe', 'medFringe', 'retFringe']))}</td><td>PAYE ${money(tot(['paye']))}</td><td></td></tr>
      </tbody></table>
      <div class="btn-row" style="margin-top:10px"><span class="muted">Add code:</span>${QUICK_CODES.map(q => `<button class="btn btn-sm" data-act="addcode" data-i="${i}" data-code="${q}" title="${esc((codeList().find(c => c.code === q) || {}).name)}">${q}</button>`).join('')}<button class="btn btn-sm" data-act="addcode" data-i="${i}" data-code="">Other…</button></div>
    </div>`;
  }).join('');
  return head('Employment income (IRP5 / IT3(a))', 'Capture each certificate code by code exactly as it appears. The planner applies the correct tax treatment per source code.', wizBtn('irp5', 'IRP5 wizard') + helpBtn('irp5') + `<button class="btn btn-primary" data-act="add" data-p="y.irp5" data-tpl="irp5">+ Add certificate</button>`) +
    (certs || `<div class="card empty"><div class="big">🏢</div><p>No IRP5 certificates yet.</p><button class="btn btn-primary" data-wizard="irp5">Capture an IRP5 with the wizard</button></div>`) +
    (y.irp5.length ? `<div class="card"><h2>All certificates – totals by code</h2><table class="t"><thead><tr><th>Code</th><th>Description</th><th class="r">Total</th></tr></thead><tbody>${Object.entries(r.irp5.byCode).sort().map(([k, v]) => `<tr><td><span class="code-tag">${k}</span></td><td>${esc((codeList().find(c => c.code === k) || {}).name || 'Custom code')}</td><td class="r">${moneyCell(v)}</td></tr>`).join('')}</tbody></table></div>` : '');
};
function treatLabel(t) { return { income: 'Taxable income', pension: 'Taxable (pension/annuity)', travel: 'Taxable – travel allowance', fringe: 'Taxable fringe benefit', medFringe: 'Taxable + medical contribution', retFringe: 'Taxable + retirement contribution', exempt: 'Non-taxable', retContrib: 'Retirement contribution (s11F)', medContrib: 'Medical contribution', donation: 'Donation (s18A)', lumpRet: 'Retirement lump sum (special table)', lumpWd: 'Withdrawal lump sum (special table)', savingsWd: 'Two-pot withdrawal', paye: 'Tax credit – PAYE', lumpTax: 'Tax credit – lump sum', info: 'Information only' }[t] || t; }

// ---------------- Business ----------------
const BUS_EXP = ['Accounting fees', 'Advertising', 'Bank charges', 'Cellphone & internet', 'Entertainment (business)', 'Insurance', 'Interest paid', 'Legal fees', 'Rent', 'Repairs', 'Salaries & wages', 'Software & subscriptions', 'Stationery', 'Travel (business)', 'Utilities'];
SCREENS.business = () => {
  const y = yd(), r = result();
  const cards = y.business.map((b, i) => {
    const res = r.business[i] || { income: 0, expenses: 0, net: 0 };
    return `<div class="card"><div class="card-head"><h2>${esc(b.name || 'Business ' + (i + 1))}</h2><span class="pill ${res.net < 0 ? 'bad' : 'ok'}">Net ${res.net < 0 ? 'loss' : 'profit'} ${money0(res.net)}</span><button class="btn btn-sm btn-danger" data-act="del" data-p="y.business" data-i="${i}">Remove</button></div>
      <div class="grid g4">${f({ p: `y.business.${i}.name`, label: 'Trading name / activity' })}${f({ p: `y.business.${i}.kind`, label: 'Type', type: 'select', options: ['Sole proprietor', 'Freelance / consulting', 'Commission earner', 'Partnership share', 'Crypto / share trading (revenue)', 'Other trade'] })}
      ${f({ p: `y.business.${i}.turnover`, label: 'Turnover / fees invoiced', type: 'money' })}${f({ p: `y.business.${i}.otherIncome`, label: 'Other business income', type: 'money' })}
      ${f({ p: `y.business.${i}.costOfSales`, label: 'Cost of sales', type: 'money' })}${f({ p: `y.business.${i}.wearTear`, label: 'Wear-and-tear (s11(e))', type: 'money', hint: 'Assets per SARS IN 47' })}${f({ p: `y.business.${i}.homeOffice`, label: 'Home office (business portion)', type: 'money' })}</div>
      <h3>Expenses</h3><table class="t"><thead><tr><th>Description</th><th class="r" style="width:200px">Amount</th><th style="width:40px"></th></tr></thead><tbody>
      ${(b.expenses || []).map((e, j) => `<tr><td><input type="text" data-p="y.business.${i}.expenses.${j}.desc" value="${esc(e.desc)}"></td><td><input class="num" type="text" data-num="money" data-p="y.business.${i}.expenses.${j}.amount" value="${esc(fmtInput(e.amount))}"></td><td><button class="btn btn-sm btn-danger" data-act="del" data-p="y.business.${i}.expenses" data-i="${j}">✕</button></td></tr>`).join('')}
      <tr class="sub"><td>Total deductions</td><td class="r">${moneyCell(res.expenses)}</td><td></td></tr></tbody></table>
      <div class="btn-row" style="margin-top:8px"><select id="busExp${i}" style="width:240px">${BUS_EXP.map(x => `<option>${x}</option>`).join('')}<option value="">Other…</option></select><button class="btn btn-sm" data-act="addexp" data-p="y.business.${i}.expenses" data-src="busExp${i}">+ Add expense</button></div>
    </div>`;
  }).join('');
  return head('Business, trade & freelance income', 'Income from carrying on a trade, net of expenses incurred in producing it (s11(a)). Losses reduce other income.', wizBtn('business', 'Business wizard') + helpBtn('business') + `<button class="btn btn-primary" data-act="add" data-p="y.business" data-tpl="business">+ Add business</button>`) +
    (cards || `<div class="card empty"><div class="big">💼</div><p>No business income captured.</p><button class="btn btn-primary" data-wizard="business">Use the business wizard</button></div>`);
};

// ---------------- Rental ----------------
const RENT_EXP = ['Bond interest', 'Rates & taxes', 'Levies', 'Insurance', 'Repairs & maintenance', 'Agent / letting fees', 'Advertising', 'Water & electricity', 'Garden & cleaning', 'Wear-and-tear (furniture)'];
SCREENS.rental = () => {
  const y = yd(), r = result();
  const cards = y.rental.map((p, i) => { const res = r.rental[i] || {}; return `<div class="card"><div class="card-head"><h2>${esc(p.property || 'Property ' + (i + 1))}</h2><span class="pill ${res.net < 0 ? 'bad' : 'ok'}">Net ${money0(res.net)}</span><button class="btn btn-sm btn-danger" data-act="del" data-p="y.rental" data-i="${i}">Remove</button></div>
    <div class="grid g3">${f({ p: `y.rental.${i}.property`, label: 'Property address / name' })}${f({ p: `y.rental.${i}.rent`, label: 'Gross rent received', type: 'money' })}${f({ p: `y.rental.${i}.sharePct`, label: 'Your ownership share (%)', type: 'dec', placeholder: '100' })}</div>
    <h3>Expenses (100% – your share is applied)</h3><table class="t"><tbody>
    ${(p.expenses || []).map((e, j) => `<tr><td><input type="text" data-p="y.rental.${i}.expenses.${j}.desc" value="${esc(e.desc)}"></td><td style="width:200px"><input class="num" type="text" data-num="money" data-p="y.rental.${i}.expenses.${j}.amount" value="${esc(fmtInput(e.amount))}"></td><td style="width:40px"><button class="btn btn-sm btn-danger" data-act="del" data-p="y.rental.${i}.expenses" data-i="${j}">✕</button></td></tr>`).join('')}
    <tr class="sub"><td>Your share: income ${money(res.income)} less expenses</td><td class="r">${moneyCell(res.expenses)}</td><td></td></tr></tbody></table>
    <div class="btn-row" style="margin-top:8px"><select id="rentExp${i}" style="width:240px">${RENT_EXP.map(x => `<option>${x}</option>`).join('')}<option value="">Other…</option></select><button class="btn btn-sm" data-act="addexp" data-p="y.rental.${i}.expenses" data-src="rentExp${i}">+ Add expense</button></div></div>`; }).join('');
  return head('Rental income', 'Rent received less deductible expenses. Bond capital repayments are not deductible – only interest.', wizBtn('rental', 'Rental wizard') + helpBtn('rental') + `<button class="btn btn-primary" data-act="add" data-p="y.rental" data-tpl="rental">+ Add property</button>`) +
    (cards || `<div class="card empty"><div class="big">🏠</div><p>No rental properties captured.</p><button class="btn btn-primary" data-wizard="rental">Use the rental wizard</button></div>`);
};

// ---------------- Investments ----------------
SCREENS.investments = () => {
  const r = result();
  return head('Interest & dividends', 'Enter totals from IT3(b) certificates. Amounts inside a tax-free savings account are not declared.', wizBtn('investments', 'Investment wizard') + helpBtn('interest')) +
  `<div class="grid g2"><div class="card"><h2>Interest</h2>${f({ p: 'y.investments.localInterest', label: 'Local interest received (IT3(b))', type: 'money' })}<br>${f({ p: 'y.investments.foreignInterest', label: 'Foreign interest received (in rand)', type: 'money' })}
    <div class="sum-box">${line('Local interest', money(r.interest.local))}${line(`Exemption (${r.age >= 65 ? '65 and older' : 'under 65'}, max ${money0(r.interest.limit)})`, money(-r.interest.exempt))}${line('Foreign interest', money(r.interest.foreign))}${line('Taxable interest', money(r.interest.local - r.interest.exempt + r.interest.foreign), 'total')}</div></div>
  <div class="card"><h2>Dividends</h2>${f({ p: 'y.investments.localDividends', label: 'Local dividends (exempt – dividends tax withheld)', type: 'money' })}<br>${f({ p: 'y.investments.dividendsTaxWithheld', label: 'Dividends tax withheld (20%) – information only', type: 'money' })}<br>${f({ p: 'y.investments.reitDividends', label: 'Dividends from SA REITs (taxable)', type: 'money' })}<br>${f({ p: 'y.investments.foreignDividends', label: 'Foreign dividends (in rand)', type: 'money' })}
    <div class="sum-box">${line('REIT dividends', money(r.dividends.reit))}${line('Foreign dividends', money(r.dividends.foreign))}${line('Less exempt portion (25/45)', money(-r.dividends.foreignExempt))}${line('Taxable dividends', money(r.dividends.reit + r.dividends.foreign - r.dividends.foreignExempt), 'total')}</div></div></div>`;
};

// ---------------- CGT ----------------
const CGT_TYPES = [['shares', 'Listed shares / unit trusts'], ['crypto', 'Crypto assets'], ['property', 'Property (not primary residence)'], ['primary', 'Primary residence'], ['business', 'Business asset'], ['personal', 'Personal-use asset (disregarded)'], ['other', 'Other asset']];
SCREENS.cgt = () => {
  const y = yd(), r = result(), cg = r.cgt;
  return head('Capital gains & losses', 'Every disposal in the year: shares, crypto, property and other capital assets.', wizBtn('cgt', 'Disposal wizard') + helpBtn('cgt') + `<button class="btn btn-primary" data-act="add" data-p="y.cgt.items" data-tpl="cgt">+ Add disposal</button>`) +
  `<div class="card"><table class="t"><thead><tr><th>Description</th><th>Asset type</th><th>Date sold</th><th class="r">Proceeds</th><th class="r">Base cost</th><th class="r">Selling costs</th><th class="r">Gain / (loss)</th><th class="r">Exclusion</th><th></th></tr></thead><tbody>
  ${y.cgt.items.map((it, i) => `<tr><td><input type="text" data-p="y.cgt.items.${i}.desc" value="${esc(it.desc)}"></td><td><select data-p="y.cgt.items.${i}.type">${CGT_TYPES.map(([v, l]) => `<option value="${v}" ${it.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><input type="date" data-p="y.cgt.items.${i}.date" value="${esc(it.date || '')}"></td>
  <td><input class="num" data-num="money" data-p="y.cgt.items.${i}.proceeds" value="${esc(fmtInput(it.proceeds))}"></td><td><input class="num" data-num="money" data-p="y.cgt.items.${i}.baseCost" value="${esc(fmtInput(it.baseCost))}"></td><td><input class="num" data-num="money" data-p="y.cgt.items.${i}.costs" value="${esc(fmtInput(it.costs))}"></td>
  <td class="r">${moneyCell(cg.rows[i].gain)}</td><td class="r">${moneyCell(-cg.rows[i].exclusion)}</td><td><button class="btn btn-sm btn-danger" data-act="del" data-p="y.cgt.items" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">No disposals captured.</td></tr>'}
  </tbody></table></div>
  <div class="grid g2"><div class="card"><h2>Adjustments</h2><div class="grid g2">${f({ p: 'y.cgt.lossBF', label: 'Assessed capital loss brought forward', type: 'money' })}${f({ p: 'y.cgt.smallBusinessExclusion', label: 'Small business exclusion (55+, para 57)', type: 'money', hint: `Max ${money0(pack().cgt.smallBusinessExclusion)}` })}</div><div style="margin-top:10px">${f({ p: 'y.cgt.yearOfDeath', label: 'Year of death (use the death exclusion)', type: 'check' })}</div></div>
  <div class="card"><h2>Calculation</h2>${line('Aggregate gain / (loss)', money(cg.aggregate))}${line('Less annual exclusion', money(-cg.annualExclusion))}${line('Less capital loss brought forward', money(-cg.lossBF))}${line('Net capital gain / (loss)', money(cg.net))}${line(`Inclusion rate`, pct(cg.inclusionRate))}${line('Taxable capital gain', money(cg.taxableGain), 'total')}${cg.lossCF ? line('Capital loss carried forward', money(cg.lossCF)) : ''}</div></div>`;
};

// ---------------- Lump sums ----------------
SCREENS.lumps = () => {
  const r = result(), L = r.lump;
  return head('Retirement lump sums & two-pot withdrawals', 'Lump sums are taxed on separate lifetime tables; amounts on IRP5 codes 3901/3915/3920 are added automatically.', wizBtn('lumps', 'Lump sum wizard') + helpBtn('lump-sums')) +
  `<div class="grid g2"><div class="card"><h2>Amounts received this year</h2><div class="grid g2">
    ${f({ p: 'y.lumps.retirement', label: 'Retirement / death / retrenchment lump sum', type: 'money', code: '3915' })}${f({ p: 'y.lumps.withdrawal', label: 'Withdrawal lump sum (resignation)', type: 'money', code: '3920' })}
    ${f({ p: 'y.lumps.savingsWithdrawal', label: 'Two-pot savings withdrawal', type: 'money', hint: 'Taxed at marginal rates' })}${f({ p: 'y.lumps.priorLumpSums', label: 'Taxable lump sums received in previous years', type: 'money', hint: 'Since Oct 2007 (retirement) / Mar 2009 (withdrawal)' })}
    ${f({ p: 'y.lumps.taxDeducted', label: 'Tax deducted by fund (directive)', type: 'money', code: '4115' })}</div></div>
  <div class="card"><h2>Tax on lump sums</h2>${line('Withdrawal benefits', money(L.withdrawal))}${line('Tax – withdrawal table', money(L.withdrawalTax))}${line('Retirement / severance benefits', money(L.retirement))}${line('Tax – retirement table', money(L.retirementTax))}${line('Total lump sum tax', money(L.total), 'total')}${line('Tax already deducted', money(L.taxDeducted))}<div class="alert info">Two-pot withdrawals of ${money(r.savingsWithdrawal)} are included in taxable income.</div></div></div>`;
};

// ---------------- Foreign ----------------
SCREENS.foreign = () => {
  const r = result(), P = pack();
  return head('Foreign income', 'South African residents are taxed on worldwide income. Convert amounts to rand at the average or spot rate.', helpBtn('foreign-employment')) +
  `<div class="card"><div class="grid g2">${f({ p: 'y.foreign.employmentIncome', label: 'Foreign employment income (rand)', type: 'money' })}${f({ p: 'y.foreign.qualifies', label: 'Qualifies for s10(1)(o)(ii): outside SA > 183 days incl. 60 continuous', type: 'check' })}
  ${f({ p: 'y.foreign.otherForeignIncome', label: 'Other foreign income (rand)', type: 'money' })}${f({ p: 'y.foreign.foreignTaxCredit', label: 'Foreign tax paid – s6quat credit (rand)', type: 'money' })}</div>
  <div class="sum-box">${line('Foreign employment income', money(r.foreignEmployment))}${line(`Exemption (limit ${P.foreignEmploymentExemption === null ? 'none' : money0(P.foreignEmploymentExemption)})`, money(-r.foreignExempt))}${line('Foreign tax credit used', money(r.foreignTaxCredit))}</div></div>`;
};

// ---------------- Other income ----------------
SCREENS.other = () => {
  const y = yd();
  return head('Other income', 'Any other income: royalties, restraint payments, prizes, annuities not on an IRP5.', `<button class="btn btn-primary" data-act="add" data-p="y.other" data-tpl="other">+ Add item</button>`) +
  `<div class="card"><table class="t"><thead><tr><th>Description</th><th style="width:200px">Treatment</th><th class="r" style="width:200px">Amount</th><th></th></tr></thead><tbody>${y.other.map((o, i) => `<tr><td><input data-p="y.other.${i}.desc" value="${esc(o.desc)}"></td><td><select data-p="y.other.${i}.type"><option value="taxable" ${o.type !== 'exempt' ? 'selected' : ''}>Taxable</option><option value="exempt" ${o.type === 'exempt' ? 'selected' : ''}>Exempt (shown only)</option></select></td><td><input class="num" data-num="money" data-p="y.other.${i}.amount" value="${esc(fmtInput(o.amount))}"></td><td><button class="btn btn-sm btn-danger" data-act="del" data-p="y.other" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Nothing captured.</td></tr>'}</tbody></table></div>`;
};

// ---------------- Retirement ----------------
SCREENS.retirement = () => {
  const r = result(), ra = r.ra, P = pack();
  return head('Retirement fund contributions (s11F)', `Deduction limited to ${pct(P.retirement.pct)} of the greater of remuneration or taxable income, capped at ${money0(P.retirement.cap)}.`, wizBtn('retirement', 'Retirement wizard') + helpBtn('ra')) +
  `<div class="grid g2"><div class="card"><h2>Contributions</h2>${f({ p: 'y.deductions.raContrib', label: 'Retirement annuity contributions paid personally (IT3(f) certificates)', type: 'money', code: '4006' })}<br>${f({ p: 'y.deductions.raCarryForward', label: 'Contributions carried forward from previous years', type: 'money' })}
    <div class="sum-box">${line('Payroll contributions (4001/4003/4006) + employer 3817', money(r.irp5.agg.retContrib + r.irp5.agg.retFringe))}${line('Personal RA contributions', money(E.n(yd().deductions.raContrib)))}${line('Carried forward in', money(ra.carriedIn))}${line('Total available', money(ra.contributions + ra.carriedIn), 'total')}</div></div>
  <div class="card"><h2>Deduction limit</h2>${line('Remuneration', money(ra.remuneration))}${line(`${pct(P.retirement.pct)} of greater of remuneration / taxable income`, money(ra.limitPct))}${line('Annual cap', money(ra.cap))}${line('Deduction allowed', money(ra.allowed), 'total')}${line('Carried forward to next year', money(ra.carryForward))}
  ${ra.allowed < Math.min(ra.cap, ra.limitPct) ? `<div class="alert tip">💡 Room for a further ${money0(Math.min(ra.cap, ra.limitPct) - ra.allowed)} deductible contribution before ${dateLong(P.end)} – saving about ${money0((Math.min(ra.cap, ra.limitPct) - ra.allowed) * r.marginalRate)} tax.</div>` : ''}</div></div>`;
};

// ---------------- Medical ----------------
SCREENS.medical = () => {
  const r = result(), m = r.medical, P = pack();
  return head('Medical aid & medical expenses', 'Medical scheme fees tax credit (s6A) and additional medical expenses tax credit (s6B).', wizBtn('medical', 'Medical wizard') + helpBtn('medical-additional')) +
  `<div class="grid g2"><div class="card"><h2>Scheme membership</h2><div class="grid g2">${f({ p: 'y.medical.onScheme', label: 'Member of a medical scheme', type: 'check' })}${f({ p: 'y.medical.disability', label: 'Taxpayer, spouse or child has a disability (ITR-DD)', type: 'check' })}
    ${f({ p: 'y.medical.months', label: 'Months on the scheme', type: 'int' })}${f({ p: 'y.medical.dependants', label: 'Dependants (excluding main member)', type: 'int' })}
    ${f({ p: 'y.medical.contributions', label: 'Contributions paid personally (not via payroll)', type: 'money', hint: 'Payroll contributions come from codes 4005 / 3810' })}${f({ p: 'y.medical.qme', label: 'Qualifying out-of-pocket medical expenses', type: 'money', hint: 'Not recovered from the scheme' })}</div></div>
  <div class="card"><h2>Credits</h2>${line(`Monthly credit (${P.medicalCredits.main} + ${P.medicalCredits.first} + ${P.medicalCredits.additional} × extra)`, money(m.perMonth))}${line('Medical scheme fees tax credit (s6A)', money(m.mtc))}${line('Total contributions', money(m.contributions))}${line('Qualifying expenses', money(m.qme))}${line(`Additional credit (s6B, ${m.basis})`, money(m.additional))}${line('Credits used against tax', money(m.mtcUsed + m.additionalUsed), 'total')}</div></div>`;
};

// ---------------- Travel ----------------
SCREENS.travel = () => {
  const r = result(), t = r.travel, P = pack(), y = yd();
  const allowance = r.irp5.agg.travel;
  return head('Travel deduction (logbook)', `Claim business kilometres against a travel allowance. Cost table for ${P.label}; prescribed rate R${P.travel.prescribedRate.toFixed(2)}/km.`, wizBtn('travel', 'Travel wizard') + helpBtn('logbook')) +
  `<div class="grid g2"><div class="card"><h2>Vehicle & logbook</h2><div class="grid g2">${f({ p: 'y.travel.enabled', label: 'Claim travel expenses this year', type: 'check' })}<div class="field"><label>Travel allowance received <span class="code-tag">3701/3702</span></label><input class="num calc" readonly value="${fmtInput(allowance)}"></div>
    ${f({ p: 'y.travel.vehicleValue', label: 'Vehicle value incl. VAT (cost when acquired)', type: 'money' })}${f({ p: 'y.travel.daysUsed', label: 'Days used for business in year', type: 'int', placeholder: '365' })}
    ${f({ p: 'y.travel.totalKm', label: 'Total kilometres in the year', type: 'int' })}${f({ p: 'y.travel.businessKm', label: 'Business kilometres (logbook)', type: 'int' })}
    ${f({ p: 'y.travel.fuelBorne', label: 'I paid all fuel costs', type: 'check' })}${f({ p: 'y.travel.maintBorne', label: 'I paid all maintenance (no maintenance plan)', type: 'check' })}
    ${f({ p: 'y.travel.method', label: 'Method', type: 'select', options: [['best', 'Best of deemed and actual'], ['deemed', 'Deemed cost (SARS table)'], ['actual', 'Actual cost']] })}</div>
    <h3>Actual costs (optional)</h3><div class="grid g3">${f({ p: 'y.travel.actual.fuel', label: 'Fuel & oil', type: 'money' })}${f({ p: 'y.travel.actual.maintenance', label: 'Repairs & maintenance', type: 'money' })}${f({ p: 'y.travel.actual.insurance', label: 'Insurance', type: 'money' })}${f({ p: 'y.travel.actual.licence', label: 'Licence', type: 'money' })}${f({ p: 'y.travel.actual.interest', label: 'Finance interest', type: 'money' })}${f({ p: 'y.travel.actual.lease', label: 'Lease payments', type: 'money' })}</div></div>
  <div class="card"><h2>Calculation</h2>${t.band ? `${line('Cost band', `up to ${t.band.upTo ? money0(t.band.upTo) : 'no limit'}`)}${line('Fixed cost p.a.', money(t.band.fixed))}${line('Fixed cost per km', 'R ' + E.fmt(t.fixedPerKm, 4))}${line('Fuel per km', y.travel.fuelBorne ? 'R ' + (t.band.fuel / 100).toFixed(3) : '—')}${line('Maintenance per km', y.travel.maintBorne ? 'R ' + (t.band.maint / 100).toFixed(3) : '—')}${line('Rate per km', 'R ' + E.fmt(t.ratePerKm, 3))}${line('Business use', t.businessPct + '%')}${line('Deemed cost claim', money(t.deemed))}${line(`Actual cost claim (incl. wear-and-tear ${money0(t.wearTear)})`, money(t.actual))}${line(`Deduction (${t.method})`, money(t.chosen), 'total')}` : '<div class="muted">Enter vehicle value and kilometres.</div>'}${alerts((t.notes || []).map(x => ({ level: 'info', text: x })))}</div></div>
  <div class="card"><h2>SARS cost table – ${P.label}</h2><table class="t"><thead><tr><th>Vehicle value</th><th class="r">Fixed cost (R p.a.)</th><th class="r">Fuel (c/km)</th><th class="r">Maintenance (c/km)</th></tr></thead><tbody>${P.travel.scale.map((b, i, a) => `<tr ${t.band === b ? 'style="background:var(--accent-bg);font-weight:600"' : ''}><td>${b.upTo === null ? 'Exceeding ' + money0(a[i - 1].upTo) : (i === 0 ? 'Up to ' : `${money0(a[i - 1].upTo + 1)} – `) + money0(b.upTo)}</td><td class="r">${E.fmt(b.fixed)}</td><td class="r">${b.fuel.toFixed(1)}</td><td class="r">${b.maint.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>`;
};

// ---------------- Donations ----------------
SCREENS.donations = () => {
  const r = result(), d = r.donations;
  return head('Donations (s18A)', 'Donations to approved PBOs with a section 18A receipt, limited to 10% of taxable income.', helpBtn('donations')) +
  `<div class="grid g2"><div class="card">${f({ p: 'y.deductions.donations', label: 'Donations per s18A certificates (not via payroll)', type: 'money' })}<br>${f({ p: 'y.deductions.donationsCarryForward', label: 'Excess donations carried forward', type: 'money' })}</div>
  <div class="card">${line('Payroll donations (4030)', money(r.irp5.agg.donation))}${line('Total available', money(d.available))}${line('Deduction allowed (10% limit)', money(d.allowed), 'total')}${line('Carried forward', money(d.carryForward))}</div></div>`;
};

// ---------------- Home office & other ----------------
SCREENS.deductions = () => {
  const y = yd(), H = S.scratch.ho || (S.scratch.ho = { area: 0, total: 0, costs: 0 });
  const hoCalc = H.total ? (E.n(H.area) / E.n(H.total)) * E.n(H.costs) : 0;
  return head('Home office & other deductions', 'Home office, other allowable deductions and assessed losses.', helpBtn('home-office') + `<button class="btn btn-primary" data-act="add" data-p="y.deductions.other" data-tpl="other">+ Other deduction</button>`) +
  `<div class="grid g2"><div class="card"><h2>Home office</h2>${f({ p: 'y.deductions.homeOffice', label: 'Home office expenses claimed', type: 'money' })}
    <h3>Calculator</h3><div class="grid g3">${f({ p: 't.ho.area', label: 'Office m²', type: 'dec' })}${f({ p: 't.ho.total', label: 'Home m²', type: 'dec' })}${f({ p: 't.ho.costs', label: 'Rent/interest, rates, power, cleaning, repairs', type: 'money' })}</div>
    <div class="btn-row" style="margin-top:8px"><span>Claim = ${money(hoCalc)}</span><button class="btn btn-sm" data-act="useho" data-v="${hoCalc}">Use this amount</button></div></div>
  <div class="card"><h2>Losses</h2>${f({ p: 'y.deductions.assessedLossBF', label: 'Assessed loss brought forward', type: 'money' })}</div></div>
  <div class="card"><h2>Other deductions</h2><table class="t"><tbody>${(y.deductions.other || []).map((o, i) => `<tr><td><input data-p="y.deductions.other.${i}.desc" value="${esc(o.desc)}"></td><td style="width:200px"><input class="num" data-num="money" data-p="y.deductions.other.${i}.amount" value="${esc(fmtInput(o.amount))}"></td><td style="width:40px"><button class="btn btn-sm btn-danger" data-act="del" data-p="y.deductions.other" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td class="muted">None.</td></tr>'}</tbody></table></div>`;
};

// ---------------- Provisional ----------------
SCREENS.provisional = () => {
  const r = result(), pv = r.provisional, ba = pv.basicAmount, y = yd();
  return head('Provisional tax (IRP6)', 'Two compulsory payments and an optional top-up, based on estimated taxable income for the year.', wizBtn('p1', 'IRP6 wizard') + helpBtn('provisional-who')) +
  `<div class="grid g2"><div class="card"><h2>Status</h2>${f({ p: 'y.flags.provisional', label: 'Registered provisional taxpayer', type: 'check' })}<br>${f({ p: 'y.provisional.includeAdditionalMedical', label: 'Include additional medical credit (s6B) in estimates', type: 'check', hint: 'Conservative practice is to leave this off.' })}
    <h3>Planned taxable income for the year</h3><div class="calc-line total"><span class="lbl">From this plan</span><span>${money(pv.plannedTI)}</span></div></div>
  <div class="card"><h2>Basic amount</h2><div class="grid g2">${f({ p: 'y.provisional.basicAmount.lastAssessedYear', label: 'Latest assessed tax year', type: 'int' })}${f({ p: 'y.provisional.basicAmount.lastAssessedTI', label: 'Taxable income on that assessment', type: 'money' })}${f({ p: 'y.provisional.basicAmount.lessCapitalGain', label: 'Less taxable capital gain included', type: 'money' })}${f({ p: 'y.provisional.basicAmount.lessLumpSums', label: 'Less lump sums included', type: 'money' })}</div>
    <div class="sum-box">${line('Base', money(ba.base))}${line(`Uplift 8% × ${ba.years} year(s)`, money(ba.uplift))}${line('Basic amount', money(ba.amount), 'total')}</div></div></div>
  <div class="grid g3">${['p1', 'p2', 'p3'].map((k, i) => `<div class="card due-card"><h2>${['1st payment', '2nd payment', '3rd top-up'][i]}</h2>${line('Due', dateLong(k === 'p3' ? pv.p3.dueDate : pv.dueDates[k]))}${line('Amount due', money(pv[k].due), 'total')}${line('Paid', money(pv[k].paid))}<div style="margin-top:8px"><button class="btn btn-sm" data-go="${k}">Open worksheet →</button></div></div>`).join('')}</div>`;
};
function payBlock(k) {
  const r = result(), pv = r.provisional, P6 = yd().provisional[k] || {};
  const due = k === 'p3' ? pv.p3.dueDate : pv.dueDates[k];
  const amt = pv[k].due, rate = E.n(S.settings.interestRate) / 100;
  let note = '';
  if (k !== 'p3' && P6.datePaid && P6.datePaid > due) note = `<div class="alert bad">⚠ Paid after the due date (${dateLong(due)}): 10% late payment penalty of about ${money(0.1 * Math.max(amt, E.n(P6.paid)))} plus interest.</div>`;
  else if (E.n(P6.paid) + 1 < amt) note = `<div class="alert info">Outstanding ${money(amt - E.n(P6.paid))}. ${k === 'p3' ? 'Interest' : 'If paid late: 10% penalty plus interest'} at ${E.n(S.settings.interestRate)}% p.a. ≈ ${money((amt - E.n(P6.paid)) * rate / 12)} per month.</div>`;
  return `<div class="card"><h2>Payment made</h2><div class="grid g3">${f({ p: `y.provisional.${k}.paid`, label: 'Amount paid', type: 'money' })}${f({ p: `y.provisional.${k}.datePaid`, label: 'Date paid', type: 'date' })}${f({ p: `y.provisional.${k}.prn`, label: 'Payment reference (PRN)' })}</div>${note}</div>`;
}
SCREENS.p1 = () => {
  const r = result(), p = r.provisional.p1, pv = r.provisional;
  return head('IRP6 – First period', `Due ${dateLong(pv.dueDates.p1)}. Half of the estimated tax for the year, less PAYE for the first six months.`, wizBtn('p1', 'Period 1 wizard') + helpBtn('irp6-p1') + `<button class="btn btn-primary" data-report="p1">Worksheet PDF</button>`) +
  `<div class="grid g2"><div class="card"><h2>Estimate</h2>${f({ p: 'y.provisional.p1.useBasic', label: `Use the basic amount (${money0(pv.basicAmount.amount)})`, type: 'check' })}<br>
    ${f({ p: 'y.provisional.p1.estimateTI', label: 'Estimated taxable income for the full year', type: 'money', placeholder: fmtInput(pv.plannedTI), hint: 'Leave blank to use the planned figure.' })}<br>
    ${f({ p: 'y.provisional.p1.paye', label: 'PAYE deducted 1 March – 31 August', type: 'money', placeholder: fmtInput(p.paye), hint: 'Leave blank to use half of the annual PAYE.' })}</div>
  <div class="card"><h2>Calculation</h2>${line('Estimated taxable income', money(p.estimateTI))}${line('Tax after rebates and medical credits', money(p.taxOnEstimate))}${line('50% for the first period', money(p.half))}${line('Less PAYE (first six months)', money(-p.paye))}${line('Payment due', money(p.due), 'total')}${p.estimateTI < pv.basicAmount.amount ? '<div class="alert warn">⚠ Estimate is below the basic amount – SARS may ask you to justify it.</div>' : ''}</div></div>` + payBlock('p1');
};
SCREENS.p2 = () => {
  const r = result(), p = r.provisional.p2, pv = r.provisional, pen = pv.penalty;
  return head('IRP6 – Second period', `Due ${dateLong(pv.dueDates.p2)}. Full estimated tax for the year less all PAYE and the first payment.`, wizBtn('p2', 'Period 2 wizard') + helpBtn('irp6-p2') + `<button class="btn btn-primary" data-report="p2">Worksheet PDF</button>`) +
  `<div class="grid g2"><div class="card"><h2>Estimate</h2>${f({ p: 'y.provisional.p2.estimateTI', label: 'Estimated taxable income for the full year', type: 'money', placeholder: fmtInput(pv.plannedTI) })}<br>${f({ p: 'y.provisional.p2.paye', label: 'PAYE for the full year', type: 'money', placeholder: fmtInput(p.paye) })}</div>
  <div class="card"><h2>Calculation</h2>${line('Estimated taxable income', money(p.estimateTI))}${line('Tax after rebates and medical credits', money(p.taxOnEstimate))}${line('Less PAYE for the year', money(-p.paye))}${line('Less first payment', money(-p.p1Paid))}${line('Payment due', money(p.due), 'total')}</div></div>
  <div class="card"><h2>Underestimation penalty test</h2><p class="muted">${esc(pen.rule)}</p>${line('Actual taxable income (from plan)', money(r.taxableIncome))}${line('Safe-harbour taxable income', money(pen.targetTI))}${line('Tax on safe-harbour amount', money(pen.taxOnTarget))}${line('Your 2nd period estimate', money(pen.estimateTI))}${line('Potential penalty (20%)', money(pen.amount), 'total')}
  ${pen.ok ? '<div class="alert tip">✓ No underestimation penalty expected.</div>' : '<div class="alert bad">⚠ Increase the estimate or the payment to avoid the penalty.</div>'}${pen.assumedP2 ? '<div class="muted">Assumes the 2nd payment shown as due is paid in full.</div>' : ''}</div>` + payBlock('p2');
};
SCREENS.p3 = () => {
  const r = result(), p = r.provisional.p3;
  return head('Third (top-up) payment', `Optional. Pay by ${dateLong(p.dueDate)} to avoid interest on tax still owing once actual figures are known.`, helpBtn('irp6-p3') + `<button class="btn btn-primary" data-report="p3">Worksheet PDF</button>`) +
  `<div class="grid g2"><div class="card"><h2>Calculation (actual figures)</h2>${line('Actual taxable income', money(r.taxableIncome))}${line('Normal tax after rebates and credits', money(p.actualNormalTax))}${line('Less PAYE', money(-p.paye))}${line('Less 1st payment', money(-p.p1Paid))}${line(p.p2Assumed ? 'Less 2nd payment (as calculated – not yet recorded)' : 'Less 2nd payment', money(-p.p2Paid))}${line('Top-up recommended', money(p.due), 'total')}</div>${payBlock('p3')}</div>`;
};

// ---------------- Final ----------------
SCREENS.final = () => {
  const r = result();
  const groups = {}; r.lines.forEach(l => (groups[l.section] = groups[l.section] || []).push(l));
  return head('ITR12 & expected assessment', 'Full income tax computation and the figures to capture on the ITR12.', wizBtn('final', 'ITR12 wizard') + `<button class="btn" data-report="itr12">ITR12 schedule</button><button class="btn btn-primary" data-report="computation">Computation PDF</button>`) +
  `<div class="grid g2"><div class="card"><h2>Income tax computation</h2><table class="t"><tbody>
    ${Object.entries(groups).map(([g, ls]) => `<tr class="sub"><td colspan="2">${esc(g)}</td><td></td></tr>` + ls.map(l => `<tr><td>${l.code ? `<span class="code-tag">${l.code}</span> ` : ''}${esc(l.label)}</td><td class="r">${moneyCell(l.amount)}</td><td></td></tr>`).join('')).join('')}
    <tr class="total"><td>Taxable income</td><td class="r">${moneyCell(r.taxableIncome)}</td><td></td></tr></tbody></table></div>
  <div class="card"><h2>Tax</h2>${line('Tax on taxable income', money(r.grossTax))}${line('Less rebates', money(-r.rebates))}${line('Less medical scheme fees credit', money(-r.medical.mtcUsed))}${line('Less additional medical credit', money(-r.medical.additionalUsed))}${line('Less foreign tax credit', money(-r.foreignTaxCredit))}${line('Normal tax', money(r.normalTax), 'total')}${line('Tax on lump sums', money(r.lump.total))}${line('Total liability', money(r.liability), 'total')}${line('Less PAYE', money(-r.paye))}${line('Less tax deducted on lump sums', money(-r.lump.taxDeducted))}${line('Less provisional tax paid', money(-r.provisionalPaid))}${line(r.balance > 0 ? 'Payable to SARS' : 'Refund due', money(Math.abs(r.balance)), 'total')}
  <h3>Carried forward</h3>${line('Retirement contributions', money(r.ra.carryForward))}${line('Donations', money(r.donations.carryForward))}${line('Assessed loss', money(r.assessedLossCF))}${line('Capital loss', money(r.cgt.lossCF))}</div></div>`;
};

// ---------------- What-if ----------------
SCREENS.whatif = () => {
  const W = S.scratch.wi || (S.scratch.wi = { ra: 0, donation: 0, income: 0, bonus: 0, expenses: 0, medical: 0, businessKm: 0, gain: 0 });
  const c = cur(), y = yd(), base = result();
  const y2 = E.clone(y);
  y2.deductions.raContrib = E.n(y2.deductions.raContrib) + E.n(W.ra);
  y2.deductions.donations = E.n(y2.deductions.donations) + E.n(W.donation);
  if (E.n(W.income) || E.n(W.expenses)) y2.business.push({ name: 'What-if', turnover: E.n(W.income), expenses: [{ desc: 'Extra expenses', amount: E.n(W.expenses) }] });
  if (E.n(W.bonus)) y2.irp5.push({ employer: 'What-if', codes: [{ code: '3605', amount: E.n(W.bonus) }] });
  y2.medical.qme = E.n(y2.medical.qme) + E.n(W.medical);
  if (E.n(W.businessKm)) y2.travel.businessKm = E.n(y2.travel.businessKm) + E.n(W.businessKm);
  if (E.n(W.gain)) y2.cgt.items.push({ desc: 'What-if disposal', type: 'shares', proceeds: E.n(W.gain), baseCost: 0 });
  const alt = E.compute(c, y2, pack(), codeList());
  S.scratch.wiResult = { base, alt };
  const row = (l, a, b) => `<tr><td>${l}</td><td class="r">${moneyCell(a)}</td><td class="r">${moneyCell(b)}</td><td class="r">${moneyCell(b - a)}</td></tr>`;
  return head('What-if planner', 'Test planning ideas before year end. Nothing here changes the client file.', `<button class="btn" data-act="wireset">Reset</button><button class="btn btn-primary" data-report="whatif">Comparison PDF</button>`) +
  `<div class="grid g2"><div class="card"><h2>Scenario</h2><div class="grid g2">${f({ p: 't.wi.ra', label: 'Extra RA contribution', type: 'money' })}${f({ p: 't.wi.donation', label: 'Extra s18A donation', type: 'money' })}${f({ p: 't.wi.bonus', label: 'Extra salary / bonus', type: 'money' })}${f({ p: 't.wi.income', label: 'Extra business income', type: 'money' })}${f({ p: 't.wi.expenses', label: 'Extra business expenses', type: 'money' })}${f({ p: 't.wi.medical', label: 'Extra medical expenses', type: 'money' })}${f({ p: 't.wi.businessKm', label: 'Extra business km', type: 'int' })}${f({ p: 't.wi.gain', label: 'Sell shares – capital gain', type: 'money' })}</div></div>
  <div class="card"><h2>Comparison</h2><table class="t"><thead><tr><th></th><th class="r">Current</th><th class="r">Scenario</th><th class="r">Difference</th></tr></thead><tbody>
  ${row('Taxable income', base.taxableIncome, alt.taxableIncome)}${row('Normal tax', base.normalTax, alt.normalTax)}${row('Total liability', base.liability, alt.liability)}${row('Balance on assessment', base.balance, alt.balance)}${row('1st IRP6 payment', base.provisional.p1.due, alt.provisional.p1.due)}${row('2nd IRP6 payment', base.provisional.p2.due, alt.provisional.p2.due)}
  </tbody></table><div class="alert ${alt.liability <= base.liability ? 'tip' : 'warn'}" style="margin-top:12px">${alt.liability <= base.liability ? 'Tax saving' : 'Additional tax'}: <b>${money(Math.abs(alt.liability - base.liability))}</b></div></div></div>`;
};

// ---------------- Reports list ----------------
SCREENS.reports = () => head('Reports', 'Professional reports on your practice letterhead. Preview, save as PDF or print.', `<button class="btn btn-primary" data-report="pack">Full client pack (PDF)</button>`) +
  `<div class="wiz-list">${window.REPORTS.list().map(rp => `<div class="wiz-card" data-report="${rp.id}"><b>${rp.title}</b><span>${rp.desc}</span></div>`).join('')}</div>`;

// ---------------- Clients ----------------
SCREENS.clients = () => {
  const q = (S.scratch.clientFilter || '').toLowerCase();
  const list = S.clients.filter(c => !q || (clientName(c) + ' ' + c.taxRef + ' ' + c.email).toLowerCase().includes(q)).sort((a, b) => clientName(a).localeCompare(clientName(b)));
  return head('Client register', `${S.clients.length} client${S.clients.length === 1 ? '' : 's'} · data stored in ${esc(S.dataDir)}`, `<button class="btn" data-act="importclient">Import</button><button class="btn" data-act="exportall">Export all</button><button class="btn" data-report="register">Register PDF</button><button class="btn btn-primary" data-wizard="newclient">+ New client</button>`) +
  `<div class="card"><input type="text" id="clientFilter" placeholder="Filter by name, tax number or email…" value="${esc(S.scratch.clientFilter || '')}" style="margin-bottom:12px">
  <table class="t"><thead><tr><th>Client</th><th>Tax number</th><th>Provisional</th><th>Status ${S.year}</th><th class="r">Taxable income</th><th class="r">Balance ${S.year}</th><th>Modified</th><th></th></tr></thead><tbody>
  ${list.map(c => { let r = null, y = c.years[S.year]; try { if (y) r = E.compute(c, y, pack(), codeList()); } catch (e) {}
    return `<tr class="clickable" data-open="${c.id}"><td><b>${esc(clientName(c))}</b><div class="muted">${esc(c.email || '')}</div></td><td>${esc(c.taxRef)}</td><td>${y && y.flags.provisional ? '<span class="pill info">Yes</span>' : '—'}</td><td>${esc((y && y.status) || (y ? 'In progress' : 'Not started'))}</td><td class="r">${r ? moneyCell(r.taxableIncome, 0) : '—'}</td><td class="r">${r ? `<span class="${r.balance > 0 ? 'neg' : ''}">${r.balance > 0 ? 'Payable ' : 'Refund '}${E.fmt(Math.abs(r.balance))}</span>` : '—'}</td><td class="muted">${c.modified ? new Date(c.modified).toLocaleDateString('en-ZA') : ''}</td>
    <td><div class="btn-row"><button class="btn btn-sm" data-act="dupclient" data-id="${c.id}">Duplicate</button><button class="btn btn-sm" data-act="exportclient" data-id="${c.id}">Export</button><button class="btn btn-sm btn-danger" data-act="delclient" data-id="${c.id}">Delete</button></div></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No clients yet. Click <b>+ New client</b>.</td></tr>'}</tbody></table></div>`;
};

// ---------------- Tax tables ----------------
SCREENS.taxtables = () => {
  const yr = S.scratch.ttYear || S.year; const P = pack(yr); const ov = S.overrides[yr] ? '<span class="pill warn">Edited</span>' : '<span class="pill ok">SARS defaults</span>';
  const pp = (k) => `x.${yr}.${k}`;
  const tf = (k, label, type) => f({ p: pp(k), label, type: type || 'money', value: k.split('.').reduce((o, x) => o[x], P) });
  return head('Tax tables', 'All rates and limits used by the planner. Edit after a Budget speech; your changes are kept separately and can be reset.', `<select id="ttYear">${YEARS.map(y => `<option ${y === yr ? 'selected' : ''} value="${y}">${PACKS[y].label}</option>`).join('')}</select>${ov}<button class="btn" data-act="ttexport">Export</button><button class="btn" data-act="ttimport">Import</button><button class="btn btn-danger" data-act="ttreset" data-y="${yr}">Reset year</button><button class="btn" data-report="tables">Print tables</button>`) +
  `<div class="grid g2"><div class="card"><h2>Income tax brackets</h2><table class="t"><thead><tr><th class="r">Taxable income above</th><th class="r">Base tax</th><th class="r">Rate %</th></tr></thead><tbody>${P.brackets.map((b, i) => `<tr><td><input class="num" data-num="money" data-p="x.${yr}.brackets.${i}.from" value="${fmtInput(b.from)}"></td><td><input class="num" data-num="money" data-p="x.${yr}.brackets.${i}.base" value="${fmtInput(b.base)}"></td><td><input class="num" data-num="pct" data-p="x.${yr}.brackets.${i}.rate" value="${(b.rate * 100).toFixed(2)}"></td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h2>Rebates, thresholds & credits</h2><div class="grid g3">${tf('rebates.primary', 'Primary rebate')}${tf('rebates.secondary', 'Secondary (65+)')}${tf('rebates.tertiary', 'Tertiary (75+)')}${tf('thresholds.under65', 'Threshold < 65')}${tf('thresholds.age65', 'Threshold 65–74')}${tf('thresholds.age75', 'Threshold 75+')}${tf('medicalCredits.main', 'Medical credit – main')}${tf('medicalCredits.first', '– first dependant')}${tf('medicalCredits.additional', '– each additional')}${tf('interestExemption.under65', 'Interest exemption < 65')}${tf('interestExemption.over65', 'Interest exemption 65+')}${tf('retirement.cap', 'Retirement deduction cap')}${tf('cgt.annualExclusion', 'CGT annual exclusion')}${tf('cgt.primaryResidence', 'Primary residence exclusion')}${tf('cgt.deathExclusion', 'CGT exclusion in year of death')}${tf('travel.prescribedRate', 'Prescribed rate per km', 'dec')}${tf('subsistence.meals', 'Subsistence – meals & incidentals')}${tf('subsistence.incidental', 'Subsistence – incidentals')}</div></div></div>
  <div class="grid g2"><div class="card"><h2>Travel cost scale</h2><table class="t"><thead><tr><th class="r">Value up to</th><th class="r">Fixed R</th><th class="r">Fuel c</th><th class="r">Maint c</th></tr></thead><tbody>${P.travel.scale.map((b, i) => `<tr><td><input class="num" data-num="money" data-p="x.${yr}.travel.scale.${i}.upTo" value="${b.upTo === null ? '' : fmtInput(b.upTo)}" placeholder="no limit"></td><td><input class="num" data-num="money" data-p="x.${yr}.travel.scale.${i}.fixed" value="${fmtInput(b.fixed)}"></td><td><input class="num" data-num="dec" data-p="x.${yr}.travel.scale.${i}.fuel" value="${b.fuel}"></td><td><input class="num" data-num="dec" data-p="x.${yr}.travel.scale.${i}.maint" value="${b.maint}"></td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h2>Retirement lump sum tables</h2>${['lumpSumWithdrawal', 'lumpSumRetirement'].map(k => `<h3>${k === 'lumpSumWithdrawal' ? 'Withdrawal benefits' : 'Retirement / severance benefits'}</h3><table class="t"><tbody>${P[k].map((b, i) => `<tr><td><input class="num" data-num="money" data-p="x.${yr}.${k}.${i}.from" value="${fmtInput(b.from)}"></td><td><input class="num" data-num="money" data-p="x.${yr}.${k}.${i}.base" value="${fmtInput(b.base)}"></td><td><input class="num" data-num="pct" data-p="x.${yr}.${k}.${i}.rate" value="${(b.rate * 100).toFixed(2)}"></td></tr>`).join('')}</tbody></table>`).join('')}
  ${P.notes ? `<div class="alert info">${esc(P.notes)}</div>` : ''}</div></div>`;
};

// ---------------- Help ----------------
SCREENS.help = () => {
  const q = S.scratch.helpQ || '';
  const H = window.IntaxHelp;
  const results = q ? H.search(q, codeList()) : H.ARTICLES.map(a => ({ type: 'article', article: a }));
  const sel = H.ARTICLES.find(a => a.id === S.scratch.helpId) || (results.find(x => x.type === 'article') || {}).article || H.ARTICLES[0];
  return head('Tax help & search', 'Plain-English explanations of South African individual tax. Every topic links to the screen where it is captured.') +
  `<div class="split"><div class="card" style="padding:0"><div style="padding:12px"><input id="helpSearch" type="text" placeholder="Search e.g. 'travel', '3701', 'penalty'…" value="${esc(q)}"></div><div class="help-list">
    ${results.map(x => x.type === 'article' ? `<div class="ha ${x.article === sel ? 'active' : ''}" data-helpid="${x.article.id}"><b>${esc(x.article.title)}</b></div>` : `<div class="ha" data-codego="${x.code.code}"><span class="code-tag">${x.code.code}</span> ${esc(x.code.name)}<div class="muted">${treatLabel(x.code.treat)}</div></div>`).join('') || '<div class="ha muted">No matches.</div>'}</div></div>
  <div class="card help-article"><h2>${esc(sel.title)}</h2>${sel.body}${sel.codes.length ? `<p>Related source codes: ${sel.codes.map(c => `<span class="code-tag">${c}</span>`).join(' ')}</p>` : ''}<div class="btn-row" style="margin-top:14px"><button class="btn btn-primary" data-go="${sel.go}">Go to ${esc((NAV.find(n => n.id === sel.go) || {}).label || sel.go)} →</button></div>
  <p class="muted" style="margin-top:18px">General information only, based on the Income Tax Act and SARS guidance for the tax years 2020–2027. Always confirm against current SARS publications.</p></div></div>`;
};

// ---------------- Settings ----------------
SCREENS.settings = () => {
  const p = S.settings.practice;
  return head('Practice settings', 'Your practice details print on every report.') +
  `<div class="grid g2"><div class="card"><h2>Practice</h2><div class="grid g2">${f({ p: 's.practice.name', label: 'Practice name' })}${f({ p: 's.practice.practitioner', label: 'Tax practitioner' })}${f({ p: 's.practice.prNumber', label: 'SARS practitioner number (PR-…)' })}${f({ p: 's.practice.regBody', label: 'Recognised controlling body', placeholder: 'e.g. SAIT, SAICA, SAIPA' })}${f({ p: 's.practice.phone', label: 'Phone' })}${f({ p: 's.practice.email', label: 'Email' })}${f({ p: 's.practice.website', label: 'Website' })}</div><div style="margin-top:12px">${f({ p: 's.practice.address', label: 'Address', type: 'textarea' })}</div><div style="margin-top:12px">${f({ p: 's.practice.disclaimer', label: 'Report disclaimer', type: 'textarea' })}</div></div>
  <div><div class="card"><h2>Logo</h2>${p.logo ? `<img src="${p.logo}" style="max-height:80px;max-width:260px;display:block;margin-bottom:10px">` : '<p class="muted">No logo – reports use the practice name.</p>'}<div class="btn-row"><button class="btn" data-act="logo">Choose logo…</button>${p.logo ? '<button class="btn btn-danger" data-act="nologo">Remove</button>' : ''}</div></div>
  <div class="card"><h2>Calculation settings</h2>${f({ p: 's.interestRate', label: 'SARS interest rate on underpayments (% p.a.)', type: 'dec', hint: 'Used to estimate interest on late payments. Check the current prescribed rate on the SARS website.' })}<br>${f({ p: 's.reportAccent', label: 'Report accent colour', placeholder: '#0b7a75' })}</div>
  <div class="card"><h2>Data & backups</h2><p class="muted">Data folder: ${esc(S.dataDir)}<br>A backup is made every day you open the app (last 60 kept).</p><div class="btn-row"><button class="btn" data-act="opendata">Open data folder</button><button class="btn" data-act="restore">Restore a backup…</button><button class="btn" data-act="exportall">Export everything</button></div><p class="muted">Intax Planner ${esc(S.version)}</p></div></div></div>`;
};

window.SCREENS = SCREENS; window.NAV = NAV; window.NEEDS_CLIENT = NEEDS_CLIENT; window.FLAG_ROUTE = FLAG_ROUTE; window.CHECK_TILES = CHECK_TILES; window.treatLabel = treatLabel;
