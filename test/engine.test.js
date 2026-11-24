// Engine tests – each expected figure is worked out by hand from the SARS tables.
'use strict';
const E = require('../src/engine/engine.js');
const { TAX_PACKS, YEARS } = require('../src/data/taxpacks.js');
const { CODES } = require('../src/data/codes.js');

let pass = 0, fail = 0;
function eq(name, got, want, tol = 0.01) {
  if (Math.abs(got - want) <= tol) { pass++; }
  else { fail++; console.log('FAIL', name, 'got', got, 'want', want); }
}
const P = (y) => E.getPack(TAX_PACKS, y);
const client = (dob) => Object.assign(E.emptyClient(), { dob: dob || '1985-06-15' });
const year = (y, f) => { const d = E.emptyYear(y); f && f(d); return d; };
const irp = (codes) => [{ employer: 'Test', codes: Object.entries(codes).map(([code, amount]) => ({ code, amount })) }];

// 1. Salary only, 2027
let y = year(2027, d => { d.irp5 = irp({ 3601: 600000, 4102: 120000 }); });
let r = E.compute(client(), y, P(2027), CODES);
eq('salary TI', r.taxableIncome, 600000);
eq('salary tax', r.normalTax, 132907);
eq('salary balance', r.balance, 12907);

// 2. 2024 tables, age 70, secondary rebate
eq('2024 age 70', E.normalTax(500000, 70, P(2024)), 90828);
// tertiary rebate 2027 age 80 below threshold
eq('2027 threshold 75+', E.normalTax(171300, 80, P(2027)), 0, 1);
eq('2027 threshold <65', E.normalTax(99000, 30, P(2027)), 0, 1);
eq('2027 threshold 65', E.normalTax(153250, 66, P(2027)), 0, 1);
// every year: threshold gives ~0 tax
for (const yr of YEARS) { const p = P(yr); eq('threshold ' + yr, E.normalTax(p.thresholds.under65, 40, p), 0, 2); eq('threshold65 ' + yr, E.normalTax(p.thresholds.age65, 70, p), 0, 2); eq('threshold75 ' + yr, E.normalTax(p.thresholds.age75, 80, p), 0, 2); }
// bracket continuity every year
for (const yr of YEARS) { const b = P(yr).brackets; for (let i = 1; i < b.length; i++) eq(`continuity ${yr} ${i}`, b[i - 1].base + b[i - 1].rate * (b[i].from - b[i - 1].from), b[i].base, 1); }

// 3. RA limit 27.5%
y = year(2027, d => { d.irp5 = irp({ 3601: 600000 }); d.deductions.raContrib = 200000; });
r = E.compute(client(), y, P(2027), CODES);
eq('RA allowed', r.ra.allowed, 165000);
eq('RA cf', r.ra.carryForward, 35000);
eq('RA tax', r.normalTax, 78267);

// 4. Medical credits under 65
y = year(2027, d => { d.irp5 = irp({ 3601: 600000, 4005: 60000 }); d.medical = { onScheme: true, months: 12, dependants: 2, contributions: 0, qme: 20000 }; });
r = E.compute(client(), y, P(2027), CODES);
eq('MTC', r.medical.mtc, 12072);
eq('additional <65', r.medical.additional, 0);
eq('tax after MTC', r.normalTax, 132907 - 12072);
// Medical 65+: 33.3% x ((60000 - 3*12072) + 20000) = 0.333*(23784+20000)=14580.07
r = E.compute(client('1950-01-01'), y, P(2027), CODES);
eq('additional 65+', r.medical.additional, 14580.07, 0.05);

// 5. Travel deemed 2027
y = year(2027, d => { d.irp5 = irp({ 3601: 400000, 3701: 120000 }); d.travel = Object.assign(d.travel, { enabled: true, method: 'deemed', vehicleValue: 400000, totalKm: 30000, businessKm: 15000 }); });
r = E.compute(client(), y, P(2027), CODES);
eq('travel deemed', r.travel.chosen, 99806.55, 1);
eq('travel TI', r.taxableIncome, 520000 - r.travel.chosen, 0.01);

