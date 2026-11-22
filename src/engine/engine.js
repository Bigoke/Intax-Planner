// Intax Planner – calculation engine (pure functions, no UI).
// Works in Node (tests) and in the browser (window.IntaxEngine).
(function (root) {
'use strict';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const n = (v) => { const x = Number(String(v ?? '').replace(/[\s,R]/g, '')); return isFinite(x) ? x : 0; };
const sum = (arr, f) => (arr || []).reduce((a, x) => a + n(f ? f(x) : x), 0);
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- tax packs ----------
function deepMerge(base, over) {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base) || Array.isArray(over) || typeof base !== 'object' || typeof over !== 'object') return over;
  const out = Object.assign({}, base);
  for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
  return out;
}
function getPack(packs, year, overrides) {
  const base = packs[year];
  if (!base) throw new Error('No tax tables for ' + year);
  return deepMerge(clone(base), overrides && overrides[year]);
}

// ---------- basic tables ----------
function tableTax(brackets, amount) {
  amount = Math.max(0, n(amount));
  let row = brackets[0];
  for (const b of brackets) if (amount > b.from) row = b;
  return Math.max(0, row.base + row.rate * (amount - row.from));
}
function marginalRate(brackets, amount) {
  let row = brackets[0];
  for (const b of brackets) if (amount > b.from) row = b;
  return row.rate;
}

function ageAtYearEnd(dob, pack) {
  if (!dob) return null;
  const d = new Date(dob), e = new Date(pack.end + 'T00:00:00');
  if (isNaN(d)) return null;
  let a = e.getFullYear() - d.getFullYear();
  const m = e.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && e.getDate() < d.getDate())) a--;
  return a;
}

function rebatesFor(age, pack) {
  const r = pack.rebates; let t = r.primary;
  if (age !== null && age >= 65) t += r.secondary;
  if (age !== null && age >= 75) t += r.tertiary;
  return t;
}
function thresholdFor(age, pack) {
  if (age !== null && age >= 75) return pack.thresholds.age75;
  if (age !== null && age >= 65) return pack.thresholds.age65;
  return pack.thresholds.under65;
}
// Normal tax after rebates
function normalTax(ti, age, pack) {
  return Math.max(0, tableTax(pack.brackets, ti) - rebatesFor(age, pack));
}

// ---------- empty client / year ----------
function emptyYear(year) {
  return {
    year,
    flags: { employment: true, business: false, rental: false, investments: false, cgt: false, retirement: false, foreign: false, other: false, travel: false, medical: false, donations: false, homeOffice: false, lumpSums: false, provisional: false },
    irp5: [],
    business: [],
    rental: [],
    investments: { localInterest: 0, foreignInterest: 0, localDividends: 0, reitDividends: 0, foreignDividends: 0, dividendsTaxWithheld: 0 },
    cgt: { items: [], lossBF: 0, smallBusinessExclusion: 0, yearOfDeath: false },
    lumps: { retirement: 0, withdrawal: 0, savingsWithdrawal: 0, priorLumpSums: 0, taxDeducted: 0 },
    foreign: { employmentIncome: 0, qualifies: false, foreignTaxCredit: 0, otherForeignIncome: 0 },
    other: [],
    deductions: { raContrib: 0, raCarryForward: 0, donations: 0, donationsCarryForward: 0, homeOffice: 0, assessedLossBF: 0, other: [] },
    medical: { onScheme: false, months: 12, dependants: 0, contributions: 0, qme: 0, disability: false },
    companyCar: { enabled: false, determinedValue: 0, maintenancePlan: false, months: 12, totalKm: 0, businessKm: 0, fuelBorne: false, maintBorne: false, insurance: 0, licence: 0 },
    tfsa: { contributions: 0, priorTotal: 0 },
    cop: null, // null = follow marital status; true/false = override
    assessment: { date: '', reference: '', taxableIncome: null, normalTax: null, paye: null, provisional: null, interest: 0, penalties: 0, balance: null, notes: '' },
    finalOpts: { expectedAssessmentDate: '' },
    docs: {}, docsCustom: [],
    travel: { enabled: false, method: 'best', vehicleValue: 0, totalKm: 0, businessKm: 0, daysUsed: 365, fuelBorne: true, maintBorne: true, actual: { fuel: 0, maintenance: 0, insurance: 0, licence: 0, interest: 0, lease: 0 }, vehicleCost: 0 },
    provisional: {
      basicAmount: { lastAssessedYear: year - 1, lastAssessedTI: 0, lessCapitalGain: 0, lessLumpSums: 0 },
      p1: { useBasic: false, estimateTI: null, paye: null, paid: 0, datePaid: '' },
      p2: { estimateTI: null, paye: null, paid: 0, datePaid: '' },
      p3: { paid: 0, datePaid: '' },
      includeAdditionalMedical: false
    },
    notes: ''
  };
}
function emptyClient() {
  return { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), firstName: '', surname: '', idNumber: '', taxRef: '', dob: '', email: '', phone: '', address: '', practitioner: '', notes: '', years: {}, created: new Date().toISOString() };
}

