// Intax Planner – professional reports (HTML → PDF / print).
'use strict';
(function () {
const m2 = (v) => { const x = Number(v) || 0; return x < 0 ? `(${E.fmt(-x, 2)})` : E.fmt(x, 2); };
const tr = (l, v, cls, code) => `<tr class="${cls || ''}"><td>${code ? `<span class="cd">${code}</span>` : ''}${l}</td><td class="r">${v === '' ? '' : m2(v)}</td></tr>`;
const sect = (t) => `<tr class="sec"><td colspan="2">${t}</td></tr>`;

function css(accent) {
  return `@page { size: A4; margin: 14mm 13mm 16mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1b2433; font-size: 9.6pt; margin: 0; }
  .lh { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid ${accent}; padding-bottom: 10px; margin-bottom: 14px; }
  .lh img { max-height: 54px; max-width: 220px; }
  .lh .pn { font-size: 15pt; font-weight: 700; color: #0d2340; }
  .lh .pd { text-align: right; font-size: 8pt; color: #4a5568; line-height: 1.45; }
  .tb { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; }
  .tb h1 { font-size: 16pt; margin: 0; color: #0d2340; font-weight: 600; }
  .tb .st { color: ${accent}; font-weight: 600; font-size: 10pt; margin-top: 2px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid #d8dee6; border-radius: 4px; margin-bottom: 16px; }
  .meta div { padding: 6px 9px; border-right: 1px solid #d8dee6; } .meta div:last-child { border-right: none; }
  .meta b { display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: .6px; color: #7a8699; font-weight: 700; }
  h2 { font-size: 10.5pt; color: #0d2340; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #d8dee6; text-transform: uppercase; letter-spacing: .5px; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  td, th { padding: 3.5px 6px; border-bottom: 1px solid #edf0f4; vertical-align: top; }
  th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4px; color: #7a8699; border-bottom: 1.5px solid #c7d0db; background: #f7f9fb; }
  .r { text-align: right; white-space: nowrap; }
  tr.sec td { font-weight: 700; color: #0d2340; background: #f2f5f9; padding-top: 6px; }
  tr.sub td { font-weight: 600; border-top: 1px solid #c7d0db; }
  tr.tot td { font-weight: 700; border-top: 1.8px solid #0d2340; border-bottom: 3px double #0d2340; background: #f7f9fb; }
  .cd { display: inline-block; min-width: 30px; font-size: 7.5pt; font-weight: 700; color: #8a6420; background: #f6efe0; border-radius: 2px; padding: 0 3px; margin-right: 6px; text-align: center; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .box { border: 1px solid #d8dee6; border-left: 3px solid ${accent}; border-radius: 3px; padding: 8px 11px; margin: 10px 0; }
  .box.warn { border-left-color: #b42318; }
  .big { font-size: 13pt; font-weight: 700; color: #0d2340; }
  .muted { color: #7a8699; } p { margin: 4px 0 7px; line-height: 1.45; } ul { margin: 4px 0 8px 16px; padding: 0; } li { margin-bottom: 3px; }
  .disc { margin-top: 22px; padding-top: 8px; border-top: 1px solid #d8dee6; font-size: 7.5pt; color: #7a8699; line-height: 1.4; }
  .sign { margin-top: 26px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 8.5pt; }
  .sign div { border-top: 1px solid #1b2433; padding-top: 4px; }
  .pb { page-break-before: always; }
  .kp { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 14px; }
  .kp div { border: 1px solid #d8dee6; border-radius: 4px; padding: 7px 9px; } .kp b { display: block; font-size: 7pt; color: #7a8699; text-transform: uppercase; letter-spacing: .5px; } .kp span { font-size: 12pt; font-weight: 700; color: #0d2340; }`;
}
function letterhead() {
  const p = S.settings.practice;
  const det = [p.address ? esc(p.address).replace(/\n/g, '<br>') : '', [p.phone, p.email].filter(Boolean).map(esc).join(' · '), p.website ? esc(p.website) : '', p.prNumber ? `Tax practitioner ${esc(p.prNumber)}${p.regBody ? ' · ' + esc(p.regBody) : ''}` : ''].filter(Boolean).join('<br>');
  return `<div class="lh"><div>${p.logo ? `<img src="${p.logo}">` : `<div class="pn">${esc(p.name || 'Tax Practice')}</div>`}${p.logo && p.name ? `<div style="font-weight:600;margin-top:4px">${esc(p.name)}</div>` : ''}</div><div class="pd">${det}</div></div>`;
}
function titleBlock(title, sub, c, P) {
  return `<div class="tb"><div><h1>${title}</h1>${sub ? `<div class="st">${sub}</div>` : ''}</div></div>` + (c ? `<div class="meta"><div><b>Taxpayer</b>${esc(clientName(c))}</div><div><b>Tax reference</b>${esc(c.taxRef || '—')}</div><div><b>Year of assessment</b>${P ? esc(P.label) : ''}</div><div><b>Prepared</b>${dateLong(new Date().toISOString().slice(0, 10))}</div></div>` : '');
}
function footer() {
  const p = S.settings.practice;
  return `<div class="disc">${esc(p.disclaimer || '')}${p.practitioner ? `<br>Prepared by ${esc(p.practitioner)}${p.prNumber ? ' (' + esc(p.prNumber) + ')' : ''}${p.name ? ', ' + esc(p.name) : ''}.` : ''} Calculated with Intax Planner using SARS tables for ${esc(pack().label)}.</div>`;
}
function doc(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css(S.settings.reportAccent || '#0b7a75')}</style></head><body>${body}</body></html>`;
}

// ---------- report bodies ----------
function computationBody(c, r, P) {
  const groups = {}; r.lines.forEach(l => (groups[l.section] = groups[l.section] || []).push(l));
  let rows = '';
  Object.entries(groups).forEach(([g, ls]) => { rows += sect(g); ls.forEach(l => { rows += l.kind === 'note' ? `<tr><td colspan="2" class="muted"><i>${esc(l.label)}</i></td></tr>` : tr(l.label, l.amount, '', l.code); }); });
  rows += tr('Taxable income', r.taxableIncome, 'tot');
  const tax = [tr('Normal tax on taxable income per tax table', r.grossTax), tr(`Less: rebates (${r.age !== null && r.age >= 75 ? 'primary, secondary, tertiary' : r.age !== null && r.age >= 65 ? 'primary, secondary' : 'primary'})`, -r.rebates), tr('Less: medical scheme fees tax credit (s6A)', -r.medical.mtcUsed), tr('Less: additional medical expenses tax credit (s6B)', -r.medical.additionalUsed), tr('Less: foreign tax credit (s6quat)', -r.foreignTaxCredit), tr('Normal tax payable', r.normalTax, 'sub'), tr('Tax on retirement lump sums (separate tables)', r.lump.total), (r.tfsa && r.tfsa.tax ? tr('Tax on excess tax-free savings contributions (40%)', r.tfsa.tax) : ''), tr('Total tax liability', r.liability, 'sub'), tr('Less: employees’ tax (PAYE)', -r.paye, '', '4102'), tr('Less: tax deducted on lump sums', -r.lump.taxDeducted, '', '4115'), tr('Less: provisional tax paid (IRP6)', -r.provisionalPaid), tr(r.balance > 0 ? 'Amount payable to SARS' : 'Amount refundable by SARS', Math.abs(r.balance), 'tot')].join('');
  return titleBlock('Income Tax Computation', 'Individual · Section 5 of the Income Tax Act', c, P) +
  `<div class="kp"><div><b>Taxable income</b><span>R ${E.fmt(r.taxableIncome)}</span></div><div><b>Tax liability</b><span>R ${E.fmt(r.liability)}</span></div><div><b>Effective rate</b><span>${r.effectiveRate}%</span></div><div><b>${r.balance > 0 ? 'Payable' : 'Refund'}</b><span>R ${E.fmt(Math.abs(r.balance))}</span></div></div>
  <h2>Taxable income</h2><table><tr><th>Description</th><th class="r">R</th></tr>${rows}</table>
  <h2>Tax calculation</h2><table>${tax}</table>
  <div class="two"><div><h2>Carried forward to next year</h2><table>${tr('Retirement fund contributions (s11F)', r.ra.carryForward)}${tr('Donations (s18A)', r.donations.carryForward)}${tr('Assessed loss', r.assessedLossCF)}${tr('Assessed capital loss', r.cgt.lossCF)}</table></div>
  <div><h2>Key rates applied</h2><table><tr><td>Age at end of tax year</td><td class="r">${r.age ?? 'not given'}</td></tr><tr><td>Marginal rate</td><td class="r">${Math.round(r.marginalRate * 100)}%</td></tr>${tr('Tax threshold', r.threshold)}${tr('Interest exemption limit', r.interest.limit)}</table></div></div>`;
}

function itr12Body(c, r, P, y) {
  let html = titleBlock('ITR12 Preparation Schedule', 'Figures to capture on SARS eFiling, with source codes', c, P);
  y.irp5.forEach((cert, i) => {
    html += `<h2>IRP5 / IT3(a) ${i + 1} – ${esc(cert.employer || 'Employer')}${cert.payeRef ? ' (' + esc(cert.payeRef) + ')' : ''}</h2><table><tr><th style="width:70px">Code</th><th>Description</th><th class="r">Amount (R)</th></tr>${cert.codes.filter(l => E.n(l.amount)).map(l => `<tr><td><span class="cd">${esc(l.code)}</span></td><td>${esc((codeList().find(x => x.code === l.code) || {}).name || '')}</td><td class="r">${m2(l.amount)}</td></tr>`).join('')}</table>`;
  });
  const S2 = window.IntaxCodes.ITR12_SECTIONS;
  const rows = [];
  const push = (k, v, note) => { if (E.n(v)) rows.push(`<tr><td>${S2[k]}</td><td class="muted">${note || ''}</td><td class="r">${m2(v)}</td></tr>`); };
  const I = y.investments;
  push('localInterest', I.localInterest, 'IT3(b)'); push('foreignInterest', I.foreignInterest); push('localDividends', I.localDividends, 'IT3(b) – exempt'); push('reitDividends', I.reitDividends); push('foreignDividends', I.foreignDividends);
  r.business.forEach(b => push('business', b.net, esc(b.name) + ` (income ${E.fmt(b.income)}, expenses ${E.fmt(b.expenses)})`));
  r.rental.forEach(p => push('rental', p.net, esc(p.name) + ` (income ${E.fmt(p.income)}, expenses ${E.fmt(p.expenses)})`));
  y.other.filter(o => o.type !== 'exempt').forEach(o => push('otherIncome', o.amount, esc(o.desc)));
  push('foreignEmployment', y.foreign.employmentIncome, y.foreign.qualifies ? 's10(1)(o)(ii) exemption claimed: ' + E.fmt(r.foreignExempt) : '');
  r.cgt.rows.forEach(g => push('cgt', g.gain, `${esc(g.desc)} – proceeds ${E.fmt(g.proceeds)}, base cost ${E.fmt(g.base)}`));
  push('ra', y.deductions.raContrib, 'IT3(f) certificates');
  if (r.medical.contributions || r.medical.qme) rows.push(`<tr><td>${S2.medical}</td><td class="muted">${r.medical.months} months, ${r.medical.dependants} dependant(s); contributions ${E.fmt(r.medical.contributions)}; out-of-pocket ${E.fmt(r.medical.qme)}${y.medical.disability ? '; disability (ITR-DD)' : ''}</td><td class="r"></td></tr>`);
  push('donations', E.n(y.deductions.donations), 's18A receipts');
  if (r.travel.chosen) rows.push(`<tr><td>${S2.travel}</td><td class="muted">Vehicle value ${E.fmt(y.travel.vehicleValue)}; total km ${E.fmt(y.travel.totalKm)}; business km ${E.fmt(y.travel.businessKm)}; ${y.travel.fuelBorne ? 'fuel borne' : 'fuel not borne'}; ${y.travel.maintBorne ? 'maintenance borne' : 'maintenance plan'}; ${r.travel.method} cost</td><td class="r">${m2(r.travel.chosen)}</td></tr>`);
  push('homeOffice', y.deductions.homeOffice); (y.deductions.other || []).forEach(o => push('otherDeductions', o.amount, esc(o.desc)));
  push('assessedLoss', y.deductions.assessedLossBF); push('foreignTaxCredit', y.foreign.foreignTaxCredit);
  const P6 = y.provisional;
  ['p1', 'p2', 'p3'].forEach((k, i) => { if (E.n(P6[k].paid)) rows.push(`<tr><td>${S2.provisionalPaid}</td><td class="muted">Period ${i + 1}${P6[k].datePaid ? ', paid ' + dateLong(P6[k].datePaid) : ''}${P6[k].prn ? ', PRN ' + esc(P6[k].prn) : ''}</td><td class="r">${m2(P6[k].paid)}</td></tr>`); });
  html += `<h2>Other ITR12 sections</h2><table><tr><th>ITR12 section</th><th>Details</th><th class="r">Amount (R)</th></tr>${rows.join('') || '<tr><td colspan="3" class="muted">None</td></tr>'}</table>`;
  html += `<div class="box">Expected outcome on assessment: <b>${r.balance > 0 ? 'payable R ' + E.fmt(r.balance, 2) : 'refund R ' + E.fmt(-r.balance, 2)}</b> (taxable income R ${E.fmt(r.taxableIncome, 2)}).</div>`;
  return html;
}

function p1Body(c, r, P) {
  const p = r.provisional.p1, pv = r.provisional;
  return titleBlock('Provisional Tax – First Period (IRP6)', `Due ${dateLong(pv.dueDates.p1)}`, c, P) +
  `<h2>Estimate of taxable income</h2><table>${tr('Basic amount (latest assessment' + (pv.basicAmount.years ? ', increased by 8% p.a.' : '') + ')', pv.basicAmount.amount)}${tr('Planned taxable income for the year', pv.plannedTI)}${tr(p.useBasic ? 'Estimate used (basic amount)' : 'Estimate used', p.estimateTI, 'sub')}</table>
  <h2>Calculation</h2><table>${tr('Normal tax on estimate after rebates and credits', p.taxOnEstimate)}${tr('One half for the first period', p.half)}${tr('Less: employees’ tax for the period (March – August)', -p.paye)}${tr('Provisional tax payable', p.due, 'tot')}</table>
  <div class="box">Pay <b>R ${E.fmt(p.due, 2)}</b> to SARS by <b>${dateLong(pv.dueDates.p1)}</b> using the payment reference number (PRN) on the IRP6 return. A late payment attracts a 10% penalty plus interest.</div>`;
}
function p2Body(c, r, P) {
  const p = r.provisional.p2, pv = r.provisional, pen = pv.penalty;
  return titleBlock('Provisional Tax – Second Period (IRP6)', `Due ${dateLong(pv.dueDates.p2)}`, c, P) +
  `<h2>Calculation</h2><table>${tr('Estimated taxable income for the year', p.estimateTI)}${tr('Normal tax on estimate after rebates and credits', p.taxOnEstimate)}${tr('Less: employees’ tax for the year', -p.paye)}${tr('Less: first provisional payment', -p.p1Paid)}${tr('Provisional tax payable', p.due, 'tot')}</table>
  <h2>Underestimation penalty test (para 20, Fourth Schedule)</h2><p>${esc(pen.rule)}</p><table>${tr('Actual / planned taxable income', r.taxableIncome)}${tr('Safe-harbour taxable income', pen.targetTI)}${tr('Normal tax on safe-harbour amount', pen.taxOnTarget)}${tr('Estimate submitted', pen.estimateTI)}${tr('Potential penalty at 20%', pen.amount, 'tot')}</table>
  <div class="box ${pen.ok ? '' : 'warn'}">${pen.ok ? 'The estimate and payments meet the safe-harbour requirement – no underestimation penalty is expected.' : 'The estimate is below the safe-harbour level. Consider increasing the estimate and payment to avoid the penalty.'}</div>`;
}
function p3Body(c, r, P) {
  const p = r.provisional.p3;
  return titleBlock('Provisional Tax – Third (Top-up) Payment', `Voluntary · pay by ${dateLong(p.dueDate)}`, c, P) +
  `<table>${tr('Actual taxable income', r.taxableIncome)}${tr('Normal tax after rebates and credits', p.actualNormalTax)}${tr('Less: employees’ tax', -p.paye)}${tr('Less: first provisional payment', -p.p1Paid)}${tr('Less: second provisional payment', -p.p2Paid)}${tr('Recommended top-up payment', p.due, 'tot')}</table>
  <div class="box">A top-up payment made by ${dateLong(p.dueDate)} prevents interest on tax still owing. Interest is charged from that date on any shortfall until the assessment is paid.</div>`;
}
function summaryBody(c, r, P, y) {
  const pv = r.provisional;
  const tips = r.warnings.filter(w => w.level === 'tip' || w.level === 'warn');
  return titleBlock('Tax Planning Summary', `Prepared for ${esc(clientName(c))}`, c, P) +
  `<p>Dear ${esc(c.firstName || clientName(c))},</p><p>Below is a summary of your estimated income tax position for the ${esc(P.label)} tax year, based on the information you provided. The detailed computation and supporting schedules are attached.</p>
  <div class="kp"><div><b>Taxable income</b><span>R ${E.fmt(r.taxableIncome)}</span></div><div><b>Tax for the year</b><span>R ${E.fmt(r.liability)}</span></div><div><b>Already paid</b><span>R ${E.fmt(r.credits)}</span></div><div><b>${r.balance > 0 ? 'Still payable' : 'Expected refund'}</b><span>R ${E.fmt(Math.abs(r.balance))}</span></div></div>
  <h2>Where your income comes from</h2>${svgDonut(incomeMix(r), 150, { center: 'Income' })}
  ${y.flags.provisional ? `<h2>Payment schedule</h2><table><tr><th>Payment</th><th>Due date</th><th class="r">Amount (R)</th></tr><tr><td>1st provisional payment</td><td>${dateLong(pv.dueDates.p1)}</td><td class="r">${m2(pv.p1.due)}</td></tr><tr><td>2nd provisional payment</td><td>${dateLong(pv.dueDates.p2)}</td><td class="r">${m2(pv.p2.due)}</td></tr><tr><td>3rd top-up payment (if required)</td><td>${dateLong(pv.p3.dueDate)}</td><td class="r">${m2(pv.p3.due)}</td></tr></table>` : ''}
  <h2>Income summary</h2><table>${tr('Employment income', r.employment)}${r.businessNet ? tr('Business / trade', r.businessNet) : ''}${r.rentalNet ? tr('Rental', r.rentalNet) : ''}${r.investNet ? tr('Interest & dividends (taxable)', r.investNet) : ''}${r.cgt.taxableGain ? tr('Taxable capital gain', r.cgt.taxableGain) : ''}${r.otherIncome + r.savingsWithdrawal ? tr('Other income', r.otherIncome + r.savingsWithdrawal) : ''}${tr('Total deductions', -(r.totalDeductions))}${tr('Taxable income', r.taxableIncome, 'tot')}</table>
  ${tips.length ? `<h2>Recommendations & points to note</h2><ul>${tips.map(w => `<li>${esc(w.text)}</li>`).join('')}</ul>` : ''}
  <p>Please let us know if any of your circumstances change during the year so that we can update the estimates.</p><p>Kind regards,<br><br><b>${esc(S.settings.practice.practitioner || '')}</b><br>${esc(S.settings.practice.name || '')}</p>`;
}
function schedulesBody(c, r, P, y) {
  let h = titleBlock('Supporting Schedules', '', c, P);
  r.business.forEach((b, i) => { const src = y.business[i]; h += `<h2>Business: ${esc(b.name)}</h2><table>${tr('Turnover', src.turnover)}${tr('Other income', src.otherIncome)}${tr('Cost of sales', -E.n(src.costOfSales))}${(src.expenses || []).map(e => tr(esc(e.desc), -E.n(e.amount))).join('')}${tr('Wear-and-tear', -E.n(src.wearTear))}${tr('Home office', -E.n(src.homeOffice))}${tr('Net profit / (loss)', b.net, 'tot')}</table>`; });
  r.rental.forEach((p, i) => { const src = y.rental[i]; h += `<h2>Rental: ${esc(p.name)} (${E.n(src.sharePct) || 100}% share)</h2><table>${tr('Rent received (share)', p.income)}${(src.expenses || []).map(e => tr(esc(e.desc), -E.n(e.amount) * (E.n(src.sharePct) || 100) / 100)).join('')}${tr('Net rental income / (loss)', p.net, 'tot')}</table>`; });
  if (r.cgt.rows.length) h += `<h2>Capital gains</h2><table><tr><th>Asset</th><th class="r">Proceeds</th><th class="r">Base cost</th><th class="r">Gain/(loss)</th><th class="r">Exclusion</th></tr>${r.cgt.rows.map(g => `<tr><td>${esc(g.desc)}</td><td class="r">${m2(g.proceeds)}</td><td class="r">${m2(g.base)}</td><td class="r">${m2(g.gain)}</td><td class="r">${m2(-g.exclusion)}</td></tr>`).join('')}</table><table>${tr('Aggregate gain / (loss)', r.cgt.aggregate)}${tr('Annual exclusion', -r.cgt.annualExclusion)}${tr('Capital loss brought forward', -r.cgt.lossBF)}${tr('Net capital gain', r.cgt.net)}${tr(`Taxable capital gain (${Math.round(r.cgt.inclusionRate * 100)}%)`, r.cgt.taxableGain, 'tot')}</table>`;
  if (r.travel.band) { const t = r.travel; h += `<h2>Travel claim (${t.method} cost)</h2><table>${tr('Vehicle value', y.travel.vehicleValue)}${tr('Fixed cost per table', t.band.fixed)}${tr('Total kilometres', y.travel.totalKm)}${tr('Business kilometres', y.travel.businessKm)}${tr('Rate per km (R)', t.ratePerKm)}${tr('Deemed cost claim', t.deemed)}${tr('Actual cost claim', t.actual)}${tr('Travel allowance received', r.irp5.agg.travel)}${tr('Deduction allowed', t.chosen, 'tot')}</table>`; }
  if (r.medical.mtc || r.medical.qme) h += `<h2>Medical credits</h2><table><tr><td>Months on scheme / dependants</td><td class="r">${r.medical.months} / ${r.medical.dependants}</td></tr>${tr('Medical scheme fees tax credit (s6A)', r.medical.mtc)}${tr('Contributions', r.medical.contributions)}${tr('Qualifying out-of-pocket expenses', r.medical.qme)}${tr('Additional medical expenses credit (s6B)', r.medical.additional, 'tot')}</table>`;
  if (r.ra.contributions || r.ra.carriedIn) h += `<h2>Retirement fund contributions (s11F)</h2><table>${tr('Contributions for the year', r.ra.contributions)}${tr('Carried forward in', r.ra.carriedIn)}${tr('Remuneration', r.ra.remuneration)}${tr('27.5% limit', r.ra.limitPct)}${tr('Annual cap', r.ra.cap)}${tr('Deduction allowed', r.ra.allowed, 'tot')}${tr('Carried forward', r.ra.carryForward)}</table>`;
  if (r.lump.total) h += `<h2>Retirement lump sums</h2><table>${tr('Withdrawal benefits', r.lump.withdrawal)}${tr('Tax – withdrawal table', r.lump.withdrawalTax)}${tr('Retirement / severance benefits', r.lump.retirement)}${tr('Tax – retirement table', r.lump.retirementTax)}${tr('Total', r.lump.total, 'tot')}</table>`;
  return h;
}
function multiYearBody(c) {
  const yrs = Object.keys(c.years).map(Number).sort();
  const rs = yrs.map(yr => E.compute(c, c.years[yr], pack(yr), codeList()));
  const row = (l, f) => `<tr><td>${l}</td>${rs.map(r => `<td class="r">${m2(f(r))}</td>`).join('')}</tr>`;
  return titleBlock('Multi-year Comparison', `${yrs[0] || ''} – ${yrs[yrs.length - 1] || ''}`, c, null) + `<div style="margin:6px 0 14px">${svgBars(yrs.map(String), [{ name: 'Taxable income', values: rs.map(r => r.taxableIncome) }, { name: 'Tax liability', values: rs.map(r => r.liability) }, { name: 'PAYE + provisional paid', values: rs.map(r => r.credits) }], { width: 640, height: 210 })}</div>` +
  `<table><tr><th>R</th>${yrs.map(y => `<th class="r">${y}</th>`).join('')}</tr>${row('Employment income', r => r.employment)}${row('Business', r => r.businessNet)}${row('Rental', r => r.rentalNet)}${row('Investments (taxable)', r => r.investNet)}${row('Taxable capital gain', r => r.cgt.taxableGain)}${row('Retirement deduction', r => -r.ra.allowed)}${row('Taxable income', r => r.taxableIncome)}${row('Normal tax', r => r.normalTax)}${row('PAYE', r => r.paye)}${row('Provisional paid', r => r.provisionalPaid)}${row('Balance (payable / (refund))', r => r.balance)}${row('Effective rate %', r => r.effectiveRate)}</table>`;
}
function whatifBody(c, P) {
  const w = S.scratch.wiResult; if (!w) return '<p>Open the What-if planner first.</p>';
  const W = S.scratch.wi;
  const row = (l, a, b) => `<tr><td>${l}</td><td class="r">${m2(a)}</td><td class="r">${m2(b)}</td><td class="r">${m2(b - a)}</td></tr>`;
  const changes = [['Extra RA contribution', W.ra], ['Extra s18A donation', W.donation], ['Extra salary / bonus', W.bonus], ['Extra business income', W.income], ['Extra business expenses', W.expenses], ['Extra medical expenses', W.medical], ['Extra business km', W.businessKm], ['Capital gain on share sale', W.gain]].filter(x => E.n(x[1]));
  return titleBlock('Tax Planning Scenario', 'What-if comparison', c, P) + `<h2>Changes tested</h2><table>${changes.map(x => tr(x[0], E.n(x[1]))).join('') || '<tr><td>No changes entered</td></tr>'}</table>
  <h2>Effect</h2><table><tr><th></th><th class="r">Current</th><th class="r">Scenario</th><th class="r">Difference</th></tr>${row('Taxable income', w.base.taxableIncome, w.alt.taxableIncome)}${row('Normal tax', w.base.normalTax, w.alt.normalTax)}${row('Total liability', w.base.liability, w.alt.liability)}${row('Balance on assessment', w.base.balance, w.alt.balance)}${row('1st IRP6 payment', w.base.provisional.p1.due, w.alt.provisional.p1.due)}${row('2nd IRP6 payment', w.base.provisional.p2.due, w.alt.provisional.p2.due)}</table>
  <div class="box">${w.alt.liability <= w.base.liability ? 'Tax saving' : 'Additional tax'}: <b>R ${E.fmt(Math.abs(w.alt.liability - w.base.liability), 2)}</b></div>`;
}
function registerBody() {
  return titleBlock('Client Register', `${S.clients.length} clients · tax year ${S.year}`, null, null) + `<table><tr><th>Client</th><th>Tax number</th><th>Provisional</th><th>Status</th><th class="r">Taxable income</th><th class="r">Balance</th></tr>${S.clients.slice().sort((a, b) => clientName(a).localeCompare(clientName(b))).map(c => { const y = c.years[S.year]; let r = null; try { if (y) r = E.compute(c, y, pack(), codeList()); } catch (e) {} return `<tr><td>${esc(clientName(c))}</td><td>${esc(c.taxRef)}</td><td>${y && y.flags.provisional ? 'Yes' : ''}</td><td>${esc((y && y.status) || '')}</td><td class="r">${r ? m2(r.taxableIncome) : ''}</td><td class="r">${r ? m2(r.balance) : ''}</td></tr>`; }).join('')}</table>`;
}
function tablesBody() {
  const P = pack(S.scratch.ttYear || S.year);
  return titleBlock('Tax Tables', P.label, null, null) + `<h2>Rates of tax – individuals</h2><table><tr><th>Taxable income above (R)</th><th>Rate</th></tr>${P.brackets.map(b => `<tr><td>${E.fmt(b.from)}</td><td>R ${E.fmt(b.base)} + ${(b.rate * 100).toFixed(0)}% of the amount above R ${E.fmt(b.from)}</td></tr>`).join('')}</table>
  <div class="two"><div><h2>Rebates & thresholds</h2><table>${tr('Primary rebate', P.rebates.primary)}${tr('Secondary rebate (65+)', P.rebates.secondary)}${tr('Tertiary rebate (75+)', P.rebates.tertiary)}${tr('Threshold under 65', P.thresholds.under65)}${tr('Threshold 65–74', P.thresholds.age65)}${tr('Threshold 75+', P.thresholds.age75)}</table></div><div><h2>Other</h2><table>${tr('Medical credit – main/first', P.medicalCredits.main)}${tr('Medical credit – additional', P.medicalCredits.additional)}${tr('Interest exemption < 65', P.interestExemption.under65)}${tr('Interest exemption 65+', P.interestExemption.over65)}${tr('CGT annual exclusion', P.cgt.annualExclusion)}${tr('Retirement deduction cap', P.retirement.cap)}${tr('Prescribed rate per km', P.travel.prescribedRate)}</table></div></div>
  <h2>Travel cost scale</h2><table><tr><th>Vehicle value up to</th><th class="r">Fixed cost</th><th class="r">Fuel c/km</th><th class="r">Maintenance c/km</th></tr>${P.travel.scale.map(b => `<tr><td>${b.upTo === null ? 'Above' : E.fmt(b.upTo)}</td><td class="r">${E.fmt(b.fixed)}</td><td class="r">${b.fuel.toFixed(1)}</td><td class="r">${b.maint.toFixed(1)}</td></tr>`).join('')}</table>`;
}

const LIST = [
  { id: 'computation', cat: 'Client reports', title: 'Income tax computation', desc: 'Full computation from income to tax payable or refund, with source codes.', client: true },
  { id: 'summary', cat: 'Client reports', title: 'Tax planning summary (client letter)', desc: 'Client-facing summary, payment schedule and recommendations.', client: true },
  { id: 'itr12', cat: 'Client reports', title: 'ITR12 preparation schedule', desc: 'Every IRP5 code and ITR12 section figure ready for eFiling capture.', client: true },
  { id: 'p1', cat: 'Provisional tax', title: 'IRP6 – first period worksheet', desc: 'August provisional payment calculation.', client: true },
  { id: 'p2', cat: 'Provisional tax', title: 'IRP6 – second period worksheet', desc: 'February payment with the underestimation penalty test.', client: true },
  { id: 'p3', cat: 'Provisional tax', title: 'Third (top-up) payment worksheet', desc: 'Top-up required to avoid interest.', client: true },
  { id: 'schedules', cat: 'Client reports', title: 'Supporting schedules', desc: 'Business, rental, capital gains, travel, medical, retirement and lump sums.', client: true },
  { id: 'multiyear', cat: 'Client reports', title: 'Multi-year comparison', desc: 'All captured tax years side by side.', client: true },
  { id: 'whatif', cat: 'Planning', title: 'What-if scenario', desc: 'Planning scenario comparison from the What-if planner.', client: true },
  { id: 'register', cat: 'Practice', title: 'Client register', desc: 'All clients with status and balances for the selected year.' },
  { id: 'tables', cat: 'Practice', title: 'Tax tables', desc: 'Rates, rebates, thresholds and travel table for the year.' }
];

const EXTRA = {};
function build(id, arg) {
  if (EXTRA[id]) return EXTRA[id](arg);
  const c = cur(), P = pack();
  const def = LIST.find(x => x.id === id) || { id: 'pack', title: 'Client pack', client: true };
  if (def.client && !c) throw new Error('Select a client first.');
  const y = c ? yd() : null, r = c ? result() : null;
  let body;
  switch (id) {
    case 'computation': body = computationBody(c, r, P); break;
    case 'summary': body = summaryBody(c, r, P, y); break;
    case 'itr12': body = itr12Body(c, r, P, y); break;
    case 'p1': body = p1Body(c, r, P); break;
    case 'p2': body = p2Body(c, r, P); break;
    case 'p3': body = p3Body(c, r, P); break;
    case 'schedules': body = schedulesBody(c, r, P, y); break;
    case 'multiyear': body = multiYearBody(c); break;
    case 'whatif': if (!S.scratch.wiResult) { App.go('whatif'); } body = whatifBody(c, P); break;
    case 'register': body = registerBody(); break;
    case 'tables': body = tablesBody(); break;
    case 'pack': {
      const parts = [summaryBody(c, r, P, y), computationBody(c, r, P), schedulesBody(c, r, P, y), itr12Body(c, r, P, y)];
      if (y.flags.provisional) parts.push(p1Body(c, r, P), p2Body(c, r, P), p3Body(c, r, P));
      if (window.REPORTS && REPORTS.packExtra) parts.push(...REPORTS.packExtra(c, r, P, y));
      body = parts.map((p, i) => `<div class="${i ? 'pb' : ''}">${letterhead()}${p}${footer()}</div>`).join('');
      return { title: def.title, html: doc('Client pack', body) };
    }
    default: throw new Error('Unknown report');
  }
  return { title: def.title, html: doc(def.title, letterhead() + body + (c && ['computation', 'summary', 'itr12'].includes(id) ? `<div class="sign"><div>Tax practitioner</div><div>Taxpayer</div></div>` : '') + footer()) };
}
function fileName(title) { const c = cur(); return `${title} - ${c ? clientName(c) + ' - ' : ''}${S.year}.pdf`.replace(/[\\/:*?"<>|]/g, ''); }

function preview(id, arg) {
  let rep; try { rep = build(id, arg); } catch (e) { toast(e.message); return; }
  const m = modal({ title: rep.title, wide: true, body: '<iframe class="preview"></iframe>', foot: `<span class="muted" style="margin-right:auto">A4 · ${esc(S.settings.practice.name || 'Set your practice details in Practice settings')}</span><button class="btn" id="rpPrint">Print…</button><button class="btn btn-primary" id="rpPdf">Save PDF</button>` });
  m.body.style.padding = '10px';
  m.el.querySelector('iframe').srcdoc = rep.html.replace('<body>', '<body style="background:#e9edf2"><div style="background:#fff;max-width:210mm;margin:12px auto;padding:14mm 13mm;box-shadow:0 2px 10px rgba(0,0,0,.15)">').replace('</body>', '</div></body>');
  m.el.querySelector('#rpPdf').onclick = async () => { const p = await window.intax.pdf(rep.html, rep.fileName || fileName(rep.title)); if (p) toast('Saved ' + p); };
  m.el.querySelector('#rpPrint').onclick = () => window.intax.print(rep.html);
}

window.REPORTS = { list: () => LIST, build, preview, fileName, EXTRA, LIST, h: { css, letterhead, titleBlock, footer, doc, tr, sect, m2, computationBody, summaryBody, schedulesBody, itr12Body, p1Body, p2Body, p3Body } };
})();
