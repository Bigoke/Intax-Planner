// Intax Planner – guided wizards. Fields are bound live (data-p), so the summary steps always show current results.
'use strict';

const sumLine = (l, v, cls) => `<div class="calc-line ${cls || ''}"><span class="lbl">${l}</span><span>${v}</span></div>`;
const WIZ = {};

function irpField(code, label) { return f({ p: `t.irp.codes.${code}`, label: label || (codeList().find(c => c.code === code) || {}).name, type: 'money', code }); }

WIZ.newclient = {
  title: 'New client', desc: 'Create a client file and set up the tax year.',
  start() { S.scratch.nc = { firstName: '', surname: '', taxRef: '', idNumber: '', dob: '', email: '', phone: '', provisional: false, year: S.year }; },
  steps: [
    { title: 'Who is the taxpayer?', intro: 'Basic details for the client file and the report headers.', html: () => `<div class="grid g2">${f({ p: 't.nc.firstName', label: 'First names' })}${f({ p: 't.nc.surname', label: 'Surname' })}${f({ p: 't.nc.taxRef', label: 'Income tax reference number' })}${f({ p: 't.nc.idNumber', label: 'ID / passport number' })}${f({ p: 't.nc.dob', label: 'Date of birth', type: 'date', hint: 'Needed for age rebates (65+ and 75+).' })}</div>`, valid: () => (S.scratch.nc.firstName || S.scratch.nc.surname) ? true : 'Enter at least a name.' },
    { title: 'Contact details', intro: 'Optional – shown on reports and the client register.', html: () => `<div class="grid g2">${f({ p: 't.nc.email', label: 'Email' })}${f({ p: 't.nc.phone', label: 'Phone' })}</div>` },
    { title: 'Tax year', intro: 'Which year are you planning? You can switch years at any time from the top bar.', html: () => `<div class="grid g2">${f({ p: 't.nc.year', label: 'Tax year', type: 'select', num: true, options: YEARS.slice().reverse().map(y => [y, PACKS[y].label]) })}${f({ p: 't.nc.provisional', label: 'Registered provisional taxpayer', type: 'check', hint: 'Has business, rental, investment or other non-PAYE income.' })}</div>` }
  ],
  finish() {
    const n = S.scratch.nc, c = E.emptyClient();
    Object.assign(c, { firstName: n.firstName, surname: n.surname, taxRef: n.taxRef, idNumber: n.idNumber, dob: n.dob, email: n.email, phone: n.phone });
    S.clients.push(c); S.clientId = c.id; S.year = Number(n.year) || S.year;
    yd().flags.provisional = !!n.provisional;
    App.afterClientChange();
    return 'checklist';
  }
};

WIZ.checklist = {
  title: 'Guided set-up', desc: 'Answer a few questions; the right wizards follow automatically.',
  steps: [
    { title: 'What income did the taxpayer receive?', intro: 'Click every source that applies for ' + '<b>the selected tax year</b>.', html: () => tilesHtml(['employment', 'business', 'rental', 'investments', 'cgt', 'lumpSums', 'foreign', 'other']) },
    { title: 'Which deductions and credits apply?', intro: 'Deduction finder: tick everything the taxpayer paid or received.', html: () => tilesHtml(['retirement', 'medical', 'travel', 'donations', 'homeOffice', 'provisional']) + `<div class="alert tip" style="margin-top:14px">💡 Commonly missed: retirement annuity certificates (IT3(f)), out-of-pocket medical costs, the travel logbook, s18A donation receipts and home office costs for commission earners.</div>` },
    { title: 'Ready', intro: 'The following wizards will run next. You can skip any of them.', html: () => { const q = WIZ.checklist.queue(); return q.length ? `<ol>${q.map(k => `<li>${WIZ[k].title}</li>`).join('')}</ol>` : '<p>No sections selected.</p>'; } }
  ],
  queue() { const y = yd(); const map = { employment: 'irp5', business: 'business', rental: 'rental', investments: 'investments', cgt: 'cgt', lumpSums: 'lumps', retirement: 'retirement', medical: 'medical', travel: 'travel', donations: 'donations', provisional: 'p1' }; return Object.keys(map).filter(k => y.flags[k]).map(k => map[k]); },
  finish() { Wizard.queue = WIZ.checklist.queue(); return 'dashboard'; }
};
function tilesHtml(keys) {
  const y = yd();
  return `<div class="tiles">${CHECK_TILES.filter(t => keys.includes(t[0])).map(([k, ic, t, s]) => `<div class="tile ${y.flags[k] ? 'on' : ''}" data-flag="${k}"><span class="ti-check">${y.flags[k] ? '✓' : ''}</span><div class="ti-icon">${ic}</div><div class="ti-title">${t}</div><div class="ti-sub">${s}</div></div>`).join('')}</div>`;
}

