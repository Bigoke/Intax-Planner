// Intax Planner – SARS eFiling tax calculator result (ITC12) parser and reconciliation.
// The ITC12 previews the assessment from the ITR12 as captured on eFiling. It excludes provisional
// tax payments, assessed losses brought forward and other carry-overs, so the planner adds those.
(function (root) {
'use strict';

const amt = (s) => { const x = Number(String(s).replace(/[R\s,]/g, '')); return isFinite(x) ? x : null; };
const AMOUNT = /(-?\(?R?\s?[\d\s,]*\d\.\d{2}\)?)\s*$/;

const LABELS = [
  ['taxableIncome', /^Taxable Income\b/i],
  ['ratingPct', /^Rating percentage/i],
  ['ratingAmount', /^Rating amount/i],
  ['lumpRetTI', /^Taxable income\s*-\s*Subject to retirement fund lump sum benefit/i],
  ['lumpWdTI', /^Taxable income\s*-\s*Subject to retirement fund lump sum withdrawal/i],
  ['normalTax', /^Normal tax on taxable income/i],
  ['rebates', /^Rebates/i],
  ['additionalTax', /^Additional Tax/i],
  ['penalties', /^Administrative penalties/i],
  ['lumpRetTax', /^Retirement fund lump sum benefit tax liability/i],
  ['lumpWdTax', /^Retirement fund lump sum withdrawal benefit tax liability/i],
  ['subtotal', /^Subtotal/i],
  ['credits', /^Employees.? tax and tax credits/i],
  ['result', /^Calculated Result/i]
];

function categorize(code, desc) {
  const c = Number(code), d = String(desc || '').toUpperCase();
  if (c >= 3600 && c < 3900) return 'employment';
  if (c >= 3900 && c < 4000) return 'lumpsum';
  if (/CAPITAL (GAIN|LOSS)/.test(d)) return 'cgt';
  if (/REIT/.test(d)) return 'reit';
  if (/DIVIDEND/.test(d)) return /FOREIGN/.test(d) ? 'foreignDividends' : 'dividends';
  if (/INTEREST/.test(d)) return /FOREIGN/.test(d) ? 'foreignInterest' : 'localInterest';
  if (/RENT/.test(d)) return 'rental';
  if (c >= 3400 && c < 3600) return 'business';
  if (c >= 4000 && c < 4200) return 'deduction';
  if (/FOREIGN/.test(d)) return 'foreign';
  return 'other';
}
const isLoss = (desc) => /\bLOSS/i.test(desc);

// lines: array of text lines (from the PDF, or pasted from the eFiling page)
function parseItc12(input) {
  const lines = (Array.isArray(input) ? input : String(input || '').split(/\r?\n/)).map(l => String(l).replace(/\t+/g, '  ').replace(/ /g, ' ').trim()).filter(Boolean);
  const out = { reference: '', year: null, issueDate: '', assessed: [], deductions: [], assessedTotal: null, deductionsTotal: null, warnings: [] };
  let section = null;
  for (const line of lines) {
    let m;
    if ((m = line.match(/Reference Number:?\s*(\d{10})/i))) { out.reference = m[1]; continue; }
    if ((m = line.match(/Year Of Assessment:?\s*(\d{4})/i))) { out.year = Number(m[1]); continue; }
    if ((m = line.match(/Issue Date:?\s*(\d{4})-?(\d{2})-?(\d{2})/i))) { out.issueDate = `${m[1]}-${m[2]}-${m[3]}`; continue; }
    if (/^Amounts Assessed/i.test(line)) { section = 'assessed'; continue; }
    if (/^Deductions\b/i.test(line) && !AMOUNT.test(line)) { section = 'deductions'; continue; }
    if (/^Tax Calculation/i.test(line)) { section = 'calc'; continue; }
    if (/^Code\s+Source/i.test(line)) continue;
    if ((m = line.match(/^Total\b.*?([\d\s,]*\d\.\d{2})\s*$/i)) && (section === 'assessed' || section === 'deductions')) {
      out[section === 'assessed' ? 'assessedTotal' : 'deductionsTotal'] = amt(m[1]); section = section === 'deductions' ? 'after' : 'betweenSections'; continue;
    }
    if ((m = line.match(/^(\d{4})\s+(.+?)\s+(-?[\d\s,]*\d\.\d{2})\s*$/)) && (section === 'assessed' || section === 'deductions')) {
      out[section].push({ code: m[1], desc: m[2].trim(), amount: amt(m[3]), category: categorize(m[1], m[2]) });
      continue;
    }
    for (const [key, re] of LABELS) {
      if (re.test(line) && out[key] === undefined) { const mm = line.match(AMOUNT); if (mm) { out[key] = amt(mm[1].replace(/[()]/g, '')); if (/^\(/.test(mm[1].trim())) out[key] = -out[key]; } break; }
    }
  }
  // Losses are printed as positive amounts – work out the signs from the printed total.
  const plain = out.assessed.reduce((a, l) => a + l.amount, 0);
  const signed = out.assessed.reduce((a, l) => a + (isLoss(l.desc) ? -l.amount : l.amount), 0);
  const useSigned = out.assessedTotal === null ? true : Math.abs(signed - out.assessedTotal) <= Math.abs(plain - out.assessedTotal);
  out.assessed.forEach(l => { l.signed = useSigned && isLoss(l.desc) ? -l.amount : l.amount; });
  if (out.assessedTotal !== null && Math.abs(out.assessed.reduce((a, l) => a + l.signed, 0) - out.assessedTotal) > 1) out.warnings.push('The source code lines do not add up to the total printed by SARS – check the import.');
  out.deductions.forEach(l => { l.signed = l.amount; });
  const required = ['taxableIncome', 'normalTax', 'result'];
  out.valid = required.every(k => typeof out[k] === 'number');
  if (!out.valid) out.warnings.push('Could not find the taxable income, normal tax and calculated result. Is this a SARS "Tax Calculator Result" (ITC12)?');
  LABELS.forEach(([k]) => { if (out[k] === undefined) out[k] = null; });
  return out;
}

const CATS = [
  ['employment', 'Employment income (IRP5 codes 36xx–38xx)'], ['business', 'Business / trade profit or loss (34xx)'], ['rental', 'Rental income'],
  ['localInterest', 'Local interest (after exemption)'], ['foreignInterest', 'Foreign interest'], ['reit', 'REIT distributions'], ['dividends', 'Local dividends'], ['foreignDividends', 'Foreign dividends (taxable part)'],
  ['cgt', 'Capital gains'], ['foreign', 'Other foreign income'], ['lumpsum', 'Lump sums'], ['other', 'Other income'], ['deduction', 'Deductions']
];

// Compare the SARS calculator with the planner's computation (res = engine compute result).
function reconcileItc12(it, res, provisionalPaid) {
  const n = (v) => Number(v) || 0, r2 = (v) => Math.round(n(v) * 100) / 100;
  const plan = {
    employment: res.employment + (res.companyCar ? res.companyCar.added - res.companyCar.reduction : 0),
    business: res.businessNet, rental: res.rentalNet,
    localInterest: res.interest.local - res.interest.exempt, foreignInterest: res.interest.foreign,
    reit: res.dividends.reit, dividends: 0, foreignDividends: res.dividends.foreign - res.dividends.foreignExempt,
    cgt: res.cgt.taxableGain, foreign: res.foreignEmployment - res.foreignExempt, lumpsum: 0,
    other: res.otherIncome + res.savingsWithdrawal,
    deduction: res.totalDeductions - (res.companyCar ? res.companyCar.reduction : 0)
  };
  const sars = {}; CATS.forEach(([k]) => { sars[k] = 0; });
  it.assessed.forEach(l => { sars[l.category] = (sars[l.category] || 0) + l.signed; });
  it.deductions.forEach(l => { sars.deduction = (sars.deduction || 0) + l.signed; });
  const rows = CATS.map(([k, label]) => ({ key: k, label, sars: r2(sars[k]), plan: r2(plan[k]), diff: r2(n(sars[k]) - n(plan[k])), codes: [...it.assessed, ...it.deductions].filter(l => (l.category === k) || (k === 'deduction' && it.deductions.includes(l))).map(l => l.code) }))
    .filter(x => Math.abs(x.sars) > 0.004 || Math.abs(x.plan) > 0.004);
  const planRebates = res.rebates + res.medical.mtcUsed + res.medical.additionalUsed + res.foreignTaxCredit;
  const planCredits = res.paye + res.lump.taxDeducted;
  const planResult = res.liability - planCredits;
  const tax = [
    ['Taxable income', it.taxableIncome, res.taxableIncome],
    ['Normal tax on taxable income', it.normalTax, res.grossTax],
    ['Rebates and tax credits (rebates, medical, foreign)', it.rebates, planRebates],
    ['Lump sum tax', n(it.lumpRetTax) + n(it.lumpWdTax), res.lump.total],
    ['Subtotal (tax liability)', it.subtotal, res.liability],
    ['Employees’ tax and tax credits', it.credits, planCredits],
    ['Calculated result (before provisional tax)', it.result, planResult]
  ].map(([label, s, p]) => ({ label, sars: s === null ? null : r2(s), plan: r2(p), diff: s === null ? null : r2(n(s) - p) }));
  const paid = r2(provisionalPaid);
  return {
    rows, tax, provisionalPaid: paid,
    sarsAfterProvisional: r2(n(it.result) - paid), planAfterProvisional: r2(res.balance),
    difference: r2(n(it.result) - paid - res.balance),
    material: Math.abs(n(it.result) - planResult) > 100 || Math.abs(n(it.taxableIncome) - res.taxableIncome) > 100
  };
}

const api = { parseItc12, reconcileItc12, categorizeItc12: categorize, ITC12_CATS: CATS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IntaxItc12 = api;
})(typeof window !== 'undefined' ? window : globalThis);
