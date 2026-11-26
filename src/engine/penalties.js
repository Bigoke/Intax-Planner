// Intax Planner – foreseeable SARS penalties and interest for an individual's tax year.
// Covers: late ITR12 (administrative non-compliance penalty, s210/s211 TAA), late or short provisional
// payments (10% penalty, para 27 Fourth Schedule, plus interest), underestimation (para 20), interest on
// underpaid provisional tax (s89quat), late payment of the assessment (10% penalty s213 + interest),
// and an understatement-penalty scenario (s222/s223 TAA).
(function (root) {
'use strict';
const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
const r2 = (v) => Math.round(n(v) * 100) / 100;
const dayMs = 86400000;
const toD = (iso) => new Date(iso + 'T00:00:00Z');
const isoD = (d) => d.toISOString().slice(0, 10);
const addDaysIso = (iso, k) => { const d = toD(iso); d.setUTCDate(d.getUTCDate() + k); return isoD(d); };
const today = () => new Date().toISOString().slice(0, 10);

// Administrative non-compliance penalty table (s211): based on taxable income (or assessed loss) of the preceding year.
const ADMIN_TABLE = [[250000, 250], [500000, 500], [1000000, 1000], [5000000, 2000], [10000000, 4000], [50000000, 8000], [Infinity, 16000]];
function adminMonthly(priorTI) { if (n(priorTI) <= 0) return 250; for (const [upTo, amt] of ADMIN_TABLE) if (n(priorTI) <= upTo) return amt; return 16000; }

// Understatement penalty percentages (s223 table): [standard, obstructive/repeat, VDP after notification, VDP before notification]
const UNDERSTATEMENT = [
  ['substantial', 'Substantial understatement', [10, 20, 5, 0]],
  ['reasonableCare', 'Reasonable care not taken in completing return', [25, 50, 15, 0]],
  ['noGrounds', 'No reasonable grounds for the tax position taken', [50, 75, 25, 0]],
  ['avoidance', 'Impermissible avoidance arrangement', [75, 100, 35, 0]],
  ['grossNeg', 'Gross negligence', [100, 125, 50, 5]],
  ['evasion', 'Intentional tax evasion', [150, 200, 75, 10]]
];
const UNDERSTATEMENT_CASES = [['standard', 'Standard case'], ['repeat', 'Obstructive or repeat case'], ['vdpAfter', 'Voluntary disclosure after audit notification'], ['vdpBefore', 'Voluntary disclosure before notification']];

// Interest at SARS rates on `amount` for each day from `start` (inclusive) to `end` (exclusive).
function interestBetween(amount, start, end, rates) {
  const out = { amount: 0, days: 0, segments: [] };
  if (!amount || !start || !end || end <= start) return out;
  const rs = (rates || []).slice().sort((a, b) => a.from.localeCompare(b.from));
  for (let i = 0; i < rs.length; i++) {
    const from = rs[i].from, toEx = i + 1 < rs.length ? rs[i + 1].from : '9999-12-31';
    const s = start > from ? start : from, e = end < toEx ? end : toEx;
    if (e <= s) continue;
    const days = Math.round((toD(e) - toD(s)) / dayMs);
    const amt = amount * rs[i].rate / 100 * days / 365;
    out.segments.push({ from: s, to: addDaysIso(e, -1), days, rate: rs[i].rate, interest: r2(amt) });
    out.amount += amt; out.days += days;
  }
  out.amount = r2(out.amount);
  return out;
}

// Months (or part months) a return is late, as SARS levies the penalty per month of non-compliance.
function monthsLate(due, actual) {
  if (!due || !actual || actual <= due) return 0;
  const a = toD(due), b = toD(actual);
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() > a.getUTCDate()) m += 1;
  return Math.max(1, m);
}

function emptyPenaltyInputs() {
  return { asAt: '', submittedDate: '', outstandingReturns: 1, priorTI: null, p2Submitted: true, assessmentDate: '', assessmentDue: '', assessmentPaidDate: '', understatement: { adjustment: 0, behaviour: 'reasonableCare', case: 'standard' } };
}

// E = engine (for normalTax), res = compute() result, rates = interest table
function penaltiesCalc(client, y, pack, res, E, rates, opts) {
  const P = Object.assign(emptyPenaltyInputs(), y.penalties || {});
  P.understatement = Object.assign(emptyPenaltyInputs().understatement, (y.penalties || {}).understatement || {});
  const asAt = P.asAt || (opts && opts.today) || today();
  const items = [];
  const prov = !!(y.flags && y.flags.provisional);
  const pv = res.provisional, age = res.age;

  // 1. Late submission of the ITR12
  const deadline = pack.filing ? (prov ? pack.filing.provisional : pack.filing.nonProvisional) : null;
  const submitted = P.submittedDate || '';
  const filingTo = submitted || asAt;
  const priorTI = P.priorTI === null || P.priorTI === '' || P.priorTI === undefined ? n(y.provisional && y.provisional.basicAmount && y.provisional.basicAmount.lastAssessedTI) : n(P.priorTI);
  const months = deadline ? Math.min(35, monthsLate(deadline, filingTo)) : 0;
  const monthly = adminMonthly(priorTI) * Math.max(1, n(P.outstandingReturns) || 1);
  const filing = { key: 'filing', title: 'Late submission of the ITR12 return', law: 's210/s211 Tax Administration Act', deadline, estimateDeadline: !!(pack.filing && pack.filing.estimate), submitted, measuredTo: filingTo, months, monthly, priorTI, amount: deadline ? r2(months * monthly) : 0, status: !deadline ? 'No filing deadline in the tax tables' : months ? (submitted ? `Submitted ${months} month(s) late` : `Outstanding – ${months} month(s) late at ${asAt}`) : (submitted ? 'Submitted on time' : 'Not yet due'), kind: 'penalty' };
  items.push(filing);

  // 2. Provisional payments: 10% late-payment penalty + interest from the due date
  const irp6 = [];
  if (prov) {
    [['p1', '1st provisional payment', pv.dueDates.p1, pv.p1.due], ['p2', '2nd provisional payment', pv.dueDates.p2, pv.p2.due]].forEach(([k, label, due, amountDue]) => {
      const pay = (y.provisional && y.provisional[k]) || {};
      const paid = n(pay.paid), date = pay.datePaid || '';
      const onTime = date && date <= due ? Math.min(paid, amountDue) : 0;
      const lateAmt = Math.max(0, amountDue - onTime);
      const isPast = asAt > due;
      const penalty = isPast ? r2(lateAmt * pack.provisional.latePenalty) : 0;
      // interest: on the part paid late from due date to payment date; on the unpaid part to the as-at date
      const paidLate = date && date > due ? Math.min(paid, amountDue) : 0;
      const unpaid = Math.max(0, amountDue - onTime - paidLate);
      const i1 = interestBetween(paidLate, addDaysIso(due, 1), addDaysIso(date || due, 1), rates);
      const i2 = isPast ? interestBetween(unpaid, addDaysIso(due, 1), addDaysIso(asAt, 1), rates) : { amount: 0, days: 0 };
      irp6.push({ key: k, label, due, amountDue: r2(amountDue), paid, datePaid: date, lateAmount: r2(lateAmt), penalty, interest: r2(i1.amount + i2.amount), paidLate, unpaid, isPast });
      items.push({ key: k + 'late', title: `${label} – late or short payment`, law: 'para 27 Fourth Schedule (10%) and interest (s187 TAA)', amount: penalty, interest: r2(i1.amount + i2.amount), status: !isPast ? 'Not yet due' : lateAmt < 1 ? 'Paid in full on time' : `${E.fmt(lateAmt, 2)} not paid by ${due}`, kind: 'penalty' });
    });
  }

  // 3. Underestimation penalty (2nd estimate too low) – including a 2nd IRP6 that was never submitted (deemed nil estimate)
  let under = { amount: 0 };
  if (prov) {
    const pen = pv.penalty;
    let amount = pen.amount, note = pen.rule;
    if (P.p2Submitted === false) {
      const paidAll = n(pv.p2.paye) + n(pv.p1.paid) + n(pv.p2.paid);
      amount = r2(pack.provisional.penaltyRate * Math.max(0, pen.taxOnTarget - paidAll));
      note = '2nd IRP6 not submitted within 4 months after year end – SARS treats the estimate as nil. ' + pen.rule;
    }
    under = { amount: r2(amount), note, targetTI: pen.targetTI, taxOnTarget: pen.taxOnTarget };
    items.push({ key: 'under', title: 'Underestimation of provisional tax', law: 'para 20 Fourth Schedule (20%)', amount: under.amount, status: under.amount ? 'Estimate below the safe-harbour amount' : 'No penalty', note, kind: 'penalty' });
  }

  // 4. s89quat interest on provisional tax shortfall from the effective date to the assessment date
  let quat = { amount: 0, days: 0 };
  const assessDate = P.assessmentDate || (y.assessment && y.assessment.date) || (y.finalOpts && y.finalOpts.expectedAssessmentDate) || '';
  const effective = res.taxableIncome > 50000 ? `${pack.year}-09-30` : `${pack.year}-08-31`;
  if (prov) {
    const owing = Math.max(0, res.normalTax - res.paye - res.provisionalPaid);
    const to = assessDate || asAt;
    quat = Object.assign(interestBetween(owing, addDaysIso(effective, 1), addDaysIso(to, 1), rates), { owing: r2(owing), effective, to, estimated: !assessDate });
    items.push({ key: 'quat', title: 'Interest on underpaid provisional tax', law: 's89quat Income Tax Act', amount: 0, interest: quat.amount, status: owing < 1 ? 'No shortfall' : to <= effective ? `Interest on ${E.fmt(owing, 2)} would start on ${addDaysIso(effective, 1)} if still unpaid` : `On ${E.fmt(owing, 2)} from ${addDaysIso(effective, 1)} to ${to}${assessDate ? '' : ' (no assessment date – to as-at date)'}`, kind: 'interest' });
  }

  // 5. Late payment of the assessment balance
  const bal = y.assessment && y.assessment.balance !== null && y.assessment.balance !== undefined && y.assessment.balance !== '' ? n(y.assessment.balance) : res.balance;
  const assessDue = P.assessmentDue || (y.assessment && y.assessment.paymentDue) || '';
  const assessPaid = n(y.assessment && y.assessment.paid);
  const assessPaidDate = P.assessmentPaidDate || '';
  let assessLate = { penalty: 0, interest: 0 };
  if (bal > 0 && assessDue) {
    const outstanding = Math.max(0, bal - (assessPaidDate && assessPaidDate <= assessDue ? assessPaid : 0));
    const end = assessPaidDate && assessPaidDate > assessDue ? assessPaidDate : asAt;
    const isPast = end > assessDue;
    const pen = isPast ? r2(outstanding * 0.10) : 0;
    const int = isPast ? interestBetween(outstanding, addDaysIso(assessDue, 1), addDaysIso(end, 1), rates) : { amount: 0 };
    assessLate = { outstanding: r2(outstanding), penalty: pen, interest: int.amount, due: assessDue, to: end };
    items.push({ key: 'assess', title: 'Late payment of the assessment', law: 's213 TAA (10%) and interest (s187)', amount: pen, interest: int.amount, status: !isPast ? `Due ${assessDue}` : outstanding < 1 ? 'Paid on time' : `${E.fmt(outstanding, 2)} unpaid after ${assessDue}`, kind: 'penalty' });
  } else items.push({ key: 'assess', title: 'Late payment of the assessment', law: 's213 TAA (10%) and interest (s187)', amount: 0, interest: 0, status: bal > 0 ? 'Enter the payment due date from the ITA34 to calculate' : 'No amount payable', kind: 'penalty' });

  // 6. Understatement penalty scenario (if SARS adjusts the return)
  const U = P.understatement, adj = n(U.adjustment);
  let underst = { amount: 0, shortfall: 0, pct: 0 };
  if (adj) {
    const credits = res.medical.mtcUsed + res.medical.additionalUsed + res.foreignTaxCredit;
    const taxNow = Math.max(0, E.normalTax(res.taxableIncome, age, pack) - credits);
    const taxAdj = Math.max(0, E.normalTax(res.taxableIncome + adj, age, pack) - credits);
    const shortfall = Math.max(0, taxAdj - taxNow);
    const row = UNDERSTATEMENT.find(u => u[0] === U.behaviour) || UNDERSTATEMENT[1];
    const ci = Math.max(0, UNDERSTATEMENT_CASES.findIndex(c => c[0] === U.case));
    const pct = row[2][ci];
    const int = interestBetween(shortfall, addDaysIso(effective, 1), addDaysIso(asAt, 1), rates);
    underst = { amount: r2(shortfall * pct / 100), shortfall: r2(shortfall), pct, behaviour: row[1], caseLabel: UNDERSTATEMENT_CASES[ci][1], interest: int.amount, adjustment: adj };
    items.push({ key: 'understatement', title: 'Understatement penalty (scenario)', law: 's222/s223 TAA', amount: underst.amount, interest: underst.interest, status: `${row[1]} – ${UNDERSTATEMENT_CASES[ci][1]}: ${pct}% of tax shortfall ${E.fmt(shortfall, 2)}`, kind: 'scenario' });
  }

  const actual = items.filter(i => i.kind !== 'scenario');
  const totalPenalties = r2(actual.reduce((a, i) => a + n(i.amount), 0));
  const totalInterest = r2(actual.reduce((a, i) => a + n(i.interest), 0));
  return { asAt, inputs: P, items, filing, irp6, under, quat, assessLate, understatement: underst, totalPenalties, totalInterest, total: r2(totalPenalties + totalInterest), effective, rateNow: currentRate(rates, asAt) };
}
function currentRate(rates, date) { let r = null; (rates || []).slice().sort((a, b) => a.from.localeCompare(b.from)).forEach(x => { if (x.from <= date) r = x.rate; }); return r; }

const api = { interestBetween, monthsLate, adminMonthly, ADMIN_TABLE, UNDERSTATEMENT, UNDERSTATEMENT_CASES, emptyPenaltyInputs, penaltiesCalc, currentRate, addDaysIso };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IntaxPenalties = api;
})(typeof window !== 'undefined' ? window : globalThis);
