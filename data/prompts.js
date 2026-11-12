// Prompts for Deep Dives, writing briefs and speaking, plus the rubrics used for critique.

export const DIVE_PROMPTS = [
  { id: 'd-rates', t: 'Why do higher interest rates hurt some companies far more than others?', links: ['discounting', 'leverage'] },
  { id: 'd-curse', t: 'Is the resource curse a law or a choice? Compare two resource-rich countries.', links: ['resource-curse', 'incentives'] },
  { id: 'd-nuclear', t: 'Should a country of your choice build new nuclear power stations?', links: ['intermittency', 'eroi', 'opportunity-cost'] },
  { id: 'd-moat', t: 'Pick a company you admire. What exactly stops a well-funded rival from copying it?', links: ['network-effects', 'costco', 'southwest'] },
  { id: 'd-forecast', t: 'Can experts forecast geopolitics better than chance? What separates the good forecasters?', links: ['base-rates', 'bayes-update', 'falsifiability'] },
  { id: 'd-bubble', t: 'Choose one financial bubble. Could a careful observer have identified it at the time?', links: ['social-proof', 'feedback-loops', 'fat-tails'] },
  { id: 'd-chips', t: 'How dangerous is the world\'s dependence on Taiwan for advanced chips, and what should be done?', links: ['chokepoints', 'comparative-advantage', 'diversification'] },
  { id: 'd-metrics', t: 'When does measuring performance make performance worse?', links: ['incentives', 'map-territory'] },
  { id: 'd-grid', t: 'What limits how fast a country can decarbonise its electricity?', links: ['bottleneck', 'intermittency', 'stocks-flows'] },
  { id: 'd-disrupt', t: 'Why do successful companies so often fail to adopt the technology that replaces them?', links: ['kodak', 'netflix-blockbuster', 'sunk-cost'] },
  { id: 'd-debt', t: 'When is government debt a problem? Use one country as a case.', links: ['stocks-flows', 'compounding', 'second-order-effects'] },
  { id: 'd-rent', t: 'Do rent controls help tenants? Set out the best case for each side, then decide.', links: ['second-order-effects', 'steelman'] },
  { id: 'd-luck', t: 'How much of a successful investor\'s record is skill? How would you tell?', links: ['law-of-large-numbers', 'regression-to-mean', 'expected-value'] },
  { id: 'd-trade', t: 'Who wins and who loses from free trade, and what follows for policy?', links: ['comparative-advantage', 'chokepoints'] },
  { id: 'd-commons', t: 'Choose one shared resource that was managed well. Why did it work there?', links: ['tragedy-of-commons', 'incentives'] },
  { id: 'd-lean', t: 'Did just-in-time supply chains go too far? What is the right amount of slack?', links: ['toyota', 'margin-of-safety', 'fat-tails'] },
  { id: 'd-media', t: 'What business model can sustain quality journalism in the next decade?', links: ['network-effects', 'incentives', 'kodak'] },
  { id: 'd-rules', t: 'Pick a rule or institution widely called outdated. Why was it created, and should it go?', links: ['chestertons-fence', 'second-order-effects'] },
];

export const DIVE_RUBRIC = [
  { k: 'answer', t: 'Answer first', lo: 'The position is unclear or only appears at the end', hi: 'A clear, specific answer in the opening sentences that the rest supports' },
  { k: 'structure', t: 'Structure', lo: 'Points overlap or arrive in no clear order', hi: 'Three or so distinct points, each doing separate work, in a logical order' },
  { k: 'evidence', t: 'Evidence and numbers', lo: 'Assertions with no figures, sources or examples', hi: 'Specific, sourced figures and examples that carry the argument' },
  { k: 'counter', t: 'Counter-argument', lo: 'The other side is absent or a straw man', hi: 'The strongest objection is stated fairly and answered' },
  { k: 'concepts', t: 'Use of concepts', lo: 'Concepts are named but not used', hi: 'General principles are applied precisely and explain something' },
  { k: 'clarity', t: 'Clarity and concision', lo: 'Wordy, vague or hard to follow', hi: 'Plain, exact sentences with nothing wasted' },
];

export const DIVE_CHECKLIST = [
  'My answer is in the first two sentences',
  'Each paragraph makes one point and I can name it',
  'I gave at least three specific figures or examples, with sources',
  'I stated the strongest objection and answered it',
  'I cut every sentence that does not support the answer',
];

