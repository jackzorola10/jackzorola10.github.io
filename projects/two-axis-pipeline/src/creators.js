/** Fictional creators for the demo and tests. Handles, niches and numbers are invented. */
const DemoCreators = (() => {
  const c = (id, handle, niche, followers, dataState, relationState, extra = {}) => ({
    id, handle, niche, followers, dataState, relationState, contactScore: 60, daysSincePost: 4, qualityFlag: 'OK', daysSinceRefresh: 3, excluded: false, ...extra,
  });
  const creators = [
    c('c1', '@tacos.del.norte', 'Food', 18400, 'Measured', 'Not contacted'),
    c('c2', '@ring.side.mx', 'Combat sports', 42100, 'Measured', 'Active'),
    c('c3', '@gym.notes', 'Fitness', 9200, 'Measured', 'Not contacted', { contactScore: 0 }),
    c('c4', '@weekend.brunch', 'Food', 31500, 'Measured', 'In conversation'),
    c('c5', '@ladrillo.y.cafe', 'Lifestyle', 6100, 'Captured', 'Not contacted'),
    c('c6', '@fight.night.recap', 'Combat sports', 27800, 'Measured', 'Active', { daysSinceRefresh: 45 }),
    c('c7', '@city.bites', 'Food', 54000, 'Measured', 'Not contacted', { qualityFlag: 'Suspicious followers' }),
    c('c8', '@old.school.boxing', 'Combat sports', 12300, 'Measured', 'Not contacted', { daysSincePost: 62 }),
    c('c9', '@street.style.mty', 'Fashion', 22700, 'Measured', 'Agreement sent'),
    c('c10', '@family.picnic', 'Family', 15800, 'Measured', 'Not contacted'),
    c('c11', '@sparring.daily', 'Combat sports', 8800, 'Measured', 'Active'),
    c('c12', '@home.barista', 'Food', 4300, 'Down', 'Active'),
  ];
  // One creator, twelve recent videos: one went viral and one is pinned.
  const viral = {
    handle: '@weekend.brunch', followers: 31500,
    videos: [4200, 5100, 3900, 6800, 4700, 5300, 212000, 4100, 5600, 3800, 4900, 61000].map((views, i) => ({ id: `v${i + 1}`, views, pinned: i === 11 })),
  };
  return { creators, viral };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DemoCreators;