// ---------- IRP5 aggregation ----------
function aggregateIrp5(irp5List, codeList) {
  const byCode = {}; const treatOf = {};
  (codeList || []).forEach(c => { treatOf[c.code] = c.treat; });
  const agg = { income: 0, pension: 0, travel: 0, fringe: 0, medFringe: 0, retFringe: 0, exempt: 0, retContrib: 0, medContrib: 0, donation: 0, lumpRet: 0, lumpWd: 0, savingsWd: 0, paye: 0, lumpTax: 0, info: 0 };
  for (const cert of irp5List || []) {
    for (const line of cert.codes || []) {
      const amt = n(line.amount); if (!amt) continue;
      const code = String(line.code).trim();
      byCode[code] = (byCode[code] || 0) + amt;
      const t = treatOf[code] || line.treat || 'income';
      agg[t] = (agg[t] || 0) + amt;
    }
  }
  return { byCode, agg };
}

// ---------- travel ----------
function travelBand(pack, value) {
  const scale = pack.travel.scale;
  for (const b of scale) if (b.upTo === null || value <= b.upTo) return b;
  return scale[scale.length - 1];
}
function travelClaim(tr, pack, allowance) {
  const res = { deemed: 0, actual: 0, chosen: 0, method: 'none', ratePerKm: 0, band: null, cappedAt: allowance, notes: [] };
  if (!tr || !tr.enabled) return res;
  const total = n(tr.totalKm), bus = Math.min(n(tr.businessKm), total);
  if (!total || !bus) { res.notes.push('Enter total and business kilometres from your logbook.'); return res; }
  const band = travelBand(pack, n(tr.vehicleValue));
  const days = Math.min(365, Math.max(0, n(tr.daysUsed) || 365));
  const fixedPerKm = (band.fixed * days / 365) / total;
  const rate = fixedPerKm + (tr.fuelBorne ? band.fuel / 100 : 0) + (tr.maintBorne ? band.maint / 100 : 0);
  res.band = band; res.ratePerKm = r2(rate); res.fixedPerKm = r2(fixedPerKm);
  res.deemed = r2(rate * bus);
  // actual cost method
  const a = tr.actual || {};
  const topBand = pack.travel.scale.filter(b => b.upTo !== null).slice(-1)[0];
  const costForWT = Math.min(n(tr.vehicleCost) || n(tr.vehicleValue), topBand ? topBand.upTo : Infinity);
  const wearTear = n(a.lease) > 0 ? 0 : (costForWT / 7) * days / 365;
  const actualTotal = n(a.fuel) + n(a.maintenance) + n(a.insurance) + n(a.licence) + n(a.interest) + n(a.lease) + wearTear;
  res.wearTear = r2(wearTear); res.actualTotal = r2(actualTotal);
  res.actual = r2(actualTotal * bus / total);
  let pick = tr.method;
  if (pick === 'best' || !pick) pick = res.actual > res.deemed ? 'actual' : 'deemed';
  if (pick === 'actual' && !actualTotal) pick = 'deemed';
  res.method = pick;
  const raw = pick === 'actual' ? res.actual : res.deemed;
  res.uncapped = raw;
  res.chosen = r2(Math.min(raw, Math.max(0, allowance)));
  if (allowance <= 0) res.notes.push('A travel deduction can only be claimed against a travel allowance (codes 3701/3702) or by someone running a business.');
  else if (raw > allowance) res.notes.push('Claim limited to the travel allowance received.');
  res.businessPct = r2(bus / total * 100);
  return res;
}

// ---------- capital gains ----------
function cgtCalc(cg, pack, age, share) {
  share = share || 1;
  const items = (cg && cg.items) || [];
  const rows = items.map(it => {
    const sh = it.type === 'personal' ? 1 : share;
    const fullProceeds = n(it.proceeds);
    const proceeds = fullProceeds * sh, base = (n(it.baseCost) + n(it.costs)) * sh;
    let gain = proceeds - base, exclusion = 0;
    if (it.type === 'primary' && gain > 0) {
      if (fullProceeds <= 2000000 && pack.year < 2027) exclusion = gain; // proceeds ≤ R2m rule (pre-2027)
      else if (fullProceeds <= 3000000 && pack.year >= 2027) exclusion = gain;
      else exclusion = Math.min(gain, pack.cgt.primaryResidence * sh);
    }
    if (it.type === 'personal') { exclusion = gain; } // personal-use assets disregarded
    return { desc: it.desc || '', type: it.type || 'other', date: it.date || '', proceeds: r2(proceeds), base: r2(base), gain: r2(gain), exclusion: r2(exclusion), net: r2(gain - exclusion) };
  });
  const aggregate = sum(rows, r => r.net) - n(cg && cg.smallBusinessExclusion);
  const annualExcl = cg && cg.yearOfDeath ? pack.cgt.deathExclusion : pack.cgt.annualExclusion;
  let afterExcl;
  if (aggregate > 0) afterExcl = Math.max(0, aggregate - annualExcl);
  else afterExcl = Math.min(0, aggregate + annualExcl);
  const net = afterExcl - n(cg && cg.lossBF);
  const taxable = net > 0 ? net * pack.cgt.inclusionRate : 0;
  const lossCF = net < 0 ? -net : 0;
  return { rows, aggregate: r2(aggregate), annualExclusion: annualExcl, afterExclusion: r2(afterExcl), lossBF: n(cg && cg.lossBF), net: r2(net), inclusionRate: pack.cgt.inclusionRate, taxableGain: r2(taxable), lossCF: r2(lossCF) };
}

