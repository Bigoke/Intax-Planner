// Intax Planner 1.4 – SARS eFiling tax calculator result (ITC12): import, reconcile, expected assessment.
'use strict';
(function () {
const IT = window.IntaxItc12;

// ---------- navigation ----------
const fi = NAV.findIndex(n => n.id === 'final');
NAV.splice(fi + 1, 0, { id: 'sarscalc', label: 'SARS tax calculator', icon: '🧮' });
NEEDS_CLIENT.add('sarscalc'); UNLOCKED_SCREENS.add('sarscalc');

const recon = () => { const y = yd(), r = result(); if (!y.itc12 || !y.itc12.data) return null; return { y, r, it: y.itc12.data, rc: IT.reconcileItc12(y.itc12.data, r, r.provisionalPaid) }; };
window.itc12Recon = recon;

function checks(it, c) {
  const w = [...(it.warnings || [])];
  if (it.reference && c.taxRef && it.reference.replace(/\D/g, '') !== String(c.taxRef).replace(/\D/g, '')) w.push(`The reference number on the calculator (${it.reference}) is not this client’s tax number (${c.taxRef}).`);
  if (it.year && it.year !== S.year) w.push(`The calculator is for the ${it.year} year of assessment, but ${S.year} is open.`);
  return w;
}

// ---------- import ----------
async function store(parsed, source) {
  if (!parsed.valid) { toast('That does not look like a SARS tax calculator result.'); modal({ title: 'Import failed', body: `<p>${(parsed.warnings || []).map(esc).join('<br>')}</p><p class="muted">Save the eFiling "Tax Calculator Result" page (ITC12) as PDF and import that file, or paste its text.</p>` }); return; }
  // Match the client by tax reference and the year of assessment
  const ref = (parsed.reference || '').replace(/\D/g, '');
  const match = ref ? S.clients.find(c => String(c.taxRef || '').replace(/\D/g, '') === ref) : null;
  if (match && match.id !== S.clientId && await confirmBox(`This calculator belongs to <b>${esc(clientName(match))}</b> (tax no. ${esc(match.taxRef)}). Open that client?`, 'Open client')) { S.clientId = match.id; }
  if (parsed.year && parsed.year !== S.year && YEARS.includes(parsed.year) && await confirmBox(`The calculator is for <b>${parsed.year}</b>. Switch to the ${parsed.year} tax year?`, `Use ${parsed.year}`)) { S.year = parsed.year; }
  const y = yd();
  if (y.itc12 && y.itc12.data) { y.itc12History = (y.itc12History || []).concat([y.itc12]).slice(-5); }
  y.itc12 = { importedAt: new Date().toISOString(), source, data: parsed };
  App.log('y.itc12', '', `${source} – result ${parsed.result}`);
  markDirty(); App.afterClientChange(); App.go('sarscalc'); toast('SARS calculator imported');
}
async function importPdf() {
  if (!cur()) return toast('Select a client first.');
  const res = await window.intax.pickItc12(); if (!res) return;
  store(IT.parseItc12(res.lines), res.file);
}
function pasteText() {
  const m = modal({ title: 'Paste SARS tax calculator result', body: `<p class="wiz-intro">On eFiling, open the <b>Tax Calculator Result</b> page, select all the text (Ctrl+A), copy it (Ctrl+C) and paste it below.</p><textarea id="itcPaste" style="min-height:280px;font-family:Consolas,monospace;font-size:12px" placeholder="Reference Number: …&#10;Amounts Assessed&#10;3601  INCOME - TAXABLE  …"></textarea>`, foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="itcGo">Import</button>' });
  m.el.querySelector('#itcPaste').focus();
  m.el.querySelector('#itcGo').onclick = () => { const t = m.el.querySelector('#itcPaste').value; m.el.remove(); store(IT.parseItc12(t), 'Pasted text'); };
}
function manual() {
  const y = yd(), old = (y.itc12 && y.itc12.data) || {};
  const flds = [['taxableIncome', 'Taxable income'], ['normalTax', 'Normal tax on taxable income'], ['rebates', 'Rebates'], ['additionalTax', 'Additional tax'], ['penalties', 'Administrative penalties'], ['lumpRetTax', 'Lump sum benefit tax'], ['lumpWdTax', 'Lump sum withdrawal tax'], ['subtotal', 'Subtotal'], ['credits', 'Employees’ tax and tax credits'], ['result', 'Calculated result (negative = refund)']];
  const lines = (old.assessed || []).map(l => `${l.code}  ${l.desc}  ${l.amount.toFixed(2)}`).join('\n');
  const m = modal({ title: 'Enter SARS calculator figures', wide: false, body: `<div class="grid g2"><div class="field"><label>Year of assessment</label><input id="mYear" class="num" value="${old.year || S.year}"></div><div class="field"><label>Issue date</label><input type="date" id="mDate" value="${esc(old.issueDate || new Date().toISOString().slice(0, 10))}"></div>${flds.map(([k, l]) => `<div class="field"><label>${l}</label><input class="num" id="m_${k}" value="${old[k] ?? ''}"></div>`).join('')}</div>
    <div class="field" style="margin-top:12px"><label>Amounts assessed – one source code per line: code, description, amount (losses as printed)</label><textarea id="mLines" style="min-height:120px;font-family:Consolas,monospace;font-size:12px" placeholder="3601  INCOME - TAXABLE  608075.00">${esc(lines)}</textarea></div>`, foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="mOk">Save</button>' });
  m.el.querySelector('#mOk').onclick = () => {
    const v = (id) => m.el.querySelector(id).value;
    const text = [`Reference Number: ${String(cur().taxRef || '').replace(/\D/g, '')}`, `Year Of Assessment: ${v('#mYear')}`, `Issue Date: ${v('#mDate')}`, 'Amounts Assessed', ...v('#mLines').split(/\n/).map(l => l.trim()).filter(Boolean).map(l => { const mm = l.match(/^(\d{4})\s+(.+?)\s+(-?[\d\s,.]+)$/); return mm ? `${mm[1]}  ${mm[2]}  ${parseNum(mm[3]).toFixed(2)}` : l; }), 'Tax Calculation',
      ...flds.map(([k]) => { const raw = v('#m_' + k); if (raw === '') return ''; const lab = { taxableIncome: 'Taxable Income', normalTax: 'Normal tax on taxable income', rebates: 'Rebates', additionalTax: 'Additional Tax', penalties: 'Administrative penalties', lumpRetTax: 'Retirement fund lump sum benefit tax liability', lumpWdTax: 'Retirement fund lump sum withdrawal benefit tax liability', subtotal: 'Subtotal', credits: "Employees' tax and tax credits", result: 'Calculated Result' }[k]; return `${lab}  ${parseNum(raw).toFixed(2)}`; })].join('\n');
    const parsed = IT.parseItc12(text); parsed.assessedTotal = null; parsed.warnings = parsed.warnings.filter(x => !/add up/.test(x));
    parsed.assessed.forEach(l => { l.signed = /\bLOSS/i.test(l.desc) ? -l.amount : l.amount; });
    m.el.remove(); store(parsed, 'Entered manually');
  };
}

// ---------- screen ----------
SCREENS.sarscalc = () => {
  const c = cur(), y = yd(), R = recon();
  const actions = `<button class="btn" data-act="itcpaste">Paste text…</button><button class="btn" data-act="itcmanual">${R ? 'Edit figures…' : 'Enter figures…'}</button>${R ? '<button class="btn" data-report="sarscalc">Reconciliation PDF</button><button class="btn btn-danger" data-act="itcclear">Remove</button>' : ''}<button class="btn btn-primary" data-act="itcimport">Import ITC12 PDF…</button>`;
  if (!R) return head('SARS tax calculator (ITC12)', 'Compare SARS eFiling’s tax calculator with your plan, and add the provisional tax payments SARS leaves out.', actions + helpBtn('itc12')) +
    `<div class="card"><h2>How to get the calculator result</h2><ol class="help-article"><li>On SARS eFiling open the client’s <b>ITR12</b> for ${S.year} and complete it.</li><li>Click <b>Calculate</b> (tax calculator) – SARS shows the <b>Tax Calculator Result (ITC12)</b>.</li><li>Print it and choose <b>Save as PDF</b> (or select and copy the page text).</li><li>Click <b>Import ITC12 PDF…</b> here (or <b>Paste text…</b>). The client and year are matched on the reference number and year of assessment.</li></ol>
    <div class="alert info">The SARS calculator does <b>not</b> take provisional tax payments, assessed losses brought forward or other carry-over amounts into account. Intax Planner adds the provisional payments recorded for this year (${money(result().provisionalPaid)}) to show the expected result on assessment.</div></div>`;
  const { it, rc, r } = R, warn = checks(it, c);
  const row = (x, strong) => `<tr class="${strong ? 'total' : ''}"><td>${x.label}</td><td class="r">${x.sars === null ? '—' : moneyCell(x.sars)}</td><td class="r">${moneyCell(x.plan)}</td><td class="r">${x.diff === null ? '' : `<b class="${Math.abs(x.diff) > 100 ? 'neg' : ''}">${moneyCell(x.diff)}</b>`}</td></tr>`;
  const exp = rc.sarsAfterProvisional;
  return head('SARS tax calculator (ITC12)', `Imported ${new Date(y.itc12.importedAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })} · ${esc(y.itc12.source || '')} · issued ${dateLong(it.issueDate)} · ref ${esc(it.reference || '—')} · year ${it.year || '—'}`, actions) +
  warn.map(t => `<div class="alert warn">⚠ ${esc(t)}</div>`).join('') +
  `<div class="kpis">
    <div class="kpi"><div class="k-label">SARS calculated result</div><div class="k-val">${money0(Math.abs(it.result))}</div><div class="k-sub">${it.result > 0 ? 'payable' : 'refund'} – before provisional tax</div></div>
    <div class="kpi gold"><div class="k-label">Provisional tax paid</div><div class="k-val">${money0(rc.provisionalPaid)}</div><div class="k-sub">recorded on the IRP6 screens</div></div>
    <div class="kpi ${exp > 0 ? 'red' : 'green'}"><div class="k-label">Expected on assessment</div><div class="k-val">${money0(Math.abs(exp))}</div><div class="k-sub">${exp > 0 ? 'payable to SARS' : 'refund from SARS'}</div></div>
    <div class="kpi ${Math.abs(rc.difference) > 100 ? 'red' : 'accent'}"><div class="k-label">Plan vs SARS</div><div class="k-val">${money0(rc.difference)}</div><div class="k-sub">${Math.abs(rc.difference) > 100 ? 'difference to investigate' : 'plan agrees with SARS'}</div></div>
  </div>
  <div class="grid g2"><div class="card"><h2>Tax calculation</h2><table class="t"><thead><tr><th></th><th class="r">SARS</th><th class="r">Plan</th><th class="r">Difference</th></tr></thead><tbody>${rc.tax.map((x, i) => row(x, i === rc.tax.length - 1)).join('')}
    <tr><td>Less provisional tax paid (not in the SARS calculator)</td><td class="r">${moneyCell(-rc.provisionalPaid)}</td><td class="r">${moneyCell(-r.provisionalPaid)}</td><td></td></tr>
    <tr class="total"><td>Expected result on assessment</td><td class="r">${moneyCell(rc.sarsAfterProvisional)}</td><td class="r">${moneyCell(rc.planAfterProvisional)}</td><td class="r"><b class="${Math.abs(rc.difference) > 100 ? 'neg' : ''}">${moneyCell(rc.difference)}</b></td></tr></tbody></table>
    <p class="muted" style="margin-top:8px">Positive = payable, negative = refund.${it.ratingPct !== null ? ` Rating percentage per SARS: ${it.ratingPct}% (normal tax ÷ taxable income).` : ''}</p></div>
  <div class="card"><h2>Income and deductions by type</h2><table class="t"><thead><tr><th></th><th>Codes</th><th class="r">SARS</th><th class="r">Plan</th><th class="r">Difference</th></tr></thead><tbody>${rc.rows.map(x => `<tr><td>${esc(x.label)}</td><td>${x.codes.map(cd => `<span class="code-tag">${cd}</span>`).join(' ')}</td><td class="r">${moneyCell(x.sars)}</td><td class="r">${moneyCell(x.plan)}</td><td class="r"><b class="${Math.abs(x.diff) > 100 ? 'neg' : ''}">${moneyCell(x.diff)}</b></td></tr>`).join('')}
    <tr class="total"><td colspan="2">Taxable income</td><td class="r">${moneyCell(it.taxableIncome)}</td><td class="r">${moneyCell(r.taxableIncome)}</td><td class="r">${moneyCell(it.taxableIncome - r.taxableIncome)}</td></tr></tbody></table>
    <p class="muted" style="margin-top:8px">SARS shows taxable amounts (after the interest exemption and the CGT inclusion rate). Losses are shown as negative.</p></div></div>
  <div class="grid g2"><div class="card"><h2>Source codes per SARS</h2><table class="t"><thead><tr><th>Code</th><th>Description</th><th class="r">Amount</th></tr></thead><tbody>${it.assessed.map(l => `<tr><td><span class="code-tag">${l.code}</span></td><td>${esc(l.desc)}</td><td class="r">${moneyCell(l.signed)}</td></tr>`).join('')}${it.assessedTotal !== null ? `<tr class="sub"><td colspan="2">Total amounts assessed</td><td class="r">${moneyCell(it.assessedTotal)}</td></tr>` : ''}${it.deductions.map(l => `<tr><td><span class="code-tag">${l.code}</span></td><td>${esc(l.desc)} (deduction)</td><td class="r">${moneyCell(-l.amount)}</td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h2>What the SARS calculator leaves out</h2>${line('Provisional tax payments (1st, 2nd, top-up)', money(r.provisionalPaid))}${line('Assessed loss brought forward (in plan)', money(r.assessedLossBF))}${line('Retirement contributions carried forward (in plan)', money(r.ra.carriedIn))}${line('Capital loss brought forward (in plan)', money(r.cgt.lossBF))}${line('Expected s89quat interest', r.interest89 && r.interest89.applies ? money(r.interest89.amount) : '—')}
    ${rc.material ? '<div class="alert warn">⚠ The plan and the SARS calculator differ. Common causes: a certificate SARS has that the plan does not (or the reverse), the interest exemption, losses brought forward, or medical credits.</div>' : '<div class="alert tip">✓ The plan agrees with the SARS calculator.</div>'}
    ${(y.itc12History || []).length ? `<h3>Earlier imports</h3>${y.itc12History.slice().reverse().map(h => line(`${new Date(h.importedAt).toLocaleDateString('en-ZA')} – ${esc(h.source || '')}`, money(h.data.result))).join('')}` : ''}</div></div>`;
};

// ---------- report ----------
REPORTS.LIST.push({ id: 'sarscalc', cat: 'Client reports', title: 'SARS calculator reconciliation', desc: 'ITC12 result vs plan, plus provisional tax: expected assessment.' });
REPORTS.EXTRA.sarscalc = () => {
  const c = cur(); if (!c) throw new Error('Select a client first.');
  const R = recon(); if (!R) throw new Error('Import the SARS tax calculator result (ITC12) first.');
  const { it, rc, r } = R, H = REPORTS.h, P = pack(), m2 = H.m2;
  const row = (x, cls) => `<tr class="${cls || ''}"><td>${x.label}</td><td class="r">${x.sars === null ? '—' : m2(x.sars)}</td><td class="r">${m2(x.plan)}</td><td class="r">${x.diff === null ? '' : m2(x.diff)}</td></tr>`;
  const body = H.titleBlock('SARS Tax Calculator Reconciliation', `ITC12 issued ${dateLong(it.issueDate)} · reference ${esc(it.reference || '—')}`, c, P) +
    `<div class="kp"><div><b>SARS calculated result</b><span>R ${E.fmt(it.result, 2)}</span></div><div><b>Provisional tax paid</b><span>R ${E.fmt(rc.provisionalPaid, 2)}</span></div><div><b>Expected on assessment</b><span>R ${E.fmt(Math.abs(rc.sarsAfterProvisional), 2)} ${rc.sarsAfterProvisional > 0 ? 'payable' : 'refund'}</span></div><div><b>Plan vs SARS</b><span>R ${E.fmt(rc.difference, 2)}</span></div></div>
    <h2>Tax calculation</h2><table><tr><th></th><th class="r">SARS</th><th class="r">Plan</th><th class="r">Difference</th></tr>${rc.tax.map((x, i) => row(x, i === rc.tax.length - 1 ? 'sub' : '')).join('')}<tr><td>Less provisional tax paid</td><td class="r">${m2(-rc.provisionalPaid)}</td><td class="r">${m2(-r.provisionalPaid)}</td><td></td></tr><tr class="tot"><td>Expected result on assessment (positive = payable)</td><td class="r">${m2(rc.sarsAfterProvisional)}</td><td class="r">${m2(rc.planAfterProvisional)}</td><td class="r">${m2(rc.difference)}</td></tr></table>
    <h2>Income and deductions by type</h2><table><tr><th></th><th>Codes</th><th class="r">SARS</th><th class="r">Plan</th><th class="r">Difference</th></tr>${rc.rows.map(x => `<tr><td>${esc(x.label)}</td><td>${x.codes.join(', ')}</td><td class="r">${m2(x.sars)}</td><td class="r">${m2(x.plan)}</td><td class="r">${m2(x.diff)}</td></tr>`).join('')}<tr class="tot"><td colspan="2">Taxable income</td><td class="r">${m2(it.taxableIncome)}</td><td class="r">${m2(r.taxableIncome)}</td><td class="r">${m2(it.taxableIncome - r.taxableIncome)}</td></tr></table>
    <h2>Source codes per SARS calculator</h2><table><tr><th>Code</th><th>Description</th><th class="r">Amount</th></tr>${it.assessed.map(l => `<tr><td><span class="cd">${l.code}</span></td><td>${esc(l.desc)}</td><td class="r">${m2(l.signed)}</td></tr>`).join('')}</table>
    <div class="box ${rc.material ? 'warn' : ''}">The SARS tax calculator is an indication only and excludes provisional tax payments, assessed losses and other carry-over amounts. Provisional tax recorded in Intax Planner has been deducted to estimate the assessment.${rc.material ? ' <b>The plan differs from the SARS calculator – review before submitting the return.</b>' : ''}</div>`;
  return { title: 'SARS calculator reconciliation', html: H.doc('SARS calculator reconciliation', H.letterhead() + body + H.footer()), fileName: `SARS calculator reconciliation - ${clientName(c)} - ${S.year}.pdf` };
};

// ---------- surface it elsewhere ----------
const _final = SCREENS.final;
SCREENS.final = () => { const R = recon(); return (R ? `<div class="alert ${Math.abs(R.rc.difference) > 100 ? 'warn' : 'tip'}">🧮 <span>SARS tax calculator: <b>${money(R.it.result)}</b> before provisional tax → expected on assessment <b>${money(R.rc.sarsAfterProvisional)}</b>. Plan difference ${money(R.rc.difference)}.</span><button class="btn-link go" data-go="sarscalc">Open →</button></div>` : `<div class="alert info">🧮 <span>Got the SARS eFiling tax calculator result (ITC12)? Import it to check the plan and see the expected assessment after provisional tax.</span><button class="btn-link go" data-go="sarscalc">Import →</button></div>`) + _final(); };
const _dash = SCREENS.dashboard;
SCREENS.dashboard = () => { const R = recon(); let h = _dash(); if (R) h = h.replace('<div class="card"><div class="card-head"><h2>Review points', `<div class="alert ${Math.abs(R.rc.difference) > 100 ? 'warn' : 'tip'}">🧮 <span>SARS calculator (${dateLong(R.it.issueDate)}): expected on assessment <b>${money(R.rc.sarsAfterProvisional)}</b> after provisional tax${Math.abs(R.rc.difference) > 100 ? ` – differs from the plan by ${money(R.rc.difference)}` : ' – agrees with the plan'}.</span><button class="btn-link go" data-go="sarscalc">Open →</button></div>\n<div class="card"><div class="card-head"><h2>Review points`); return h; };

Object.assign(ACTIONS2, {
  itcimport() { importPdf(); },
  itcpaste() { if (!cur()) return toast('Select a client first.'); pasteText(); },
  itcmanual() { if (!cur()) return toast('Select a client first.'); manual(); },
  async itcclear() { if (!(await confirmBox('Remove the imported SARS calculator result for this year?', 'Remove'))) return; const y = yd(); y.itc12 = null; App.log('y.itc12', 'imported', 'removed'); markDirty(); App.refresh(); }
});
window.ItcImport = { store, parse: IT.parseItc12 };
})();
