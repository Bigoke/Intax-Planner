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

## New in 1.5

- **SARS penalties & interest** (Final → Penalties & interest): foreseeable amounts for a late ITR12 (s210/s211 fixed penalty by prior-year taxable income, up to 35 months), late or short IRP6 payments (10% plus interest), underestimation (20%, including a 2nd IRP6 not submitted), s89quat interest, late payment of the assessment (10% plus interest), and an understatement-penalty scenario (s223 table). Interest is calculated day by day at SARS Table 1 rates, which you can edit on the Tax tables screen. ITR12 filing deadlines appear in Deadlines & payments.
- **Export to Excel with working formulas**: every screen has an **Excel** button and every report preview has **Export to Excel**. Client exports include a live working paper (Computation, Provisional, Penalties, Tax tables, Interest rates) where inputs are blue and every calculation is an Excel formula with named ranges; report tables get SUM formulas on total rows. `npm run test:excel` recalculates the demo working papers in LibreOffice and checks them against the engine.

## New in 1.4
- **SARS eFiling tax calculator (ITC12):**
  - Import the "Tax Calculator Result" PDF, paste its text, or type the figures. The client and year are matched on the reference number and year of assessment.
  - Compares SARS and the plan line by line (taxable income, normal tax, rebates and credits, PAYE, calculated result) and by income type and source code.
  - Deducts the provisional tax recorded in the app, which SARS's calculator leaves out, to show the **expected payable or refund on assessment**.
  - Earlier imports are kept, and there is a reconciliation PDF report.

## New in 1.3
- **Several practices:** each has its own clients, letterhead, logo and practitioner details. Switch from the practice name at the top left. Tax tables, appearance and the PIN are shared. Data folders from earlier versions are upgraded automatically.
- **Example practice:** three fictional clients, created on first start. You can delete it, or add it again, from the practice menu or Practice settings.
- **Add your own tax years:** on the Tax tables screen. The tables are copied from an existing year for you to update, and you can recalculate the base tax and thresholds. More rates are now editable (CGT inclusion, retirement %, TFSA, dividends tax, company car rates, penalty rates), and you can add or remove bracket and travel-table rows.
- **Appearance:** Light, Slate, Warm and Dark themes, seven accent colours, four text sizes plus auto-fit (Ctrl + / Ctrl − / Ctrl 0).
- **Menu:** bold section headings that collapse and expand.
- **New icon:** a minimalist "i" mark (`build/icon.svg`).

## New in 1.2
- **Several vehicles per tax year:**
  - Travel logbook claims: each vehicle has its own value, days used (fixed cost pro-rated), kilometres and costs, and its own deemed or actual method. The total is limited to the travel allowance.
  - Company cars: the IRP5 3802/3816 total is split between the cars, or you enter the value per car. Each car gets its own logbook reduction.
- **Working from home:**
  - Checks the s23(b) requirements for employees, commission earners and business owners.
  - Office share of home running costs, by floor area and months.
  - Wear-and-tear on work equipment using SARS IN 47 write-off periods; items under R7 000 are written off in full.
  - Other work costs, which salaried employees cannot deduct (s23(m)).
  - New wizard, home office report, and a warning about the primary residence exclusion.
- **Invoicing removed:** Time & fees is now **Time records** (hours and value per client) with a practice summary and report. Billing happens in your own accounting system.

## New in 1.1
- **Practice dashboard:** client count, payments due in the next 30 days, overdue items, unbilled fees and a work-status pipeline.
- **Deadlines & payments:** every client's 1st, 2nd and top-up payments, assessment payment dates, objection deadlines in one list. Filter it and export to CSV or PDF.
- **Documents checklist:** generated from each client's income and deductions. Tick documents as they arrive and send a document request letter.
- **Time records:** hours and value per client.
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
  - Document request letter, engagement letter, change log
  - Deadlines, work in progress, time records, provisional tax summary for all clients
- **CSV exports:** computation, client register, deadlines and time records.

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