// ---------- lump sums ----------
function lumpSumTax(y, pack, irp) {
  const L = y.lumps || {};
  const prior = n(L.priorLumpSums);
  const wd = n(L.withdrawal) + n(irp.agg.lumpWd);
  const rt = n(L.retirement) + n(irp.agg.lumpRet);
  const wdTax = wd ? tableTax(pack.lumpSumWithdrawal, prior + wd) - tableTax(pack.lumpSumWithdrawal, prior) : 0;
  const rtTax = rt ? tableTax(pack.lumpSumRetirement, prior + wd + rt) - tableTax(pack.lumpSumRetirement, prior + wd) : 0;
  return { withdrawal: wd, retirement: rt, prior, withdrawalTax: r2(wdTax), retirementTax: r2(rtTax), total: r2(wdTax + rtTax), taxDeducted: r2(n(L.taxDeducted) + n(irp.agg.lumpTax)) };
}

// ---------- medical credits ----------
function medicalCredits(y, pack, age, ti, contributionsTotal) {
  const m = y.medical || {};
  const months = Math.min(12, Math.max(0, n(m.months)));
  const deps = Math.max(0, Math.floor(n(m.dependants)));
  const mc = pack.medicalCredits;
  const onScheme = m.onScheme || contributionsTotal > 0;
  const perMonth = onScheme ? mc.main + (deps >= 1 ? mc.first : 0) + Math.max(0, deps - 1) * mc.additional : 0;
  const mtc = perMonth * months;
  const qme = n(m.qme);
  const ma = pack.medicalAdditional;
  let additional = 0, basis;
  if ((age !== null && age >= 65) || m.disability) {
    basis = (age !== null && age >= 65) ? '65 or older' : 'disability';
    additional = Math.max(0, ma.over65Pct * ((contributionsTotal - ma.over65Multiple * mtc) + qme));
  } else {
    basis = 'under 65';
    additional = Math.max(0, ma.under65Pct * ((Math.max(0, contributionsTotal - ma.under65Multiple * mtc) + qme) - ma.tiPct * ti));
  }
  return { months, dependants: deps, perMonth, mtc: r2(mtc), contributions: r2(contributionsTotal), qme: r2(qme), additional: r2(additional), basis };
}

// ---------- company car (para 7, Seventh Schedule) ----------
function companyCarCalc(cc, pack, irpValue) {
  const res = { enabled: false, value: 0, calculated: 0, reduction: 0, fromIrp5: irpValue > 0, notes: [] };
  if (!cc || !cc.enabled) return res;
  res.enabled = true;
  const rate = cc.maintenancePlan ? pack.companyCar.maintenancePlan : pack.companyCar.standard;
  const months = Math.min(12, Math.max(0, n(cc.months) || 12));
  res.rate = rate; res.months = months;
  res.calculated = r2(n(cc.determinedValue) * rate * months);
  res.value = irpValue > 0 ? irpValue : res.calculated;
  const total = n(cc.totalKm), bus = Math.min(n(cc.businessKm), total), priv = Math.max(0, total - bus);
  const band = travelBand(pack, n(cc.determinedValue));
  res.band = band;
  res.businessPart = total ? res.value * bus / total : 0;
  res.fuelPart = cc.fuelBorne ? priv * band.fuel / 100 : 0;
  res.maintPart = cc.maintBorne && !cc.maintenancePlan ? priv * band.maint / 100 : 0;
  res.otherPart = n(cc.insurance) + n(cc.licence);
  res.reduction = r2(Math.min(res.value, res.businessPart + res.fuelPart + res.maintPart + res.otherPart));
  res.businessPart = r2(res.businessPart); res.fuelPart = r2(res.fuelPart); res.maintPart = r2(res.maintPart);
  if (!total) res.notes.push('Enter total and business kilometres from the logbook to reduce the fringe benefit.');
  return res;
}

// ---------- tax by bracket ----------
function taxByBracket(ti, brackets) {
  const out = [];
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i], to = i + 1 < brackets.length ? brackets[i + 1].from : Infinity;
    const inBand = Math.max(0, Math.min(ti, to) - b.from);
    out.push({ from: b.from, to: to === Infinity ? null : to, rate: b.rate, amount: r2(inBand), tax: r2(inBand * b.rate) });
  }
  return out;
}

