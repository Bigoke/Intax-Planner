// IRP5 / IT3(a) source codes used by Intax Planner.
// "treat" tells the engine what to do with the amount:
//   income      – taxable income (employment)
//   pension     – taxable pension / annuity income
//   travel      – taxable travel allowance (also caps the travel deduction)
//   fringe      – taxable fringe benefit
//   medFringe   – taxable fringe benefit AND counts as a medical scheme contribution paid by the taxpayer
//   retFringe   – taxable fringe benefit AND counts as a retirement fund contribution (s11F)
//   exempt      – shown on IRP5 but not taxable
//   retContrib  – employee retirement fund contribution (s11F)
//   medContrib  – medical scheme contribution paid by the employee
//   donation    – s18A donation deducted by the employer
//   lumpRet     – retirement / severance lump sum (special table)
//   lumpWd      – withdrawal lump sum (special table)
//   savingsWd   – two-pot savings withdrawal benefit (marginal rates)
//   paye        – employees' tax deducted (credit)
//   lumpTax     – tax deducted on lump sums (credit)
//   info        – information only
(function (root) {
'use strict';

const CODES = [
  // Normal income
  { code: '3601', name: 'Income (salary, wages)', treat: 'income', group: 'Normal income' },
  { code: '3602', name: 'Income – non-taxable', treat: 'exempt', group: 'Normal income' },
  { code: '3603', name: 'Pension', treat: 'pension', group: 'Normal income' },
  { code: '3605', name: 'Annual payment (bonus, 13th cheque)', treat: 'income', group: 'Normal income' },
  { code: '3606', name: 'Commission', treat: 'income', group: 'Normal income' },
  { code: '3607', name: 'Overtime', treat: 'income', group: 'Normal income' },
  { code: '3608', name: 'Arbitration award', treat: 'income', group: 'Normal income' },
  { code: '3610', name: 'Annuity from a retirement annuity fund', treat: 'pension', group: 'Normal income' },
  { code: '3611', name: 'Purchased annuity', treat: 'pension', group: 'Normal income' },
  { code: '3613', name: 'Restraint of trade', treat: 'income', group: 'Normal income' },
  { code: '3615', name: "Director's remuneration", treat: 'income', group: 'Normal income' },
  { code: '3616', name: 'Independent contractor', treat: 'income', group: 'Normal income' },
  { code: '3617', name: 'Labour broker', treat: 'income', group: 'Normal income' },
  // Allowances
  { code: '3701', name: 'Travel allowance', treat: 'travel', group: 'Allowances' },
  { code: '3702', name: 'Reimbursive travel allowance (taxable)', treat: 'travel', group: 'Allowances' },
  { code: '3703', name: 'Reimbursive travel allowance (non-taxable)', treat: 'exempt', group: 'Allowances' },
  { code: '3704', name: 'Subsistence allowance – local (taxable)', treat: 'income', group: 'Allowances' },
  { code: '3705', name: 'Subsistence allowance – local (non-taxable)', treat: 'exempt', group: 'Allowances' },
  { code: '3707', name: 'Share options exercised', treat: 'income', group: 'Allowances' },
  { code: '3708', name: 'Public office allowance', treat: 'income', group: 'Allowances' },
  { code: '3713', name: 'Other allowances (taxable)', treat: 'income', group: 'Allowances' },
  { code: '3714', name: 'Other allowances (non-taxable)', treat: 'exempt', group: 'Allowances' },
  { code: '3715', name: 'Subsistence allowance – foreign (taxable)', treat: 'income', group: 'Allowances' },
  { code: '3716', name: 'Subsistence allowance – foreign (non-taxable)', treat: 'exempt', group: 'Allowances' },
  { code: '3718', name: 'Vesting of equity instruments', treat: 'income', group: 'Allowances' },
  // Fringe benefits
  { code: '3801', name: 'General fringe benefits', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3802', name: 'Use of motor vehicle (company car)', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3803', name: 'Use of asset', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3804', name: 'Meals, refreshments and vouchers', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3805', name: 'Free or cheap accommodation', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3806', name: 'Free or cheap services', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3807', name: 'Low or interest-free loans', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3808', name: "Employee's debt paid or waived", treat: 'fringe', group: 'Fringe benefits' },
  { code: '3809', name: 'Taxable bursaries or scholarships', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3810', name: 'Medical scheme contributions paid by employer', treat: 'medFringe', group: 'Fringe benefits' },
  { code: '3813', name: 'Medical services costs paid by employer', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3815', name: 'Non-taxable fringe benefit', treat: 'exempt', group: 'Fringe benefits' },
  { code: '3816', name: 'Use of motor vehicle (operating lease)', treat: 'fringe', group: 'Fringe benefits' },
  { code: '3817', name: 'Employer contributions to pension, provident or RA funds', treat: 'retFringe', group: 'Fringe benefits' },
  // Lump sums
  { code: '3901', name: 'Gratuities / severance benefit', treat: 'lumpRet', group: 'Lump sums' },
  { code: '3915', name: 'Retirement fund lump sum (retirement, death, retrenchment)', treat: 'lumpRet', group: 'Lump sums' },
  { code: '3920', name: 'Retirement fund lump sum withdrawal benefit', treat: 'lumpWd', group: 'Lump sums' },
  { code: '3921', name: 'Living annuity commutation', treat: 'lumpRet', group: 'Lump sums' },
  // Deductions
  { code: '4001', name: 'Current pension fund contributions', treat: 'retContrib', group: 'Deductions' },
  { code: '4002', name: 'Arrear pension fund contributions', treat: 'retContrib', group: 'Deductions' },
  { code: '4003', name: 'Current provident fund contributions', treat: 'retContrib', group: 'Deductions' },
  { code: '4005', name: 'Medical scheme contributions (employee)', treat: 'medContrib', group: 'Deductions' },
  { code: '4006', name: 'Current retirement annuity fund contributions', treat: 'retContrib', group: 'Deductions' },
  { code: '4007', name: 'Arrear retirement annuity fund contributions', treat: 'retContrib', group: 'Deductions' },
  { code: '4030', name: 'Donations deducted from remuneration (s18A)', treat: 'donation', group: 'Deductions' },
  { code: '4472', name: "Employer's pension fund contributions", treat: 'info', group: 'Employer contributions' },
  { code: '4473', name: "Employer's provident fund contributions", treat: 'info', group: 'Employer contributions' },
  { code: '4474', name: "Employer's medical scheme contributions", treat: 'info', group: 'Employer contributions' },
  { code: '4493', name: "Employer's retirement annuity fund contributions", treat: 'info', group: 'Employer contributions' },
  // Tax
  { code: '4102', name: 'PAYE (employees’ tax)', treat: 'paye', group: 'Tax deducted' },
  { code: '4115', name: 'Tax on retirement lump sum / severance benefit', treat: 'lumpTax', group: 'Tax deducted' },
  { code: '4116', name: 'Medical scheme fees tax credit allowed by employer', treat: 'info', group: 'Tax deducted' },
  { code: '4141', name: 'UIF contribution', treat: 'info', group: 'Tax deducted' },
  { code: '4142', name: 'SDL contribution (employer)', treat: 'info', group: 'Tax deducted' },
  { code: '4149', name: 'Total tax, SDL and UIF', treat: 'info', group: 'Tax deducted' }
];

// ITR12 sections (non-IRP5 items) the planner maps its figures into.
const ITR12_SECTIONS = {
  localInterest: 'Local interest (incl. SA REIT interest)',
  foreignInterest: 'Foreign interest',
  localDividends: 'Local dividends (exempt – dividends tax withheld)',
  reitDividends: 'Dividends from SA REITs (taxable)',
  foreignDividends: 'Foreign dividends',
  rental: 'Rental income (local)',
  business: 'Local business, trade and professional income',
  otherIncome: 'Other income',
  cgt: 'Capital gains / losses',
  foreignEmployment: 'Foreign employment income',
  ra: 'Retirement fund contributions (RA certificates / IT3(f))',
  medical: 'Medical aid and medical expenses',
  donations: 'Donations to approved PBOs (s18A certificates)',
  travel: 'Travel expenses (logbook)',
  homeOffice: 'Home office expenses',
  otherDeductions: 'Other deductions',
  assessedLoss: 'Assessed loss brought forward',
  foreignTaxCredit: 'Foreign tax credits (s6quat)',
  provisionalPaid: 'Provisional tax paid (IRP6)'
};

const __exp = { CODES, ITR12_SECTIONS };
if (typeof module !== 'undefined' && module.exports) module.exports = __exp; else root.IntaxCodes = __exp;
})(typeof window !== 'undefined' ? window : globalThis);