WIZ.irp5 = {
  title: 'IRP5 certificate', desc: 'Capture an employee tax certificate step by step.',
  start() { S.scratch.irp = { employer: '', payeRef: '', from: pack().start, to: pack().end, codes: {} }; },
  steps: [
    { title: 'Employer', intro: 'Take the details from the top of the IRP5 / IT3(a).', html: () => `<div class="grid g2">${f({ p: 't.irp.employer', label: 'Employer name' })}${f({ p: 't.irp.payeRef', label: 'Employer PAYE reference' })}${f({ p: 't.irp.from', label: 'Period from', type: 'date' })}${f({ p: 't.irp.to', label: 'Period to', type: 'date' })}</div>` },
    { title: 'Income', intro: 'Enter the amounts next to each income source code. Leave blank if not on the certificate.', html: () => `<div class="grid g2">${['3601', '3605', '3606', '3607', '3603', '3615', '3713', '3714'].map(c => irpField(c)).join('')}</div>` },
    { title: 'Allowances & fringe benefits', intro: 'Travel allowance, company car, medical aid and retirement contributions paid by the employer.', html: () => `<div class="grid g2">${['3701', '3702', '3703', '3801', '3802', '3810', '3817', '3805'].map(c => irpField(c)).join('')}</div>` },
    { title: 'Deductions', intro: 'Contributions deducted from the salary (40xx codes).', html: () => `<div class="grid g2">${['4001', '4003', '4005', '4006', '4030'].map(c => irpField(c)).join('')}</div>` },
    { title: 'Tax deducted', intro: 'PAYE and credits already allowed by the employer.', html: () => `<div class="grid g2">${['4102', '4116', '4141', '4115'].map(c => irpField(c)).join('')}</div>` },
    { title: 'Review', intro: 'Check the totals against the certificate.', html: () => { const codes = Object.entries(S.scratch.irp.codes).filter(([, v]) => E.n(v)); return `<table class="t"><tbody>${codes.map(([k, v]) => `<tr><td><span class="code-tag">${k}</span> ${esc((codeList().find(c => c.code === k) || {}).name)}</td><td class="r">${moneyCell(v)}</td></tr>`).join('') || '<tr><td class="muted">No amounts entered.</td></tr>'}</tbody></table>`; } }
  ],
  finish() {
    const s = S.scratch.irp;
    yd().irp5.push({ employer: s.employer, payeRef: s.payeRef, from: s.from, to: s.to, codes: Object.entries(s.codes).filter(([, v]) => E.n(v)).map(([code, amount]) => ({ code, amount: E.n(amount) })) });
    yd().flags.employment = true;
    if (E.n(s.codes['3701']) || E.n(s.codes['3702'])) yd().flags.travel = true;
    if (E.n(s.codes['4005']) || E.n(s.codes['3810'])) { yd().flags.medical = true; yd().medical.onScheme = true; }
    return 'employment';
  }
};