// 6. CGT 2027
y = year(2027, d => { d.cgt.items = [{ desc: 'Shares', type: 'shares', proceeds: 250000, baseCost: 100000, costs: 0 }]; });
r = E.compute(client(), y, P(2027), CODES);
eq('CGT taxable', r.cgt.taxableGain, 40000);
// primary residence 2027: gain 3.5m on proceeds 6m -> 3.5m-3m=500k -> 450k after exclusion*0.4=180000
y = year(2027, d => { d.cgt.items = [{ desc: 'House', type: 'primary', proceeds: 6000000, baseCost: 2500000, costs: 0 }]; });
eq('primary residence', E.compute(client(), y, P(2027), CODES).cgt.taxableGain, 180000);

// 7. Withdrawal lump sum
y = year(2027, d => { d.lumps.withdrawal = 100000; });
eq('withdrawal tax', E.compute(client(), y, P(2027), CODES).lump.withdrawalTax, 13050);
// retirement lump sum 800k: 39600 + 0.27*30000 = 47700
y = year(2027, d => { d.lumps.retirement = 800000; });
eq('retirement tax', E.compute(client(), y, P(2027), CODES).lump.retirementTax, 47700);
// old table 2022: withdrawal 100k -> 13500
y = year(2022, d => { d.lumps.withdrawal = 100000; });
eq('withdrawal 2022', E.compute(client(), y, P(2022), CODES).lump.withdrawalTax, 13500);

// 8. Interest exemption
y = year(2027, d => { d.investments.localInterest = 30000; d.investments.foreignDividends = 9000; });
r = E.compute(client(), y, P(2027), CODES);
eq('interest net', r.interest.local - r.interest.exempt, 6200);
eq('foreign div taxable', r.investNet, 6200 + 4000);

// 9. Provisional P1 for business owner
y = year(2027, d => { d.business = [{ name: 'Consulting', turnover: 500000, expenses: [{ desc: 'Costs', amount: 100000 }] }]; d.flags.provisional = true; });
r = E.compute(client(), y, P(2027), CODES);
eq('business TI', r.taxableIncome, 400000);
eq('P1 due', r.provisional.p1.due, 33708.5);
eq('P2 due (nothing paid)', r.provisional.p2.due, 67417);
y.provisional.p1.paid = 33708.5; y.provisional.p2.paid = 20000;
r = E.compute(client(), y, P(2027), CODES);
eq('P3 top-up', r.provisional.p3.due, 67417 - 53708.5);
// penalty: TI 400k <= 1m, basic amount 0 -> target = 90% = 360000; tax = 79998 - 17820 + 0 ... = 62178 ; paid 53708.5 -> 20% x 8469.5
eq('penalty', r.provisional.penalty.amount, 0.2 * (E.normalTax(360000, 38, P(2027)) - 53708.5), 0.05);

// 10. Donations limited to 10%
y = year(2027, d => { d.irp5 = irp({ 3601: 300000 }); d.deductions.donations = 50000; });
r = E.compute(client(), y, P(2027), CODES);
eq('donation allowed', r.donations.allowed, 30000);
eq('donation cf', r.donations.carryForward, 20000);

// 11. Basic amount uplift
y = year(2027, d => { d.provisional.basicAmount = { lastAssessedYear: 2025, lastAssessedTI: 500000, lessCapitalGain: 0, lessLumpSums: 0 }; });
eq('basic amount +16%', E.basicAmount(y, P(2027)).amount, 580000);

// 12. Married in community of property – half of interest, rental, CGT
y = year(2027, d => { d.investments.localInterest = 60000; d.rental = [{ property: 'Flat', rent: 120000, sharePct: 100, expenses: [{ desc: 'Rates', amount: 20000 }] }]; d.cgt.items = [{ desc: 'Shares', type: 'shares', proceeds: 300000, baseCost: 100000 }]; });
const cop = Object.assign(client(), { maritalStatus: 'Married in community of property' });
r = E.compute(cop, y, P(2027), CODES);
eq('cop interest', r.interest.local - r.interest.exempt, 30000 - 23800);
eq('cop rental', r.rentalNet, 50000);
eq('cop cgt', r.cgt.taxableGain, (100000 - 50000) * 0.4);
y.cop = false; eq('cop override off', E.compute(cop, y, P(2027), CODES).rentalNet, 100000);

