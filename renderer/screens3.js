// Intax Planner 1.2 – several vehicles (travel logbook and company cars), working from home, time records.
'use strict';

// ---------- navigation tweaks ----------
(function () {
  const i = NAV.findIndex(n => n.id === 'deductions');
  NAV.splice(i, 1, { id: 'homeoffice', label: 'Work from home', icon: '⌂', flag: 'homeOffice' }, { id: 'deductions', label: 'Other deductions & losses', icon: '−' });
  NEEDS_CLIENT.add('homeoffice');
  const t = CHECK_TILES.find(x => x[0] === 'homeOffice'); if (t) { t[2] = 'Works from home'; t[3] = 'Home office costs and work equipment'; }
  CHECK_TILES.push(['otherDeductions', '−', 'Other deductions', 'Assessed losses and other allowable deductions']);
  FLAG_ROUTE.homeOffice = 'homeoffice'; FLAG_ROUTE.otherDeductions = 'deductions';
  const tr = CHECK_TILES.find(x => x[0] === 'travel'); if (tr) tr[3] = 'Business travel with a logbook – one or more vehicles';
  const cc = CHECK_TILES.find(x => x[0] === 'companyCar'); if (cc) cc[3] = 'Employer-provided vehicle(s) – fringe benefit 3802';
})();

// Upgrade older files once they are loaded
const _yd = yd;
window.yd = function (create = true) { const y = _yd(create); if (y) E.migrateYear(y); return y; };

const veh = (p, i, key, label, type, extra) => f(Object.assign({ p: `${p}.${i}.${key}`, label, type }, extra || {}));