// ---------- business days / SA public holidays ----------
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
const iso = (d) => d.toISOString().slice(0, 10);
function saHolidays(y) {
  const set = new Set();
  const fixed = ['01-01', '03-21', '04-27', '05-01', '06-16', '08-09', '09-24', '12-16', '12-25', '12-26'];
  for (const md of fixed) {
    const d = new Date(`${y}-${md}T00:00:00Z`); set.add(iso(d));
    if (d.getUTCDay() === 0) { const m = new Date(d); m.setUTCDate(m.getUTCDate() + 1); set.add(iso(m)); } // Sunday -> Monday
  }
  const e = easterSunday(y);
  const gf = new Date(e); gf.setUTCDate(e.getUTCDate() - 2); set.add(iso(gf));
  const fd = new Date(e); fd.setUTCDate(e.getUTCDate() + 1); set.add(iso(fd));
  return set;
}
function isBusinessDay(d) {
  const day = d.getUTCDay(); if (day === 0 || day === 6) return false;
  return !saHolidays(d.getUTCFullYear()).has(iso(d));
}
function addBusinessDays(dateIso, count) {
  if (!dateIso) return '';
  const d = new Date(dateIso + 'T00:00:00Z'); if (isNaN(d)) return '';
  let left = count;
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (isBusinessDay(d)) left--; }
  return iso(d);
}
// SARS due dates fall on the last business day when the date is not a business day.
function lastBusinessDayOnOrBefore(dateIso) {
  const d = new Date(dateIso + 'T00:00:00Z');
  while (!isBusinessDay(d)) d.setUTCDate(d.getUTCDate() - 1);
  return iso(d);
}
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }

// ---------- the main computation ----------
function compute(client, y, pack, codeList, opts) {
  opts = opts || {};
  const age = ageAtYearEnd(client && client.dob, pack);
  const cop = y.cop === true || ((y.cop === null || y.cop === undefined) && client && client.maritalStatus === 'Married in community of property');
  const share = cop ? 0.5 : 1;
  const irp = aggregateIrp5(y.irp5, codeList);
  const A = irp.agg;
  const lines = []; // {section, label, amount, code, kind:'income'|'deduction'|'info'}
  const add = (section, label, amount, code, kind) => { amount = r2(amount); if (amount || kind === 'note') lines.push({ section, label, amount, code: code || '', kind: kind || 'income' }); return amount; };

  // Employment
  const employment = A.income + A.pension + A.travel + A.fringe + A.medFringe + A.retFringe;
  Object.keys(irp.byCode).sort().forEach(code => {
    const c = (codeList || []).find(x => x.code === code);
    const t = c ? c.treat : 'income';
    if (['income', 'pension', 'travel', 'fringe', 'medFringe', 'retFringe'].includes(t)) add('Employment (IRP5)', c ? c.name : 'Code ' + code, irp.byCode[code], code);
  });

  // Company car
  const carIrp = n(irp.byCode['3802']) + n(irp.byCode['3816']);
  const car = companyCarCalc(y.companyCar, pack, carIrp);
  let carAdded = 0;
  if (car.enabled && !car.fromIrp5 && car.calculated) { carAdded = car.calculated; add('Employment (IRP5)', 'Company car fringe benefit (calculated, not on IRP5)', carAdded, '3802'); }

  // Foreign employment
  const F = y.foreign || {};
  const fEmp = n(F.employmentIncome);
  const fCap = pack.foreignEmploymentExemption;
  const fExempt = F.qualifies ? (fCap === null ? fEmp : Math.min(fEmp, fCap)) : 0;
  if (fEmp) { add('Foreign income', 'Foreign employment income', fEmp); if (fExempt) add('Foreign income', 'Less: s10(1)(o)(ii) exemption', -fExempt); }
  const fOther = n(F.otherForeignIncome);
  if (fOther) add('Foreign income', 'Other foreign income', fOther);

  // Business
  const business = (y.business || []).map(b => {
    const income = n(b.turnover) + n(b.otherIncome);
    const exp = n(b.costOfSales) + sum(b.expenses, e => e.amount) + n(b.wearTear) + n(b.homeOffice);
    return { name: b.name || 'Business', income: r2(income), expenses: r2(exp), net: r2(income - exp) };
  });
  business.forEach(b => add('Business / trade', b.name + ' – net ' + (b.net < 0 ? 'loss' : 'profit'), b.net));
  const businessNet = sum(business, b => b.net);

  // Rental
  const rental = (y.rental || []).map(p => {
    const pshare = (n(p.sharePct) || 100) / 100 * (p.separateProperty ? 1 : share);
    const inc = n(p.rent) * pshare, exp = sum(p.expenses, e => e.amount) * pshare;
    return { name: p.property || 'Property', income: r2(inc), expenses: r2(exp), net: r2(inc - exp) };
  });
  rental.forEach(p => add('Rental', p.name + ' – net ' + (p.net < 0 ? 'loss' : 'income'), p.net));
  const rentalNet = sum(rental, p => p.net);

  // Investments
  const I = y.investments || {};
  const exemptLimit = age !== null && age >= 65 ? pack.interestExemption.over65 : pack.interestExemption.under65;
  if (cop) add('Investments', 'Joint estate: 50% of interest, dividends, rental and capital gains included', 0, '', 'note');
  const li = n(I.localInterest) * share; const liExempt = Math.min(li, exemptLimit);
  if (li) { add('Investments', 'Local interest', li); add('Investments', 'Less: interest exemption (s10(1)(i))', -liExempt); }
  const fi = n(I.foreignInterest) * share; if (fi) add('Investments', 'Foreign interest', fi);
  const reit = n(I.reitDividends) * share; if (reit) add('Investments', 'Dividends from SA REITs', reit);
  const fd = n(I.foreignDividends) * share; const fdExempt = fd * pack.foreignDividendExemptFraction;
  if (fd) { add('Investments', 'Foreign dividends', fd); add('Investments', 'Less: s10B(3) exempt portion', -fdExempt); }
  const investNet = li - liExempt + fi + reit + fd - fdExempt;

  // Other income
  const otherTaxable = sum((y.other || []).filter(o => o.type !== 'exempt'), o => o.amount);
  (y.other || []).filter(o => o.type !== 'exempt' && n(o.amount)).forEach(o => add('Other income', o.desc || 'Other income', o.amount));
  const savingsWd = n((y.lumps || {}).savingsWithdrawal) + n(A.savingsWd);
  if (savingsWd) add('Other income', 'Two-pot savings withdrawal benefit', savingsWd);

  const incomeTotal = employment + carAdded + (fEmp - fExempt) + fOther + businessNet + rentalNet + investNet + otherTaxable + savingsWd;

  // Deductions
  const D = y.deductions || {};
  const travelAllowance = A.travel;
  const travel = travelClaim(y.travel, pack, travelAllowance);
  if (travel.chosen) add('Deductions', 'Travel expenses (' + (travel.method === 'actual' ? 'actual cost' : 'deemed cost') + ', logbook)', -travel.chosen, '', 'deduction');
  if (car.reduction) add('Deductions', 'Company car fringe benefit reduction (para 7(7)/(8), logbook)', -car.reduction, '', 'deduction');
  const homeOffice = n(D.homeOffice); if (homeOffice) add('Deductions', 'Home office expenses', -homeOffice, '', 'deduction');
  const otherDed = sum(D.other, x => x.amount); (D.other || []).filter(x => n(x.amount)).forEach(x => add('Deductions', x.desc || 'Other deduction', -n(x.amount), '', 'deduction'));
  let tiBeforeLoss = incomeTotal - travel.chosen - car.reduction - homeOffice - otherDed;
  const lossBF = n(D.assessedLossBF);
  if (lossBF) add('Deductions', 'Assessed loss brought forward', -lossBF, '', 'deduction');
  const tiBeforeRA = tiBeforeLoss - lossBF;

  // s11F retirement contributions
  const remuneration = employment + carAdded - car.reduction + (fEmp - fExempt);
  const raContributions = A.retContrib + A.retFringe + n(D.raContrib);
  const raAvailable = raContributions + n(D.raCarryForward);
  const raLimitPct = pack.retirement.pct * Math.max(remuneration, tiBeforeRA);
  const raAllowed = Math.max(0, Math.min(raAvailable, pack.retirement.cap, raLimitPct, Math.max(0, tiBeforeRA)));
  const raCF = raAvailable - raAllowed;
  if (raAllowed) add('Deductions', 'Retirement fund contributions (s11F)', -raAllowed, '4006', 'deduction');
  const tiAfterRA = tiBeforeRA - raAllowed;

  // Capital gains
  const cgt = cgtCalc(y.cgt, pack, age, share);
  if (cgt.taxableGain) add('Capital gains', 'Taxable capital gain (' + Math.round(cgt.inclusionRate * 100) + '% inclusion)', cgt.taxableGain);
  const tiBeforeDonations = tiAfterRA + cgt.taxableGain;

  // s18A donations
  const donAvailable = n(D.donations) + A.donation + n(D.donationsCarryForward);
  const donAllowed = Math.max(0, Math.min(donAvailable, pack.donationsPct * Math.max(0, tiBeforeDonations)));
  if (donAllowed) add('Deductions', 'Donations to PBOs (s18A, limited to 10%)', -donAllowed, '4030', 'deduction');
  let ti = tiBeforeDonations - donAllowed;
  const assessedLossCF = ti < 0 ? -ti : 0;
  ti = Math.max(0, ti);

  // Tax
  const grossTax = tableTax(pack.brackets, ti);
  const rebates = Math.min(grossTax, rebatesFor(age, pack));
  let tax = grossTax - rebates;
  const medContributions = A.medContrib + A.medFringe + n((y.medical || {}).contributions);
  const med = medicalCredits(y, pack, age, ti, medContributions);
  const mtcUsed = Math.min(tax, med.mtc); tax -= mtcUsed;
  const addUsed = Math.min(tax, med.additional); tax -= addUsed;
  const ftc = Math.min(tax, n(F.foreignTaxCredit)); tax -= ftc;
  const normalTaxPayable = tax;

  const lump = lumpSumTax(y, pack, irp);
  const T = y.tfsa || {};
  const tContrib = n(T.contributions), tPrior = n(T.priorTotal);
  const tAnnualExcess = Math.max(0, tContrib - pack.tfsa.annual);
  const tLifeExcess = Math.max(0, tPrior + tContrib - pack.tfsa.lifetime) - Math.max(0, tPrior - pack.tfsa.lifetime);
  const tfsaExcess = Math.max(tAnnualExcess, tLifeExcess);
  const tfsaTax = r2(tfsaExcess * 0.40);
  const liability = normalTaxPayable + lump.total + tfsaTax;

  const P = y.provisional || {};
  const provisionalPaid = n(P.p1 && P.p1.paid) + n(P.p2 && P.p2.paid) + n(P.p3 && P.p3.paid);
  const paye = A.paye;
  const credits = paye + lump.taxDeducted + provisionalPaid;
  const balance = liability - credits;

  const res = {
    year: pack.year, packLabel: pack.label, age, irp5: irp, lines,
    employment: r2(employment), foreignEmployment: r2(fEmp), foreignExempt: r2(fExempt),
    business, businessNet: r2(businessNet), rental, rentalNet: r2(rentalNet),
    interest: { local: li, exempt: r2(liExempt), foreign: fi, limit: exemptLimit }, dividends: { local: n(I.localDividends) * share, reit, foreign: fd, foreignExempt: r2(fdExempt), dwt: n(I.dividendsTaxWithheld) },
    investNet: r2(investNet), otherIncome: r2(otherTaxable), savingsWithdrawal: r2(savingsWd),
    incomeTotal: r2(incomeTotal), travel, homeOffice, otherDeductions: r2(otherDed), assessedLossBF: lossBF,
    ra: { contributions: r2(raContributions), carriedIn: n(D.raCarryForward), remuneration: r2(remuneration), limitPct: r2(raLimitPct), cap: pack.retirement.cap, allowed: r2(raAllowed), carryForward: r2(raCF) },
    cgt, donations: { available: r2(donAvailable), allowed: r2(donAllowed), carryForward: r2(donAvailable - donAllowed) },
    taxableIncome: r2(ti), tiExclCG: r2(Math.max(0, ti - cgt.taxableGain)), assessedLossCF: r2(assessedLossCF),
    grossTax: r2(grossTax), rebates: r2(rebates), threshold: thresholdFor(age, pack),
    medical: Object.assign(med, { mtcUsed: r2(mtcUsed), additionalUsed: r2(addUsed) }),
    foreignTaxCredit: r2(ftc), normalTax: r2(normalTaxPayable), lump, liability: r2(liability),
    paye: r2(paye), provisionalPaid: r2(provisionalPaid), credits: r2(credits), balance: r2(balance),
    effectiveRate: incomeTotal > 0 ? r2(normalTaxPayable / Math.max(1, incomeTotal + cgt.taxableGain) * 100) : 0,
    marginalRate: marginalRate(pack.brackets, ti),
    cop, share, companyCar: car,
    totalDeductions: r2(travel.chosen + car.reduction + homeOffice + otherDed + lossBF + raAllowed + donAllowed),
    tfsa: { contributions: tContrib, priorTotal: tPrior, annualLimit: pack.tfsa.annual, lifetimeLimit: pack.tfsa.lifetime, annualRoom: r2(Math.max(0, pack.tfsa.annual - tContrib)), lifetimeRoom: r2(Math.max(0, pack.tfsa.lifetime - tPrior - tContrib)), excess: r2(tfsaExcess), tax: tfsaTax },
    brackets: taxByBracket(ti, pack.brackets)
  };
  res.provisional = provisionalCalc(client, y, pack, res, opts);
  res.interest89 = assessmentInterest(y, res, opts);
  res.recon = assessmentRecon(y, res);
  res.warnings = warnings(client, y, pack, res);
  return res;
}

