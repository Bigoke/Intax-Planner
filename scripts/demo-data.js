// Demo data for smoke tests and screenshots (fictional people).
'use strict';
const E = require('../src/engine/engine.js');
const irp = (employer, codes) => ({ employer, payeRef: '7123456789', from: '2026-03-01', to: '2027-02-28', codes: Object.entries(codes).map(([code, amount]) => ({ code, amount })) });

const c1 = Object.assign(E.emptyClient(), { id: 'demo1', firstName: 'Thandi', surname: 'Mokoena', taxRef: '0123456789', idNumber: '7904120000000', dob: '1979-04-12', email: 'thandi@example.co.za', phone: '082 000 0000', maritalStatus: 'Married out of community' });
const y = E.emptyYear(2027);
Object.assign(y.flags, { employment: true, business: true, rental: true, investments: true, cgt: true, retirement: true, medical: true, travel: true, donations: true, provisional: true });
y.irp5 = [irp('Acme Engineering (Pty) Ltd', { 3601: 720000, 3605: 60000, 3701: 96000, 3810: 36000, 3817: 54000, 4001: 54000, 4005: 18000, 4102: 205000, 4116: 9024, 4141: 2125, 4474: 36000 })];
y.business = [{ name: 'Mokoena Consulting', kind: 'Freelance / consulting', turnover: 280000, otherIncome: 0, costOfSales: 0, wearTear: 8000, homeOffice: 14000, expenses: [{ desc: 'Software & subscriptions', amount: 12000 }, { desc: 'Cellphone & internet', amount: 9000 }, { desc: 'Accounting fees', amount: 6500 }] }];
y.rental = [{ property: '12 Oak Street, Pretoria', rent: 144000, sharePct: 100, expenses: [{ desc: 'Bond interest', amount: 62000 }, { desc: 'Rates & taxes', amount: 14400 }, { desc: 'Insurance', amount: 6000 }, { desc: 'Agent / letting fees', amount: 11520 }] }];
y.investments = { localInterest: 42000, foreignInterest: 0, localDividends: 15000, reitDividends: 3000, foreignDividends: 8000, dividendsTaxWithheld: 3000 };
y.cgt.items = [{ desc: '1 200 Satrix 40 units', type: 'shares', date: '2026-09-15', proceeds: 210000, baseCost: 95000, costs: 800 }, { desc: '0.15 BTC', type: 'crypto', date: '2026-11-02', proceeds: 230000, baseCost: 120000, costs: 1200 }];
y.deductions.raContrib = 60000; y.deductions.donations = 12000;
y.medical = { onScheme: true, months: 12, dependants: 2, contributions: 0, qme: 25000, disability: false };
y.travel = Object.assign(y.travel, { enabled: true, method: 'best', vehicleValue: 520000, totalKm: 32000, businessKm: 14000, daysUsed: 365, fuelBorne: true, maintBorne: true });
y.provisional.basicAmount = { lastAssessedYear: 2026, lastAssessedTI: 905000, lessCapitalGain: 0, lessLumpSums: 0 };
y.provisional.p1.paid = 30000; y.provisional.p1.datePaid = '2026-08-29';
y.status = 'In progress';
c1.years[2027] = y;
const y26 = E.clone(y); y26.year = 2026; y26.irp5 = [irp('Acme Engineering (Pty) Ltd', { 3601: 680000, 3605: 55000, 3701: 90000, 4102: 190000, 4001: 51000, 4005: 17000, 3810: 34000, 3817: 51000 })]; y26.cgt.items = []; y26.provisional.p1.paid = 25000; y26.provisional.p2.paid = 40000; y26.status = 'Assessed';
c1.years[2026] = y26;

const c2 = Object.assign(E.emptyClient(), { id: 'demo2', firstName: 'Johan', surname: 'van der Merwe', taxRef: '9876543210', dob: '1952-08-30', email: 'johan@example.co.za' });
const z = E.emptyYear(2027);
Object.assign(z.flags, { employment: true, investments: true, medical: true, provisional: true, lumpSums: true });
z.irp5 = [irp('Old Mutual Pension', { 3603: 310000, 4102: 38000 })];
z.investments.localInterest = 120000;
z.medical = { onScheme: true, months: 12, dependants: 1, contributions: 72000, qme: 40000, disability: false };
z.lumps.savingsWithdrawal = 25000;
c2.years[2027] = z;

const settings = { practice: { name: 'Bigoke Tax & Accounting', practitioner: 'A. Practitioner', prNumber: 'PR-0000000', regBody: 'SAIT', address: '1 Main Road\nJohannesburg, 2000', phone: '011 000 0000', email: 'tax@example.co.za', website: '', logo: '', disclaimer: 'This computation is an estimate prepared for tax planning purposes from information supplied by the taxpayer. Final liability is determined by SARS on assessment.' }, lastClient: 'demo1', lastYear: 2027, interestRate: 10.5, reportAccent: '#0b7a75' };
module.exports = { clients: [c1, c2], settings };
