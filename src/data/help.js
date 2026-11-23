// Intax Planner – built-in tax knowledge base. Each article links ("Go to") to the screen/field it is about.
(function (root) {
'use strict';
const A = (id, title, go, keywords, codes, body) => ({ id, title, go, keywords, codes, body });

const ARTICLES = [
  A('provisional-who', 'Who is a provisional taxpayer?', 'provisional', 'provisional taxpayer irp6 register who must side income freelance rental interest', [],
    `<p>Anyone who earns income that is not employment income taxed through PAYE – business or freelance income, rental, interest, foreign income or other income – is a provisional taxpayer and must submit IRP6 returns.</p>
     <p>Individuals are <b>exempt</b> if they do not carry on a business and their taxable income will not exceed the tax threshold, or if their non-PAYE income (interest, dividends, rental, foreign dividends) is <b>R30 000 or less</b> in the year.</p>
     <p>Directors of private companies are not automatically provisional taxpayers if all their income is remuneration taxed under PAYE.</p>`),
  A('irp6-p1', 'First provisional payment (IRP6 period 1)', 'p1', 'first payment period 1 august irp6 half estimate', [],
    `<p>Due on the <b>last business day of August</b> (six months into the tax year).</p>
     <p>Payment = ½ × tax on the estimated taxable income for the full year (after rebates and medical scheme fees credits) − PAYE deducted in the first six months − foreign tax credits.</p>
     <p>The estimate may not be lower than the <b>basic amount</b> unless you can justify it. There is no underestimation penalty on the first period, but late payment carries a 10% penalty plus interest.</p>`),
  A('irp6-p2', 'Second provisional payment (IRP6 period 2)', 'p2', 'second payment period 2 february year end full estimate penalty', [],
    `<p>Due on the <b>last business day of February</b> (end of the tax year).</p>
     <p>Payment = tax on the estimated taxable income for the full year − all PAYE for the year − the first provisional payment − foreign tax credits.</p>
     <p>This estimate is tested against the actual taxable income on assessment for the <b>underestimation penalty</b>.</p>`),
  A('irp6-p3', 'Third (top-up) provisional payment', 'p3', 'third payment top-up voluntary september interest topping', [],
    `<p>A voluntary payment after year-end to reduce interest on any tax still owing once the actual figures are known.</p>
     <p>For a February year end it must be paid by <b>30 September</b> if taxable income exceeds R50 000, otherwise by <b>31 August</b>. After that date SARS charges interest on the shortfall until the assessment is paid.</p>`),
  A('underestimation', 'Underestimation penalty (paragraph 20)', 'p2', 'penalty 20% 90% 80% basic amount underestimate one million', [],
    `<p>SARS imposes a penalty of <b>20%</b> of the shortfall when the second-period estimate is too low:</p>
     <ul><li>Taxable income <b>R1 million or less</b>: the estimate must be at least the lesser of <b>90%</b> of actual taxable income and the <b>basic amount</b>.</li>
     <li>Taxable income <b>above R1 million</b>: the estimate must be at least <b>80%</b> of actual taxable income.</li></ul>
     <p>The penalty is 20% of the difference between the normal tax on that safe amount and the PAYE plus first and second provisional payments made.</p>`),
  A('basic-amount', 'Basic amount', 'provisional', 'basic amount last assessment 8% 18 months', [],
    `<p>The taxable income on your latest assessment, <b>less</b> any taxable capital gain and retirement lump sums included in it.</p>
     <p>If that assessment is for a year that ended more than 18 months before the end of the current year, the basic amount is increased by <b>8% for every year</b> in between.</p>`),
  A('late-payment', 'Late payment penalty and interest', 'provisional', 'late penalty 10% interest prescribed rate', [],
    `<p>A provisional payment made after its due date attracts a <b>10% late payment penalty</b> plus interest at the prescribed rate from the due date until paid.</p>`),
  A('itr12', 'Final return – ITR12', 'final', 'itr12 annual return filing season submission efiling assessment', [],
    `<p>The ITR12 is the annual income tax return for individuals. SARS opens filing season in July; provisional taxpayers usually have until the following January to file.</p>
     <p>On assessment SARS calculates the final tax and subtracts PAYE and provisional payments. The <b>Final ITR12</b> screen shows the expected result and lists every figure with its source code so it can be captured on eFiling.</p>`),
  A('irp5', 'IRP5 / IT3(a) certificates', 'employment', 'irp5 it3a employee tax certificate employer codes salary', ['3601', '4102'],
    `<p>Your employer issues an IRP5 showing income, allowances, fringe benefits, deductions and PAYE under four-digit <b>source codes</b>. Capture each code exactly as printed – the planner knows how each code is taxed.</p>
     <p>Use one certificate per employer (and one per period if you changed jobs).</p>`),
  A('code-3601', 'Code 3601 – Salary and wages', 'employment', 'salary wages income basic pay', ['3601'], `<p>Normal remuneration – fully taxable.</p>`),
  A('code-3605', 'Code 3605 – Annual payment / bonus', 'employment', 'bonus 13th cheque annual payment', ['3605'], `<p>Bonuses and other annual payments – fully taxable in the year received.</p>`),
  A('code-3606', 'Code 3606 – Commission', 'employment', 'commission earner sales s11 deductions', ['3606'], `<p>Commission is fully taxable. If more than 50% of your remuneration is commission, you may claim business expenses (s11(a)) such as home office costs – enter them under Deductions.</p>`),
  A('travel-allowance', 'Travel allowance (code 3701)', 'travel', 'travel allowance car vehicle 3701 80% 20% paye logbook', ['3701', '3702'],
    `<p>A fixed travel allowance is reflected under <b>3701</b>. PAYE is withheld on 80% of it (20% if 80% of use is for business). On assessment the whole allowance is taxable, and you claim a deduction for business kilometres using a <b>logbook</b>.</p>
     <p>Without a logbook no deduction is allowed.</p>`),
  A('logbook', 'Logbook – deemed cost vs actual cost', 'travel', 'logbook deemed cost actual cost fixed cost fuel maintenance kilometre table', ['3701'],
    `<p><b>Deemed cost:</b> use the SARS cost table for the vehicle value (incl. VAT). Rate per km = fixed cost ÷ total km + fuel (if you paid all fuel) + maintenance (if you paid all maintenance). Multiply by business km.</p>
     <p><b>Actual cost:</b> total fuel, maintenance, insurance, licence, finance interest and wear-and-tear (cost over 7 years) × business km ÷ total km.</p>
     <p>The planner calculates both and picks the better one. The claim cannot exceed the allowance received.</p>
     <p><b>More than one vehicle:</b> add each vehicle with its own value, days used and kilometres. Each is calculated separately (fixed cost pro-rated for the days used) and the total is limited to the allowance.</p>`),
  A('reimbursive', 'Reimbursive travel (3702 / 3703)', 'travel', 'reimbursive per km rate prescribed rate 4.95', ['3702', '3703'],
    `<p>Reimbursement per business kilometre up to the prescribed rate (R4.95/km for 2027) is not taxable (3703) if no other travel compensation is paid. Amounts above it are taxable (3702).</p>`),
  A('company-car', 'Company car fringe benefit (3802)', 'companycar', 'company car use of motor vehicle fringe 3.5% 3.25%', ['3802', '3816'],
    `<p>Private use of an employer-owned car is taxed at <b>3.5%</b> of the determined value per month (3.25% if a maintenance plan came with it). The benefit can be reduced on assessment for business kilometres and for private fuel/maintenance paid yourself, supported by a logbook.</p>`),
  A('medical-mtc', 'Medical scheme fees tax credit (s6A)', 'medical', 'medical aid credit monthly dependants s6a', ['4005', '3810', '4116'],
    `<p>A fixed monthly credit for each member on the scheme: main member and first dependant, then a lower amount for each additional dependant (2027: R376, R376, R254). The credit reduces tax payable and is already allowed by your employer through PAYE (code 4116).</p>`),
  A('medical-additional', 'Additional medical expenses tax credit (s6B)', 'medical', 'additional medical expenses out of pocket qualifying 7.5% 25% 33.3% disability', ['4005'],
    `<p><b>Under 65, no disability:</b> 25% × [(contributions − 4 × medical credits) + qualifying out-of-pocket expenses − 7.5% of taxable income].</p>
     <p><b>65 and older, or a person with a disability in the family:</b> 33.3% × [(contributions − 3 × medical credits) + qualifying expenses].</p>
     <p>Keep receipts. Disability requires an ITR-DD form signed by a medical practitioner.</p>`),
  A('ra', 'Retirement fund contributions (s11F)', 'retirement', 'retirement annuity ra pension provident 27.5% cap 350000 430000 deduction', ['4001', '4003', '4006', '3817'],
    `<p>Contributions to pension, provident and retirement annuity funds (including employer contributions taxed as fringe benefit 3817) are deductible up to the lesser of:</p>
     <ul><li><b>27.5%</b> of the greater of remuneration or taxable income,</li><li>the annual cap (<b>R350 000</b>, <b>R430 000</b> from 2027),</li><li>taxable income before the deduction and before capital gains.</li></ul>
     <p>Any excess carries forward to later years or reduces tax on lump sums.</p>`),
  A('donations', 'Donations (s18A)', 'donations', 'donations pbo s18a certificate 10% charity', ['4030'],
    `<p>Donations to approved public benefit organisations with a <b>section 18A receipt</b> are deductible, limited to <b>10%</b> of taxable income. The excess carries forward.</p>`),
  A('home-office', 'Working from home – home office expenses', 'homeoffice', 'home office study work from home wfh remote rent bond interest rates s23b laptop desk', [],
    `<p>Allowed only if the room is used <b>regularly and exclusively</b> for work and specifically equipped for it, and either more than 50% of your duties are performed there or more than 50% of your income is commission/independent work.</p>
     <p>Claim the floor-area percentage of rent or bond interest, rates, electricity, water, cleaning, repairs and building insurance, for the months worked from home. Wear-and-tear on work equipment (laptop, desk, chair) is allowed separately – items under R7 000 are written off in full.</p>
     <p>Salaried employees cannot deduct phone, internet or stationery (s23(m)); commission earners and business owners can. The office part of the home may later lose part of the primary residence exclusion.</p>`),
  A('interest', 'Interest income and exemption', 'investments', 'interest exemption savings 23800 34500 local foreign', [],
    `<p>Local interest is exempt up to <b>R23 800</b> a year (under 65) or <b>R34 500</b> (65 and older). Foreign interest is fully taxable. Enter the total from your IT3(b) certificates.</p>`),
  A('dividends', 'Dividends – local, REIT and foreign', 'investments', 'dividends shares dividend withholding tax 20% reit foreign exempt', [],
    `<p>Local dividends are exempt from income tax because <b>20% dividends tax</b> has already been withheld. Distributions from <b>REITs</b> are taxable as income. Foreign dividends are partly exempt so that the effective rate does not exceed 20%.</p>`),
  A('tfsa', 'Tax-free savings accounts', 'investments', 'tfsa tax free savings 36000 46000 500000 lifetime', [],
    `<p>Interest, dividends and gains inside a tax-free savings account are not taxed and are not declared as income. Contributions are limited to R36 000 a year (R46 000 from 2027) and R500 000 over a lifetime; excess contributions are taxed at 40%.</p>`),
  A('cgt', 'Capital gains tax', 'cgt', 'capital gains tax shares stocks crypto property sale base cost annual exclusion 40% inclusion', [],
    `<p>Gain = proceeds − base cost (purchase price plus costs of buying and selling). Add all gains and losses for the year, subtract the <b>annual exclusion</b> (R40 000, R50 000 from 2027) and any capital loss carried forward. <b>40%</b> of the net gain is included in taxable income.</p>`),
  A('crypto', 'Cryptocurrency', 'cgt', 'crypto bitcoin trading capital revenue', [],
    `<p>Crypto assets are taxed under the normal rules: gains on investments held long-term are capital gains, while frequent trading is revenue (taxed in full as income – enter it under Business). Each disposal, including crypto-to-crypto trades, is a taxable event.</p>`),
  A('shares', 'Shares and unit trusts', 'cgt', 'shares stock investment unit trust portfolio sale', [],
    `<p>Shares held for at least three years are deemed to be capital (s9C). Enter each sale as a disposal with its base cost. Use your broker's tax certificate (IT3(c)).</p>`),
  A('primary-residence', 'Primary residence exclusion', 'cgt', 'house home primary residence sale 2 million 3 million', [],
    `<p>The first <b>R2 million</b> of gain (<b>R3 million</b> from 2027) on the sale of your primary residence is excluded. If the selling price does not exceed that amount, the whole gain is excluded.</p>`),
  A('rental', 'Rental income', 'rental', 'rental property rent airbnb landlord expenses bond interest rates', [],
    `<p>Rent received less expenses: bond interest (not capital), rates, levies, insurance, repairs, agent fees, advertising and wear-and-tear on furniture. If you co-own the property, enter your share percentage.</p>`),
  A('business', 'Business, freelance and sole proprietor income', 'business', 'business freelance sole proprietor trade side hustle profit expenses invoice', [],
    `<p>Declare turnover less expenses incurred in producing the income (s11(a)), wear-and-tear (s11(e)) and home office costs. A net loss can be set off against other income, subject to the s20A ring-fencing rules.</p>`),
  A('wear-tear', 'Wear-and-tear allowances', 'business', 'wear and tear depreciation computer laptop furniture interpretation note 47', [],
    `<p>Assets used for trade are written off over SARS's prescribed periods (Interpretation Note 47), e.g. computers 3 years, furniture 6 years, motor vehicles 5 years. Small items under R7 000 can be written off in full.</p>`),
  A('assessed-loss', 'Assessed losses', 'deductions', 'assessed loss carry forward ring fencing s20a', [],
    `<p>A tax loss from trade carries forward and reduces future taxable income. The planner shows the loss carried forward on the computation.</p>`),
  A('lump-sums', 'Retirement lump sums and withdrawals', 'lumps', 'lump sum retirement withdrawal resign retrench severance pension payout 550000 27500', ['3901', '3915', '3920'],
    `<p>Lump sums are taxed on separate tables, cumulative over your lifetime. At retirement, death or retrenchment the first <b>R550 000</b> is tax-free; on resignation/withdrawal only the first <b>R27 500</b> (R500 000 / R25 000 before 2024). Enter previous lump sums so the tables are applied correctly.</p>`),
  A('two-pot', 'Two-pot savings withdrawals', 'lumps', 'two pot savings component withdrawal 2024 marginal', [],
    `<p>Since 1 September 2024 members can withdraw from the savings component once a tax year. The withdrawal is added to taxable income and taxed at your <b>marginal rate</b>; the fund withholds tax on a tax directive.</p>`),
  A('foreign-employment', 'Foreign employment income exemption', 'foreign', 'foreign employment abroad 183 days 60 days exemption 1.25 million expat', [],
    `<p>Salary earned while working outside SA for more than 183 days (60 continuous) in any 12-month period is exempt up to <b>R1.25 million</b> a year (from 2021). Foreign tax paid on the taxable part can be claimed as a credit.</p>`),
  A('foreign-tax-credit', 'Foreign tax credits (s6quat)', 'foreign', 'foreign tax credit double tax treaty', [],
    `<p>Tax paid to another country on foreign income that is also taxed in SA can be deducted from SA tax, limited to the SA tax on that income.</p>`),
  A('rebates', 'Rebates and tax thresholds', 'taxtables', 'rebate primary secondary tertiary threshold age 65 75', [],
    `<p>Every individual gets the primary rebate; people aged 65 and older add the secondary rebate, and 75 and older the tertiary rebate. Age is measured on the last day of the tax year. The tax threshold is the income at which tax starts.</p>`),
  A('brackets', 'Tax brackets and marginal rates', 'taxtables', 'brackets tax table rates 18% 45% marginal', [],
    `<p>South Africa taxes individuals on a sliding scale from 18% to 45%. The marginal rate is the rate on the next rand earned and is what an extra deduction saves you.</p>`),
  A('subsistence', 'Subsistence allowances', 'employment', 'subsistence allowance meals incidental overnight travel', ['3704', '3705', '3715', '3716'],
    `<p>Allowances for overnight business travel are tax-free up to the SARS daily amount (2027: R595 meals and incidentals, R184 incidentals only). Amounts not spent on business travel become taxable.</p>`),
  A('fringe', 'Fringe benefits', 'employment', 'fringe benefit loan accommodation asset medical employer pays', ['3801', '3805', '3807', '3810'],
    `<p>Benefits in kind from an employer (low-interest loans, accommodation, medical aid paid by the employer, use of assets) are taxable at their cash equivalent and appear in the 38xx codes.</p>`),
  A('tax-year', 'The tax year', 'client', 'tax year 1 march 28 february year of assessment', [],
    `<p>The individual tax year runs from <b>1 March to the end of February</b>. "2027" means 1 March 2026 – 28 February 2027.</p>`),
  A('ita34', 'SARS assessment (ITA34) and objections', 'assessment', 'assessment ita34 objection noo dispute 80 business days request reasons correction', [],
    `<p>After the ITR12 is submitted SARS issues a <b>notice of assessment (ITA34)</b>. Compare it with your computation: differences usually come from missing third-party certificates or deductions SARS did not accept.</p>
     <p>If you disagree you can request reasons and then lodge a <b>Notice of Objection (NOO)</b> on eFiling within <b>80 business days</b> of the assessment date (public holidays and weekends excluded). Payment of the amount assessed is not suspended unless SARS agrees to a suspension.</p>`),
  A('joint-estate', 'Married in community of property', 'client', 'married community of property joint estate spouse split 50% interest rental', [],
    `<p>Spouses married in community of property are each taxed on <b>half</b> of the income from joint assets: interest, dividends, rental income and capital gains. Income from a trade or employment is taxed in the hands of the spouse who earns it.</p>
     <p>Assets excluded from the joint estate (for example by a will or donation) are taxed 100% in the owner's hands.</p>`),
  A('interest-89quat', 'Interest on underpaid provisional tax (s89quat)', 'assessment', 'interest 89quat underpayment effective date assessment owing', [],
    `<p>When the provisional tax and PAYE paid are less than the normal tax on assessment, SARS charges interest from the <b>effective date</b> (30 September for most individuals, or 31 August when taxable income is R50 000 or less) until the assessment. A third (top-up) payment before that date avoids it.</p>`),
  A('documents', 'Documents to keep', 'documents', 'documents records keep five years certificates supporting', [],
    `<p>Keep all certificates, invoices, logbooks and statements that support a return for at least <b>five years</b> from the date the return was submitted. SARS can ask for them in a verification or audit.</p>`),
  A('time-records', 'Recording time per client', 'fees', 'time records hours fees rate work done', [],
    `<p>Record work done per client on <b>Time records</b>: date, tax year, description, hours and rate (hours × rate fills the value). The practice <b>Time records</b> screen and report summarise hours and value per client – use them to bill from your own accounting system.</p>`),
  A('practices', 'Several practices', 'settings', 'practice practices firm switch multiple example demo delete', [],
    `<p>Each practice has its own clients, letterhead, logo and practitioner details. Switch practice from the name at the top left. Tax tables, appearance and the PIN are shared by all practices.</p><p>The <b>example practice</b> holds three fictional clients for exploring the app and can be deleted (or added again) under Practice settings.</p>`),
  A('add-tax-year', 'Adding a new tax year', 'taxtables', 'add new tax year budget custom tables fill manual 2028', [],
    `<p>On <b>Tax tables</b>, choose <b>+ Add tax year</b>, pick the year and an existing year to copy, then replace the figures from the Budget Review or SARS tables. The buttons <b>Recalculate base tax</b> and <b>Recalculate thresholds</b> work out the dependent figures from the bracket limits, rates and rebates.</p>`),
  A('appearance', 'Theme and text size', 'settings', 'theme dark mode colour text size font bigger smaller zoom autofit', [],
    `<p>Use <b>Aa</b> in the top bar (or Practice settings) to choose a theme, an accent colour and the text size. <b>Auto-fit</b> scales the text to the window and screen. Shortcuts: Ctrl + and Ctrl − to change the size, Ctrl 0 to reset.</p>`),
  A('update-tables', 'Updating tax tables after the Budget', 'taxtables', 'update tax tables budget new year rates edit import', [],
    `<p>All rates, rebates, thresholds, credits, CGT and travel tables are stored in editable tax packs. Open <b>Tax Tables</b>, choose the year and change any value, or import a pack file. Reset restores the SARS defaults shipped with the app.</p>`)
];

const SYNONYMS = {
  car: 'travel vehicle', vehicle: 'travel car', km: 'kilometre logbook', mileage: 'logbook travel', petrol: 'fuel travel', fuel: 'travel logbook',
  stock: 'shares', stocks: 'shares', equity: 'shares', crypto: 'crypto bitcoin', bitcoin: 'crypto',
  medical: 'medical aid', doctor: 'medical expenses', pension: 'retirement', annuity: 'retirement ra', ra: 'retirement annuity',
  charity: 'donations', donate: 'donations', house: 'primary residence property', property: 'rental property', rent: 'rental',
  freelance: 'business', side: 'business freelance', invoice: 'business', salary: 'irp5 3601', bonus: '3605', paye: 'irp5 provisional',
  late: 'penalty late', penalty: 'penalty underestimation late', topup: 'third', 'top-up': 'third', return: 'itr12', efiling: 'itr12',
  resign: 'withdrawal lump', retrench: 'lump severance', payout: 'lump sum', abroad: 'foreign', overseas: 'foreign', expat: 'foreign',
  savings: 'interest tfsa', bank: 'interest', office: 'home office', study: 'home office', wfh: 'home office working', remote: 'home office working', cars: 'vehicle travel company car', vehicles: 'vehicle travel logbook', laptop: 'wear tear', computer: 'wear tear'
};

function search(query, codeList) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  let terms = q.split(/[\s,]+/).filter(Boolean);
  terms = terms.concat(...terms.map(t => (SYNONYMS[t] || '').split(' ').filter(Boolean)));
  const results = [];
  for (const a of ARTICLES) {
    const hay = (a.title + ' ' + a.keywords).toLowerCase();
    const body = a.body.replace(/<[^>]+>/g, ' ').toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (/^\d{4}$/.test(t) && a.codes.includes(t)) score += 20;
      if (a.title.toLowerCase().includes(t)) score += 6;
      if (hay.includes(t)) score += 3;
      if (body.includes(t)) score += 1;
    }
    if (a.title.toLowerCase().includes(q)) score += 10;
    if (score) results.push({ type: 'article', score, article: a });
  }
  // source code matches
  for (const c of codeList || []) {
    if (terms.includes(c.code) || (q.length > 3 && c.name.toLowerCase().includes(q))) results.push({ type: 'code', score: terms.includes(c.code) ? 30 : 4, code: c });
  }
  return results.sort((x, y) => y.score - x.score).slice(0, 25);
}

const __exp = { ARTICLES, search };
if (typeof module !== 'undefined' && module.exports) module.exports = __exp; else root.IntaxHelp = __exp;
})(typeof window !== 'undefined' ? window : globalThis);