// ---------- Travel – several vehicles ----------
SCREENS.travel = () => {
  const r = result(), t = r.travel, P = pack(), y = yd();
  const allowance = r.irp5.agg.travel;
  const cards = y.travel.vehicles.map((v, i) => {
    const res = t.vehicles[i] || {};
    const p = 'y.travel.vehicles';
    return `<div class="card"><div class="card-head"><h2>🚗 ${esc(v.name || 'Vehicle ' + (i + 1))}${v.registration ? ` <span class="chip">${esc(v.registration)}</span>` : ''}</h2><span class="pill ${res.uncapped ? 'ok' : 'info'}">Claim ${money0(res.uncapped || 0)}</span><button class="btn btn-sm btn-danger" data-act="del" data-p="${p}" data-i="${i}">Remove vehicle</button></div>
    <div class="grid g2"><div><div class="grid g2">
      ${veh(p, i, 'name', 'Vehicle (make & model)')}${veh(p, i, 'registration', 'Registration')}
      ${veh(p, i, 'vehicleValue', 'Value incl. VAT when acquired', 'money')}${veh(p, i, 'daysUsed', 'Days used in this tax year', 'int', { placeholder: '365', hint: 'Fixed cost is pro-rated for part of the year' })}
      ${veh(p, i, 'totalKm', 'Total km with this vehicle', 'int')}${veh(p, i, 'businessKm', 'Business km (logbook)', 'int')}
      ${veh(p, i, 'fuelBorne', 'Paid all fuel', 'check')}${veh(p, i, 'maintBorne', 'Paid all maintenance (no plan)', 'check')}
      ${veh(p, i, 'method', 'Method', 'select', { options: [['best', 'Best of deemed and actual'], ['deemed', 'Deemed cost (SARS table)'], ['actual', 'Actual cost']] })}</div>
      <h3>Actual costs (optional)</h3><div class="grid g3">${['fuel', 'maintenance', 'insurance', 'licence', 'interest', 'lease'].map(k => veh(p, i, 'actual.' + k, { fuel: 'Fuel & oil', maintenance: 'Repairs & maintenance', insurance: 'Insurance', licence: 'Licence', interest: 'Finance interest', lease: 'Lease payments' }[k], 'money')).join('')}</div></div>
    <div>${res.band ? `${line('Cost band', `up to ${res.band.upTo ? money0(res.band.upTo) : 'no limit'}`)}${line(`Fixed cost (${E.n(v.daysUsed) || 365} days)`, money(res.band.fixed * (Math.min(365, E.n(v.daysUsed) || 365)) / 365))}${line('Fixed cost per km', 'R ' + E.fmt(res.fixedPerKm, 4))}${line('Fuel per km', v.fuelBorne ? 'R ' + (res.band.fuel / 100).toFixed(3) : '—')}${line('Maintenance per km', v.maintBorne ? 'R ' + (res.band.maint / 100).toFixed(3) : '—')}${line('Rate per km', 'R ' + E.fmt(res.ratePerKm, 3))}${line('Business use', res.businessPct + '%')}${line('Deemed cost claim', money(res.deemed))}${line(`Actual cost claim (wear-and-tear ${money0(res.wearTear)})`, money(res.actual))}${line(`This vehicle (${res.method})`, money(res.uncapped), 'total')}` : '<p class="muted">Enter the value and kilometres.</p>'}${(res.notes || []).map(n => `<div class="alert info">${esc(n)}</div>`).join('')}</div></div></div>`;
  }).join('');
  return head('Travel deduction (logbook)', `One or more vehicles used for business. Each vehicle is calculated separately and the total is limited to the travel allowance. Cost table for ${P.label}; prescribed rate R${P.travel.prescribedRate.toFixed(2)}/km.`, wizBtn('travel', 'Add vehicle wizard') + helpBtn('logbook') + `<button class="btn btn-primary" data-act="addvehicle">+ Add vehicle</button>`) +
  `<div class="card"><div class="grid g4">${f({ p: 'y.travel.enabled', label: 'Claim travel expenses this year', type: 'check' })}<div class="field"><label>Travel allowance <span class="code-tag">3701/3702</span></label><input class="num calc" readonly value="${fmtInput(allowance)}"></div><div class="field"><label>Total for all vehicles</label><input class="num calc" readonly value="${fmtInput(t.uncapped)}"></div><div class="field"><label>Deduction allowed</label><input class="num calc" readonly value="${fmtInput(t.chosen)}" style="font-weight:700"></div></div>${(t.notes || []).filter(n => !/: /.test(n)).map(n => `<div class="alert info">${esc(n)}</div>`).join('')}</div>` +
  (cards || `<div class="card empty"><div class="big">🚗</div><p>No vehicles yet. Add each vehicle used for business during the year – for example when a car was replaced.</p><button class="btn btn-primary" data-act="addvehicle">+ Add vehicle</button></div>`) +
  (t.vehicles.length > 1 ? `<div class="card"><h2>Summary</h2><table class="t"><thead><tr><th>Vehicle</th><th class="r">Days</th><th class="r">Business km</th><th class="r">Total km</th><th>Method</th><th class="r">Claim</th></tr></thead><tbody>${t.vehicles.map(v => `<tr><td>${esc(v.name)}</td><td class="r">${E.n(v.input.daysUsed) || 365}</td><td class="r">${E.fmt(v.input.businessKm)}</td><td class="r">${E.fmt(v.input.totalKm)}</td><td>${v.method}</td><td class="r">${moneyCell(v.uncapped)}</td></tr>`).join('')}<tr class="sub"><td colspan="5">Total</td><td class="r">${moneyCell(t.uncapped)}</td></tr><tr class="total"><td colspan="5">Deduction (limited to allowance ${money0(allowance)})</td><td class="r">${moneyCell(t.chosen)}</td></tr></tbody></table></div>` : '') +
  `<div class="card"><h2>SARS cost table – ${P.label}</h2><table class="t"><thead><tr><th>Vehicle value</th><th class="r">Fixed cost (R p.a.)</th><th class="r">Fuel (c/km)</th><th class="r">Maintenance (c/km)</th></tr></thead><tbody>${P.travel.scale.map((b, i, a) => `<tr ${t.vehicles.some(v => v.band === b) ? 'style="background:var(--accent-bg);font-weight:600"' : ''}><td>${b.upTo === null ? 'Exceeding ' + money0(a[i - 1].upTo) : (i === 0 ? 'Up to ' : `${money0(a[i - 1].upTo + 1)} – `) + money0(b.upTo)}</td><td class="r">${E.fmt(b.fixed)}</td><td class="r">${b.fuel.toFixed(1)}</td><td class="r">${b.maint.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>`;
};

// ---------- Company cars – several vehicles ----------
SCREENS.companycar = () => {
  const r = result(), cc = r.companyCar, y = yd(), P = pack();
  const irp = E.n(r.irp5.byCode['3802']) + E.n(r.irp5.byCode['3816']);
  const cards = y.companyCars.map((c, i) => {
    const res = cc.cars[i] || {}, p = 'y.companyCars';
    return `<div class="card"><div class="card-head"><h2>🚙 ${esc(c.name || 'Company car ' + (i + 1))}${c.registration ? ` <span class="chip">${esc(c.registration)}</span>` : ''}</h2><span class="pill ok">Taxable ${money0((res.value || 0) - (res.reduction || 0))}</span><button class="btn btn-sm btn-danger" data-act="del" data-p="${p}" data-i="${i}">Remove</button></div>
    <div class="grid g2"><div class="grid g2">
      ${veh(p, i, 'name', 'Vehicle (make & model)')}${veh(p, i, 'registration', 'Registration')}
      ${veh(p, i, 'determinedValue', 'Determined value (cost incl. VAT, excl. finance)', 'money')}${veh(p, i, 'months', 'Months available to you', 'int')}
      ${veh(p, i, 'maintenancePlan', 'Sold with a maintenance plan (3.25%)', 'check')}${y.companyCars.length > 1 && irp ? veh(p, i, 'irp5Value', 'Value for this car on the IRP5 (optional)', 'money', { placeholder: 'split automatically' }) : '<div></div>'}
      ${veh(p, i, 'totalKm', 'Total km with this car', 'int')}${veh(p, i, 'businessKm', 'Business km (logbook)', 'int')}
      ${veh(p, i, 'fuelBorne', 'I paid all private fuel', 'check')}${veh(p, i, 'maintBorne', 'I paid all private maintenance', 'check')}
      ${veh(p, i, 'insurance', 'Insurance paid personally', 'money')}${veh(p, i, 'licence', 'Licence paid personally', 'money')}</div>
    <div>${line(`Rate ${pct(res.rate || 0)} × ${res.months || 0} months`, money(res.calculated || 0))}${line(cc.fromIrp5 ? 'Value used (share of IRP5)' : 'Value used (calculated – added to income)', money(res.value || 0))}${line('Reduction: business km', money(-(res.businessPart || 0)))}${line('Reduction: private fuel', money(-(res.fuelPart || 0)))}${line('Reduction: private maintenance', money(-(res.maintPart || 0)))}${line('Reduction: insurance and licence', money(-(res.otherPart || 0)))}${line('Reduction on assessment', money(-(res.reduction || 0)), 'total')}${line('Taxable value', money((res.value || 0) - (res.reduction || 0)))}${(res.notes || []).map(n => `<div class="alert info">${esc(n)}</div>`).join('')}</div></div></div>`;
  }).join('');
  return head('Company car fringe benefit', 'One or more employer-owned vehicles (codes 3802/3816). With a logbook the taxable value is reduced on assessment for business kilometres and private costs paid personally.', wizBtn('companycar', 'Add car wizard') + helpBtn('company-car') + `<button class="btn btn-primary" data-act="addcar">+ Add company car</button>`) +
  `<div class="card"><div class="grid g4"><div class="field"><label>Value on IRP5 <span class="code-tag">3802/3816</span></label><input class="num calc" readonly value="${fmtInput(irp)}"></div><div class="field"><label>Total value used</label><input class="num calc" readonly value="${fmtInput(cc.value)}"></div><div class="field"><label>Total reduction</label><input class="num calc" readonly value="${fmtInput(cc.reduction)}"></div><div class="field"><label>Taxable after reduction</label><input class="num calc" readonly value="${fmtInput(cc.value - cc.reduction)}" style="font-weight:700"></div></div>${(cc.notes || []).filter(n => !/: /.test(n)).map(n => `<div class="alert warn">${esc(n)}</div>`).join('')}<p class="muted" style="margin-top:8px">${y.companyCars.length > 1 && irp ? 'The IRP5 total is split between the cars in proportion to their calculated values unless you enter the value per car. ' : ''}Rates ${pct(P.companyCar.standard)} / ${pct(P.companyCar.maintenancePlan)} a month; fuel and maintenance per km from the ${P.label} cost scale.</p></div>` +
  (cards || `<div class="card empty"><div class="big">🚙</div><p>No company cars captured.${irp ? ` The IRP5 shows a benefit of ${money0(irp)} – add the car to reduce it with a logbook.` : ''}</p><button class="btn btn-primary" data-act="addcar">+ Add company car</button></div>`);
};

// ---------- Work from home ----------
const HO_COSTS = [['rent', 'Rent'], ['bondInterest', 'Bond interest (not capital)'], ['rates', 'Rates & taxes / levies'], ['electricity', 'Electricity'], ['water', 'Water'], ['cleaning', 'Cleaning'], ['repairs', 'Repairs to the home'], ['insurance', 'Building insurance'], ['security', 'Security'], ['other', 'Other home costs']];
SCREENS.homeoffice = () => {
  const r = result(), h = r.homeOffice, y = yd(), ho = y.homeOffice, P = pack();
  const p = 'y.homeOffice';
  const ok = (b) => b ? '<span class="pill ok">✓</span>' : '<span class="pill bad">✗</span>';
  return head('Working from home', 'Home office costs (s11(a) read with s23(b)) and wear-and-tear on work equipment (s11(e)).', wizBtn('homeoffice', 'Home office wizard') + helpBtn('home-office')) +
  `<div class="grid g2"><div class="card"><h2>Who works from home?</h2>${f({ p: p + '.enabled', label: 'The taxpayer works from a home office this year', type: 'check' })}
    <div class="grid g2" style="margin-top:10px">${f({ p: p + '.basis', label: 'Earns income as', type: 'select', options: [['employee', 'Salaried employee'], ['commission', 'Employee – mainly commission'], ['business', 'Own business / independent contractor']] })}${f({ p: p + '.months', label: 'Months worked from home this year', type: 'int' })}</div>
    <h3>Requirements</h3>${f({ p: p + '.exclusive', label: 'The room is used regularly and exclusively for work', type: 'check' })}${f({ p: p + '.equipped', label: 'The room is specifically equipped for work (desk, computer, etc.)', type: 'check' })}${ho.basis !== 'business' ? f({ p: p + '.mainlyAtHome', label: ho.basis === 'commission' ? 'Duties are mainly performed outside an office provided by the employer' : 'More than 50% of duties are performed in the home office', type: 'check' }) : ''}
    <div class="sum-box">${h.enabled ? (h.eligible ? '<span class="pill ok">Qualifies for a home office deduction</span>' : `<span class="pill bad">Does not qualify for home running costs</span>${h.reasons.map(x => `<div class="muted" style="margin-top:4px">• ${esc(x)}</div>`).join('')}`) : '<span class="muted">Tick the first box to start.</span>'}</div></div>
  <div class="card"><h2>Deduction</h2>${line(`Office share: ${E.fmt(ho.officeArea, 1)} m² of ${E.fmt(ho.homeArea, 1)} m²`, (Math.round(h.pct * 1000) / 10) + '%')}${line('Home running costs for the year', money(h.homeCosts))}${line(`Home office portion (${h.months ?? 12} months)`, money(h.premises))}${line('Wear-and-tear on work equipment', money(h.wearTear))}${line(h.otherAllowed ? 'Other work costs' : 'Other work costs (not deductible for salaried employees)', money(h.other))}${line('Total deduction', money(h.total), 'total')}
    ${E.n(y.deductions.homeOffice) ? `<div class="alert info">A manual home office amount of ${money(y.deductions.homeOffice)} from an earlier version is also claimed. ${f({ p: 'y.deductions.homeOffice', label: 'Manual amount (set to 0 once captured here)', type: 'money' })}</div>` : ''}
    <div class="alert info">Selling the home later: the office portion may not qualify for the primary residence exclusion (capital gains).</div></div></div>
  <div class="grid g2"><div class="card"><h2>Floor area</h2><div class="grid g2">${f({ p: p + '.officeArea', label: 'Office area (m²)', type: 'dec' })}${f({ p: p + '.homeArea', label: 'Total home area (m²)', type: 'dec' })}</div>
    <h3>Home running costs (full year, whole home)</h3><div class="grid g2">${HO_COSTS.map(([k, l]) => f({ p: `${p}.costs.${k}`, label: l, type: 'money' })).join('')}</div></div>
  <div class="card"><div class="card-head"><h2>Other work costs</h2><button class="btn btn-sm" data-act="add" data-p="${p}.otherCosts" data-tpl="other">+ Add</button></div>${h.otherAllowed ? '' : '<div class="alert warn">Salaried employees may not deduct phone, internet, stationery and similar costs (s23(m)). These are kept for information only.</div>'}
    <table class="t"><tbody>${ho.otherCosts.map((o, i) => `<tr><td><input data-p="${p}.otherCosts.${i}.desc" value="${esc(o.desc)}" placeholder="e.g. Internet (work portion)"></td><td style="width:160px"><input class="num" data-num="money" data-p="${p}.otherCosts.${i}.amount" value="${fmtInput(o.amount)}"></td><td style="width:40px"><button class="btn btn-sm btn-danger" data-act="del" data-p="${p}.otherCosts" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td class="muted">None.</td></tr>'}</tbody></table></div></div>
  <div class="card"><div class="card-head"><h2>Work equipment (wear-and-tear)</h2><button class="btn btn-sm" data-act="addasset">+ Add item</button></div>
    <table class="t" style="table-layout:fixed"><thead><tr><th>Item</th><th style="width:230px">Type</th><th style="width:150px">Bought</th><th class="r" style="width:120px">Cost</th><th class="r" style="width:70px">Years</th><th class="r" style="width:70px">Work %</th><th class="r" style="width:110px">Claim</th><th style="width:44px"></th></tr></thead><tbody>
    ${ho.assets.map((a, i) => `<tr><td><input data-p="${p}.assets.${i}.desc" value="${esc(a.desc)}"></td><td><select data-p="${p}.assets.${i}.type" data-asset="${i}">${E.IN47_ASSETS.map(([v, l]) => `<option value="${v}" ${a.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><input type="date" data-p="${p}.assets.${i}.purchaseDate" value="${esc(a.purchaseDate || '')}"></td><td><input class="num" data-num="money" data-p="${p}.assets.${i}.cost" value="${fmtInput(a.cost)}"></td><td><input class="num" data-num="dec" data-p="${p}.assets.${i}.years" value="${a.years ?? ''}"></td><td><input class="num" data-num="dec" data-p="${p}.assets.${i}.businessPct" value="${a.businessPct ?? 100}"></td><td class="r" title="${esc((h.assets[i] || {}).note || '')}">${moneyCell((h.assets[i] || {}).claim || 0)}</td><td><button class="btn btn-sm btn-danger" data-act="del" data-p="${p}.assets" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Laptop, desk, chair, printer… Items under R7 000 are written off in full in the year bought.</td></tr>'}</tbody></table>
    <p class="muted" style="margin-top:6px">Write-off periods follow SARS Interpretation Note 47 and can be changed per item.</p></div>`;
};

// ---------- Other deductions & losses ----------
SCREENS.deductions = () => {
  const y = yd();
  return head('Other deductions & losses', 'Assessed losses brought forward and any other allowable deductions. Home office costs are on Work from home.', `<button class="btn btn-primary" data-act="add" data-p="y.deductions.other" data-tpl="other">+ Other deduction</button>`) +
  `<div class="grid g2"><div class="card"><h2>Losses</h2>${f({ p: 'y.deductions.assessedLossBF', label: 'Assessed loss brought forward', type: 'money' })}</div><div class="card"><h2>Home office</h2><p class="muted">Capture the home office, its running costs and work equipment on the Work from home screen.</p><button class="btn" data-go="homeoffice">Go to Work from home →</button></div></div>
  <div class="card"><h2>Other deductions</h2><table class="t"><tbody>${(y.deductions.other || []).map((o, i) => `<tr><td><input data-p="y.deductions.other.${i}.desc" value="${esc(o.desc)}"></td><td style="width:200px"><input class="num" data-num="money" data-p="y.deductions.other.${i}.amount" value="${esc(fmtInput(o.amount))}"></td><td style="width:40px"><button class="btn btn-sm btn-danger" data-act="del" data-p="y.deductions.other" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td class="muted">None.</td></tr>'}</tbody></table></div>`;
};

// ---------- Time records (no invoicing) ----------
SCREENS.fees = () => {
  const c = cur(); c.fees = c.fees || [];
  const tot = (l, k) => l.reduce((a, f) => a + E.n(f[k]), 0);
  const thisYear = c.fees.filter(f => Number(f.year) === S.year);
  return head('Time records', `Time and fee value recorded for ${esc(clientName(c))}. Use it to track work and to bill in your own accounting system.`, `<button class="btn btn-primary" data-act="addfee">+ Time entry</button>`) +
  `<div class="kpis"><div class="kpi accent"><div class="k-label">Hours – ${S.year}</div><div class="k-val">${E.fmt(tot(thisYear, 'hours'), 1)}</div></div><div class="kpi gold"><div class="k-label">Value – ${S.year}</div><div class="k-val">${money0(tot(thisYear, 'amount'))}</div></div><div class="kpi"><div class="k-label">Hours – all years</div><div class="k-val">${E.fmt(tot(c.fees, 'hours'), 1)}</div></div><div class="kpi"><div class="k-label">Value – all years</div><div class="k-val">${money0(tot(c.fees, 'amount'))}</div></div></div>
  <div class="card"><table class="t"><thead><tr><th style="width:140px">Date</th><th style="width:80px">Tax year</th><th>Work done</th><th class="r" style="width:90px">Hours</th><th class="r" style="width:110px">Rate</th><th class="r" style="width:130px">Value</th><th></th></tr></thead><tbody>
  ${c.fees.map((f, i) => `<tr data-allow><td><input type="date" data-p="c.fees.${i}.date" value="${esc(f.date)}"></td><td><input type="text" class="num" data-num="int" data-p="c.fees.${i}.year" value="${f.year || ''}"></td><td><input type="text" data-p="c.fees.${i}.desc" value="${esc(f.desc)}" list="feeDescs"></td><td><input class="num" data-num="dec" data-p="c.fees.${i}.hours" value="${f.hours || ''}"></td><td><input class="num" data-num="money" data-p="c.fees.${i}.rate" value="${fmtInput(f.rate)}"></td><td><input class="num" data-num="money" data-p="c.fees.${i}.amount" value="${fmtInput(f.amount)}"></td><td><button class="btn btn-sm btn-danger" data-act="del" data-p="c.fees" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No entries yet. Hours × rate fills the value automatically.</td></tr>'}
  <tr class="sub"><td colspan="3">Total</td><td class="r">${E.fmt(tot(c.fees, 'hours'), 1)}</td><td></td><td class="r">${moneyCell(tot(c.fees, 'amount'))}</td><td></td></tr></tbody></table>
  <datalist id="feeDescs">${['Provisional tax return – 1st period (IRP6)', 'Provisional tax return – 2nd period (IRP6)', 'Top-up payment calculation', 'Income tax return (ITR12) preparation and submission', 'Tax planning consultation', 'Tax computation and supporting schedules', 'SARS correspondence', 'Notice of objection', 'Verification / audit – supporting documents', 'Registration as provisional taxpayer'].map(x => `<option value="${x}">`).join('')}</datalist></div>`;
};
SCREENS.timesummary = () => {
  const rows = S.clients.map(c => { const fs = c.fees || []; const y = fs.filter(f => Number(f.year) === S.year); return { c, hy: y.reduce((a, f) => a + E.n(f.hours), 0), vy: y.reduce((a, f) => a + E.n(f.amount), 0), ha: fs.reduce((a, f) => a + E.n(f.hours), 0), va: fs.reduce((a, f) => a + E.n(f.amount), 0) }; }).filter(x => x.ha || x.va).sort((a, b) => b.vy - a.vy);
  const T = (k) => rows.reduce((a, x) => a + x[k], 0);
  return head('Time records – practice', `Hours and value recorded per client for ${S.year} and in total.`, `<button class="btn" data-act="csv" data-what="fees">Export CSV</button><button class="btn btn-primary" data-report="timesummary">Time summary PDF</button>`) +
  `<div class="kpis"><div class="kpi accent"><div class="k-label">Hours – ${S.year}</div><div class="k-val">${E.fmt(T('hy'), 1)}</div></div><div class="kpi gold"><div class="k-label">Value – ${S.year}</div><div class="k-val">${money0(T('vy'))}</div></div><div class="kpi"><div class="k-label">Clients with time</div><div class="k-val">${rows.length}</div></div><div class="kpi"><div class="k-label">Value – all years</div><div class="k-val">${money0(T('va'))}</div></div></div>
  <div class="card"><table class="t"><thead><tr><th>Client</th><th class="r">Hours ${S.year}</th><th class="r">Value ${S.year}</th><th class="r">Hours (all)</th><th class="r">Value (all)</th></tr></thead><tbody>${rows.map(x => `<tr class="clickable" data-act="openc" data-id="${x.c.id}" data-route="fees"><td>${esc(clientName(x.c))}</td><td class="r">${E.fmt(x.hy, 1)}</td><td class="r">${moneyCell(x.vy)}</td><td class="r">${E.fmt(x.ha, 1)}</td><td class="r">${moneyCell(x.va)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No time recorded yet.</td></tr>'}</tbody></table></div>`;
};

// ---------- actions ----------
Object.assign(ACTIONS2, {
  addvehicle() { const y = yd(); y.travel.enabled = true; y.flags.travel = true; y.travel.vehicles.push(E.emptyVehicle(y.travel.vehicles.length + 1)); markDirty(); App.refresh(); const n = document.querySelector(`[data-p="y.travel.vehicles.${y.travel.vehicles.length - 1}.name"]`); if (n) { n.focus(); n.select(); } },
  addcar() { const y = yd(); y.flags.companyCar = true; y.companyCars.push(E.emptyCompanyCar(y.companyCars.length + 1)); markDirty(); App.refresh(); },
  addasset() { const ho = yd().homeOffice; ho.assets.push({ desc: '', type: 'laptop', cost: 0, years: 2, purchaseDate: pack().start, businessPct: 100 }); markDirty(); App.refresh(); }
});
// Asset type change sets the IN47 default write-off period
document.addEventListener('change', e => {
  const i = e.target.dataset && e.target.dataset.asset; if (i === undefined) return;
  const a = yd().homeOffice.assets[Number(i)], d = E.IN47_ASSETS.find(x => x[0] === e.target.value);
  if (a && d) { a.years = d[2]; if (!a.desc) a.desc = d[1]; markDirty(); }
}, true);

// Roll forward: vehicles, company cars and home office
const _roll = ACTIONS2.rollforward;
ACTIONS2.rollforward = async (t, ds) => {
  const c = cur(), from = yd(), before = S.year;
  await _roll(t, ds);
  const ok = document.getElementById('rfOk'); if (!ok) return;
  const orig = ok.onclick;
  ok.onclick = () => {
    const keep = document.getElementById('rfAmt').checked, g = 1 + E.n(document.getElementById('rfG').value) / 100;
    orig();
    const to = c.years[before + 1]; if (!to || S.year !== before + 1) return;
    to.travel = { enabled: from.travel.enabled, vehicles: from.travel.vehicles.map(v => Object.assign(E.clone(v), { daysUsed: 365, totalKm: keep ? v.totalKm : 0, businessKm: keep ? v.businessKm : 0, actual: Object.fromEntries(Object.entries(v.actual || {}).map(([k, x]) => [k, keep ? E.r2(E.n(x) * g) : 0])) })) };
    to.companyCars = from.companyCars.map(x => Object.assign(E.clone(x), { months: 12, irp5Value: null, totalKm: keep ? x.totalKm : 0, businessKm: keep ? x.businessKm : 0 }));
    to.homeOffice = Object.assign(E.clone(from.homeOffice), { costs: Object.fromEntries(Object.entries(from.homeOffice.costs).map(([k, x]) => [k, keep ? E.r2(E.n(x) * g) : 0])), otherCosts: (from.homeOffice.otherCosts || []).map(o => ({ desc: o.desc, amount: keep ? E.r2(E.n(o.amount) * g) : 0 })) });
    markDirty(); App.route('dashboard');
  };
};