WIZ.business = {
  title: 'Business / freelance income', desc: 'Net profit from a trade, profession or side business.',
  start() { S.scratch.bus = { name: '', kind: 'Sole proprietor', turnover: 0, otherIncome: 0, costOfSales: 0, wearTear: 0, homeOffice: 0, exp: {} }; },
  steps: [
    { title: 'The business', intro: 'One wizard per business activity.', html: () => `<div class="grid g2">${f({ p: 't.bus.name', label: 'Trading name / activity' })}${f({ p: 't.bus.kind', label: 'Type', type: 'select', options: ['Sole proprietor', 'Freelance / consulting', 'Commission earner', 'Partnership share', 'Crypto / share trading (revenue)', 'Other trade'] })}</div>` },
    { title: 'Income', intro: 'Total invoiced or received for the year (excluding VAT if VAT registered).', html: () => `<div class="grid g2">${f({ p: 't.bus.turnover', label: 'Turnover / fees', type: 'money' })}${f({ p: 't.bus.otherIncome', label: 'Other business income', type: 'money' })}${f({ p: 't.bus.costOfSales', label: 'Cost of sales (stock, materials)', type: 'money' })}</div>` },
    { title: 'Expenses', intro: 'Only expenses incurred in producing the income. Leave the rest blank.', html: () => `<div class="grid g3">${BUS_EXP.map((x, i) => f({ p: `t.bus.exp.e${i}`, label: x, type: 'money' })).join('')}${f({ p: 't.bus.wearTear', label: 'Wear-and-tear on assets', type: 'money' })}${f({ p: 't.bus.homeOffice', label: 'Home office (business %)', type: 'money' })}</div>` },
    { title: 'Result', html: () => { const b = S.scratch.bus; const exp = Object.values(b.exp).reduce((a, v) => a + E.n(v), 0) + E.n(b.costOfSales) + E.n(b.wearTear) + E.n(b.homeOffice); const inc = E.n(b.turnover) + E.n(b.otherIncome); return sumLine('Income', money(inc)) + sumLine('Expenses', money(-exp)) + sumLine('Net profit / (loss)', money(inc - exp), 'total') + (inc - exp > 30000 ? '<div class="alert warn">⚠ Business income makes the taxpayer a provisional taxpayer – IRP6 returns are required.</div>' : ''); } }
  ],
  finish() { const b = S.scratch.bus; yd().business.push({ name: b.name, kind: b.kind, turnover: E.n(b.turnover), otherIncome: E.n(b.otherIncome), costOfSales: E.n(b.costOfSales), wearTear: E.n(b.wearTear), homeOffice: E.n(b.homeOffice), expenses: Object.entries(b.exp).filter(([, v]) => E.n(v)).map(([k, v]) => ({ desc: BUS_EXP[Number(k.slice(1))], amount: E.n(v) })) }); yd().flags.business = true; yd().flags.provisional = true; return 'business'; }
};

WIZ.rental = {
  title: 'Rental property', desc: 'Rent received less deductible expenses.',
  start() { S.scratch.rent = { property: '', rent: 0, sharePct: 100, exp: {} }; },
  steps: [
    { title: 'Property', html: () => `<div class="grid g3">${f({ p: 't.rent.property', label: 'Property address' })}${f({ p: 't.rent.rent', label: 'Rent received for the year', type: 'money' })}${f({ p: 't.rent.sharePct', label: 'Ownership share %', type: 'dec' })}</div>` },
    { title: 'Expenses', intro: 'Enter 100% of each cost – your share is applied automatically. Bond capital repayments are not deductible.', html: () => `<div class="grid g3">${RENT_EXP.map((x, i) => f({ p: `t.rent.exp.e${i}`, label: x, type: 'money' })).join('')}</div>` }
  ],
  finish() { const p = S.scratch.rent; yd().rental.push({ property: p.property, rent: E.n(p.rent), sharePct: E.n(p.sharePct) || 100, expenses: Object.entries(p.exp).filter(([, v]) => E.n(v)).map(([k, v]) => ({ desc: RENT_EXP[Number(k.slice(1))], amount: E.n(v) })) }); yd().flags.rental = true; yd().flags.provisional = true; return 'rental'; }
};

