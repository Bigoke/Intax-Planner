// Intax Planner 1.1 – additional reports.
'use strict';
(function () {
const H = REPORTS.h, X = REPORTS.EXTRA;
const { letterhead, titleBlock, footer, doc, tr, sect, m2 } = H;
const today = () => new Date().toISOString().slice(0, 10);
const wrap = (title, body, opts = {}) => ({ title, html: doc(title, letterhead() + body + (opts.sign ? `<div class="sign"><div>${opts.sign[0]}</div><div>${opts.sign[1]}</div></div>` : '') + (opts.letter ? '' : footer())), fileName: opts.fileName });
const need = () => { if (!cur()) throw new Error('Select a client first.'); return { c: cur(), y: yd(), r: result(), P: pack() }; };
const P_ = () => S.settings.practice, B_ = () => S.settings.billing;
const safe = (c, yr) => { try { return c.years[yr] ? E.compute(c, c.years[yr], pack(yr), codeList(), { interestRate: S.settings.interestRate }) : null; } catch (e) { return null; } };
const addr = (c) => c.address ? esc(c.address).replace(/\n/g, '<br>') : '';

const NEW = [
  { id: 'comparative', cat: 'Client reports', title: 'Comparative computation', desc: 'This year against last year, line by line, with differences.' },
  { id: 'brackets', cat: 'Client reports', title: 'Tax rate analysis', desc: 'Tax per bracket, marginal and effective rates, room before the next bracket.' },
  { id: 'savings', cat: 'Planning', title: 'Retirement & savings planning', desc: 'Unused RA, TFSA, donation and interest-exemption room with tax saved.' },
  { id: 'companycar', cat: 'Client reports', title: 'Company car benefit schedule', desc: 'Fringe benefit value and logbook reduction (para 7).' },
  { id: 'irp6capture', cat: 'Provisional tax', title: 'IRP6 capture sheet', desc: 'Field-by-field figures for both IRP6 returns on eFiling.' },
  { id: 'assessment', cat: 'Client reports', title: 'Assessment reconciliation (ITA34)', desc: 'Plan vs SARS assessment, differences and objection deadline.' },
  { id: 'docrequest', cat: 'Engagement', title: 'Document request letter', desc: 'Letter to the client listing outstanding documents.' },
  { id: 'engagement', cat: 'Engagement', title: 'Engagement letter', desc: 'Scope, responsibilities and fees for tax planning and returns.' },
  { id: 'invoice', cat: 'Engagement', title: 'Invoice', desc: 'Open from Time & fees to view a specific invoice.', hidden: true },
  { id: 'auditlog', cat: 'Engagement', title: 'Change log (audit trail)', desc: 'All changes to this client with dates and values.' },
  { id: 'deadlines', cat: 'Practice', title: 'Deadlines & payments', desc: 'Overdue and upcoming payments and deadlines for all clients.' },
  { id: 'wip', cat: 'Practice', title: 'Work in progress', desc: 'Status, documents, balances and unbilled fees per client.' },
  { id: 'feeregister', cat: 'Practice', title: 'Fee register', desc: 'Invoices issued, paid and unpaid, plus unbilled work.' },
  { id: 'provsummary', cat: 'Practice', title: 'Provisional tax summary – all clients', desc: '1st, 2nd and top-up amounts for every provisional taxpayer.' }
];
REPORTS.LIST.push(...NEW);
const _list = REPORTS.list;
REPORTS.list = () => _list().filter(r => !r.hidden);

// ---------- Comparative computation ----------
X.comparative = () => {
  const { c, r, P } = need(); const prevYr = S.year - 1, rp = safe(c, prevYr);
  if (!rp) throw new Error(`No ${prevYr} tax year captured for this client.`);
  const key = (l) => l.section + '|' + l.label;
  const keys = []; [...rp.lines, ...r.lines].forEach(l => { if (l.kind !== 'note' && !keys.includes(key(l))) keys.push(key(l)); });
  const val = (res, k) => res.lines.filter(l => key(l) === k).reduce((a, l) => a + l.amount, 0);
  let rows = '', lastSec = '';
  keys.forEach(k => { const [sec, lab] = k.split('|'); if (sec !== lastSec) { rows += `<tr class="sec"><td colspan="4">${esc(sec)}</td></tr>`; lastSec = sec; } const a = val(r, k), b = val(rp, k); rows += `<tr><td>${esc(lab)}</td><td class="r">${m2(a)}</td><td class="r">${m2(b)}</td><td class="r">${m2(a - b)}</td></tr>`; });
  const row = (l, a, b, cls) => `<tr class="${cls || ''}"><td>${l}</td><td class="r">${m2(a)}</td><td class="r">${m2(b)}</td><td class="r">${m2(a - b)}</td></tr>`;
  return wrap('Comparative computation', titleBlock('Comparative Income Tax Computation', `${S.year} compared with ${prevYr}`, c, P) +
    `<table><tr><th>R</th><th class="r">${S.year}</th><th class="r">${prevYr}</th><th class="r">Change</th></tr>${rows}${row('Taxable income', r.taxableIncome, rp.taxableIncome, 'tot')}${row('Normal tax after rebates and credits', r.normalTax, rp.normalTax)}${row('Total liability', r.liability, rp.liability, 'sub')}${row('PAYE', r.paye, rp.paye)}${row('Provisional tax paid', r.provisionalPaid, rp.provisionalPaid)}${row('Balance payable / (refund)', r.balance, rp.balance, 'tot')}${row('Effective rate (%)', r.effectiveRate, rp.effectiveRate)}</table>`);
};

// ---------- Tax rate analysis ----------
function bracketsBody(c, r, P) {
  const nextB = r.brackets.find(b => b.from > r.taxableIncome);
  return titleBlock('Tax Rate Analysis', 'How the tax on taxable income is built up', c, P) +
  `<div class="kp"><div><b>Taxable income</b><span>R ${E.fmt(r.taxableIncome)}</span></div><div><b>Marginal rate</b><span>${Math.round(r.marginalRate * 100)}%</span></div><div><b>Effective rate</b><span>${r.effectiveRate}%</span></div><div><b>Room before next bracket</b><span>${nextB ? 'R ' + E.fmt(nextB.from - r.taxableIncome) : '—'}</span></div></div>
  <div style="margin:6px 0 12px">${svgBracketBar(r.brackets, { width: 640 })}</div>
  <table><tr><th>Taxable income band</th><th class="r">Rate</th><th class="r">Income in band</th><th class="r">Tax</th></tr>${r.brackets.map(b => `<tr style="${b.amount ? '' : 'color:#a0aab8'}"><td>R ${E.fmt(b.from)} – ${b.to ? 'R ' + E.fmt(b.to) : 'and above'}</td><td class="r">${Math.round(b.rate * 100)}%</td><td class="r">${m2(b.amount)}</td><td class="r">${m2(b.tax)}</td></tr>`).join('')}
  ${tr('Tax before rebates', r.grossTax, 'sub')}${tr('Less rebates', -r.rebates)}${tr('Less medical credits', -(r.medical.mtcUsed + r.medical.additionalUsed))}${tr('Less foreign tax credits', -r.foreignTaxCredit)}${tr('Normal tax', r.normalTax, 'tot')}</table>
  <div class="box">Every additional R1 000 of taxable income costs about <b>R ${E.fmt(1000 * r.marginalRate)}</b> in tax; every R1 000 of extra deduction (e.g. a retirement annuity contribution) saves the same amount.</div>`;
}
X.brackets = () => { const { c, r, P } = need(); return wrap('Tax rate analysis', bracketsBody(c, r, P)); };

// ---------- Retirement & savings planning ----------
function savingsBody(c, r, P, y) {
  const raRoom = Math.max(0, Math.min(r.ra.cap, r.ra.limitPct) - r.ra.allowed);
  const donRoom = Math.max(0, P.donationsPct * (r.taxableIncome + r.donations.allowed) - r.donations.allowed);
  const intRoom = Math.max(0, r.interest.limit - r.interest.exempt);
  const save = (amt) => amt * r.marginalRate;
  return titleBlock('Retirement & Savings Planning', `Opportunities before ${dateLong(P.end)}`, c, P) +
  `<table><tr><th>Opportunity</th><th class="r">Unused room</th><th class="r">Tax saving / benefit</th></tr>
  <tr><td><b>Retirement annuity contribution (s11F)</b><br><span class="muted">Limit ${Math.round(P.retirement.pct * 100)}% of R ${E.fmt(Math.max(r.ra.remuneration, r.taxableIncome))}, capped at R ${E.fmt(r.ra.cap)}. Used: R ${E.fmt(r.ra.allowed)}.</span></td><td class="r">${m2(raRoom)}</td><td class="r">${m2(save(raRoom))}</td></tr>
  <tr><td><b>Tax-free savings account</b><br><span class="muted">Annual limit R ${E.fmt(r.tfsa.annualLimit)}, lifetime R ${E.fmt(r.tfsa.lifetimeLimit)}. Growth is tax-free.</span></td><td class="r">${m2(Math.min(r.tfsa.annualRoom, r.tfsa.lifetimeRoom))}</td><td class="r muted">Future tax-free growth</td></tr>
  <tr><td><b>Donations to s18A PBOs</b><br><span class="muted">Deductible up to 10% of taxable income.</span></td><td class="r">${m2(donRoom)}</td><td class="r">${m2(save(donRoom))}</td></tr>
  <tr><td><b>Interest exemption</b><br><span class="muted">Local interest exempt up to R ${E.fmt(r.interest.limit)}; used R ${E.fmt(r.interest.exempt)}.</span></td><td class="r">${m2(intRoom)}</td><td class="r muted">Interest earned tax-free</td></tr>
  <tr><td><b>CGT annual exclusion</b><br><span class="muted">R ${E.fmt(P.cgt.annualExclusion)} of gains a year are tax-free; consider realising gains before year end.</span></td><td class="r">${m2(Math.max(0, P.cgt.annualExclusion - Math.max(0, r.cgt.aggregate)))}</td><td class="r">${m2(Math.max(0, P.cgt.annualExclusion - Math.max(0, r.cgt.aggregate)) * P.cgt.inclusionRate * r.marginalRate)}</td></tr>
  </table>
  <h2>Retirement contribution summary</h2><table>${tr('Contributions for the year (payroll, employer and RA)', r.ra.contributions)}${tr('Carried forward from earlier years', r.ra.carriedIn)}${tr('Deduction allowed', r.ra.allowed, 'sub')}${tr('Carried forward to next year', r.ra.carryForward)}</table>
  <div class="box">Contributions above the limit are not lost: they carry forward and can reduce tax on retirement lump sums or annuities later.</div>`;
}
X.savings = () => { const { c, r, P, y } = need(); return wrap('Retirement & savings planning', savingsBody(c, r, P, y)); };
REPORTS.packExtra = (c, r, P, y) => [bracketsBody(c, r, P), savingsBody(c, r, P, y)];

// ---------- Company car ----------
X.companycar = () => {
  const { c, r, P, y } = need(), cc = r.companyCar, I = y.companyCar;
  if (!cc.enabled) throw new Error('Turn on the company car calculation first (Company car benefit screen).');
  return wrap('Company car benefit schedule', titleBlock('Company Car Fringe Benefit', 'Seventh Schedule, paragraph 7', c, P) +
    `<table>${tr('Determined value', I.determinedValue)}${tr(`Monthly rate (${(cc.rate * 100).toFixed(2)}%) × ${cc.months} months`, cc.calculated)}${tr(cc.fromIrp5 ? 'Value per IRP5 (3802/3816)' : 'Value included in income', cc.value, 'sub')}${sect('Reduction on assessment (logbook)')}${tr(`Business use: ${E.fmt(I.businessKm)} of ${E.fmt(I.totalKm)} km`, -cc.businessPart)}${tr('Private fuel borne by employee', -cc.fuelPart)}${tr('Private maintenance borne by employee', -cc.maintPart)}${tr('Insurance and licence borne by employee', -cc.otherPart)}${tr('Total reduction', -cc.reduction, 'sub')}${tr('Taxable fringe benefit', cc.value - cc.reduction, 'tot')}</table>`);
};

// ---------- IRP6 capture sheet ----------
X.irp6capture = () => {
  const { c, r, P, y } = need(), pv = r.provisional;
  const block = (title, rows) => `<h2>${title}</h2><table><tr><th>IRP6 field</th><th class="r">Amount (R)</th></tr>${rows.map(([l, v]) => tr(l, v)).join('')}</table>`;
  return wrap('IRP6 capture sheet', titleBlock('IRP6 Capture Sheet', 'Figures to enter on the provisional tax returns', c, P) +
    block(`First period – due ${dateLong(pv.dueDates.p1)}`, [['Estimated taxable income for the year', pv.p1.estimateTI], ['Basic amount', pv.basicAmount.amount], ['Normal tax on estimate (after rebates)', E.normalTax(pv.p1.estimateTI, r.age, P)], ['Medical scheme fees tax credit', r.medical.mtc], ['Employees’ tax deducted for the period', pv.p1.paye], ['Foreign tax credits', E.n(y.foreign.foreignTaxCredit)], ['Amount payable', pv.p1.due]]) +
    block(`Second period – due ${dateLong(pv.dueDates.p2)}`, [['Estimated taxable income for the year', pv.p2.estimateTI], ['Normal tax on estimate (after rebates)', E.normalTax(pv.p2.estimateTI, r.age, P)], ['Medical scheme fees tax credit', r.medical.mtc], ['Employees’ tax for the year', pv.p2.paye], ['First period payment', pv.p2.p1Paid], ['Foreign tax credits', E.n(y.foreign.foreignTaxCredit)], ['Amount payable', pv.p2.due]]) +
    `<div class="box">Taxpayer details: ${esc(clientName(c))} · tax reference ${esc(c.taxRef || '—')}. Use the PRN generated on eFiling as the payment reference.</div>`);
};

// ---------- Assessment reconciliation ----------
X.assessment = () => {
  const { c, r, P, y } = need(), rc = r.recon, A = y.assessment;
  if (!rc.entered) throw new Error('Capture the SARS assessment figures first.');
  return wrap('Assessment reconciliation', titleBlock('Assessment Reconciliation (ITA34)', `Assessment ${A.date ? 'dated ' + dateLong(A.date) : ''}${A.reference ? ' · ref ' + esc(A.reference) : ''}`, c, P) +
    `<table><tr><th></th><th class="r">Per plan</th><th class="r">Per SARS</th><th class="r">Difference</th></tr>${rc.rows.map(x => `<tr><td>${x.label}</td><td class="r">${m2(x.plan)}</td><td class="r">${x.sars === null ? '—' : m2(x.sars)}</td><td class="r">${x.diff === null ? '' : m2(x.diff)}</td></tr>`).join('')}</table>
    <table style="margin-top:10px">${tr('Interest charged by SARS', rc.interest)}${tr('Penalties charged by SARS', rc.penalties)}</table>
    <div class="box ${rc.material ? 'warn' : ''}">${rc.material ? 'The assessment differs materially from the plan. Request reasons (if needed) and consider lodging a Notice of Objection (NOO) before the deadline.' : 'The assessment agrees with the plan.'}<br>Objection deadline (80 business days from the assessment date): <b>${rc.objectionDeadline ? dateLong(rc.objectionDeadline) : '—'}</b>${A.paymentDue ? `<br>Payment due date: <b>${dateLong(A.paymentDue)}</b>` : ''}</div>${A.notes ? `<h2>Notes</h2><p>${esc(A.notes).replace(/\n/g, '<br>')}</p>` : ''}`);
};

// ---------- Document request letter ----------
X.docrequest = () => {
  const { c, y, P } = need(), list = window.docList(c, y), out = list.filter(d => !d.received);
  return wrap('Document request', `<p style="margin-top:4px">${dateLong(today())}</p><p><b>${esc(clientName(c))}</b>${c.address ? '<br>' + addr(c) : ''}${c.email ? '<br>' + esc(c.email) : ''}</p>
    <h1 style="font-size:14pt;color:#0d2340;margin:16px 0 6px">Documents required – ${esc(P.label)}</h1><p>Dear ${esc(c.firstName || clientName(c))},</p>
    <p>To finalise your ${y.flags.provisional ? 'provisional tax estimates and ' : ''}income tax return for the ${esc(P.label)} tax year, please send us the documents below${out.length ? '' : ' (we have received everything – thank you)'}.</p>
    ${out.length ? `<table><tr><th style="width:24px"></th><th>Document</th><th>Needed for</th></tr>${out.map(d => `<tr><td>☐</td><td>${esc(d.label)}</td><td class="muted">${esc(d.why)}</td></tr>`).join('')}</table>` : ''}
    ${list.some(d => d.received) ? `<h2>Already received</h2><ul>${list.filter(d => d.received).map(d => `<li>${esc(d.label)}${d.date ? ' – ' + dateLong(d.date) : ''}</li>`).join('')}</ul>` : ''}
    <p>${y.flags.provisional ? `Please note the provisional tax due dates: ${dateLong(result().provisional.dueDates.p1)} and ${dateLong(result().provisional.dueDates.p2)}.` : ''} Missing information can lead to SARS adjustments, penalties and interest.</p>
    <p>Kind regards,<br><br><b>${esc(P_().practitioner || '')}</b><br>${esc(P_().name || '')}</p>`, { letter: true, fileName: `Document request - ${clientName(c)} - ${S.year}.pdf` });
};

// ---------- Engagement letter ----------
X.engagement = () => {
  const { c, y, P } = need(), p = P_(), B = B_();
  return wrap('Engagement letter', `<p style="margin-top:4px">${dateLong(today())}</p><p><b>${esc(clientName(c))}</b>${c.address ? '<br>' + addr(c) : ''}<br>Tax reference: ${esc(c.taxRef || '—')}</p>
  <h1 style="font-size:14pt;color:#0d2340;margin:16px 0 6px">Engagement letter – personal income tax services</h1><p>Dear ${esc(c.firstName || clientName(c))},</p>
  <p>Thank you for appointing ${esc(p.name || 'our practice')}. This letter sets out the services we will provide and the responsibilities of each party.</p>
  <h2>1. Scope of services – ${esc(P.label)} tax year</h2><ul>${y.flags.provisional ? '<li>Tax planning and calculation of the first and second provisional tax (IRP6) payments, and the voluntary top-up payment where needed.</li><li>Submission of the IRP6 returns on SARS eFiling.</li>' : ''}<li>Preparation and submission of the annual income tax return (ITR12).</li><li>Review of the SARS assessment (ITA34) against our computation and advice on objections where appropriate.</li><li>Routine correspondence with SARS relating to these returns.</li></ul>
  <p>Unless agreed separately in writing, the engagement excludes SARS audits and verifications beyond routine supporting documents, dispute resolution after objection, estate planning and bookkeeping.</p>
  <h2>2. Your responsibilities</h2><ul><li>Provide complete and accurate information and supporting documents in time to meet SARS deadlines.</li><li>Tell us promptly about changes in your income or circumstances during the year.</li><li>Keep records that support your returns for at least five years from the date the return is submitted, as required by the Tax Administration Act.</li><li>Review the returns we prepare before submission. You remain responsible for the accuracy of your tax affairs.</li></ul>
  <h2>3. Our responsibilities</h2><ul><li>Perform the services with due care, as a registered tax practitioner${p.prNumber ? ' (' + esc(p.prNumber) + (p.regBody ? ', ' + esc(p.regBody) : '') + ')' : ''}.</li><li>Keep your information confidential and process personal information in line with the Protection of Personal Information Act (POPIA).</li><li>We do not audit or independently verify the information you give us.</li></ul>
  <h2>4. Fees</h2><p>${esc(B.engagementFee || 'Our fees are based on the time spent at our standard hourly rates.')} Invoices are payable within ${E.n(B.paymentTerms) || 30} days.${B.vatRegistered ? ' VAT is charged at the standard rate.' : ''}</p>
  <h2>5. Limitations</h2><p>Provisional tax amounts are estimates based on information available at the time. SARS determines the final liability on assessment. We are not responsible for penalties or interest caused by late or incomplete information.</p>
  <p>Please sign and return a copy of this letter to confirm your acceptance.</p><p>Yours sincerely,<br><br><b>${esc(p.practitioner || '')}</b><br>${esc(p.name || '')}</p>`, { letter: true, sign: [`For ${esc(p.name || 'the practice')}`, `Accepted: ${esc(clientName(c))} – date`], fileName: `Engagement letter - ${clientName(c)} - ${S.year}.pdf` });
};

// ---------- Invoice ----------
X.invoice = (no) => {
  const c = cur(); if (!c) throw new Error('Select a client first.');
  const inv = (c.invoices || []).find(i => i.no === no) || (c.invoices || []).slice(-1)[0];
  if (!inv) throw new Error('No invoice found – create one on the Time & fees screen.');
  const p = P_(), B = B_();
  const html = `<div class="tb"><div><h1>${inv.vatRate ? 'Tax invoice' : 'Invoice'} ${esc(inv.no)}</h1><div class="st">${inv.paid ? 'PAID' : 'Due ' + dateLong(inv.dueDate)}</div></div><div style="text-align:right;font-size:9pt">Date: <b>${dateLong(inv.date)}</b>${inv.vatRate && B.vatNumber ? `<br>VAT no: <b>${esc(B.vatNumber)}</b>` : ''}</div></div>
  <div class="two"><div class="box"><b>Bill to</b><br>${esc(clientName(c))}${c.address ? '<br>' + addr(c) : ''}${c.taxRef ? '<br>Tax ref: ' + esc(c.taxRef) : ''}${c.vatNumber ? '<br>VAT no: ' + esc(c.vatNumber) : ''}</div><div class="box"><b>Payment details</b><br>${B.bankName ? `${esc(B.bankName)}<br>Account: ${esc(B.accountName)}<br>Number: ${esc(B.accountNumber)}${B.branchCode ? '<br>Branch: ' + esc(B.branchCode) : ''}` : '<span class="muted">Add bank details in Practice settings.</span>'}<br>Reference: <b>${esc(inv.no)}</b></div></div>
  <table style="margin-top:10px"><tr><th style="width:90px">Date</th><th>Description</th><th class="r">Hours</th><th class="r">Rate</th><th class="r">Amount (R)</th></tr>${inv.items.map(i => `<tr><td>${esc(i.date || '')}</td><td>${esc(i.desc)}</td><td class="r">${i.hours || ''}</td><td class="r">${i.rate && i.hours ? m2(i.rate) : ''}</td><td class="r">${m2(i.amount)}</td></tr>`).join('')}
  ${inv.vatRate ? tr('Subtotal (excl. VAT)', inv.subtotal, 'sub').replace('<td>', '<td colspan="4">') + tr(`VAT at ${inv.vatRate}%`, inv.vat).replace('<td>', '<td colspan="4">') : ''}${tr('Total due', inv.total, 'tot').replace('<td>', '<td colspan="4">')}</table>
  <p class="muted" style="margin-top:12px">Payment terms: ${E.n(B.paymentTerms) || 30} days. Thank you for your business.</p>`;
  return { title: 'Invoice ' + inv.no, html: doc('Invoice ' + inv.no, letterhead() + html), fileName: `Invoice ${inv.no} - ${clientName(c)}.pdf`.replace(/[\\/:*?"<>|]/g, '') };
};

// ---------- Change log ----------
X.auditlog = () => {
  const { c, P } = need();
  const show = (v) => typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'number' ? E.fmt(v, Number.isInteger(v) ? 0 : 2) : esc(v ?? '');
  const log = (c.log || []).slice().reverse().slice(0, 1500);
  return wrap('Change log', titleBlock('Change Log (Audit Trail)', `${log.length} recorded change(s)`, c, null) + `<table><tr><th>When</th><th>Year</th><th>Field</th><th class="r">From</th><th class="r">To</th></tr>${log.map(l => `<tr><td style="white-space:nowrap">${new Date(l.t).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${l.year || ''}</td><td>${esc(l.label)}</td><td class="r">${show(l.from)}</td><td class="r">${show(l.to)}</td></tr>`).join('') || '<tr><td colspan="5">No changes recorded.</td></tr>'}</table>`);
};

// ---------- Practice reports ----------
X.deadlines = () => {
  const list = allDeadlines().filter(d => !d.done && (d.overdue || d.days <= 120));
  const sumOpen = list.reduce((a, d) => a + Math.max(0, (d.amount || 0) - (d.paid || 0)), 0);
  return wrap('Deadlines', titleBlock('Deadlines & Payments', `Overdue and next 120 days · ${list.length} item(s) · R ${E.fmt(sumOpen)} outstanding`, null, null) +
    `<table><tr><th>Date</th><th>Client</th><th>Tax no.</th><th>Item</th><th class="r">Amount</th><th>Status</th></tr>${list.map(d => `<tr><td style="white-space:nowrap">${dateLong(d.date)}</td><td>${esc(clientName(d.c))}</td><td>${esc(d.c.taxRef || '')}</td><td>${esc(d.label)} (${d.yr})</td><td class="r">${d.amount === null ? '' : m2(Math.max(0, d.amount - (d.paid || 0)))}</td><td>${d.overdue ? '<b style="color:#b42318">Overdue</b>' : d.days + ' days'}</td></tr>`).join('') || '<tr><td colspan="6">Nothing due.</td></tr>'}</table>`, { fileName: `Deadlines ${today()}.pdf` });
};
X.wip = () => {
  const rows = S.clients.slice().sort((a, b) => clientName(a).localeCompare(clientName(b))).map(c => {
    const y = c.years[S.year], r = safe(c, S.year), docs = y ? window.docList(c, y) : [];
    return `<tr><td>${esc(clientName(c))}</td><td>${esc((y && y.status) || 'Not started')}${y && y.locked ? ' 🔒' : ''}</td><td class="r">${docs.filter(d => d.received).length}/${docs.length}</td><td class="r">${r ? m2(r.taxableIncome) : ''}</td><td class="r">${r ? m2(r.balance) : ''}</td><td class="r">${m2((c.fees || []).filter(f => !f.invoiceNo).reduce((a, f) => a + E.n(f.amount), 0))}</td></tr>`;
  }).join('');
  return wrap('Work in progress', titleBlock('Work in Progress', `Tax year ${pack().label}`, null, null) + `<table><tr><th>Client</th><th>Status</th><th class="r">Docs</th><th class="r">Taxable income</th><th class="r">Balance</th><th class="r">Unbilled</th></tr>${rows}</table>`, { fileName: `Work in progress ${S.year}.pdf` });
};
X.feeregister = () => {
  const inv = S.clients.flatMap(c => (c.invoices || []).map(i => ({ c, i }))).sort((a, b) => a.i.date.localeCompare(b.i.date));
  const unb = S.clients.map(c => ({ c, amt: (c.fees || []).filter(f => !f.invoiceNo).reduce((a, f) => a + E.n(f.amount), 0) })).filter(x => x.amt);
  const t = (l) => l.reduce((a, x) => a + x.i.total, 0);
  return wrap('Fee register', titleBlock('Fee Register', `As at ${dateLong(today())}`, null, null) + `<h2>Invoices</h2><table><tr><th>Invoice</th><th>Date</th><th>Client</th><th class="r">Excl. VAT</th><th class="r">VAT</th><th class="r">Total</th><th>Status</th></tr>${inv.map(x => `<tr><td>${esc(x.i.no)}</td><td>${dateLong(x.i.date)}</td><td>${esc(clientName(x.c))}</td><td class="r">${m2(x.i.subtotal)}</td><td class="r">${m2(x.i.vat)}</td><td class="r">${m2(x.i.total)}</td><td>${x.i.paid ? 'Paid' : 'Unpaid'}</td></tr>`).join('')}${tr('Total invoiced', t(inv), 'sub').replace('<td>', '<td colspan="5">').replace('</tr>', '<td></td></tr>')}</table>
  <table style="margin-top:8px">${tr('Paid', t(inv.filter(x => x.i.paid)))}${tr('Outstanding', t(inv.filter(x => !x.i.paid)), 'tot')}</table>
  <h2>Unbilled work</h2><table>${unb.map(x => tr(esc(clientName(x.c)), x.amt)).join('') || '<tr><td>None</td></tr>'}</table>`, { fileName: `Fee register ${today()}.pdf` });
};
X.provsummary = () => {
  const rows = S.clients.filter(c => c.years[S.year] && c.years[S.year].flags.provisional).sort((a, b) => clientName(a).localeCompare(clientName(b))).map(c => { const r = safe(c, S.year), p = r.provisional; return { c, r, p }; });
  const tot = (f) => rows.reduce((a, x) => a + f(x), 0);
  return wrap('Provisional tax summary', titleBlock('Provisional Tax Summary', `All provisional taxpayers · ${pack().label}`, null, null) +
    `<table><tr><th>Client</th><th>Tax no.</th><th class="r">Estimate</th><th class="r">1st due</th><th class="r">1st paid</th><th class="r">2nd due</th><th class="r">2nd paid</th><th class="r">Top-up</th></tr>${rows.map(x => `<tr><td>${esc(clientName(x.c))}</td><td>${esc(x.c.taxRef || '')}</td><td class="r">${m2(x.p.p2.estimateTI)}</td><td class="r">${m2(x.p.p1.due)}</td><td class="r">${m2(x.p.p1.paid)}</td><td class="r">${m2(x.p.p2.due)}</td><td class="r">${m2(x.p.p2.paid)}</td><td class="r">${m2(x.p.p3.due)}</td></tr>`).join('')}
    <tr class="tot"><td colspan="3">Totals (${rows.length} clients)</td><td class="r">${m2(tot(x => x.p.p1.due))}</td><td class="r">${m2(tot(x => x.p.p1.paid))}</td><td class="r">${m2(tot(x => x.p.p2.due))}</td><td class="r">${m2(tot(x => x.p.p2.paid))}</td><td class="r">${m2(tot(x => x.p.p3.due))}</td></tr></table>`, { fileName: `Provisional tax summary ${S.year}.pdf` });
};
})();
