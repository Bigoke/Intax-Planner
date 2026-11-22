# Intax Planner

A Windows desktop tax planning workstation for South African tax practitioners. Plan individual income tax for many clients: provisional tax (IRP6 first, second and third/top-up payments) and the final ITR12. Covers the **2020 to 2027 tax years**, and every tax table can be updated.

## Features
- **Client register:** many clients, each with any number of tax years. Data stays on the PC in `Documents\Intax Planner`, with an automatic daily backup (the last 60 are kept).
- **Income:**
  - IRP5 / IT3(a) captured code by code. Over 60 source codes are built in, each with the correct tax treatment.
  - Business / freelance income, rental property, interest and dividends (local, REIT, foreign)
  - Capital gains on shares, crypto and property, including the primary residence exclusion
  - Retirement lump sums and two-pot withdrawals, foreign employment income, other income
- **Deductions & credits:**
  - s11F retirement contributions (27.5% limit and cap, with carry-forward)
  - s6A / s6B medical credits
  - Travel logbook claims: deemed-cost table vs actual cost, whichever is better, capped at the allowance
  - s18A donations, home office, other deductions and assessed losses
- **Provisional tax:**
  - Basic amount, with the 8% p.a. uplift
  - First and second period worksheets
  - The paragraph 20 underestimation penalty test
  - Top-up payment, late payment penalty and interest estimates
- **ITR12:**
  - Full computation
  - Capture schedule listing every figure next to its source code / ITR12 section
  - Carry-forwards to next year
- **Wizards:** new client, guided set-up / deduction finder, IRP5, business, rental, investments, CGT disposal, lump sums, retirement, medical, travel, donations, IRP6 period 1 and 2, ITR12.
- **Help & search:** a built-in tax knowledge base. Search works by topic, everyday words or source code (e.g. "car", "3701", "penalty"), and **Go to** jumps straight to the right screen or field.
- **Professional reports:** on your practice letterhead with logo and practitioner number. Save as PDF or print.
  - Computation, client summary letter, ITR12 schedule
  - IRP6 worksheets, supporting schedules
  - Multi-year comparison, what-if scenario, client register, tax tables
  - A full client pack
- **What-if planner:** test RA top-ups, donations, bonuses and asset sales before year end.
- **Tax tables screen:** edit brackets, rebates, thresholds, medical credits, CGT, retirement cap, travel tables and lump sum tables for any year. You can also import or export them, or reset to the SARS defaults.

## New in 1.1
- **Practice dashboard:** client count, payments due in the next 30 days, overdue items, unbilled fees and a work-status pipeline.
- **Deadlines & payments:** every client's 1st, 2nd and top-up payments, assessment payment dates, objection deadlines and unpaid invoices in one list. Filter it and export to CSV or PDF.
- **Documents checklist:** generated from each client's income and deductions. Tick documents as they arrive and send a document request letter.
- **Time & fees:** record hours or fees per client and issue numbered invoices (tax invoices if you are VAT registered) with your bank details. The practice fee register shows unbilled, unpaid and paid work.
- **Change log:** an audit trail of every change, with date, time and old and new values.
- **Year lock:** locks a tax year after submission. **PIN lock** with auto-lock when idle protects client data (POPIA).
- **Roll forward:** copies a year to the next with a growth % as a base for next year's provisional estimates.
- **Annualise year-to-date figures** for IRP6 estimates.
- **Married in community of property:** 50/50 split of interest, dividends, rental and capital gains, with separate-property overrides.
- **Company car fringe benefit:** 3.5% / 3.25% calculation and logbook reduction (para 7(7)/(8)).
- **Tax-free savings accounts:** annual and lifetime limits, with 40% tax on excess contributions.
- **SARS assessment (ITA34):** reconciliation against the plan, the 80-business-day objection deadline (SA public holidays excluded), s89quat interest estimate and payment tracking.
- **Due dates:** move to the last business day before weekends and public holidays.
- **Charts:** income mix, year-on-year trend and tax-by-bracket on screen and in reports.
- **New reports:**
  - Comparative computation, tax rate analysis, retirement & savings planning
  - Company car schedule, IRP6 capture sheet, assessment reconciliation
  - Document request letter, engagement letter, invoice, change log
  - Deadlines, work in progress, fee register, provisional tax summary for all clients
- **CSV exports:** computation, client register, deadlines and fees.

## Developers
```
npm install
npm start            # run the app
npm test             # calculation engine tests (hand-checked SARS examples, all years)
npm run smoke        # (Linux: xvfb-run -a npx electron --no-sandbox scripts/smoke.js) screenshots + PDFs into smoke-out/
npm run dist         # Windows installer + portable exe (electron-builder, on Windows)
npm run dist:linux-host   # on Linux: portable via electron-builder, installer via native makensis
```
The GitHub Actions workflow builds the Windows installer on every push to `main` and attaches it to a release when you push a `v*` tag.

| Path | Contents |
|---|---|
| `src/data/taxpacks.js` | SARS tables for 2020–2027 |
| `src/data/codes.js` | IRP5 source codes |
| `src/data/help.js` | Knowledge base |
| `src/engine/engine.js` | All calculations |
| `renderer/` | UI (screens, wizards, reports) |
| `main.js` | Storage, backups, PDF |

*All figures are estimates for planning. Final liability is determined by SARS on assessment.*