WIZ.investments = {
  title: 'Interest & dividends', desc: 'From IT3(b) certificates issued by banks and investment houses.',
  steps: [
    { title: 'Interest', intro: 'Add up all IT3(b) interest. Do not include tax-free savings accounts.', html: () => `<div class="grid g2">${f({ p: 'y.investments.localInterest', label: 'Local interest', type: 'money' })}${f({ p: 'y.investments.foreignInterest', label: 'Foreign interest (rand)', type: 'money' })}</div>` },
    { title: 'Dividends', html: () => `<div class="grid g2">${f({ p: 'y.investments.localDividends', label: 'Local dividends (exempt)', type: 'money' })}${f({ p: 'y.investments.reitDividends', label: 'REIT dividends (taxable)', type: 'money' })}${f({ p: 'y.investments.foreignDividends', label: 'Foreign dividends (rand)', type: 'money' })}${f({ p: 'y.investments.dividendsTaxWithheld', label: 'Dividends tax withheld', type: 'money' })}</div>` },
    { title: 'Result', html: () => { const r = result(); return sumLine('Taxable interest and dividends', money(r.investNet), 'total') + sumLine('Interest exemption used', money(r.interest.exempt)); } }
  ],
  finish() { yd().flags.investments = true; return 'investments'; }
};

WIZ.cgt = {
  title: 'Capital gains – disposal', desc: 'Sale of shares, crypto, property or other assets.',
  start() { S.scratch.cg = { desc: '', type: 'shares', date: '', proceeds: 0, baseCost: 0, costs: 0 }; },
  steps: [
    { title: 'What was sold?', html: () => `<div class="grid g2">${f({ p: 't.cg.desc', label: 'Description (e.g. 500 Naspers shares)' })}${f({ p: 't.cg.type', label: 'Asset type', type: 'select', options: CGT_TYPES })}${f({ p: 't.cg.date', label: 'Date sold', type: 'date' })}</div>` },
    { title: 'Amounts', intro: 'Base cost = purchase price plus costs of acquiring and improving the asset. For crypto use the cost of the specific units sold (FIFO or specific identification).', html: () => `<div class="grid g3">${f({ p: 't.cg.proceeds', label: 'Selling price (proceeds)', type: 'money' })}${f({ p: 't.cg.baseCost', label: 'Base cost', type: 'money' })}${f({ p: 't.cg.costs', label: 'Selling costs (commission, agent)', type: 'money' })}</div>` },
    { title: 'Result', html: () => { const c = S.scratch.cg; const g = E.n(c.proceeds) - E.n(c.baseCost) - E.n(c.costs); return sumLine('Capital gain / (loss) on this disposal', money(g), 'total') + `<p class="muted">The annual exclusion (${money0(pack().cgt.annualExclusion)}) and inclusion rate are applied across all disposals on the Capital gains screen.</p>`; } }
  ],
  finish() { const c = S.scratch.cg; yd().cgt.items.push({ desc: c.desc, type: c.type, date: c.date, proceeds: E.n(c.proceeds), baseCost: E.n(c.baseCost), costs: E.n(c.costs) }); yd().flags.cgt = true; return 'cgt'; }
};

WIZ.lumps = {
  title: 'Lump sums & two-pot', desc: 'Retirement, resignation and savings-component withdrawals.',
  steps: [
    { title: 'Lump sums received', intro: 'Use the amounts on the fund’s tax directive / IRP5.', html: () => `<div class="grid g2">${f({ p: 'y.lumps.retirement', label: 'Retirement / retrenchment / death lump sum', type: 'money' })}${f({ p: 'y.lumps.withdrawal', label: 'Withdrawal (resignation) lump sum', type: 'money' })}${f({ p: 'y.lumps.savingsWithdrawal', label: 'Two-pot savings withdrawal', type: 'money' })}${f({ p: 'y.lumps.taxDeducted', label: 'Tax deducted by the fund', type: 'money' })}</div>` },
    { title: 'History', intro: 'Lump sum tables are cumulative over a lifetime.', html: () => f({ p: 'y.lumps.priorLumpSums', label: 'Taxable lump sums received in earlier years', type: 'money' }) },
    { title: 'Result', html: () => { const r = result(); return sumLine('Tax on lump sums', money(r.lump.total), 'total') + sumLine('Tax deducted by fund', money(r.lump.taxDeducted)); } }
  ],
  finish() { yd().flags.lumpSums = true; return 'lumps'; }
};

