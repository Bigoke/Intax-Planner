// Intax Planner – default SARS tax packs, 2020 to 2027 tax years.
// A "tax year" is named after the year in which it ends: 2027 = 1 March 2026 – 28 February 2027.
// Every figure here can be overridden by the user on the Tax Tables screen; overrides are stored
// separately (Documents\Intax Planner\taxpacks.json) so updates never overwrite them.
//
// Sources: SARS "Rates of tax for individuals", Budget Tax Guides 2019–2026, SARS rate-per-kilometre
// notices / eLogbooks, SARS retirement lump sum tables, SARS subsistence allowance notices.

(function (root) {
'use strict';

// Brackets: tax = base + rate * (taxable income - from), for the last bracket whose "from" is below income.
const B = (rows) => rows.map(([from, base, rate]) => ({ from, base, rate }));

const BR_2020 = B([[0, 0, 0.18], [195850, 35253, 0.26], [305850, 63853, 0.31], [423300, 100263, 0.36], [555600, 147891, 0.39], [708310, 207448, 0.41], [1500000, 532041, 0.45]]);
const BR_2021 = B([[0, 0, 0.18], [205900, 37062, 0.26], [321600, 67144, 0.31], [445100, 105429, 0.36], [584200, 155505, 0.39], [744800, 218139, 0.41], [1577300, 559464, 0.45]]);
const BR_2022 = B([[0, 0, 0.18], [216200, 38916, 0.26], [337800, 70532, 0.31], [467500, 110739, 0.36], [613600, 163335, 0.39], [782200, 229089, 0.41], [1656600, 587593, 0.45]]);
const BR_2023 = B([[0, 0, 0.18], [226000, 40680, 0.26], [353100, 73726, 0.31], [488700, 115762, 0.36], [641400, 170734, 0.39], [817600, 239452, 0.41], [1731600, 614192, 0.45]]);
const BR_2024 = B([[0, 0, 0.18], [237100, 42678, 0.26], [370500, 77362, 0.31], [512800, 121475, 0.36], [673000, 179147, 0.39], [857900, 251258, 0.41], [1817000, 644489, 0.45]]);
const BR_2027 = B([[0, 0, 0.18], [245100, 44118, 0.26], [383100, 79998, 0.31], [530200, 125599, 0.36], [695800, 185215, 0.39], [887000, 259783, 0.41], [1878600, 666339, 0.45]]);

// Retirement lump sum tables
const LS_WD_OLD = B([[0, 0, 0], [25000, 0, 0.18], [660000, 114300, 0.27], [990000, 203400, 0.36]]);
const LS_RT_OLD = B([[0, 0, 0], [500000, 0, 0.18], [700000, 36000, 0.27], [1050000, 130500, 0.36]]);
const LS_WD_NEW = B([[0, 0, 0], [27500, 0, 0.18], [726000, 125730, 0.27], [1089000, 223740, 0.36]]);
const LS_RT_NEW = B([[0, 0, 0], [550000, 0, 0.18], [770000, 39600, 0.27], [1155000, 143550, 0.36]]);

// Travel cost scale: upTo = upper value of band (null = no limit), fixed R p.a., fuel c/km, maint c/km
const T = (rows) => rows.map(([upTo, fixed, fuel, maint]) => ({ upTo, fixed, fuel, maint }));
const TR_2020 = T([[85000, 28352, 95.7, 34.4], [170000, 50631, 106.8, 43.1], [255000, 72983, 116.0, 47.5], [340000, 92683, 124.8, 51.9], [425000, 112443, 133.5, 60.9], [510000, 133147, 153.2, 71.6], [595000, 153850, 158.4, 88.9], [null, 153850, 158.4, 88.9]]);
const TR_2021 = T([[95000, 31332, 105.8, 37.4], [190000, 55894, 118.1, 46.8], [285000, 80539, 128.3, 51.6], [380000, 102211, 138.0, 56.4], [475000, 123955, 147.7, 66.2], [570000, 146753, 169.4, 77.8], [665000, 169552, 175.1, 96.6], [null, 169552, 175.1, 96.6]]);
const TR_2022 = T([[95000, 29504, 104.1, 38.6], [190000, 52226, 116.2, 48.3], [285000, 75039, 126.3, 53.2], [380000, 94871, 135.8, 58.1], [475000, 114781, 145.3, 68.3], [570000, 135746, 166.7, 80.2], [665000, 156711, 172.4, 99.6], [null, 156711, 172.4, 99.6]]);
const TR_2023 = T([[95000, 29836, 131.7, 40.9], [190000, 52889, 147.0, 51.1], [285000, 76033, 159.7, 56.3], [380000, 96197, 171.8, 61.5], [475000, 116438, 183.8, 72.3], [570000, 137735, 210.8, 84.9], [665000, 159031, 218.0, 105.5], [null, 159031, 218.0, 105.5]]);
const TR_2024 = T([[100000, 33760, 141.5, 43.8], [200000, 60329, 158.0, 54.8], [300000, 86958, 171.7, 60.4], [400000, 110554, 184.6, 65.9], [500000, 134150, 197.6, 77.5], [600000, 158856, 226.6, 91.0], [700000, 183611, 230.5, 102.1], [800000, 209685, 234.3, 113.1], [null, 209685, 234.3, 113.1]]);
const TR_2025 = T([[100000, 34480, 151.7, 46.0], [200000, 61770, 169.4, 57.6], [300000, 89119, 184.0, 63.5], [400000, 113436, 197.9, 69.3], [500000, 137752, 211.8, 81.5], [600000, 163178, 243.0, 95.6], [700000, 188653, 247.1, 107.3], [800000, 215447, 251.2, 118.9], [null, 215447, 251.2, 118.9]]);
const TR_2026 = T([[100000, 33940, 146.7, 47.4], [200000, 60688, 163.8, 59.3], [300000, 87497, 177.9, 65.4], [400000, 111273, 191.4, 71.4], [500000, 135048, 204.8, 83.9], [600000, 159934, 234.9, 98.5], [700000, 184867, 238.9, 110.5], [800000, 211121, 242.9, 122.5], [null, 211121, 242.9, 122.5]]);
const TR_2027 = T([[115000, 38344, 132.9, 49.1], [230000, 68487, 148.4, 61.4], [345000, 98689, 161.2, 67.8], [460000, 125393, 173.4, 74.0], [575000, 152097, 185.5, 86.9], [690000, 180078, 212.8, 102.0], [805000, 208106, 216.5, 114.5], [920000, 237679, 220.1, 126.1], [null, 237679, 220.1, 126.1]]);

function pack(year, o) {
  return Object.assign({
    year,
    label: `${year - 1}/${String(year).slice(2)} (1 Mar ${year - 1} – ${year % 4 === 0 ? 29 : 28} Feb ${year})`,
    start: `${year - 1}-03-01`,
    end: `${year}-02-${year % 4 === 0 ? 29 : 28}`,
    interestExemption: { under65: 23800, over65: 34500 },
    cgt: { annualExclusion: 40000, deathExclusion: 300000, primaryResidence: 2000000, inclusionRate: 0.40, smallBusinessExclusion: 1800000 },
    retirement: { pct: 0.275, cap: 350000 },
    donationsPct: 0.10,
    dividendsTaxRate: 0.20,
    foreignDividendExemptFraction: 25 / 45,
    foreignEmploymentExemption: 1250000,
    tfsa: { annual: 36000, lifetime: 500000 },
    lumpSumWithdrawal: LS_WD_NEW,
    lumpSumRetirement: LS_RT_NEW,
    provisional: { penaltyRate: 0.20, latePenalty: 0.10, thresholdTI: 1000000, lowPct: 0.90, highPct: 0.80, basicUplift: 0.08 },
    medicalAdditional: { under65Pct: 0.25, over65Pct: 0.333, tiPct: 0.075, under65Multiple: 4, over65Multiple: 3 },
    companyCar: { standard: 0.035, maintenancePlan: 0.0325 },
    notes: ''
  }, o);
}

const TAX_PACKS = {
  2020: pack(2020, {
    brackets: BR_2020, rebates: { primary: 14220, secondary: 7794, tertiary: 2601 },
    thresholds: { under65: 79000, age65: 122300, age75: 136750 },
    medicalCredits: { main: 310, first: 310, additional: 209 },
    lumpSumWithdrawal: LS_WD_OLD, lumpSumRetirement: LS_RT_OLD,
    travel: { scale: TR_2020, prescribedRate: 3.61 }, subsistence: { meals: 435, incidental: 134 },
    foreignEmploymentExemption: null,
    tfsa: { annual: 33000, lifetime: 500000 },
    notes: 'Foreign employment income fully exempt if s10(1)(o)(ii) days test met (cap introduced from 2021). Subsistence rates: verify against SARS notice of 1 March 2019.'
  }),
  2021: pack(2021, {
    brackets: BR_2021, rebates: { primary: 14958, secondary: 8199, tertiary: 2736 },
    thresholds: { under65: 83100, age65: 128650, age75: 143850 },
    medicalCredits: { main: 319, first: 319, additional: 215 },
    lumpSumWithdrawal: LS_WD_OLD, lumpSumRetirement: LS_RT_OLD,
    travel: { scale: TR_2021, prescribedRate: 3.98 }, subsistence: { meals: 452, incidental: 139 }
  }),
  2022: pack(2022, {
    brackets: BR_2022, rebates: { primary: 15714, secondary: 8613, tertiary: 2871 },
    thresholds: { under65: 87300, age65: 135150, age75: 151100 },
    medicalCredits: { main: 332, first: 332, additional: 224 },
    lumpSumWithdrawal: LS_WD_OLD, lumpSumRetirement: LS_RT_OLD,
    travel: { scale: TR_2022, prescribedRate: 3.82 }, subsistence: { meals: 452, incidental: 139 }
  }),
  2023: pack(2023, {
    brackets: BR_2023, rebates: { primary: 16425, secondary: 9000, tertiary: 2997 },
    thresholds: { under65: 91250, age65: 141250, age75: 157900 },
    medicalCredits: { main: 347, first: 347, additional: 234 },
    lumpSumWithdrawal: LS_WD_OLD, lumpSumRetirement: LS_RT_OLD,
    travel: { scale: TR_2023, prescribedRate: 4.18 }, subsistence: { meals: 493, incidental: 152 }
  }),
  2024: pack(2024, {
    brackets: BR_2024, rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    thresholds: { under65: 95750, age65: 148217, age75: 165689 },
    medicalCredits: { main: 364, first: 364, additional: 246 },
    travel: { scale: TR_2024, prescribedRate: 4.64 }, subsistence: { meals: 522, incidental: 161 }
  }),
  2025: pack(2025, {
    brackets: BR_2024, rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    thresholds: { under65: 95750, age65: 148217, age75: 165689 },
    medicalCredits: { main: 364, first: 364, additional: 246 },
    travel: { scale: TR_2025, prescribedRate: 4.84 }, subsistence: { meals: 548, incidental: 169 },
    notes: 'Brackets not adjusted for inflation. Two-pot system from 1 September 2024: savings withdrawals taxed at marginal rates.'
  }),
  2026: pack(2026, {
    brackets: BR_2024, rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    thresholds: { under65: 95750, age65: 148217, age75: 165689 },
    medicalCredits: { main: 364, first: 364, additional: 246 },
    travel: { scale: TR_2026, prescribedRate: 4.76 }, subsistence: { meals: 570, incidental: 176 },
    notes: 'Brackets not adjusted for inflation (second year).'
  }),
  2027: pack(2027, {
    brackets: BR_2027, rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
    thresholds: { under65: 99000, age65: 153250, age75: 171300 },
    medicalCredits: { main: 376, first: 376, additional: 254 },
    cgt: { annualExclusion: 50000, deathExclusion: 440000, primaryResidence: 3000000, inclusionRate: 0.40, smallBusinessExclusion: 2700000 },
    retirement: { pct: 0.275, cap: 430000 },
    tfsa: { annual: 46000, lifetime: 500000 },
    travel: { scale: TR_2027, prescribedRate: 4.95 }, subsistence: { meals: 595, incidental: 184 },
    notes: 'Budget 2026: brackets, rebates and medical credits adjusted for inflation; RA cap R430 000; CGT annual exclusion R50 000; primary residence exclusion R3 million.'
  })
};
// TFSA annual limit history: 33 000 (2018–2020), 36 000 (2021–2026), 46 000 (2027).
TAX_PACKS[2021].tfsa = { annual: 36000, lifetime: 500000 };

const YEARS = Object.keys(TAX_PACKS).map(Number).sort();

const __exp = { TAX_PACKS, YEARS };
if (typeof module !== 'undefined' && module.exports) module.exports = __exp; else root.IntaxPacks = __exp;
})(typeof window !== 'undefined' ? window : globalThis);
