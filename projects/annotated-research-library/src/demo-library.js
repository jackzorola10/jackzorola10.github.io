/**
 * A fictional mini-library on one question: does a four-day work week raise productivity?
 * Every source, author, study and number here is invented for the demo.
 */
const DemoLibrary = (() => {
  const question = 'Does a four-day work week raise productivity?';
  const sources = [
    {
      id: 'SRC-001', title: 'What the Northfield pilot found', author: 'Consultancy blog post', format: 'article', primary: ['northfield-pilot'],
      claims: [
        { id: 'A1', type: 'data', text: '31 of the 40 companies in the Northfield pilot kept the four-day week after it ended.', verified: true, check: 'Matches the pilot\'s own final report.' },
        { id: 'A2', type: 'thesis', text: 'Most office work expands to fill the time available.' },
        { id: 'A3', type: 'data', text: 'Revenue per employee held steady through the first 12 months.', verified: true, check: 'Confirmed, but only 12 months were measured.' },
      ],
    },
    {
      id: 'SRC-002', title: 'A founder on cutting Fridays', author: 'Podcast interview', format: 'podcast', primary: [],
      claims: [
        { id: 'A1', type: 'anecdote', text: 'Our team shipped more in four days than it used to in five.' },
        { id: 'A2', type: 'thesis', text: 'Fewer hours force teams to drop low-value meetings.' },
      ],
    },
    {
      id: 'SRC-003', title: 'Four-day week: the results are in', author: 'Newspaper article', format: 'article', primary: ['northfield-pilot'],
      claims: [
        { id: 'A1', type: 'data', text: 'Most firms in a large pilot chose to keep the shorter week.', verified: true, check: 'Same Northfield report as SRC-001.' },
        { id: 'A2', type: 'anecdote', text: 'A marketing agency says sick days fell by half.' },
      ],
    },
    {
      id: 'SRC-004', title: 'Why productivity gains fade', author: 'Economist, video essay', format: 'video', primary: ['larkin-panel'],
      claims: [
        { id: 'A1', type: 'model', text: 'If focused time rises 20% and meetings fall 30%, output per hour rises about 15%: on paper.' },
        { id: 'A2', type: 'thesis', text: 'Gains fade after the second year, once novelty wears off.' },
        { id: 'A3', type: 'data', text: 'In the Larkin panel, the output gap closed by year three.', verified: false, check: 'The panel measured hours, not output: the claim overreaches.' },
      ],
    },
    {
      id: 'SRC-005', title: 'Burnout and the short week', author: 'HR survey report', format: 'report', primary: ['hr-survey'],
      claims: [
        { id: 'A1', type: 'data', text: '68% of employees reported lower burnout.', verified: true, check: 'Self-reported; productivity was not measured.' },
        { id: 'A2', type: 'thesis', text: 'Rested teams make fewer costly mistakes.' },
      ],
    },
    {
      id: 'SRC-006', title: 'A factory tries four days', author: 'Trade magazine case study', format: 'article', primary: [],
      claims: [
        { id: 'A1', type: 'anecdote', text: 'Line output fell 12% and the plant reverted after six months.' },
        { id: 'A2', type: 'thesis', text: 'Where output is tied to machine hours, fewer hours mean less output.' },
      ],
    },
  ];
  const relations = [
    { id: 'T-001', kind: 'contradiction', a: 'SRC-001·A3', b: 'SRC-004·A2', suspect: 'year', hypothesis: 'SRC-001 measured 12 months; SRC-004 talks about year two onward. They may both be right, about different horizons.', status: 'Open' },
    { id: 'T-002', kind: 'nuance', a: 'SRC-002·A1', b: 'SRC-006·A1', suspect: 'market', hypothesis: 'Knowledge work vs. a production line. The short week may help one and hurt the other.', status: 'Resolved' },
    { id: 'T-003', kind: 'contradiction', a: 'SRC-005·A1', b: 'SRC-006·A1', suspect: 'definition', hypothesis: '"Better" means less burnout in one and more units per shift in the other. Different definitions, not opposite findings.', status: 'Resolved' },
    { id: 'T-004', kind: 'validation', a: 'SRC-002·A2', b: 'SRC-001·A2', suspect: null, hypothesis: 'A founder and a consultancy, with different incentives, reach the same mechanism: less time cuts low-value work.', status: 'Resolved' },
    { id: 'T-005', kind: 'contradiction', a: 'SRC-002·A1', b: 'SRC-004·A3', suspect: 'incentive', hypothesis: 'A founder promoting their own company vs. an economist selling a contrarian take. Neither is neutral.', status: 'Open' },
  ];
  // Sources someone might stack to "prove" the short week works.
  const supporting = ['SRC-001', 'SRC-002', 'SRC-003', 'SRC-005'];
  const quiz = [
    { text: '"31 of 40 companies kept the four-day week."', type: 'data', why: 'A countable fact you can check against the pilot report.' },
    { text: '"If meetings fall 30%, output per hour rises about 15%."', type: 'model', why: 'An if-then calculation. It shows how it could work, not that it did.' },
    { text: '"Work expands to fill the time available."', type: 'thesis', why: 'An interpretation. You can argue it, not verify it.' },
    { text: '"Our team shipped more in four days than in five."', type: 'anecdote', why: 'One team, told by its founder. Possible, not typical.' },
    { text: '"68% of employees reported lower burnout."', type: 'data', why: 'Checkable, but note what it measures: self-reported burnout, not productivity.' },
    { text: '"Gains fade once novelty wears off."', type: 'thesis', why: 'A plausible argument. It needs data before it drives a decision.' },
  ];
  return { question, sources, relations, supporting, quiz };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DemoLibrary;