WIZ.retirement = {
  title: 'Retirement contributions', desc: 'RA, pension and provident fund deductions.',
  steps: [
    { title: 'Retirement annuity certificates', intro: 'Contributions on IT3(f) certificates that were not deducted through payroll.', html: () => `<div class="grid g2">${f({ p: 'y.deductions.raContrib', label: 'RA contributions paid personally', type: 'money' })}${f({ p: 'y.deductions.raCarryForward', label: 'Carried forward from last year', type: 'money' })}</div>` },
    { title: 'Result', html: () => { const r = result(), ra = r.ra; return sumLine('Total contributions', money(ra.contributions + ra.carriedIn)) + sumLine('Limit (27.5% / cap)', money(Math.min(ra.limitPct, ra.cap))) + sumLine('Deduction allowed', money(ra.allowed), 'total') + sumLine('Carried forward', money(ra.carryForward)) + (ra.allowed < Math.min(ra.cap, ra.limitPct) ? `<div class="alert tip">💡 A further ${money0(Math.min(ra.cap, ra.limitPct) - ra.allowed)} could still be contributed and deducted this year.</div>` : ''); } }
  ],
  finish() { yd().flags.retirement = true; return 'retirement'; }
};

WIZ.medical = {
  title: 'Medical aid & expenses', desc: 'Medical credits and out-of-pocket costs.',
  steps: [
    { title: 'Medical scheme', intro: 'Get the details from the scheme’s annual tax certificate.', html: () => `<div class="grid g2">${f({ p: 'y.medical.onScheme', label: 'Member of a medical scheme', type: 'check' })}${f({ p: 'y.medical.months', label: 'Months on the scheme', type: 'int' })}${f({ p: 'y.medical.dependants', label: 'Number of dependants (excluding main member)', type: 'int' })}${f({ p: 'y.medical.contributions', label: 'Contributions paid personally (not via payroll)', type: 'money' })}</div>` },
    { title: 'Out-of-pocket costs', intro: 'Qualifying medical expenses not paid by the scheme: doctors, dentists, prescribed medicine, specs, hospital.', html: () => `<div class="grid g2">${f({ p: 'y.medical.qme', label: 'Qualifying medical expenses', type: 'money' })}${f({ p: 'y.medical.disability', label: 'Taxpayer, spouse or child has a disability', type: 'check' })}</div>` },
    { title: 'Result', html: () => { const m = result().medical; return sumLine('Medical scheme fees credit', money(m.mtc)) + sumLine('Additional medical credit', money(m.additional)) + sumLine('Total credits', money(m.mtc + m.additional), 'total'); } }
  ],
  finish() { yd().flags.medical = true; return 'medical'; }
};

WIZ.travel = {
  title: 'Travel allowance & logbook', desc: 'Deemed or actual cost claim from a logbook.',
  steps: [
    { title: 'Vehicle', html: () => { const y = yd(); y.travel.enabled = true; return `<div class="grid g2">${f({ p: 'y.travel.vehicleValue', label: 'Vehicle value incl. VAT when acquired', type: 'money' })}${f({ p: 'y.travel.daysUsed', label: 'Days used for business this year', type: 'int', placeholder: '365' })}${f({ p: 'y.travel.fuelBorne', label: 'Paid all fuel personally', type: 'check' })}${f({ p: 'y.travel.maintBorne', label: 'Paid all maintenance (no maintenance plan)', type: 'check' })}</div>`; } },
    { title: 'Logbook', intro: 'Odometer on 1 March and end of February give total km; the logbook gives business km.', html: () => `<div class="grid g2">${f({ p: 'y.travel.totalKm', label: 'Total kilometres', type: 'int' })}${f({ p: 'y.travel.businessKm', label: 'Business kilometres', type: 'int' })}</div>` },
    { title: 'Actual costs (optional)', intro: 'Enter actual costs if you kept receipts – the better method is chosen automatically.', html: () => `<div class="grid g3">${['fuel', 'maintenance', 'insurance', 'licence', 'interest', 'lease'].map(k => f({ p: `y.travel.actual.${k}`, label: k[0].toUpperCase() + k.slice(1), type: 'money' })).join('')}</div>` },
    { title: 'Result', html: () => { const r = result(), t = r.travel; return sumLine('Travel allowance received', money(r.irp5.agg.travel)) + sumLine('Deemed cost', money(t.deemed)) + sumLine('Actual cost', money(t.actual)) + sumLine('Deduction (' + t.method + ')', money(t.chosen), 'total') + (t.notes || []).map(n => `<div class="alert info">${esc(n)}</div>`).join(''); } }
  ],
  finish() { yd().flags.travel = true; return 'travel'; }
};

