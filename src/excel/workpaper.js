// Intax Planner – Excel working paper builder.
// Builds a JSON workbook spec (sheets, cells, formulas, defined names) that main.js writes with exceljs.
// Inputs are values (blue on yellow); every calculation is a live Excel formula, so the workbook recalculates
// when any input changes. Used by the renderer (window.IntaxWorkpaper) and by the Node tests.
(function (root) {
'use strict';
const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };

// ---------- spec helpers ----------
function book(title) { return { title, sheets: [], names: [] }; }
function sheet(B, name, widths) {
  const sh = { name, widths: widths || [44, 18, 18, 52], cells: [], merges: [], r: 0, freeze: null, tabColor: null };
  const addr = (c, r) => String.fromCharCode(64 + c) + r;
  const api = {
    sh,
    get row() { return sh.r; },
    put(r, c, cell) { sh.cells.push(Object.assign({ r, c }, cell)); return addr(c, r); },
    abs(c, r) { return '$' + String.fromCharCode(64 + c) + '$' + r; },
    name(nm, c, r, r2) { B.names.push({ name: nm, ref: `'${name}'!${api.abs(c, r)}${r2 ? ':' + api.abs(c, r2) : ''}` }); return nm; },
    title(t, sub) { sh.r++; api.put(sh.r, 1, { v: t, st: 'title' }); if (sub) { sh.r++; api.put(sh.r, 1, { v: sub, st: 'sub' }); } sh.r++; },
    head(t, cols) { sh.r++; sh.r++; api.put(sh.r, 1, { v: t, st: 'h' }); (cols || []).forEach((x, i) => api.put(sh.r, i + 2, { v: x, st: 'h' })); for (let c = (cols || []).length + 2; c <= sh.widths.length; c++) api.put(sh.r, c, { v: '', st: 'h' }); return sh.r; },
    blank() { sh.r++; },
    // A labelled line: label in A, value/formula in B, optional extra columns, note in the last column.
    line(label, val, o) {
      o = o || {}; sh.r++;
      api.put(sh.r, 1, { v: label, st: o.total ? 'totlabel' : o.indent ? 'indent' : 'label' });
      const cell = typeof val === 'object' && val !== null && !Array.isArray(val) ? Object.assign({}, val) : { v: val };
      if (cell.v === undefined && cell.f === undefined && cell.d === undefined) cell.v = null;
      cell.fmt = cell.fmt || o.fmt || 'money';
      cell.st = cell.st || (cell.f !== undefined ? (o.link ? 'link' : o.total ? 'total' : 'calc') : 'input');
      api.put(sh.r, 2, cell);
      if (o.note) api.put(sh.r, o.noteCol || sh.widths.length, { v: o.note, st: 'note' });
      if (o.name) api.name(o.name, 2, sh.r);
      return 'B' + sh.r;
    }
  };
  B.sheets.push(sh);
  return api;
}
const F = (f, extra) => Object.assign({ f }, extra || {});
const D = (iso) => ({ d: iso || null, fmt: 'date' });
const P = (x) => `(${x})`;

// Bracket-table tax: base + rate × (amount − lower bound), looked up with INDEX/MATCH on a table named PRE_FROM/BASE/RATE.
const tbl = (x, pre) => `IFERROR(INDEX(${pre}_BASE,MATCH(${P(x)},${pre}_FROM,1))+INDEX(${pre}_RATE,MATCH(${P(x)},${pre}_FROM,1))*(${P(x)}-INDEX(${pre}_FROM,MATCH(${P(x)},${pre}_FROM,1))),0)`;
// Normal tax after rebates on an amount
const ntax = (x) => `MAX(0,${tbl(`MAX(0,${x})`, 'BR')}-Rebates_Total)`;
// Interest at SARS rates on AMOUNT for days in [START, END) – day overlap with each rate period, no helper columns needed.
function interest(amount, start, end) {
  const mn = `(${P(end)}+IR_TO-ABS(${P(end)}-IR_TO))/2`, mx = `(${P(start)}+IR_FROM+ABS(${P(start)}-IR_FROM))/2`;
  const d = `(${mn}-${mx})`;
  return `ROUND(${P(amount)}*SUMPRODUCT(IR_RATE/36500*((${d}+ABS(${d}))/2)),2)`;
}

// ---------- the client working paper ----------
function clientWorkpaper(ctx) {
  const { client, y, pack, res, pen, rates, practice, E, codes } = ctx;
  const name = ctx.clientName || [client.firstName, client.surname].filter(Boolean).join(' ') || client.name || 'Client';
  const B = book(`${name} – ${pack.label}`);
  B.fileName = `Intax working paper - ${name} - ${pack.year}.xlsx`;
  const prov = !!(y.flags && y.flags.provisional);

  // ---- Cover ----
  const C = sheet(B, 'Cover', [30, 60]);
  C.title('Intax Planner – tax working paper', practice || '');
  [['Client', name], ['Tax reference', client.taxNumber || client.taxNo || ''], ['Tax year', pack.label], ['Provisional taxpayer', prov ? 'Yes' : 'No'], ['Prepared', new Date().toISOString().slice(0, 10)]].forEach(([a, b]) => { C.sh.r++; C.put(C.sh.r, 1, { v: a, st: 'label' }); C.put(C.sh.r, 2, a === 'Prepared' ? { d: b, fmt: 'date', st: 'text' } : { v: b, st: 'text' }); });
  C.head('How to use this workbook');
  [['Input', 'Blue figures on a yellow background are inputs – change them and the workbook recalculates.', 'input'], ['Formula', 'Black figures are calculated with Excel formulas.', 'calc'], ['Link', 'Green figures are linked from another sheet.', 'link']].forEach(([a, b, st]) => { C.sh.r++; C.put(C.sh.r, 1, { v: a, st, fmt: 'text' }); C.put(C.sh.r, 2, { v: b, st: 'note' }); });
  C.head('Sheets');
  [['Computation', 'Income, deductions, taxable income, normal tax, credits and balance'], ['Provisional', 'IRP6 1st, 2nd and 3rd (top-up) payments and the underestimation test'], ['Penalties', 'Foreseeable SARS penalties and interest'], ['Tax tables', `SARS tables for ${pack.label} used by the formulas`], ['Interest rates', 'SARS Table 1 interest rates (day-by-day calculation)']].forEach(([a, b]) => { C.sh.r++; C.put(C.sh.r, 1, { v: a, st: 'label' }); C.put(C.sh.r, 2, { v: b, st: 'note' }); });
  C.sh.r += 2; C.put(C.sh.r, 1, { v: 'Estimates for planning purposes. Figures were exported from Intax Planner and can be changed here; changes are not written back to the app.', st: 'note' }); C.sh.merges.push(`A${C.sh.r}:B${C.sh.r}`);

  // ---- Computation (built before the tables so the tab order is friendly; tables are referenced by name) ----
  const W = sheet(B, 'Computation', [52, 18, 14, 58]); W.sh.freeze = 3;
  W.title(`Income tax computation – ${pack.label}`, `${name}${client.taxNumber ? ' · ' + client.taxNumber : ''}`);
  W.head('Taxpayer', ['Amount', '']);
  W.line('Date of birth', D(client.dob || null), { name: 'Client_DOB', note: 'Blank = under 65' });
  W.line('Age at the end of the tax year', F('IF(Client_DOB="",0,DATEDIF(Client_DOB,Year_End,"y"))', { fmt: 'int' }), { name: 'Client_Age' });
  W.line('Total rebates for age', F('REB_P+IF(Client_Age>=65,REB_S,0)+IF(Client_Age>=75,REB_T,0)'), { name: 'Rebates_Total', note: 's6 primary, secondary (65+) and tertiary (75+) rebates' });

  const L = res.lines || [];
  const incLines = L.filter(l => l.kind !== 'deduction' && l.section !== 'Capital gains');
  W.head('Income', ['Amount', 'Code']);
  const incStart = W.row + 1;
  let sec = null, localInt = null, forDiv = null;
  for (const l of incLines) {
    if (l.section !== sec) { sec = l.section; W.sh.r++; W.put(W.sh.r, 1, { v: sec, st: 'sect' }); }
    let cell;
    if (/interest exemption/i.test(l.label) && localInt) cell = F(`-MIN(MAX(0,${localInt}),IF(Client_Age>=65,INT_EX_65,INT_EX_U65))`);
    else if (/s10B\(3\) exempt/i.test(l.label) && forDiv) cell = F(`-ROUND(${forDiv}*FDIV_EX,2)`);
    else cell = { v: n(l.amount) };
    const a = W.line(l.label, cell, { indent: true });
    if (l.code) W.put(W.row, 3, { v: l.code, st: 'code' });
    if (l.label === 'Local interest') localInt = a;
    if (l.label === 'Foreign dividends') forDiv = a;
  }
  if (!incLines.length) W.line('No income captured', 0, { indent: true });
  const incEnd = W.row;
  W.line('Total income', F(`SUM(B${incStart}:B${incEnd})`), { total: true, name: 'Income_Total' });

  const dedLines = L.filter(l => l.kind === 'deduction' && !/^Retirement fund/.test(l.label) && !/^Donations/.test(l.label));
  W.head('Deductions (before retirement fund contributions)', ['Amount', 'Code']);
  const dStart = W.row + 1;
  for (const l of dedLines) { W.line(l.label, n(l.amount), { indent: true }); if (l.code) W.put(W.row, 3, { v: l.code, st: 'code' }); }
  if (!dedLines.length) W.line('None', 0, { indent: true });
  const dEnd = W.row;
  W.line('Taxable income before retirement contributions', F(`Income_Total+SUM(B${dStart}:B${dEnd})`), { total: true, name: 'TI_Before_RA', note: 'Deductions are shown as negative amounts' });

  const R = res.ra;
  W.head('Retirement fund contributions (s11F)', ['Amount', '']);
  W.line('Contributions for the year', n(R.contributions), { name: 'RA_Contrib', note: 'Own and employer (fringe benefit) contributions' });
  W.line('Carried forward from previous years', n(R.carriedIn), { name: 'RA_CarriedIn' });
  W.line('Remuneration for the s11F limit', n(R.remuneration), { name: 'RA_Remun', note: 'Employment income incl. fringe benefits, after the company-car logbook reduction' });
  W.line('27.5% of the greater of remuneration and taxable income', F('RA_PCT*MAX(RA_Remun,TI_Before_RA)'), { name: 'RA_Limit' });
  W.line('Deduction allowed', F('MAX(0,MIN(RA_Contrib+RA_CarriedIn,RA_CAP,RA_Limit,MAX(0,TI_Before_RA)))'), { total: true, name: 'RA_Allowed', note: 'Lesser of available, annual cap, 27.5% limit and taxable income' });
  W.line('Carried forward to next year', F('RA_Contrib+RA_CarriedIn-RA_Allowed'));

  const G = res.cgt;
  W.head('Capital gains (Eighth Schedule)', ['Amount', '']);
  W.line('Aggregate capital gain / (loss) after exclusions per asset', n(G.aggregate), { name: 'CGT_Aggregate', note: 'From the capital gains schedule (primary residence and personal-use exclusions applied)' });
  W.line('Annual exclusion', n(G.annualExclusion) === n(pack.cgt.annualExclusion) ? F('CGT_EXCL', { st: 'link' }) : { v: n(G.annualExclusion) }, { name: 'CGT_Exclusion', note: 'R440 000 in the year of death' });
  W.line('After annual exclusion', F('IF(CGT_Aggregate>0,MAX(0,CGT_Aggregate-CGT_Exclusion),MIN(0,CGT_Aggregate+CGT_Exclusion))'), { name: 'CGT_After' });
  W.line('Assessed capital loss brought forward', n(G.lossBF), { name: 'CGT_LossBF' });
  W.line('Net capital gain / (loss)', F('CGT_After-CGT_LossBF'), { name: 'CGT_Net' });
  W.line('Taxable capital gain (inclusion rate)', F('IF(CGT_Net>0,CGT_Net*CGT_INCL,0)'), { total: true, name: 'CGT_Taxable' });
  W.line('Capital loss carried forward', F('IF(CGT_Net<0,-CGT_Net,0)'));

  W.head('Donations (s18A)', ['Amount', '']);
  W.line('Taxable income after retirement contributions plus taxable capital gain', F('TI_Before_RA-RA_Allowed+CGT_Taxable'), { name: 'TI_Before_Don' });
  W.line('Donations available (incl. carried forward)', n(res.donations.available), { name: 'Don_Available' });
  W.line('Deduction allowed (limited to 10% of taxable income)', F('MAX(0,MIN(Don_Available,DON_PCT*MAX(0,TI_Before_Don)))'), { total: true, name: 'Don_Allowed' });
  W.line('Carried forward to next year', F('Don_Available-Don_Allowed'));

  W.head('Taxable income', ['Amount', '']);
  W.line('Taxable income / (assessed loss)', F('TI_Before_Don-Don_Allowed'), { name: 'TI_Raw' });
  W.line('TAXABLE INCOME', F('MAX(0,TI_Raw)'), { total: true, name: 'Taxable_Income' });
  W.line('Assessed loss carried forward', F('IF(TI_Raw<0,-TI_Raw,0)'));

  const M = res.medical;
  W.head('Normal tax', ['Amount', '']);
  W.line('Tax per the tax table', F(tbl('Taxable_Income', 'BR')), { name: 'Gross_Tax', note: 'Base amount + marginal rate × income above the bracket threshold (Tax tables)' });
  W.line('Marginal rate', F('IFERROR(INDEX(BR_RATE,MATCH(Taxable_Income,BR_FROM,1)),0)', { fmt: 'pct0' }));
  W.line('Less: rebates', F('-MIN(Gross_Tax,Rebates_Total)'), { name: 'Rebates_Used' });
  W.line('Tax after rebates', F('Gross_Tax+Rebates_Used'), { total: true, name: 'Tax_After_Rebates' });
  W.sh.r++; W.put(W.sh.r, 1, { v: 'Medical tax credits', st: 'sect' });
  W.line('Months on a medical scheme', M.months, { fmt: 'int', name: 'Med_Months', indent: true });
  W.line('Dependants on the scheme', M.dependants, { fmt: 'int', name: 'Med_Deps', indent: true });
  W.line('On a medical scheme (1 = yes, 0 = no)', M.perMonth > 0 ? 1 : 0, { fmt: 'int', name: 'Med_OnScheme', indent: true });
  W.line('Medical scheme contributions (own + employer)', n(M.contributions), { name: 'Med_Contrib', indent: true });
  W.line('Qualifying out-of-pocket medical expenses', n(M.qme), { name: 'Med_QME', indent: true });
  W.line('Taxpayer, spouse or child with a disability (1 = yes)', (y.medical && y.medical.disability) ? 1 : 0, { fmt: 'int', name: 'Med_Disab', indent: true });
  W.line('Credit per month (s6A)', F('IF(Med_OnScheme=1,MC_MAIN+IF(Med_Deps>=1,MC_FIRST,0)+MAX(0,Med_Deps-1)*MC_ADD,0)'), { name: 'Med_PerMonth', indent: true });
  W.line('Medical scheme fees tax credit', F('Med_PerMonth*Med_Months'), { name: 'Med_MTC', indent: true });
  W.line('Additional medical expenses tax credit (s6B)', F('IF(OR(Client_Age>=65,Med_Disab=1),MAX(0,MA_65PCT*((Med_Contrib-MA_65MULT*Med_MTC)+Med_QME)),MAX(0,MA_U65PCT*((MAX(0,Med_Contrib-MA_U65MULT*Med_MTC)+Med_QME)-MA_TIPCT*Taxable_Income)))'), { name: 'Med_Additional', indent: true });
  W.line('Less: medical scheme fees tax credit used', F('-MIN(Tax_After_Rebates,Med_MTC)'), { name: 'MTC_Used' });
  W.line('Less: additional medical credit used', F('-MIN(Tax_After_Rebates+MTC_Used,Med_Additional)'), { name: 'Add_Used' });
  W.line('Foreign tax credit claimed (s6quat)', n(y.foreign && y.foreign.foreignTaxCredit), { name: 'FTC_Input' });
  W.line('Less: foreign tax credit used', F('-MIN(Tax_After_Rebates+MTC_Used+Add_Used,FTC_Input)'), { name: 'FTC_Used' });
  W.line('NORMAL TAX', F('Tax_After_Rebates+MTC_Used+Add_Used+FTC_Used'), { total: true, name: 'Normal_Tax' });

  const LS = res.lump;
  W.head('Lump sums and TFSA', ['Amount', '']);
  W.line('Previous lump sums (cumulative)', n(LS.prior), { name: 'LS_Prior' });
  W.line('Withdrawal lump sums this year', n(LS.withdrawal), { name: 'LS_Wd' });
  W.line('Retirement / severance lump sums this year', n(LS.retirement), { name: 'LS_Ret' });
  W.line('Tax on withdrawal lump sums', F(`IF(LS_Wd=0,0,${tbl('LS_Prior+LS_Wd', 'LSW')}-${tbl('LS_Prior', 'LSW')})`), { name: 'LS_WdTax', note: 'Withdrawal table applied to cumulative amounts' });
  W.line('Tax on retirement lump sums', F(`IF(LS_Ret=0,0,${tbl('LS_Prior+LS_Wd+LS_Ret', 'LSR')}-${tbl('LS_Prior+LS_Wd', 'LSR')})`), { name: 'LS_RetTax' });
  W.line('Tax deducted from lump sums (IRP5)', n(LS.taxDeducted), { name: 'LS_TaxDeducted' });
  W.line('TFSA contributions this year', n(res.tfsa.contributions), { name: 'TFSA_Contrib' });
  W.line('TFSA contributions in previous years', n(res.tfsa.priorTotal), { name: 'TFSA_Prior' });
  W.line('Tax on excess TFSA contributions (40%)', F('ROUND(MAX(MAX(0,TFSA_Contrib-TFSA_ANNUAL),MAX(0,TFSA_Prior+TFSA_Contrib-TFSA_LIFE)-MAX(0,TFSA_Prior-TFSA_LIFE))*TFSA_RATE,2)'), { name: 'TFSA_Tax' });

  W.head('Tax payable / (refundable)', ['Amount', '']);
  W.line('Normal tax', F('Normal_Tax', { st: 'link' }));
  W.line('Lump sum tax', F('LS_WdTax+LS_RetTax'), { name: 'Lump_Tax' });
  W.line('TFSA tax', F('TFSA_Tax'));
  W.line('Total tax liability', F('Normal_Tax+Lump_Tax+TFSA_Tax'), { total: true, name: 'Liability' });
  W.line('Less: employees\' tax (PAYE)', n(res.paye), { name: 'PAYE_Total', note: 'IRP5 code 4102' });
  W.line('Less: tax deducted from lump sums', F('LS_TaxDeducted', { st: 'link' }));
  W.line('Less: provisional tax paid', F('Prov_Paid_Total', { st: 'link' }), { note: 'From the Provisional sheet' });
  W.line('BALANCE PAYABLE / (REFUNDABLE)', F('Liability-PAYE_Total-LS_TaxDeducted-Prov_Paid_Total'), { total: true, name: 'Balance' });
  W.line('Effective tax rate (normal tax / income incl. taxable capital gain)', F('IF(Income_Total>0,Normal_Tax/MAX(1,Income_Total+CGT_Taxable),0)', { fmt: 'pct' }));

  // ---- Provisional ----
  const pv = res.provisional, Pin = y.provisional || {};
  const V = sheet(B, 'Provisional', [56, 18, 14, 56]); V.sh.freeze = 3;
  V.title(`Provisional tax (IRP6) – ${pack.label}`, prov ? 'Provisional taxpayer' : 'Not registered as a provisional taxpayer – shown for planning');
  const est = (x) => `MAX(0,${ntax(x)}-Med_MTC-IF(Prov_IncAdd=1,Med_Additional,0)-FTC_Input)`;
  V.head('Basic amount (para 1 Fourth Schedule)', ['Amount', '']);
  const ba = (Pin.basicAmount) || {};
  V.line('Taxable income per the latest assessment', n(ba.lastAssessedTI), { name: 'BA_LastTI' });
  V.line('Less: taxable capital gain included', n(ba.lessCapitalGain), { name: 'BA_LessCG' });
  V.line('Less: lump sums included', n(ba.lessLumpSums), { name: 'BA_LessLump' });
  V.line('Years for the 8% uplift (assessment more than 18 months old)', n(pv.basicAmount.years), { fmt: 'int', name: 'BA_Years' });
  V.line('Basic amount', F('MAX(0,BA_LastTI-BA_LessCG-BA_LessLump)*(1+PV_UPLIFT*BA_Years)'), { total: true, name: 'Basic_Amount' });
  V.line('Include the additional medical credit in estimates (1 = yes)', pv.includeAdditionalMedical ? 1 : 0, { fmt: 'int', name: 'Prov_IncAdd' });

  const ovr = (v) => (v === null || v === undefined || v === '' ? { v: null } : { v: n(v) });
  V.head('1st payment', ['Amount', '']);
  V.line('Due date', D(pv.dueDates.p1), { name: 'P1_DueDate' });
  V.line('Use the basic amount as the estimate (1 = yes)', pv.p1.useBasic ? 1 : 0, { fmt: 'int', name: 'P1_UseBasic' });
  V.line('Estimate of taxable income (blank = planned taxable income)', ovr(Pin.p1 && !Pin.p1.useBasic ? Pin.p1.estimateTI : null), { name: 'P1_EstIn' });
  V.line('Estimate used', F('IF(P1_UseBasic=1,Basic_Amount,IF(P1_EstIn="",Taxable_Income,P1_EstIn))'), { name: 'P1_Est' });
  V.line('Tax on the estimate (after rebates and credits)', F(est('P1_Est')), { name: 'P1_Tax' });
  V.line('50% of the tax', F('P1_Tax/2'));
  V.line('Employees\' tax for the first 6 months (blank = half of PAYE)', ovr(Pin.p1 && Pin.p1.paye), { name: 'P1_PayeIn' });
  V.line('Less: employees\' tax', F('-IF(P1_PayeIn="",PAYE_Total/2,P1_PayeIn)'), { name: 'P1_Paye' });
  V.line('1st PAYMENT DUE', F('MAX(0,P1_Tax/2+P1_Paye)'), { total: true, name: 'P1_Due' });
  V.line('Amount paid', n(pv.p1.paid), { name: 'P1_Paid' });
  V.line('Date paid', D(Pin.p1 && Pin.p1.datePaid), { name: 'P1_DatePaid' });

  V.head('2nd payment', ['Amount', '']);
  V.line('Due date', D(pv.dueDates.p2), { name: 'P2_DueDate' });
  V.line('Estimate of taxable income (blank = planned taxable income)', ovr(Pin.p2 && Pin.p2.estimateTI), { name: 'P2_EstIn' });
  V.line('Estimate used', F('IF(P2_EstIn="",Taxable_Income,P2_EstIn)'), { name: 'P2_Est' });
  V.line('Tax on the estimate (after rebates and credits)', F(est('P2_Est')), { name: 'P2_Tax' });
  V.line('Employees\' tax for the full year (blank = total PAYE)', ovr(Pin.p2 && Pin.p2.paye), { name: 'P2_PayeIn' });
  V.line('Less: employees\' tax', F('-IF(P2_PayeIn="",PAYE_Total,P2_PayeIn)'), { name: 'P2_Paye' });
  V.line('Less: 1st payment made', F('-P1_Paid'));
  V.line('2nd PAYMENT DUE', F('MAX(0,P2_Tax+P2_Paye-P1_Paid)'), { total: true, name: 'P2_Due' });
  V.line('Amount paid', n(pv.p2.paid), { name: 'P2_Paid' });
  V.line('Date paid', D(Pin.p2 && Pin.p2.datePaid), { name: 'P2_DatePaid' });

  V.head('3rd (top-up) payment', ['Amount', '']);
  V.line('Due date', D(pv.p3.dueDate), { name: 'P3_DueDate' });
  V.line('Normal tax for the year', F('Normal_Tax', { st: 'link' }));
  V.line('Less: employees\' tax', F('-PAYE_Total'));
  V.line('Less: 1st payment', F('-P1_Paid'));
  V.line('Less: 2nd payment (amount due if nothing paid yet)', F('-IF(P2_Paid>0,P2_Paid,P2_Due)'), { name: 'P3_P2Used' });
  V.line('TOP-UP PAYMENT (avoids s89quat interest)', F('MAX(0,Normal_Tax-PAYE_Total-P1_Paid+P3_P2Used)'), { total: true, name: 'P3_Due' });
  V.line('Amount paid', n(Pin.p3 && Pin.p3.paid), { name: 'P3_Paid' });
  V.line('Total provisional tax paid', F('P1_Paid+P2_Paid+P3_Paid'), { total: true, name: 'Prov_Paid_Total' });

  V.head('Underestimation test (para 20 Fourth Schedule)', ['Amount', '']);
  V.line('Actual taxable income', F('Taxable_Income', { st: 'link' }));
  V.line('Required (safe-harbour) estimate', F('IF(Taxable_Income<=PV_THR,MIN(Taxable_Income*PV_LOW,IF(Basic_Amount>0,Basic_Amount,Taxable_Income*PV_LOW)),Taxable_Income*PV_HIGH)'), { name: 'PV_Target', note: '≤ R1m: lesser of 90% and the basic amount; > R1m: 80% of actual' });
  V.line('2nd estimate submitted', F('P2_Est', { st: 'link' }));
  V.line('Tax on the required estimate', F(est('PV_Target')), { name: 'PV_TaxTarget' });
  V.line('Less: PAYE and the 1st and 2nd payments', F('P2_Paye-P1_Paid+P3_P2Used'));
  V.line('UNDERESTIMATION PENALTY (20%)', F('PV_PEN*MAX(0,PV_TaxTarget+P2_Paye-P1_Paid+P3_P2Used)'), { total: true, name: 'PV_Penalty' });

  // ---- Penalties ----
  const pi = pen ? pen.inputs : {};
  const K = sheet(B, 'Penalties', [56, 18, 18, 56]); K.sh.freeze = 3;
  K.title('Foreseeable SARS penalties and interest', 'Interest is calculated day by day at the SARS Table 1 rates on the Interest rates sheet');
  K.head('General', ['Value', '']);
  K.line('Calculate to (as-at date)', D(pen ? pen.asAt : null), { name: 'As_At' });
  K.line('Provisional taxpayer (1 = yes)', prov ? 1 : 0, { fmt: 'int', name: 'Is_Prov' });

  K.head('Late submission of the ITR12 (s210/s211 TAA)', ['Value', '']);
  K.line('Filing deadline', D(pen && pen.filing.deadline), { name: 'Filing_Deadline' });
  K.line('Return submitted on (blank = not yet)', D(pi.submittedDate || null), { name: 'Filing_Submitted' });
  K.line('Measured to', F('IF(Filing_Submitted="",As_At,Filing_Submitted)', { fmt: 'date' }), { name: 'Filing_To' });
  K.line('Months late (part month counts, max 35)', F('IF(OR(Filing_Deadline="",Filing_To<=Filing_Deadline),0,MIN(35,MAX(1,(YEAR(Filing_To)-YEAR(Filing_Deadline))*12+MONTH(Filing_To)-MONTH(Filing_Deadline)+IF(DAY(Filing_To)>DAY(Filing_Deadline),1,0))))', { fmt: 'int' }), { name: 'Filing_Months' });
  K.line('Taxable income of the preceding year', n(pen && pen.filing.priorTI), { name: 'Prior_TI' });
  K.line('Monthly penalty per the s211 table', F('INDEX(ADM_AMT,COUNTIF(ADM_UPTO,"<"&Prior_TI)+1)'), { name: 'Adm_Monthly' });
  K.line('Returns outstanding', Math.max(1, n(pi.outstandingReturns) || 1), { fmt: 'int', name: 'Returns_Out' });
  K.line('Administrative penalty', F('Filing_Months*Adm_Monthly*MAX(1,Returns_Out)'), { total: true, name: 'Pen_Filing' });

  const pTot = [['Pen_Filing', null]];
  if (prov) {
    for (const k of ['P1', 'P2']) {
      K.head(`${k === 'P1' ? '1st' : '2nd'} provisional payment – late or short (para 27, s187)`, ['Value', '']);
      K.line('Due date', F(`${k}_DueDate`, { st: 'link', fmt: 'date' }), { name: `${k}_D` });
      K.line('Amount due', F(`${k}_Due`, { st: 'link' }), { name: `${k}_A` });
      K.line('Amount paid', F(`${k}_Paid`, { st: 'link' }), { name: `${k}_Pd` });
      K.line('Date paid', F(`IF(${k}_DatePaid="","",${k}_DatePaid)`, { st: 'link', fmt: 'date' }), { name: `${k}_DP` });
      K.line('Paid on time', F(`IF(AND(${k}_DP<>"",${k}_DP<=${k}_D),MIN(${k}_Pd,${k}_A),0)`), { name: `${k}_OnTime` });
      K.line('Not paid on time', F(`MAX(0,${k}_A-${k}_OnTime)`), { name: `${k}_Late` });
      K.line('Paid late', F(`IF(AND(${k}_DP<>"",${k}_DP>${k}_D),MIN(${k}_Pd,${k}_A),0)`), { name: `${k}_PaidLate` });
      K.line('Still unpaid', F(`MAX(0,${k}_A-${k}_OnTime-${k}_PaidLate)`), { name: `${k}_Unpaid` });
      K.line('10% late payment penalty', F(`IF(As_At>${k}_D,ROUND(${k}_Late*PV_LATE,2),0)`), { total: true, name: `Pen_${k}` });
      K.line('Interest on the late payment (to date paid)', F(`IF(${k}_DP="",0,${interest(`${k}_PaidLate`, `${k}_D+1`, `${k}_DP+1`)})`), { name: `Int_${k}a` });
      K.line('Interest on the unpaid amount (to as-at date)', F(`IF(As_At>${k}_D,${interest(`${k}_Unpaid`, `${k}_D+1`, 'As_At+1')},0)`), { name: `Int_${k}b` });
      K.line('Interest', F(`Int_${k}a+Int_${k}b`), { total: true, name: `Int_${k}` });
      pTot.push([`Pen_${k}`, `Int_${k}`]);
    }
    K.head('Underestimation of provisional tax (para 20)', ['Value', '']);
    K.line('2nd IRP6 submitted within 4 months after year end (1 = yes)', pi.p2Submitted === false ? 0 : 1, { fmt: 'int', name: 'P2_Submitted' });
    K.line('Penalty if the estimate is treated as nil', F('ROUND(PV_PEN*MAX(0,PV_TaxTarget-(-P2_Paye+P1_Paid+P2_Paid)),2)'), { name: 'Under_Nil' });
    K.line('Underestimation penalty', F('IF(P2_Submitted=1,ROUND(PV_Penalty,2),Under_Nil)'), { total: true, name: 'Pen_Under' });
    pTot.push(['Pen_Under', null]);

    K.head('Interest on underpaid provisional tax (s89quat)', ['Value', '']);
    K.line('Effective date', F(`IF(Taxable_Income>50000,DATE(${pack.year},9,30),DATE(${pack.year},8,31))`, { fmt: 'date' }), { name: 'Quat_Eff' });
    K.line('Assessment date (blank = as-at date)', D(pi.assessmentDate || (y.assessment && y.assessment.date) || (y.finalOpts && y.finalOpts.expectedAssessmentDate) || null), { name: 'Quat_AssessDate' });
    K.line('Shortfall: normal tax less PAYE and provisional payments', F('MAX(0,Normal_Tax-PAYE_Total-Prov_Paid_Total)'), { name: 'Quat_Owing' });
    K.line('s89quat interest', F(interest('Quat_Owing', 'Quat_Eff+1', 'IF(Quat_AssessDate="",As_At,Quat_AssessDate)+1')), { total: true, name: 'Int_Quat' });
    pTot.push([null, 'Int_Quat']);
  }
  const A = y.assessment || {};
  K.head('Late payment of the assessment (s213 and s187 TAA)', ['Value', '']);
  K.line('Balance payable per the assessment', (A.balance !== null && A.balance !== undefined && A.balance !== '') ? n(A.balance) : F('Balance', { st: 'link' }), { name: 'Ass_Bal' });
  K.line('Payment due date (ITA34)', D(pi.assessmentDue || A.paymentDue || null), { name: 'Ass_Due' });
  K.line('Amount paid', n(A.paid), { name: 'Ass_Paid' });
  K.line('Date paid', D(pi.assessmentPaidDate || null), { name: 'Ass_PaidDate' });
  K.line('Outstanding after the due date', F('MAX(0,Ass_Bal-IF(AND(Ass_PaidDate<>"",Ass_PaidDate<=Ass_Due),Ass_Paid,0))'), { name: 'Ass_Out' });
  K.line('Measured to', F('IF(AND(Ass_PaidDate<>"",Ass_PaidDate>Ass_Due),Ass_PaidDate,As_At)', { fmt: 'date' }), { name: 'Ass_To' });
  K.line('10% late payment penalty', F('IF(AND(Ass_Bal>0,Ass_Due<>"",Ass_To>Ass_Due),ROUND(Ass_Out*ASSESS_LATE,2),0)'), { total: true, name: 'Pen_Ass' });
  K.line('Interest', F(`IF(AND(Ass_Bal>0,Ass_Due<>"",Ass_To>Ass_Due),${interest('Ass_Out', 'Ass_Due+1', 'Ass_To+1')},0)`), { total: true, name: 'Int_Ass' });
  pTot.push(['Pen_Ass', 'Int_Ass']);

  K.head('Summary', ['Penalty', 'Interest']);
  const sumP = pTot.map(x => x[0]).filter(Boolean).join('+'), sumI = pTot.map(x => x[1]).filter(Boolean).join('+') || '0';
  K.line('Total penalties and interest', F(sumP), { total: true, name: 'Pen_Total' }); K.put(K.row, 3, { f: sumI, fmt: 'money', st: 'total' }); K.name('Int_Total', 3, K.row);
  K.line('TOTAL EXPOSURE', F('Pen_Total+Int_Total'), { total: true, name: 'Pen_Interest_Total' });

  const U = (pi && pi.understatement) || {};
  const behIdx = Math.max(0, ctx.UNDERSTATEMENT.findIndex(u => u[0] === U.behaviour)), caseIdx = Math.max(0, ctx.UNDERSTATEMENT_CASES.findIndex(c => c[0] === U.case));
  K.head('Understatement penalty – scenario (s222/s223 TAA, not in the total)', ['Value', '']);
  K.line('SARS adjustment to taxable income', n(U.adjustment), { name: 'US_Adj' });
  K.line('Behaviour (row 1–6 of the s223 table)', U.behaviour ? behIdx + 1 : 2, { fmt: 'int', name: 'US_Beh', note: '1 substantial · 2 reasonable care · 3 no reasonable grounds · 4 avoidance · 5 gross negligence · 6 evasion' });
  K.line('Case (column 1–4 of the s223 table)', caseIdx + 1, { fmt: 'int', name: 'US_Case', note: '1 standard · 2 obstructive/repeat · 3 VDP after audit notice · 4 VDP before notice' });
  K.line('Penalty percentage', F('INDEX(US_TABLE,US_Beh,US_Case)/100', { fmt: 'pct0' }), { name: 'US_Pct' });
  K.line('Tax shortfall', F(`IF(US_Adj=0,0,MAX(0,MAX(0,${ntax('Taxable_Income+US_Adj')}+MTC_Used+Add_Used+FTC_Used)-MAX(0,${ntax('Taxable_Income')}+MTC_Used+Add_Used+FTC_Used)))`), { name: 'US_Shortfall' });
  K.line('Understatement penalty', F('ROUND(US_Shortfall*US_Pct,2)'), { total: true, name: 'US_Penalty' });
  K.line('Interest on the shortfall', F(interest('US_Shortfall', 'IF(Taxable_Income>50000,DATE(' + pack.year + ',9,30),DATE(' + pack.year + ',8,31))+1', 'As_At+1')), { total: true });

  // ---- Tax tables ----
  const T = sheet(B, 'Tax tables', [40, 18, 18, 14, 40]);
  T.title(`SARS tax tables – ${pack.label}`, 'Used by the formulas in this workbook (defined names in brackets)');
  T.head('Income tax brackets (BR_FROM / BR_BASE / BR_RATE)', ['Lower bound', 'Base tax', 'Rate']);
  const bs = T.row + 1;
  pack.brackets.forEach((b, i) => { T.sh.r++; T.put(T.sh.r, 1, { v: `Bracket ${i + 1}`, st: 'label' }); T.put(T.sh.r, 2, { v: b.from, fmt: 'money', st: 'input' }); T.put(T.sh.r, 3, { v: b.base, fmt: 'money', st: 'input' }); T.put(T.sh.r, 4, { v: b.rate, fmt: 'pct0', st: 'input' }); });
  T.name('BR_FROM', 2, bs, T.row); T.name('BR_BASE', 3, bs, T.row); T.name('BR_RATE', 4, bs, T.row);
  const tl = (label, v, nm, fmt) => T.line(label + ` (${nm})`, v, { name: nm, fmt });
  T.head('Rebates, thresholds and exemptions', ['Amount', '']);
  tl('Primary rebate', pack.rebates.primary, 'REB_P'); tl('Secondary rebate (65+)', pack.rebates.secondary, 'REB_S'); tl('Tertiary rebate (75+)', pack.rebates.tertiary, 'REB_T');
  tl('Interest exemption – under 65', pack.interestExemption.under65, 'INT_EX_U65'); tl('Interest exemption – 65 and older', pack.interestExemption.over65, 'INT_EX_65');
  tl('Foreign dividends – exempt fraction', pack.foreignDividendExemptFraction, 'FDIV_EX', 'dec4');
  tl('Year end', D(pack.end), 'Year_End', 'date');
  T.head('Medical credits', ['Amount', '']);
  tl('Main member per month', pack.medicalCredits.main, 'MC_MAIN'); tl('First dependant per month', pack.medicalCredits.first, 'MC_FIRST'); tl('Each additional dependant', pack.medicalCredits.additional, 'MC_ADD');
  const ma = pack.medicalAdditional;
  tl('Additional credit % – under 65', ma.under65Pct, 'MA_U65PCT', 'pct1'); tl('Additional credit % – 65+/disability', ma.over65Pct, 'MA_65PCT', 'pct1'); tl('Taxable income % (under 65)', ma.tiPct, 'MA_TIPCT', 'pct1'); tl('Fees credit multiple – under 65', ma.under65Multiple, 'MA_U65MULT', 'int'); tl('Fees credit multiple – 65+', ma.over65Multiple, 'MA_65MULT', 'int');
  T.head('Deductions and capital gains', ['Amount', '']);
  tl('Retirement contributions – % limit', pack.retirement.pct, 'RA_PCT', 'pct1'); tl('Retirement contributions – annual cap', pack.retirement.cap, 'RA_CAP'); tl('Donations – % of taxable income', pack.donationsPct, 'DON_PCT', 'pct1');
  tl('CGT annual exclusion', pack.cgt.annualExclusion, 'CGT_EXCL'); tl('CGT inclusion rate', pack.cgt.inclusionRate, 'CGT_INCL', 'pct1');
  tl('TFSA annual limit', pack.tfsa.annual, 'TFSA_ANNUAL'); tl('TFSA lifetime limit', pack.tfsa.lifetime, 'TFSA_LIFE'); tl('Tax on excess TFSA contributions', 0.4, 'TFSA_RATE', 'pct0');
  T.head('Provisional tax and penalties', ['Amount', '']);
  const pvp = pack.provisional;
  tl('Underestimation penalty', pvp.penaltyRate, 'PV_PEN', 'pct0'); tl('Late payment penalty (para 27)', pvp.latePenalty, 'PV_LATE', 'pct0'); tl('Taxable income threshold', pvp.thresholdTI, 'PV_THR'); tl('Required estimate ≤ threshold', pvp.lowPct, 'PV_LOW', 'pct0'); tl('Required estimate > threshold', pvp.highPct, 'PV_HIGH', 'pct0'); tl('Basic amount uplift per year', pvp.basicUplift, 'PV_UPLIFT', 'pct0'); tl('Late payment of an assessment (s213)', 0.1, 'ASSESS_LATE', 'pct0');
  const lumpT = (title, rows, pre) => { T.head(`${title} (${pre}_FROM / ${pre}_BASE / ${pre}_RATE)`, ['Lower bound', 'Base tax', 'Rate']); const s = T.row + 1; rows.forEach((b, i) => { T.sh.r++; T.put(T.sh.r, 1, { v: `Band ${i + 1}`, st: 'label' }); T.put(T.sh.r, 2, { v: b.from, fmt: 'money', st: 'input' }); T.put(T.sh.r, 3, { v: b.base, fmt: 'money', st: 'input' }); T.put(T.sh.r, 4, { v: b.rate, fmt: 'pct0', st: 'input' }); }); T.name(pre + '_FROM', 2, s, T.row); T.name(pre + '_BASE', 3, s, T.row); T.name(pre + '_RATE', 4, s, T.row); };
  lumpT('Lump sums – withdrawal', pack.lumpSumWithdrawal, 'LSW'); lumpT('Lump sums – retirement and severance', pack.lumpSumRetirement, 'LSR');
  T.head('Administrative non-compliance penalty (s211) (ADM_UPTO / ADM_AMT)', ['Taxable income up to', 'Per month']);
  const as = T.row + 1;
  ctx.ADMIN_TABLE.forEach(([upTo, amt]) => { T.sh.r++; T.put(T.sh.r, 1, { v: isFinite(upTo) ? `Up to R${upTo.toLocaleString('en-ZA')}` : 'Above', st: 'label' }); T.put(T.sh.r, 2, { v: isFinite(upTo) ? upTo : 1e15, fmt: 'money', st: 'input' }); T.put(T.sh.r, 3, { v: amt, fmt: 'money', st: 'input' }); });
  T.name('ADM_UPTO', 2, as, T.row); T.name('ADM_AMT', 3, as, T.row);
  T.head('Understatement penalty % (s223) (US_TABLE)', ['Standard', 'Repeat', 'VDP after', 'VDP before']);
  const us = T.row + 1;
  ctx.UNDERSTATEMENT.forEach((u) => { T.sh.r++; T.put(T.sh.r, 1, { v: u[1], st: 'label' }); u[2].forEach((v, i) => T.put(T.sh.r, 2 + i, { v, fmt: 'int', st: 'input' })); });
  B.names.push({ name: 'US_TABLE', ref: `'Tax tables'!$B$${us}:$E$${T.row}` });

  // ---- Interest rates ----
  const I = sheet(B, 'Interest rates', [18, 18, 14, 50]);
  I.title('SARS interest rates – Table 1 (outstanding taxes)', 'Each rate applies from its date up to (not including) the next one');
  I.head('From', ['To (excl.)', 'Rate % p.a.']);
  const rs = (rates || []).slice().sort((a, b) => a.from.localeCompare(b.from));
  const is = I.row + 1;
  rs.forEach((x, i) => { I.sh.r++; I.put(I.sh.r, 1, { d: x.from, fmt: 'date', st: 'input' }); I.put(I.sh.r, 2, i + 1 < rs.length ? { f: `A${I.sh.r + 1}`, fmt: 'date', st: 'calc' } : { f: 'DATE(2099,12,31)', fmt: 'date', st: 'calc' }); I.put(I.sh.r, 3, { v: x.rate, fmt: 'dec2', st: 'input' }); });
  I.name('IR_FROM', 1, is, I.row); I.name('IR_TO', 2, is, I.row); I.name('IR_RATE', 3, is, I.row);
  I.sh.r += 2; I.put(I.sh.r, 1, { v: 'Interest = amount × Σ (rate ÷ 100 ÷ 365 × days in each rate period). To add a new rate, insert a row inside the table so the named ranges grow.', st: 'note' }); I.sh.merges.push(`A${I.sh.r}:D${I.sh.r}`);

  const seen = new Map(); for (const nm of B.names) { const k = nm.name.toLowerCase(); if (seen.has(k)) throw new Error('Duplicate defined name ' + nm.name); seen.set(k, 1); }
  B.check = { Taxable_Income: res.taxableIncome, Normal_Tax: res.normalTax, Liability: res.liability, Balance: res.balance, P1_Due: pv.p1.due, P2_Due: pv.p2.due, P3_Due: pv.p3.due, PV_Penalty: pv.penalty.amount, Pen_Total: pen ? pen.totalPenalties : 0, Int_Total: pen ? pen.totalInterest : 0 };
  return B;
}

// ---------- generic: any report or screen table → sheet with SUM formulas on total rows ----------
// tables: [{ title, rows: [[{text, num, bold, total, head}]] }]
function tablesWorkbook(title, tables, opts) {
  const B = book(title); B.fileName = (opts && opts.fileName) || title + '.xlsx';
  const used = new Set();
  const sname = (t) => { let s = String(t || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Sheet'; let x = s, i = 2; while (used.has(x.toLowerCase())) x = s.slice(0, 25) + ' ' + i++; used.add(x.toLowerCase()); return x; };
  const groups = (opts && opts.oneSheet) ? [{ title, tables }] : tables.map(t => ({ title: t.title, tables: [t] }));
  for (const g of groups) {
    const maxCols = Math.max(2, ...g.tables.map(t => Math.max(0, ...t.rows.map(r => r.length))));
    const widths = []; for (let c = 0; c < maxCols; c++) widths.push(c === 0 ? 44 : 18);
    const W = sheet(B, sname(g.title), widths);
    W.title(g.title || title, (opts && opts.subtitle) || '');
    for (const t of g.tables) {
      if (g.tables.length > 1 && t.title) { W.sh.r += 2; W.put(W.sh.r, 1, { v: t.title, st: 'sect' }); }
      W.sh.r++;
      const numCols = new Set(); t.rows.forEach(r => r.forEach((c, i) => { if (c && c.num !== null && c.num !== undefined && !c.head) numCols.add(i); }));
      // Total rows become formulas when a formula reproduces the displayed figure:
      // the rows since the previous total, the previous total plus those rows, or all detail rows so far.
      let headEnd = null, lastTotal = null, detail = [];
      for (const r of t.rows) {
        W.sh.r++;
        const isHead = r.every(c => !c || c.head);
        const isTotal = !isHead && r.some(c => c && c.total);
        if (isHead) { r.forEach((c, i) => W.put(W.sh.r, i + 1, { v: c ? c.text : '', st: 'h' })); headEnd = W.sh.r; lastTotal = null; detail = []; continue; }
        const rowNo = W.sh.r;
        r.forEach((c, i) => {
          if (!c) return;
          const col = String.fromCharCode(65 + i);
          if (isTotal && c.num !== null && c.num !== undefined) {
            const val = (rows) => rows.reduce((a, x) => a + (x.vals[i] || 0), 0);
            const since = detail.filter(x => !lastTotal || x.row > lastTotal.row);
            const rng = (rows) => rows.length ? (rows[rows.length - 1].row - rows[0].row + 1 === rows.length ? `SUM(${col}${rows[0].row}:${col}${rows[rows.length - 1].row})` : rows.map(x => col + x.row).join('+')) : '0';
            const cands = [];
            if (since.length) cands.push([rng(since), val(since)]);
            if (lastTotal && lastTotal.vals[i] !== undefined) cands.push([`${col}${lastTotal.row}+${rng(since)}`, lastTotal.vals[i] + val(since)]);
            if (detail.length) cands.push([rng(detail), val(detail)]);
            const hit = cands.find(([, v]) => Math.abs(v - c.num) < 0.02 && (since.length + detail.length) > 0);
            if (hit) W.put(rowNo, i + 1, { f: hit[0], fmt: c.fmt || 'money', st: 'total', result: c.num });
            else W.put(rowNo, i + 1, { v: c.num, fmt: c.fmt || 'money', st: 'totalv' });
          } else if (c.num !== null && c.num !== undefined) W.put(rowNo, i + 1, { v: c.num, fmt: c.fmt || 'money', st: c.bold ? 'boldv' : 'value' });
          else W.put(rowNo, i + 1, { v: c.text, st: isTotal ? 'totlabel' : c.bold ? 'bold' : 'text' });
        });
        const vals = {}; r.forEach((c, i) => { if (c && c.num !== null && c.num !== undefined) vals[i] = c.num; });
        if (isTotal) lastTotal = { row: rowNo, vals }; else if (Object.keys(vals).length) detail.push({ row: rowNo, vals });
      }
    }
  }
  return B;
}

// Parse a displayed amount: "R 1,234.56", "-R 12", "(1 234)", "12.5%", "1 234,00"
function parseAmount(s) {
  let t = String(s == null ? '' : s).replace(/ /g, ' ').trim();
  if (!t || t === '—' || t === '-') return null;
  if (/[a-z]{2,}/i.test(t.replace(/^-?R\s?|R$/i, '').replace(/p\.a\./i, ''))) return null;
  if (/\d{4}-\d{2}-\d{2}/.test(t) || /\d{1,2}\s\w+\s\d{4}/.test(t)) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (/^[-−–]/.test(t)) { neg = true; t = t.replace(/^[-−–]\s*/, ''); }
  const pct = /%$/.test(t);
  t = t.replace(/^R\s?/i, '').replace(/%$/, '').replace(/[\s,]/g, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const v = Number(t) * (neg ? -1 : 1);
  return pct ? { num: v / 100, fmt: 'pct' } : { num: v };
}

const api = { clientWorkpaper, tablesWorkbook, parseAmount, interest, tbl };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IntaxWorkpaper = api;
})(typeof window !== 'undefined' ? window : globalThis);