// ---------- provisional tax ----------
function taxOnEstimate(ti, age, pack, mtc, additional, ftc) {
  const t = normalTax(ti, age, pack);
  return Math.max(0, t - mtc - additional - ftc);
}
function dueDates(pack) {
  const y = pack.year;
  return { p1: lastBusinessDayOnOrBefore(`${y - 1}-08-31`), p2: lastBusinessDayOnOrBefore(pack.end), p3: `${y}-09-30`, p3Small: `${y}-08-31` };
}
function basicAmount(y, pack) {
  const B = ((y.provisional || {}).basicAmount) || {};
  const base = Math.max(0, n(B.lastAssessedTI) - n(B.lessCapitalGain) - n(B.lessLumpSums));
  const gap = pack.year - n(B.lastAssessedYear || pack.year - 1);
  // Increase by 8% p.a. when the assessed year ended more than 18 months before the end of this year.
  const years = gap >= 2 ? gap : 0;
  const uplift = years ? base * pack.provisional.basicUplift * years : 0;
  return { base: r2(base), years, uplift: r2(uplift), amount: r2(base + uplift) };
}
function provisionalCalc(client, y, pack, res, opts) {
  const P = y.provisional || {};
  const age = res.age;
  const incAdd = !!P.includeAdditionalMedical;
  const plannedTI = res.taxableIncome;
  const fullPaye = res.paye;
  const ba = basicAmount(y, pack);
  const est = (ti) => taxOnEstimate(ti, age, pack, res.medical.mtc, incAdd ? res.medical.additional : 0, n((y.foreign || {}).foreignTaxCredit));

  const p1In = P.p1 || {};
  const p1TI = p1In.useBasic ? ba.amount : (p1In.estimateTI === null || p1In.estimateTI === undefined || p1In.estimateTI === '' ? plannedTI : n(p1In.estimateTI));
  const p1Paye = p1In.paye === null || p1In.paye === undefined || p1In.paye === '' ? fullPaye / 2 : n(p1In.paye);
  const p1Tax = est(p1TI);
  const p1Due = Math.max(0, p1Tax / 2 - p1Paye);

  const p2In = P.p2 || {};
  const p2TI = p2In.estimateTI === null || p2In.estimateTI === undefined || p2In.estimateTI === '' ? plannedTI : n(p2In.estimateTI);
  const p2Paye = p2In.paye === null || p2In.paye === undefined || p2In.paye === '' ? fullPaye : n(p2In.paye);
  const p2Tax = est(p2TI);
  const p1Paid = n(p1In.paid);
  const p2Due = Math.max(0, p2Tax - p2Paye - p1Paid);
  const p2Paid = n(p2In.paid);

  // third (top-up)
  const actualNormal = res.normalTax;
  // Top-up assumes the 2nd payment shown as due will be paid when none is recorded yet.
  const p2ForTopUp = p2Paid || p2Due;
  const p3Due = Math.max(0, actualNormal - fullPaye - p1Paid - p2ForTopUp);
  const dd = dueDates(pack);

  // underestimation penalty (para 20, Fourth Schedule)
  const actualTI = res.taxableIncome;
  const pv = pack.provisional;
  let targetTI, rule;
  if (actualTI <= pv.thresholdTI) { targetTI = Math.min(actualTI * pv.lowPct, ba.amount || actualTI * pv.lowPct); rule = `Taxable income R1 million or less: 2nd estimate must be at least the lesser of ${Math.round(pv.lowPct * 100)}% of actual taxable income and the basic amount.`; }
  else { targetTI = actualTI * pv.highPct; rule = `Taxable income above R1 million: 2nd estimate must be at least ${Math.round(pv.highPct * 100)}% of actual taxable income.`; }
  // Penalty = 20% x (tax on the safe-harbour amount − PAYE − 1st and 2nd payments). Assumes the 2nd payment shown as due is paid if none recorded.
  const p2Assumed = p2Paid || p2Due;
  const penalty = pv.penaltyRate * Math.max(0, est(targetTI) - p2Paye - p1Paid - p2Assumed);
  return {
    basicAmount: ba, plannedTI: r2(plannedTI), dueDates: dd,
    p1: { estimateTI: r2(p1TI), taxOnEstimate: r2(p1Tax), half: r2(p1Tax / 2), paye: r2(p1Paye), due: r2(p1Due), paid: p1Paid, useBasic: !!p1In.useBasic },
    p2: { estimateTI: r2(p2TI), taxOnEstimate: r2(p2Tax), paye: r2(p2Paye), p1Paid, due: r2(p2Due), paid: p2Paid },
    p3: { actualNormalTax: r2(actualNormal), paye: r2(fullPaye), p1Paid, p2Paid: r2(p2ForTopUp), p2Assumed: !p2Paid && p2Due > 0, due: r2(p3Due), paid: n((P.p3 || {}).paid), dueDate: actualTI > 50000 ? dd.p3 : dd.p3Small },
    penalty: { targetTI: r2(targetTI), taxOnTarget: r2(est(targetTI)), estimateTI: r2(p2TI), ok: penalty < 1, amount: r2(penalty), rule, assumedP2: !p2Paid },
    includeAdditionalMedical: incAdd
  };
}