// 13. Company car reduction
y = year(2027, d => { d.irp5 = irp({ 3601: 500000, 3802: 168000 }); d.companyCar = { enabled: true, determinedValue: 400000, maintenancePlan: false, months: 12, totalKm: 30000, businessKm: 12000, fuelBorne: true, maintBorne: false, insurance: 0, licence: 0 }; });
r = E.compute(client(), y, P(2027), CODES);
eq('car calc value', r.companyCar.calculated, 168000);
eq('car reduction', r.companyCar.reduction, 67200 + 18000 * 1.734, 0.01);
eq('car TI', r.taxableIncome, 668000 - r.companyCar.reduction);

// 14. TFSA excess
y = year(2027, d => { d.tfsa = { contributions: 56000, priorTotal: 100000 }; });
r = E.compute(client(), y, P(2027), CODES);
eq('tfsa tax', r.tfsa.tax, 4000);
y.tfsa = { contributions: 40000, priorTotal: 480000 };
eq('tfsa lifetime', E.compute(client(), y, P(2027), CODES).tfsa.tax, 20000 * 0.4);

// 15. Business days and due dates
eq('Good Friday 2027 not business day', E.isBusinessDay(new Date('2027-03-26T00:00:00Z')) ? 1 : 0, 0);
eq('skip 16 Dec', E.addBusinessDays('2026-12-14', 3) === '2026-12-18' ? 1 : 0, 1);
eq('P2 due 2027 moves to Friday', E.dueDates(P(2027)).p2 === '2027-02-26' ? 1 : 0, 1);
eq('Christmas 2027 Sat, 26 Sun -> Mon 27 holiday', E.isBusinessDay(new Date('2027-12-27T00:00:00Z')) ? 1 : 0, 0);

// 16. Bracket analysis adds up
y = year(2027, d => { d.irp5 = irp({ 3601: 1234567 }); });
r = E.compute(client(), y, P(2027), CODES);
eq('brackets sum', r.brackets.reduce((a, b) => a + b.tax, 0), r.grossTax, 0.05);

// 17. Assessment recon + objection deadline
y.assessment = { date: '2026-11-02', taxableIncome: 1240000, normalTax: null, paye: null, provisional: null, balance: null };
r = E.compute(client(), y, P(2027), CODES);
eq('recon diff', r.recon.rows[0].diff, 1240000 - 1234567);
eq('objection deadline set', r.recon.objectionDeadline > '2027-02-01' ? 1 : 0, 1);

// 18. Two vehicles in one year (deemed cost each, fixed cost pro-rated by days), capped at the allowance
y = year(2027, d => { d.irp5 = irp({ 3601: 400000, 3701: 150000 }); d.travel = { enabled: true, vehicles: [
  Object.assign(E.emptyVehicle(1), { method: 'deemed', vehicleValue: 400000, daysUsed: 182, totalKm: 15000, businessKm: 8000 }),
  Object.assign(E.emptyVehicle(2), { method: 'deemed', vehicleValue: 200000, daysUsed: 183, totalKm: 12000, businessKm: 5000 }) ] }; });
r = E.compute(client(), y, P(2027), CODES);
const v1 = (125393 * 182 / 365 / 15000 + 1.734 + 0.74) * 8000, v2 = (68487 * 183 / 365 / 12000 + 1.484 + 0.614) * 5000;
eq('vehicle 1', r.travel.vehicles[0].deemed, v1, 1);
eq('vehicle 2', r.travel.vehicles[1].deemed, v2, 1);
eq('two vehicles total', r.travel.chosen, Math.min(150000, v1 + v2), 2);

// 19. Two company cars, IRP5 total split by calculated value
y = year(2027, d => { d.irp5 = irp({ 3601: 500000, 3802: 150000 }); d.companyCars = [Object.assign(E.emptyCompanyCar(1), { determinedValue: 400000, months: 6 }), Object.assign(E.emptyCompanyCar(2), { determinedValue: 200000, months: 6 })]; });
r = E.compute(client(), y, P(2027), CODES);
eq('car split 1', r.companyCar.cars[0].value, 100000, 0.01);
eq('car split 2', r.companyCar.cars[1].value, 50000, 0.01);
eq('no reduction without km', r.companyCar.reduction, 0);