export const BRIEFS = [
  { id: 'b-supplier',
    task: 'Write one paragraph (about 80 words) for the operations director recommending what to do.',
    notes: 'Supplier Henley Components – contract renewal due 30 June. They want +9% on price. Have been late on 7 of last 40 deliveries (was 2 of 40 last year). Quality fine, rejects under 1%. Alternative: Marlow Parts quoted 4% below our current price but min. order 20% bigger than we need, and 10-week lead time vs Henley 4. Switching needs tooling approval, approx £60k one-off and 3 months. We spend about £1.4m a year with Henley. Ops team likes the Henley account manager. Stock cover currently 3 weeks.',
    model: 'Recommend renewing with Henley for one year at no more than +4%, with penalties for late delivery, while qualifying Marlow as a second source. Henley\'s late deliveries have risen from 5% to 18%, which weakens its case for a 9% rise worth £126k a year. Marlow is about £180k a year cheaper than Henley\'s ask, but its 10-week lead time exceeds our three weeks of stock and switching costs £60k and three months, so an immediate move is too risky.' },
  { id: 'b-market',
    task: 'Write one paragraph (about 80 words) for the chief executive: should we enter this market next year?',
    notes: 'Looked at Kenya for the payments product. Mobile money already used by most adults, M-Pesa dominant, something like 90%+ share of mobile money. Regulator licence takes 9–12 months, need local entity. Merchant fees there are lower than our home market by about half. Two other foreign entrants left in last five years. On the other hand SME lending on top of payments is growing fast and banks under-serve it. Our lending product is not launched at home yet – planned Q3. Estimated entry cost £3m over two years. Team has no one with East Africa experience.',
    model: 'Do not enter Kenya next year. Payments there are dominated by one provider with over 90% of mobile money, fees are about half ours, and two foreign entrants have left in five years, so the £3m entry cost is unlikely to pay back on payments alone. The real opening is lending to small firms, which we have not yet launched at home. Revisit once our lending product has a year of results and we have hired East Africa experience.' },
  { id: 'b-policy',
    task: 'Write one paragraph (about 80 words) for a minister: should the pilot be extended nationally?',
    notes: 'Free breakfast pilot, 60 primary schools, one school year. Attendance up 1.1 percentage points in pilot schools vs 0.3 in comparison schools. Reading scores – no measurable difference yet. Teachers report calmer mornings (survey, 70% response). Cost £1.10 per pupil per day; take-up 45% of pupils. Schools were volunteers, not randomly chosen. National rollout approx £320m a year at same take-up. Some heads say they\'d rather have the cash for teaching assistants. Evaluation team wants a second year with random assignment.',
    model: 'Extend the pilot for a second year with randomly assigned schools before committing £320m a year to a national scheme. Attendance rose 0.8 points more than in comparison schools, but schools volunteered, so the gain may reflect motivated heads, and reading scores have not moved. A randomised second year would show whether the effect is real and whether it beats alternatives such as teaching assistants, at a small fraction of the national cost.' },
  { id: 'b-invest',
    task: 'Write one paragraph (about 80 words) for the investment committee: buy, hold or sell?',
    notes: 'Holding: Northfield Retail, 3% of the fund. Bought at 410p, now 290p. Like-for-like sales −4% this year, was +2%. Net debt 3.1x EBITDA, covenant at 3.5x, tested in March. Management says new store format trials are "encouraging" – 6 stores, sales +8%, but those were the best locations. Dividend cut expected. Trades on 7x earnings vs sector 11x. Analyst who recommended it still believes the turnaround; says we\'d be "selling at the bottom". Property portfolio valued at £400m against market cap £520m.',
    model: 'Sell at least half of the Northfield holding now. Sales are falling 4% and debt at 3.1 times earnings sits close to a 3.5 times covenant tested in March, so a breach is a live risk that the low valuation of 7 times earnings does not compensate for. The encouraging trial covers six of the best stores and proves little. Our purchase price of 410p is irrelevant. The £400m of property limits the downside, which is the case for keeping a reduced position.' },
  { id: 'b-hire',
    task: 'Write one paragraph (about 80 words) for the head of department: which hire should we make?',
    notes: 'Data team: 4 analysts, backlog 11 weeks (was 5 in Jan). Budget approved £95k. Option A: one senior data engineer ~£92k, 3-month notice so starts Sept. Option B: two junior analysts £44k each, could start in 6 weeks. Team lead says most of backlog is pipeline failures – analysts spend approx 40% of time fixing broken data feeds. Juniors need ~3 months training from existing staff. Two analysts have hinted at leaving over workload. Finance wants decision by Friday.',
    model: 'Hire the senior data engineer. About 40% of analyst time goes on fixing broken data feeds, so the backlog, up from five weeks to eleven, is a pipeline problem that more analysts would not solve and that juniors would add to during three months of training. The cost is the wait until September. To hold the team until then, tell the two analysts at risk of leaving about the hire now and pause low-priority requests.' },
  { id: 'b-price',
    task: 'Write one paragraph (about 80 words) for the chief executive: should we raise the price now?',
    notes: 'Subscription product £12/month, 80k subscribers. Proposal: raise to £14. Last rise (2 yrs ago, £10→£12) lost 6% of subscribers in 3 months, mostly on monthly plans. Costs up 9% this year. Competitor A at £15, B at £11 with ads. Survey: 31% say "would consider cancelling" – but last time 35% said the same. Annual-plan customers (30% of base) are locked until renewal. Marketing wants to wait until new features ship in Q4.',
    model: 'Raise the price to £14 now. Even if we lose 6% of subscribers, as happened after the last rise, monthly revenue goes from £960k to about £1.05m, a gain of nearly 10% that covers this year\'s 9% rise in costs. The 31% who say they would consider cancelling is no worse than the 35% who said so last time, and we would still be cheaper than Competitor A. Waiting for the Q4 features costs about £90k a month.' },
  { id: 'b-clinic',
    task: 'Write one paragraph (about 80 words) for the clinic board: how should we add capacity?',
    notes: 'Clinic at capacity: 14 treatment rooms, utilisation 93% weekdays 9–5. Waiting time for new patients 5 weeks (target 2). Option 1: second site, lease £180k/yr + fit-out £400k, opens in 10 months, adds 10 rooms. Option 2: open evenings to 8pm and Saturdays – adds approx 35% room-hours, needs 6 more clinicians, can start in 8 weeks, extra running cost ~£60k/yr plus salaries. Staff survey: 40% willing to work some evenings. Patient survey: 55% would prefer evening/weekend slots. Lease on current building ends in 3 years.',
    model: 'Extend opening to evenings and Saturdays now, and defer the second site. Longer hours add about 35% more room-hours within eight weeks for roughly £60k a year plus salaries, against ten months, a £400k fit-out and £180k a year for a new site. Demand is there: 55% of patients prefer those slots. The risk is staffing, since only 40% of staff will work evenings, so recruit the six clinicians on evening contracts. Revisit a second site when the lease ends in three years.' },
  { id: 'b-recall',
    task: 'Write one paragraph (about 80 words) for the managing director: what do we do about the fault?',
    notes: 'Product: kettle model K200, 48,000 sold since March. 23 reports of lid hinge cracking, 2 minor scalds, no serious injury. Engineering: fault traced to one supplier batch, approx 9,000 units, serial numbers known. Full recall est. £1.9m; targeted recall of batch £350k. Regulator must be told within 10 days of becoming aware – that was 6 days ago. Legal says targeted recall defensible if batch tracing is solid; QA says tracing is "95% confident". Retailers asking what to tell customers. Social media mentions rising.',
    model: 'Notify the regulator this week and recall the 9,000 units from the faulty batch now. Two people have been scalded and the ten-day reporting deadline expires in four days. A targeted recall costs £350k against £1.9m for all 48,000, and is defensible because the fault is traced to one supplier batch. Since QA is only 95% confident in the tracing, offer a free inspection to every other owner and widen the recall if any unit outside the batch fails.' },
  { id: 'b-grant',
    task: 'Write one paragraph (about 80 words) for the trustees: should we bid for the expansion grant?',
    notes: 'Charity: literacy tutoring, 1,200 children/yr, cost £310 per child. Foundation offers £500k over 2 years but only for expansion to 3 new cities. Our evaluation (last yr) – reading age gain 7 months vs 3 for comparison group, but in new city pilot (Leeds) gain was only 4 months; tutors hard to recruit, turnover 45%. Reserves cover 4 months of costs. Alternative: ask foundation to fund depth in existing 2 cities – they have said "unlikely". Board chair keen on the profile national expansion brings. Decision needed for bid deadline in 3 weeks.',
    model: 'Bid for the £500k, but for one new city first, not three at once. Our results depend on tutor quality: children gained seven months of reading age in established cities but only four in the Leeds pilot, where tutor turnover reached 45%. Three launches together would repeat that and stretch reserves that cover only four months. A phased bid, with tutor recruitment funded first and the other cities conditional on results, protects the outcome the foundation is paying for.' },
  { id: 'b-line',
    task: 'Write one paragraph (about 80 words) for the plant director: overhaul line 3 or replace it?',
    notes: 'Packaging line 3: 14 yrs old, downtime 11% last quarter (plant average 3%). Overhaul quote £220k, supplier says gives "maybe 4–5 more years", downtime back to ~5%. New line £1.3m, 9-month lead time, downtime ~2%, 20% faster, uses 30% less energy (energy for line now ~£90k/yr). Each 1% downtime costs approx £35k/yr in lost output. Line 3 makes a product family with volumes falling 6%/yr. Finance: capex budget this year £800k, mostly committed.',
    model: 'Overhaul line 3 for £220k and do not buy a new line. Cutting downtime from 11% to about 5% saves roughly £210k a year, so the overhaul pays back in about a year. A new line would save around £340k a year including energy, but costs £1.3m, a payback of nearly four years on a product family shrinking 6% a year, and it exceeds what is left of this year\'s budget. Review replacement if volumes stabilise.' },
  { id: 'b-charge',
    task: 'Write one paragraph (about 80 words) for the council leader: should the congestion charge go ahead?',
    notes: 'Town centre congestion charge proposal: £5/day, 7am–6pm weekdays. Traffic model: −18% vehicles in zone, bus journey times −12%. Est. net revenue £2.1m/yr after running costs. Retailers\' group says footfall will fall; evidence from 3 comparable towns – footfall −2%, +1%, +4% after 2 yrs. Air quality: currently breaches legal NO2 limit on 2 streets; model says charge brings both under. 62% opposed in consultation (self-selected, 1,900 responses of 85,000 pop.). Low-income drivers: 14% of zone trips. Election in 14 months.',
    model: 'Introduce the charge, with a discount for low-income drivers. It brings both streets within the legal pollution limit, cuts traffic by 18% and bus times by 12%, and raises £2.1m a year. Retailers\' fears are not borne out: footfall in three comparable towns changed by between −2% and +4%. The 62% opposition comes from 1,900 self-selected responses, about 2% of residents, so commission a representative poll well before the election.' },
  { id: 'b-churn',
    task: 'Write one paragraph (about 80 words) for the leadership team: how do we bring churn down?',
    notes: 'B2B software, 640 customers, annual churn up from 9% to 15%. Exit interviews (n=38): 17 cite missing integration with accounting packages, 9 price, 7 poor onboarding, 5 other. Churn concentrated in customers under 12 months old: 26% vs 8% for older. Sales team want 15% price cut for renewals. Product says integration is 4 months\' work for 3 engineers. Customer success suggest a dedicated onboarding manager (£55k). Average customer pays £9k/yr. Usage data: customers who connect 2+ data sources in first month churn at 5%.',
    model: 'Build the accounting integration and hire the onboarding manager; reject the price cut. Churn has risen from 9% to 15%, costing about £350k a year, and it is concentrated in first-year customers at 26%. Nearly half of leavers cite the missing integration, and customers who connect two data sources in their first month churn at only 5%. Price was cited by about a quarter, yet a 15% renewal discount would cost around £860k a year.' },
];