WIZ.donations = {
  title: 'Donations', desc: 'Section 18A donations.',
  steps: [{ title: 'Donations with s18A receipts', html: () => f({ p: 'y.deductions.donations', label: 'Total donations', type: 'money' }) + '<br>' + f({ p: 'y.deductions.donationsCarryForward', label: 'Carried forward from last year', type: 'money' }) }],
  finish() { yd().flags.donations = true; return 'donations'; }
};

WIZ.p1 = {
  title: 'IRP6 – first period', desc: 'Work out the August provisional payment.',
  steps: [
    { title: 'Basic amount', intro: 'From the latest ITA34 assessment. Leave as is if unknown.', html: () => `<div class="grid g2">${f({ p: 'y.provisional.basicAmount.lastAssessedYear', label: 'Latest assessed year', type: 'int' })}${f({ p: 'y.provisional.basicAmount.lastAssessedTI', label: 'Assessed taxable income', type: 'money' })}${f({ p: 'y.provisional.basicAmount.lessCapitalGain', label: 'Less taxable capital gain', type: 'money' })}</div>` + sumLine('Basic amount', money(result().provisional.basicAmount.amount), 'total') },
    { title: 'Estimate', intro: 'The planned taxable income is used unless you enter an estimate or choose the basic amount.', html: () => { const pv = result().provisional; return `${f({ p: 'y.provisional.p1.useBasic', label: 'Base the estimate on the basic amount', type: 'check' })}<br><div class="grid g2">${f({ p: 'y.provisional.p1.estimateTI', label: 'Estimated taxable income', type: 'money', placeholder: fmtInput(pv.plannedTI) })}${f({ p: 'y.provisional.p1.paye', label: 'PAYE March–August', type: 'money', placeholder: fmtInput(pv.p1.paye) })}</div>`; } },
    { title: 'Payment', html: () => { const p = result().provisional; return sumLine('Estimated taxable income', money(p.p1.estimateTI)) + sumLine('Tax for the year', money(p.p1.taxOnEstimate)) + sumLine('Half', money(p.p1.half)) + sumLine('Less PAYE', money(-p.p1.paye)) + sumLine(`Pay by ${dateLong(p.dueDates.p1)}`, money(p.p1.due), 'total'); } }
  ],
  finish() { yd().flags.provisional = true; return 'p1'; }
};
WIZ.p2 = {
  title: 'IRP6 – second period', desc: 'February payment and penalty test.',
  steps: [
    { title: 'Estimate', html: () => { const pv = result().provisional; return `<div class="grid g2">${f({ p: 'y.provisional.p2.estimateTI', label: 'Estimated taxable income for the year', type: 'money', placeholder: fmtInput(pv.plannedTI) })}${f({ p: 'y.provisional.p2.paye', label: 'PAYE for the full year', type: 'money', placeholder: fmtInput(pv.p2.paye) })}${f({ p: 'y.provisional.p1.paid', label: 'First payment actually paid', type: 'money' })}</div>`; } },
    { title: 'Penalty test & payment', html: () => { const p = result().provisional; return sumLine('Tax for the year', money(p.p2.taxOnEstimate)) + sumLine('Less PAYE and 1st payment', money(-(p.p2.paye + p.p2.p1Paid))) + sumLine(`Pay by ${dateLong(p.dueDates.p2)}`, money(p.p2.due), 'total') + `<div class="alert ${p.penalty.ok ? 'tip' : 'bad'}">${p.penalty.ok ? '✓ No underestimation penalty expected.' : '⚠ Potential penalty ' + money(p.penalty.amount) + '. ' + esc(p.penalty.rule)}</div>`; } }
  ],
  finish() { return 'p2'; }
};

