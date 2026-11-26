// Intax Planner 1.5 – SARS penalties & interest screen, report, interest rate table and deadline.
'use strict';
(function () {
const PN = window.IntaxPenalties;
const fmtDates = (t) => String(t).replace(/\d{4}-\d{2}-\d{2}/g, d => dateLong(d));
const rates = () => (S.overrides && S.overrides._interestRates) || window.IntaxPacks.INTEREST_RATES;
window.interestRates = rates;

// Every computation now uses the SARS interest rate table
window.result = function () { const c = cur(), y = yd(); if (!c || !y) return null; return E.compute(c, y, pack(), codeList(), { interestRate: S.settings.interestRate, interestRates: rates() }); };
window.penaltiesFor = function (c, y, yr) { try { const P = pack(yr || S.year); const r = E.compute(c, y, P, codeList(), { interestRates: rates() }); return PN.penaltiesCalc(c, y, P, r, E, rates()); } catch (e) { return null; } };
const pen = () => { const c = cur(), y = yd(); if (!c || !y) return null; y.penalties = Object.assign(PN.emptyPenaltyInputs(), y.penalties || {}); return PN.penaltiesCalc(c, y, pack(), result(), E, rates()); };
window.penalties = pen;

// ---------- navigation ----------
const ai = NAV.findIndex(n => n.id === 'assessment');
NAV.splice(ai + 1, 0, { id: 'penalties', label: 'Penalties & interest', icon: '⚠' });
NEEDS_CLIENT.add('penalties'); UNLOCKED_SCREENS.add('penalties');

// ---------- screen ----------
SCREENS.penalties = () => {
  const c = cur(), y = yd(), p = pen(), r = result(), Pk = pack();
  const prov = y.flags.provisional;
  const B = PN.UNDERSTATEMENT, CS = PN.UNDERSTATEMENT_CASES;
  const priorDefault = E.n(y.provisional && y.provisional.basicAmount && y.provisional.basicAmount.lastAssessedTI);
  const lines = p.items.map(i => `<tr class="${i.kind === 'scenario' ? 'muted' : ''}"><td><b>${esc(i.title)}</b><div class="muted">${esc(i.law)}</div></td><td>${esc(fmtDates(i.status || ''))}${i.note && i.key === 'under' && i.amount ? `<div class="muted">${esc(i.note)}</div>` : ''}</td><td class="r">${moneyCell(i.amount || 0)}</td><td class="r">${moneyCell(i.interest || 0)}</td><td class="r"><b>${moneyCell((i.amount || 0) + (i.interest || 0))}</b></td></tr>`).join('');
  return head('SARS penalties & interest', `Foreseeable penalties and interest for ${Pk.label}, calculated to ${dateLong(p.asAt)} at SARS's published interest rates (currently ${p.rateNow}% p.a.).`, helpBtn('penalties') + `<button class="btn" data-act="xlsx" data-what="client" data-sheet="Penalties">Export to Excel</button><button class="btn btn-primary" data-report="penalties">Penalties PDF</button>`) +
  `<div class="kpis">
    <div class="kpi ${p.totalPenalties ? 'red' : 'green'}"><div class="k-label">Penalties</div><div class="k-val">${money0(p.totalPenalties)}</div><div class="k-sub">fixed and percentage penalties</div></div>
    <div class="kpi ${p.totalInterest ? 'gold' : 'green'}"><div class="k-label">Interest</div><div class="k-val">${money0(p.totalInterest)}</div><div class="k-sub">at SARS rates to the as-at date</div></div>
    <div class="kpi ${p.total ? 'red' : 'green'}"><div class="k-label">Total exposure</div><div class="k-val">${money0(p.total)}</div><div class="k-sub">excluding the understatement scenario</div></div>
    <div class="kpi accent"><div class="k-label">ITR12 deadline</div><div class="k-val" style="font-size:18px">${p.filing.deadline ? dateLong(p.filing.deadline) : '—'}</div><div class="k-sub">${prov ? 'provisional taxpayer' : 'non-provisional'}${p.filing.estimateDeadline ? ' · estimated date' : ''}</div></div>
  </div>
  <div class="card"><h2>Penalties and interest</h2><table class="t"><thead><tr><th style="width:30%">Item</th><th>Status</th><th class="r">Penalty</th><th class="r">Interest</th><th class="r">Total</th></tr></thead><tbody>${lines}
    <tr class="total"><td colspan="2">Total (excluding scenario)</td><td class="r">${moneyCell(p.totalPenalties)}</td><td class="r">${moneyCell(p.totalInterest)}</td><td class="r">${moneyCell(p.total)}</td></tr></tbody></table></div>
  <div class="grid g2"><div class="card"><h2>Dates and facts</h2><div class="grid g2">
    ${f({ p: 'y.penalties.asAt', label: 'Calculate to (as-at date)', type: 'date', hint: 'Blank = today' })}${f({ p: 'y.penalties.submittedDate', label: 'ITR12 submitted on', type: 'date', hint: 'Blank = not yet submitted' })}
    ${f({ p: 'y.penalties.priorTI', label: 'Taxable income of the preceding year', type: 'money', placeholder: fmtInput(priorDefault), hint: `Sets the monthly penalty: ${money0(PN.adminMonthly(p.filing.priorTI))} per month` })}${f({ p: 'y.penalties.outstandingReturns', label: 'Returns outstanding (all years)', type: 'int', hint: 'The fixed penalty applies per outstanding return' })}
    ${prov ? f({ p: 'y.penalties.p2Submitted', label: '2nd IRP6 return was submitted', type: 'check', hint: 'If not submitted within 4 months after year end, SARS treats the estimate as nil' }) : '<div></div>'}<div></div>
    ${f({ p: 'y.penalties.assessmentDate', label: 'Assessment date (ITA34)', type: 'date', placeholder: '', hint: y.assessment && y.assessment.date ? 'From the SARS assessment screen: ' + dateLong(y.assessment.date) : 'Ends the s89quat interest period' })}${f({ p: 'y.penalties.assessmentDue', label: 'Assessment payment due date', type: 'date', hint: y.assessment && y.assessment.paymentDue ? 'From the SARS assessment screen: ' + dateLong(y.assessment.paymentDue) : '' })}
    ${f({ p: 'y.penalties.assessmentPaidDate', label: 'Assessment paid on', type: 'date' })}</div>
    <p class="muted" style="margin-top:8px">Provisional payments and dates come from the <button class="btn-link" data-go="p1">IRP6 screens</button>; the assessment balance from the <button class="btn-link" data-go="assessment">SARS assessment</button> screen (or the plan).</p></div>
  <div class="card"><h2>Understatement penalty – scenario</h2><p class="muted">If SARS adds income or disallows deductions, an understatement penalty of up to 200% of the extra tax can apply, depending on behaviour.</p><div class="grid g3">${f({ p: 'y.penalties.understatement.adjustment', label: 'SARS adjustment to taxable income', type: 'money' })}${f({ p: 'y.penalties.understatement.behaviour', label: 'Behaviour', type: 'select', options: B.map(b => [b[0], b[1]]) })}${f({ p: 'y.penalties.understatement.case', label: 'Case', type: 'select', options: CS })}</div>
    ${p.understatement.adjustment ? `<div class="sum-box">${line('Extra tax (shortfall)', money(p.understatement.shortfall))}${line(`Penalty rate (${esc(p.understatement.behaviour)} – ${esc(p.understatement.caseLabel)})`, p.understatement.pct + '%')}${line('Understatement penalty', money(p.understatement.amount), 'total')}${line('Interest on the shortfall to the as-at date', money(p.understatement.interest))}</div>` : ''}
    <table class="t" style="margin-top:10px"><thead><tr><th>Behaviour (s223)</th><th class="r">Standard</th><th class="r">Repeat</th><th class="r">VDP after</th><th class="r">VDP before</th></tr></thead><tbody>${B.map(b => `<tr><td>${esc(b[1])}</td>${b[2].map(v => `<td class="r">${v}%</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
  ${p.irp6.length ? `<div class="card"><h2>Provisional payments</h2><table class="t"><thead><tr><th>Payment</th><th>Due</th><th class="r">Amount due</th><th class="r">Paid</th><th>Date paid</th><th class="r">Not paid on time</th><th class="r">10% penalty</th><th class="r">Interest</th></tr></thead><tbody>${p.irp6.map(i => `<tr class="clickable" data-go="${i.key}"><td>${esc(i.label)}</td><td>${dateLong(i.due)}</td><td class="r">${moneyCell(i.amountDue)}</td><td class="r">${moneyCell(i.paid)}</td><td>${i.datePaid ? dateLong(i.datePaid) : '—'}</td><td class="r">${moneyCell(i.isPast ? i.lateAmount : 0)}</td><td class="r">${moneyCell(i.penalty)}</td><td class="r">${moneyCell(i.interest)}</td></tr>`).join('')}</tbody></table></div>` : ''}
  ${p.quat.segments && p.quat.segments.length ? `<div class="card"><h2>Interest on underpaid provisional tax (s89quat) – by SARS rate period</h2><table class="t"><thead><tr><th>From</th><th>To</th><th class="r">Days</th><th class="r">Rate</th><th class="r">Interest</th></tr></thead><tbody>${p.quat.segments.map(sg => `<tr><td>${dateLong(sg.from)}</td><td>${dateLong(sg.to)}</td><td class="r">${sg.days}</td><td class="r">${sg.rate}%</td><td class="r">${moneyCell(sg.interest)}</td></tr>`).join('')}<tr class="total"><td colspan="2">On ${money(p.quat.owing)}</td><td class="r">${p.quat.days}</td><td></td><td class="r">${moneyCell(p.quat.amount)}</td></tr></tbody></table></div>` : ''}
  <div class="alert info">ℹ <span>These are estimates of what SARS may levy. SARS can remit some penalties on request (for example a first incidence of a fixed penalty, or where there are reasonable grounds), and interest is charged until the day of payment. Interest rates are from SARS Table 1 and can be updated on the <button class="btn-link" data-go="taxtables">Tax tables</button> screen.</span></div>`;
};

// ---------- report ----------
REPORTS.LIST.push({ id: 'penalties', cat: 'Client reports', title: 'Penalties & interest', desc: 'Foreseeable SARS penalties and interest: late return, late or short payments, underestimation.' });
REPORTS.EXTRA.penalties = () => {
  const c = cur(); if (!c) throw new Error('Select a client first.');
  const p = pen(), H = REPORTS.h, m2 = H.m2, P = pack();
  const body = H.titleBlock('SARS Penalties & Interest', `Foreseeable amounts calculated to ${dateLong(p.asAt)}`, c, P) +
    `<div class="kp"><div><b>Penalties</b><span>R ${E.fmt(p.totalPenalties, 2)}</span></div><div><b>Interest</b><span>R ${E.fmt(p.totalInterest, 2)}</span></div><div><b>Total</b><span>R ${E.fmt(p.total, 2)}</span></div><div><b>ITR12 deadline</b><span>${p.filing.deadline ? dateLong(p.filing.deadline) : '—'}</span></div></div>
    <table><tr><th>Item</th><th>Status</th><th class="r">Penalty</th><th class="r">Interest</th></tr>${p.items.map(i => `<tr><td><b>${esc(i.title)}</b><br><span class="muted">${esc(i.law)}</span></td><td>${esc(fmtDates(i.status || ''))}</td><td class="r">${m2(i.amount || 0)}</td><td class="r">${m2(i.interest || 0)}</td></tr>`).join('')}<tr class="tot"><td colspan="2">Total (excluding understatement scenario)</td><td class="r">${m2(p.totalPenalties)}</td><td class="r">${m2(p.totalInterest)}</td></tr></table>
    ${p.irp6.length ? `<h2>Provisional payments</h2><table><tr><th>Payment</th><th>Due</th><th class="r">Due amount</th><th class="r">Paid</th><th>Paid on</th><th class="r">Penalty</th><th class="r">Interest</th></tr>${p.irp6.map(i => `<tr><td>${esc(i.label)}</td><td>${dateLong(i.due)}</td><td class="r">${m2(i.amountDue)}</td><td class="r">${m2(i.paid)}</td><td>${i.datePaid ? dateLong(i.datePaid) : '—'}</td><td class="r">${m2(i.penalty)}</td><td class="r">${m2(i.interest)}</td></tr>`).join('')}</table>` : ''}
    ${p.quat.segments && p.quat.segments.length ? `<h2>s89quat interest by rate period</h2><table><tr><th>From</th><th>To</th><th class="r">Days</th><th class="r">Rate</th><th class="r">Interest</th></tr>${p.quat.segments.map(sg => `<tr><td>${dateLong(sg.from)}</td><td>${dateLong(sg.to)}</td><td class="r">${sg.days}</td><td class="r">${sg.rate}%</td><td class="r">${m2(sg.interest)}</td></tr>`).join('')}</table>` : ''}
    <div class="box">Estimates only. SARS determines penalties and interest; certain penalties may be remitted on request. Interest is charged to the date of payment at the rates published in SARS Table 1.</div>`;
  return { title: 'Penalties & interest', html: H.doc('Penalties & interest', H.letterhead() + body + H.footer()), fileName: `Penalties and interest - ${clientName(c)} - ${S.year}.pdf` };
};

// ---------- surface elsewhere ----------
const _dash = SCREENS.dashboard;
SCREENS.dashboard = () => { let h = _dash(); const p = pen(); if (p && p.total > 0) h = h.replace('<div class="card"><div class="card-head"><h2>Review points', `<div class="alert warn">⚠ <span>Foreseeable SARS penalties and interest: <b>${money(p.total)}</b> (penalties ${money(p.totalPenalties)}, interest ${money(p.totalInterest)}).</span><button class="btn-link go" data-go="penalties">Open →</button></div>\n<div class="card"><div class="card-head"><h2>Review points`); return h; };
const _final = SCREENS.final;
SCREENS.final = () => { const p = pen(); return (p && p.total > 0 ? `<div class="alert warn">⚠ <span>Foreseeable penalties and interest: <b>${money(p.total)}</b>.</span><button class="btn-link go" data-go="penalties">Open →</button></div>` : '') + _final(); };

// ITR12 filing deadline in the practice deadlines list
const _allDl = window.allDeadlines;
window.allDeadlines = () => {
  const out = _allDl(), t = new Date().toISOString().slice(0, 10);
  for (const c of S.clients) for (const yr of Object.keys(c.years).map(Number)) {
    if (!YEARS.includes(yr)) continue;
    const y = c.years[yr], P = pack(yr); if (!P.filing) continue;
    const prov = y.flags && y.flags.provisional, date = prov ? P.filing.provisional : P.filing.nonProvisional;
    const done = !!((y.penalties && y.penalties.submittedDate) || ['Submitted', 'Assessed'].includes(y.status));
    const d = { c, yr, kind: 'itr12', label: `ITR12 return due${P.filing.estimate ? ' (estimated date)' : ''}`, date, amount: null, paid: 0, route: 'penalties', done };
    d.days = daysUntil(date); d.overdue = !done && date < t; out.push(d);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
};

// ---------- interest rate table on the Tax tables screen ----------
const _tt = SCREENS.taxtables;
SCREENS.taxtables = () => {
  const R = rates().slice().sort((a, b) => a.from.localeCompare(b.from));
  const custom = !!(S.overrides && S.overrides._interestRates);
  return _tt() + `<div class="card"><div class="card-head"><h2>SARS interest rates (Table 1 – outstanding taxes)</h2>${custom ? '<span class="pill warn">Edited</span><button class="btn btn-sm btn-danger" data-act="irreset">Reset to SARS</button>' : '<span class="pill ok">SARS table</span>'}<button class="btn btn-sm" data-act="iradd">+ New rate</button></div>
    <p class="muted">Each rate applies from its date until the next one. Used for all interest calculations (provisional tax, s89quat, late payments).</p>
    <table class="t" style="max-width:560px"><thead><tr><th>From</th><th class="r">Rate % p.a.</th><th></th></tr></thead><tbody>${R.map((x, i) => `<tr><td><input type="date" data-ir="${i}" data-irk="from" value="${x.from}"></td><td><input class="num" data-ir="${i}" data-irk="rate" value="${x.rate.toFixed(2)}"></td><td><button class="btn btn-sm btn-danger" data-act="irdel" data-i="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>`;
};
const editableRates = () => { if (!S.overrides._interestRates) S.overrides._interestRates = E.clone(window.IntaxPacks.INTEREST_RATES); S.overrides._interestRates.sort((a, b) => a.from.localeCompare(b.from)); return S.overrides._interestRates; };
document.addEventListener('change', e => {
  const i = e.target.dataset && e.target.dataset.ir; if (i === undefined) return;
  const R = editableRates(), k = e.target.dataset.irk;
  R[Number(i)][k] = k === 'rate' ? parseNum(e.target.value) : e.target.value;
  R.sort((a, b) => a.from.localeCompare(b.from)); markDirty(); setTimeout(() => App.refresh(), 0);
});
Object.assign(ACTIONS2, {
  iradd() { const R = editableRates(); const last = R[R.length - 1]; R.push({ from: new Date().toISOString().slice(0, 10), rate: last ? last.rate : 10 }); markDirty(); App.refresh(); },
  irdel(t, ds) { const R = editableRates(); if (R.length <= 1) return; R.splice(Number(ds.i), 1); markDirty(); App.refresh(); },
  async irreset() { if (!(await confirmBox('Reset the interest rates to the SARS table built into this version?', 'Reset'))) return; delete S.overrides._interestRates; markDirty(); App.refresh(); }
});

// Settings: the single interest-rate field is replaced by the SARS table
const _settings = SCREENS.settings;
SCREENS.settings = () => _settings().replace(/<div class="field\s*" data-field="s\.interestRate">[\s\S]*?<\/div><\/div>/, `<div class="field"><label>SARS interest rates</label><div class="hint">Interest is calculated with SARS Table 1 rates (currently ${PN.currentRate(rates(), new Date().toISOString().slice(0, 10))}% p.a.). <button class="btn-link" data-go="taxtables">Edit on the Tax tables screen →</button></div></div>`);
})();