export const BRIEF_CHECKLIST = [
  'The recommendation is the first sentence',
  'I used the two or three numbers that matter and left the rest out',
  'I said why the main alternative is worse',
  'A reader who sees only this paragraph could act on it',
  'It is within the word limit',
];

export const WRITING_RUBRIC = [
  { k: 'answer', t: 'Answer first', lo: 'Recommendation missing or buried', hi: 'Clear recommendation in the first sentence' },
  { k: 'selection', t: 'Selection of facts', lo: 'Lists everything or omits the decisive facts', hi: 'Only the few facts that drive the decision' },
  { k: 'reasoning', t: 'Reasoning', lo: 'Facts are stated without linking them to the recommendation', hi: 'Each fact is tied to the recommendation; the main alternative is dealt with' },
  { k: 'clarity', t: 'Clarity and concision', lo: 'Wordy or vague; over the limit', hi: 'Plain, exact, within the limit' },
];

export const SPEAK_PROMPTS = [
  'Should central banks care about house prices?',
  'Explain inflation to a sharp 15-year-old.',
  'Is it better to be a specialist or a generalist?',
  'Make the case for a four-day working week. Then name its biggest weakness.',
  'What is the most important number in the world economy right now, and why?',
  'Should rich countries pay poorer ones to keep fossil fuels in the ground?',
  'Tell me about a decision you changed your mind on, and what changed it.',
  'Why do most mergers disappoint?',
  'Is economic growth compatible with cutting emissions?',
  'Explain compounding and why people underestimate it.',
  'What makes a forecast good?',
  'Should social media companies be liable for what users post?',
  'Pitch a business you would start with £50,000.',
  'What is one widely held belief in your field that you think is wrong?',
  'Explain the difference between risk and uncertainty with an example.',
  'Why are some countries rich and others poor? Give your best two-minute answer.',
];

export const SPEAK_RUBRIC = [
  { k: 'answer', t: 'Answer first', lo: 'The point arrives late or never', hi: 'The answer is stated in the first ten seconds' },
  { k: 'structure', t: 'Structure', lo: 'A stream of thoughts with no signposts', hi: 'Two or three signposted points and a clear close' },
  { k: 'evidence', t: 'Examples and evidence', lo: 'Generalities only', hi: 'At least one specific example or figure per point' },
  { k: 'delivery', t: 'Delivery', lo: 'Many fillers, restarts or rushed pace', hi: 'Few fillers, steady pace, complete sentences' },
];

export const SPEAK_CHECKLIST = [
  'I gave my answer in the first ten seconds',
  'I signposted my points ("two reasons…")',
  'I gave a specific example or number',
  'I finished with a clear closing sentence',
];