// 20. Home office: employee, 12% of home, laptop bought in year, internet disallowed
y = year(2027, d => { d.irp5 = irp({ 3601: 600000 }); d.homeOffice = Object.assign(E.emptyHomeOffice(), { enabled: true, basis: 'employee', exclusive: true, equipped: true, mainlyAtHome: true, officeArea: 12, homeArea: 100,
  costs: Object.assign(E.emptyHomeOffice().costs, { bondInterest: 60000, rates: 12000, electricity: 18000, other: 10000 }),
  assets: [{ desc: 'Laptop', type: 'laptop', cost: 24000, years: 2, purchaseDate: '2026-09-15', businessPct: 100 }, { desc: 'Chair', type: 'furniture', cost: 3500, years: 6, purchaseDate: '2026-05-01', businessPct: 100 }],
  otherCosts: [{ desc: 'Internet', amount: 6000 }] }); });
r = E.compute(client(), y, P(2027), CODES);
eq('ho premises', r.homeOffice.premises, 100000 * 0.12);
eq('ho laptop 6 months of 2 years', r.homeOffice.assets[0].claim, 24000 / 2 * 6 / 12);
eq('ho small item', r.homeOffice.assets[1].claim, 3500);
eq('ho internet disallowed for employee', r.homeOffice.other, 0);
eq('ho TI', r.taxableIncome, 600000 - 12000 - 6000 - 3500);
y.homeOffice.mainlyAtHome = false;
r = E.compute(client(), y, P(2027), CODES);
eq('ho not eligible: only wear and tear', r.homeOffice.total, 9500);
// laptop bought 2 years earlier is fully written off
eq('laptop written off', E.assetWearTear({ cost: 24000, years: 2, purchaseDate: '2024-03-01' }, P(2027)).claim, 0);
eq('desktop year 2 of 3', E.assetWearTear({ cost: 30000, years: 3, purchaseDate: '2025-03-01' }, P(2027)).claim, 10000);

// 21. Custom (user-added) tax year
const { yearMeta } = require('../src/data/taxpacks.js');
const ov = { 2028: Object.assign(JSON.parse(JSON.stringify(P(2027))), yearMeta(2028), { custom: true }) };
ov[2028].rebates.primary = 18500;
const p28 = E.getPack(TAX_PACKS, 2028, ov);
eq('custom year primary', p28.rebates.primary, 18500);
eq('custom year end', p28.end === '2028-02-29' ? 1 : 0, 1);
y = year(2028, d => { d.irp5 = irp({ 3601: 600000 }); });
eq('custom year tax', E.compute(client(), y, p28, CODES).normalTax, 150727 - 18500);

// 22. SARS tax calculator (ITC12) parse and reconcile (fictional figures)
const IT = require('../src/engine/itc12.js');
const itcText = `INCOME TAX  ITC12
Tax Calculator Result
Reference Number:  0123456789
Year Of Assessment:  2026
Issue Date:  20261101
Amounts Assessed
Code  Source Code Description  Rand
3601  INCOME - TAXABLE  500000.00
4201  LOCAL INTEREST (EXCLUDING SARS  10000.00
3499  LOSS-OTHER NOT SPECIFIED  20000.00
Total  490000.00
Deductions
Code  Source Code Description  Rand
Total  0.00
Taxable Income  490000.00
Rating percentage (%)  23.35
Normal tax on taxable income  114407.00
Rebates  17235.00
Additional Tax  0.00
Administrative penalties  0.00
Retirement fund lump sum benefit tax liability  0.00
Retirement fund lump sum withdrawal benefit tax liability  0.00
Subtotal  97172.00
Employees' tax and tax credits  100000.00
Calculated Result  -2828.00`;
const it = IT.parseItc12(itcText);
eq('itc valid', it.valid ? 1 : 0, 1);
eq('itc loss signed', it.assessed[2].signed, -20000);
eq('itc result', it.result, -2828);
eq('itc year', it.year, 2026);
y = year(2026, d => { d.irp5 = irp({ 3601: 500000, 4102: 100000 }); d.investments.localInterest = 33800; d.business = [{ name: 'Side', turnover: 0, expenses: [{ desc: 'x', amount: 20000 }] }]; d.provisional.p1.paid = 5000; });
r = E.compute(client(), y, P(2026), CODES);
const rc = IT.reconcileItc12(it, r, r.provisionalPaid);
eq('itc TI agrees', rc.tax[0].diff, 0);
eq('itc result agrees', rc.tax[6].diff, 0);
eq('itc categories agree', rc.rows.reduce((a, x) => a + Math.abs(x.diff), 0), 0);
eq('itc after provisional', rc.sarsAfterProvisional, -7828);
eq('itc no difference', rc.difference, 0);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