// ---------- interest on underpayment (s89quat) and assessment reconciliation ----------
function assessmentInterest(y, res, opts) {
  const rate = n(opts && opts.interestRate) / 100;
  const date = (y.assessment && y.assessment.date) || (y.finalOpts && y.finalOpts.expectedAssessmentDate) || '';
  const effective = res.provisional.p3.dueDate;
  const out = { rate: rate * 100, effectiveDate: effective, assessmentDate: date, days: 0, amount: 0, applies: false };
  if (!(y.flags && y.flags.provisional) || !date || !rate || res.balance <= 0) return out;
  // Interest runs from the effective date on the normal tax still owing after PAYE and provisional payments.
  const owing = Math.max(0, res.normalTax - res.paye - res.provisionalPaid);
  const days = Math.max(0, daysBetween(effective, date));
  out.days = days; out.owing = r2(owing); out.amount = r2(owing * rate * days / 365); out.applies = days > 0 && owing > 0;
  return out;
}
function assessmentRecon(y, res) {
  const a = y.assessment || {};
  const has = (v) => v !== null && v !== undefined && v !== '';
  if (!has(a.taxableIncome) && !has(a.normalTax) && !has(a.balance)) return { entered: false };
  const rows = [
    ['Taxable income', res.taxableIncome, a.taxableIncome],
    ['Normal tax (after rebates & credits)', res.normalTax, a.normalTax],
    ['Employees’ tax (PAYE)', res.paye, a.paye],
    ['Provisional tax paid', res.provisionalPaid, a.provisional],
    ['Balance per assessment', res.balance, a.balance]
  ].map(([label, plan, sars]) => ({ label, plan: r2(plan), sars: has(sars) ? r2(n(sars)) : null, diff: has(sars) ? r2(n(sars) - plan) : null }));
  const objectionDeadline = a.date ? addBusinessDays(a.date, 80) : '';
  const material = rows.some(r => r.diff !== null && Math.abs(r.diff) > 100);
  return { entered: true, rows, interest: n(a.interest), penalties: n(a.penalties), objectionDeadline, material };
}