WIZ.final = {
  title: 'ITR12 preparation', desc: 'Document checklist and final result.',
  steps: [
    { title: 'Documents', intro: 'Make sure you have these before filing:', html: () => `<ul class="help-article"><li>IRP5 / IT3(a) from every employer</li><li>IT3(b) interest & dividend certificates, IT3(c) capital gains certificates</li><li>Medical scheme tax certificate and receipts for out-of-pocket expenses</li><li>Retirement annuity certificates (IT3(f))</li><li>Section 18A donation receipts</li><li>Logbook and vehicle purchase documents</li><li>Business financial statements / income and expense records</li><li>Rental income schedule and expense invoices</li><li>Proof of provisional tax payments (IRP6)</li></ul>` },
    { title: 'Expected outcome', html: () => { const r = result(); return sumLine('Taxable income', money(r.taxableIncome)) + sumLine('Total liability', money(r.liability)) + sumLine('PAYE and payments', money(-r.credits)) + sumLine(r.balance > 0 ? 'Payable' : 'Refund', money(Math.abs(r.balance)), 'total') + '<p class="muted">Print the ITR12 schedule from Reports – it lists every figure with its source code for capture on eFiling.</p>'; } }
  ],
  finish() { return 'final'; }
};

const Wizard = {
  queue: [],
  open(id) {
    const w = WIZ[id]; if (!w) return;
    if (id !== 'newclient' && !cur()) { toast('Select or create a client first.'); return; }
    w.start && w.start();
    let i = 0;
    const m = modal({ title: '✦ ' + w.title, body: '', foot: '' });
    Wizard.active = { w, m, id };
    const render = () => {
      const st = w.steps[i];
      m.body.innerHTML = `<div class="steps">${w.steps.map((s, k) => `<span class="${k <= i ? 'done' : ''}"></span>`).join('')}</div><div class="step-n">Step ${i + 1} of ${w.steps.length}</div><h2 style="font-size:17px;margin:4px 0">${st.title}</h2>${st.intro ? `<div class="wiz-intro">${st.intro}</div>` : '<div style="height:10px"></div>'}<div class="wiz-step">${st.html()}</div>`;
      m.foot.innerHTML = `<span class="muted" style="margin-right:auto">${Wizard.queue.length ? 'Next: ' + WIZ[Wizard.queue[0]].title : ''}</span><button class="btn" data-close>Cancel</button>${i > 0 ? '<button class="btn" id="wzBack">Back</button>' : ''}<button class="btn btn-primary" id="wzNext">${i === w.steps.length - 1 ? 'Finish' : 'Next →'}</button>`;
      m.foot.querySelector('#wzNext').onclick = next;
      const b = m.foot.querySelector('#wzBack'); if (b) b.onclick = () => { i--; render(); };
      const first = m.body.querySelector('input,select'); if (first) first.focus();
    };
    const next = () => {
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      setTimeout(() => {
        const st = w.steps[i]; const v = st.valid ? st.valid() : true;
        if (v !== true) { toast(v); return; }
        if (i < w.steps.length - 1) { i++; render(); return; }
        const go = w.finish ? w.finish() : null;
        markDirty(); m.el.remove(); Wizard.active = null;
        if (go) App.go(go);
        if (Wizard.queue.length) { const nxt = Wizard.queue.shift(); setTimeout(() => Wizard.open(nxt), 150); }
      }, 20);
    };
    Wizard.refresh = render;
    m.el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); next(); } });
    render();
  },
  menu() {
    const list = ['newclient', 'checklist', 'irp5', 'business', 'rental', 'investments', 'cgt', 'lumps', 'retirement', 'medical', 'travel', 'donations', 'p1', 'p2', 'final'];
    const m = modal({ title: '✦ Wizards', body: `<p class="wiz-intro">Guided, step-by-step capture. Each wizard explains what to enter and shows the tax effect before you finish.</p><div class="wiz-list">${list.map(k => `<div class="wiz-card" data-wiz="${k}"><b>${WIZ[k].title}</b><span>${WIZ[k].desc || ''}</span></div>`).join('')}</div>` });
    m.body.addEventListener('click', e => { const c = e.target.closest('[data-wiz]'); if (c) { m.el.remove(); Wizard.queue = []; Wizard.open(c.dataset.wiz); } });
  }
};
window.Wizard = Wizard; window.WIZ = WIZ;
