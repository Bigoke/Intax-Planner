// Builds working papers for the demo clients, recalculates them with LibreOffice and compares key cells to the engine.
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const E = require('../src/engine/engine.js'), P = require('../src/data/taxpacks.js'), C = require('../src/data/codes.js');
const PN = require('../src/engine/penalties.js'), WP = require('../src/excel/workpaper.js'), { writeWorkbook } = require('../src/excel/writer.js');
const demo = require('../scripts/demo-data.js');
const RECALC = process.env.RECALC || '/root/.claude/skills/synced/3f249c24-35d9-407c-925d-9666e57d3b32_9a4cdd94-b95c-4cbd-8efe-43287171f34e/xlsx/scripts/recalc.py';
const OUT = path.join(__dirname, 'xlsx-out');
(async () => {
  let fails = 0, n = 0;
  const cases = [];
  for (const c of demo.clients) for (const yr of Object.keys(c.years).map(Number)) {
    const y = JSON.parse(JSON.stringify(c.years[yr]));
    cases.push([c, y, yr, 'base']);
    // stress variant: late payments, late return, assessment, understatement
    const y2 = JSON.parse(JSON.stringify(c.years[yr])); y2.flags = Object.assign({}, y2.flags, { provisional: true });
    y2.provisional = y2.provisional || {}; y2.provisional.p1 = Object.assign({}, y2.provisional.p1, { paid: 10000, datePaid: `${yr - 1}-09-20` });
    y2.penalties = { asAt: `${yr + 1}-06-15`, submittedDate: '', outstandingReturns: 2, priorTI: 640000, p2Submitted: yr % 2 === 0, assessmentDate: `${yr}-11-30`, assessmentDue: `${yr}-12-31`, assessmentPaidDate: `${yr + 1}-02-10`, understatement: { adjustment: 150000, behaviour: 'grossNeg', case: 'repeat' } };
    y2.assessment = Object.assign({}, y2.assessment, { balance: 40000, paid: 40000 });
    cases.push([c, y2, yr, 'stress']);
  }
  for (const [c, y, yr, tag] of cases) {
    const pack = E.getPack(P.TAX_PACKS, yr);
    const res = E.compute(c, y, pack, C.CODES, { interestRates: P.INTEREST_RATES });
    const pen = PN.penaltiesCalc(c, y, pack, res, E, P.INTEREST_RATES, { today: `${yr + 1}-03-15` });
    const spec = WP.clientWorkpaper({ client: c, y, pack, res, pen, rates: P.INTEREST_RATES, practice: 'Test', E, ADMIN_TABLE: PN.ADMIN_TABLE, UNDERSTATEMENT: PN.UNDERSTATEMENT, UNDERSTATEMENT_CASES: PN.UNDERSTATEMENT_CASES });
    if (pen.understatement && pen.understatement.adjustment) spec.check.US_Penalty = pen.understatement.amount;
    const f = path.join(OUT, `${c.id}-${yr}-${tag}.xlsx`);
    await writeWorkbook(spec, f);
    const rc = JSON.parse(execFileSync('python3', [RECALC, f, '60']).toString());
    const vals = JSON.parse(execFileSync('python3', ['-c', `
import openpyxl,json,sys
wb=openpyxl.load_workbook(sys.argv[1],data_only=True); out={}
for nm in json.loads(sys.argv[2]):
    dn=wb.defined_names.get(nm)
    for ws,ref in dn.destinations: out[nm]=wb[ws][ref.replace('$','')].value
print(json.dumps(out))`, f, JSON.stringify(Object.keys(spec.check))]).toString());
    const bad = Object.entries(spec.check).filter(([k, v]) => Math.abs((vals[k] || 0) - (v || 0)) > 1.01).map(([k, v]) => `${k}: excel ${vals[k]} engine ${v}`);
    n++;
    if (rc.status !== 'success' || bad.length) { fails++; console.log('FAIL', c.id, yr, tag, rc.status, rc.total_errors || '', JSON.stringify(rc.error_summary || {}).slice(0, 300), bad.join(' | ')); }
  }
  console.log(`excel verify: ${n - fails}/${n} workbooks match the engine`);
  process.exit(fails ? 1 : 0);
})();