// ---------- warnings and tips (the "deduction finder" uses these too) ----------
function warnings(client, y, pack, res) {
  const w = [];
  if (!client.dob) w.push({ level: 'warn', text: 'Date of birth is missing – age rebates and the interest exemption assume under 65.', go: 'client' });
  if (res.ra.carryForward > 0) w.push({ level: 'info', text: `R${fmt(res.ra.carryForward)} of retirement contributions exceed this year's limit and carry forward to next year.`, go: 'retirement' });
  if (res.ra.allowed < Math.min(pack.retirement.cap, res.ra.limitPct) && res.taxableIncome > res.threshold) w.push({ level: 'tip', text: `You could still contribute up to R${fmt(Math.min(pack.retirement.cap, res.ra.limitPct) - res.ra.allowed)} more to a retirement annuity and deduct it this year (marginal rate ${Math.round(res.marginalRate * 100)}%).`, go: 'retirement' });
  if (res.irp5.agg.travel > 0 && !(y.travel && y.travel.enabled)) w.push({ level: 'tip', text: 'You received a travel allowance but have not entered a logbook claim. Use the Travel wizard to claim business kilometres.', go: 'travel' });
  if (res.travel.notes && res.travel.notes.length && y.travel && y.travel.enabled) res.travel.notes.forEach(t => w.push({ level: 'info', text: t, go: 'travel' }));
  if (res.donations.carryForward > 0) w.push({ level: 'info', text: `R${fmt(res.donations.carryForward)} of donations exceed the 10% limit and carry forward.`, go: 'donations' });
  if (res.medical.contributions > 0 && !(y.medical && n(y.medical.months))) w.push({ level: 'warn', text: 'Medical scheme contributions found but the number of months on the scheme is 0.', go: 'medical' });
  if (res.cgt.lossCF > 0) w.push({ level: 'info', text: `Assessed capital loss of R${fmt(res.cgt.lossCF)} carries forward.`, go: 'cgt' });
  if (res.assessedLossCF > 0) w.push({ level: 'info', text: `Assessed loss of R${fmt(res.assessedLossCF)} carries forward to next year.`, go: 'deductions' });
  const nonEmp = res.businessNet + res.rentalNet + res.investNet + res.otherIncome + res.cgt.taxableGain;
  if (nonEmp > 30000 && !(y.flags && y.flags.provisional)) w.push({ level: 'warn', text: 'You have more than R30 000 of income not taxed through PAYE – you are probably a provisional taxpayer and must submit IRP6 returns.', go: 'provisional' });
  if (res.provisional && !res.provisional.penalty.ok && y.flags && y.flags.provisional) w.push({ level: 'warn', text: `Second provisional estimate is below the safe level (R${fmt(res.provisional.penalty.targetTI)}). Possible underestimation penalty of R${fmt(res.provisional.penalty.amount)}.`, go: 'p2' });
  if (res.tfsa.excess > 0) w.push({ level: 'warn', text: `Tax-free savings contributions exceed the limit by R${fmt(res.tfsa.excess)} – 40% tax of R${fmt(res.tfsa.tax)} is payable.`, go: 'investments' });
  if (res.companyCar.fromIrp5 && !res.companyCar.enabled) w.push({ level: 'tip', text: 'A company car fringe benefit is on the IRP5. With a logbook it can be reduced for business kilometres and private costs paid personally.', go: 'companycar' });
  if (res.cop) w.push({ level: 'info', text: 'Married in community of property: 50% of interest, dividends, rental income and capital gains is taxed in each spouse’s hands.', go: 'client' });
  if (res.recon && res.recon.entered && res.recon.material) w.push({ level: 'warn', text: `The SARS assessment differs from the plan. Objection deadline: ${res.recon.objectionDeadline || 'enter the assessment date'}.`, go: 'assessment' });
  if (res.interest89 && res.interest89.applies) w.push({ level: 'info', text: `Interest of about R${fmt(res.interest89.amount)} (s89quat) is expected on tax owing from ${res.interest89.effectiveDate} to the assessment date.`, go: 'p3' });
  if (res.businessNet < 0) w.push({ level: 'info', text: 'Business loss set off against other income – check the s20A ring-fencing rules if you have losses in 3 of the last 5 years.', go: 'business' });
  return w;
}

function fmt(v, dec) {
  const x = Number(v) || 0;
  return x.toLocaleString('en-ZA', { minimumFractionDigits: dec === undefined ? 0 : dec, maximumFractionDigits: dec === undefined ? 0 : dec }).replace(/ /g, ' ');
}

const api = { companyCarCalc, taxByBracket, addBusinessDays, saHolidays, isBusinessDay, lastBusinessDayOnOrBefore, daysBetween, assessmentInterest, assessmentRecon, r2, n, sum, clone, deepMerge, getPack, tableTax, marginalRate, ageAtYearEnd, rebatesFor, thresholdFor, normalTax, emptyYear, emptyClient, aggregateIrp5, travelBand, travelClaim, cgtCalc, lumpSumTax, medicalCredits, compute, basicAmount, provisionalCalc, dueDates, fmt };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IntaxEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
