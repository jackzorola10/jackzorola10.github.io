// Interactive simulator. All decisions come from src/core.js (the same code the Airtable script embeds).
(() => {
  const C = BirthdayCore;
  const $ = id => document.getElementById(id);
  const GO_LIVE = '2026-10-13';
  const START = '2026-10-14';
  const WINDOW = 4;

  const PEOPLE = [
    { id: 'p1', name: 'Avery Stone', slackId: 'U01AVERY01', birthDate: '1991-10-14', active: true },
    { id: 'p2', name: 'Blake Rivera', slackId: 'U01BLAKE02', birthDate: '1988-10-17', active: true },
    { id: 'p3', name: 'Casey Nguyen', slackId: 'U01CASEY03', birthDate: '1995-10-18', active: true },
    { id: 'p4', name: 'Dana Brooks', slackId: 'U01DANA004', birthDate: '1993-10-20', active: true },
    { id: 'p5', name: 'Eli Moreno', slackId: 'U01ELI0005', birthDate: '1990-10-21', active: false },
    { id: 'p6', name: 'Finley Ortiz', slackId: '', birthDate: '1997-10-22', active: true },
    { id: 'p7', name: 'Gray Kim', slackId: 'U01GRAY007', birthDate: '1989-10-26', active: true },
    { id: 'p8', name: 'Harper Diaz', slackId: 'U01HARPER8', birthDate: '1992-10-28', active: true },
    { id: 'p9', name: 'Indy Shah', slackId: 'U01INDY009', birthDate: '1994-10-31', active: true },
    { id: 'p10', name: 'Jules Park', slackId: 'U01JULES10', birthDate: '1985-10-12', active: true },
  ];
  const GIFS = [
    { code: 'G01', type: 'General', alt: 'cake party', emoji: ['🎂', '🎉', '🥳'], bg: 'linear-gradient(135deg,#ff9a62,#e8467c)' },
    { code: 'G02', type: 'General', alt: 'balloon launch', emoji: ['🎈', '🎈', '🎈'], bg: 'linear-gradient(135deg,#5b8cff,#7a5cff)' },
    { code: 'G03', type: 'General', alt: 'llama with a gift', emoji: ['🦙', '🎁', '✨'], bg: 'linear-gradient(135deg,#8e5cf7,#d55cf7)' },
    { code: 'G04', type: 'General', alt: 'coffee and cake', emoji: ['🍰', '☕', '🍰'], bg: 'linear-gradient(135deg,#18a999,#3fc380)' },
    { code: 'G05', type: 'General', alt: 'pets celebrating', emoji: ['🐶', '🎂', '🐱'], bg: 'linear-gradient(135deg,#f6b93b,#e55039)' },
    { code: 'G06', type: 'General', alt: 'disco confetti', emoji: ['🎊', '🪩', '🎊'], bg: 'linear-gradient(135deg,#2d3436,#6c5ce7)' },
    { code: 'B01', type: 'Belated', alt: 'running late with cake', emoji: ['⏰', '🎂', '💨'], bg: 'linear-gradient(135deg,#636e72,#d9481f)' },
  ];
  const FALLBACK_CATALOG = {
    main: [
      { code: 'M01', text: 'Today the whole team is officially celebrating {tag} 🎂', saysToday: true },
      { code: 'M02', text: 'Happy birthday {tag}! May this year bring you less email and more cake. 🍰', saysToday: false },
      { code: 'M10', text: 'Happy birthday {tag}! We are lucky to work with you. 🙌', saysToday: false },
    ],
    weekendSuffix: [{ code: 'W01', text: '(Celebrating a little early: the big day is {date}.)' }],
    lateSuffix: [{ code: 'L01', text: '(A little late, but just as heartfelt.)' }],
    closing: [{ code: 'K01', text: '👇 Leave your wishes in the thread' }],
  };

  let catalog = FALLBACK_CATALOG;
  let today = C.parseIso(START);
  let history = [];
  let ranDays = new Set();

  // --- tiny CSV parser (quoted fields, doubled quotes) ---
  function parseCsv(text) {
    const rows = []; let row = []; let field = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const [head, ...body] = rows;
    return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  }
  async function loadCatalog() {
    try {
      const r = await fetch('data/messages.csv');
      if (!r.ok) throw new Error(r.status);
      const items = parseCsv(await r.text()).map(x => ({ code: x.Code, type: x.Type, saysToday: x['Says today'] === 'TRUE', text: x.Text }));
      catalog = {
        main: items.filter(m => m.type === 'Main'), weekendSuffix: items.filter(m => m.type === 'Weekend suffix'),
        lateSuffix: items.filter(m => m.type === 'Late suffix'), closing: items.filter(m => m.type === 'Closing'),
      };
    } catch (e) { catalog = FALLBACK_CATALOG; }
  }

  const colors = ['#7777ff', '#ff7792', '#1a1a19', '#5a5af0', '#d9577a', '#37352f', '#8f8fff', '#504e49'];
  const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
  const short = dn => { const x = C.fromDayNumber(dn); return `${'JanFebMarAprMayJunJulAugSepOctNovDec'.substr((x.m - 1) * 3, 3)} ${x.d} · ${'SunMonTueWedThuFriSat'.substr(x.dow * 3, 3)}`; };
  const nameById = id => (PEOPLE.find(p => p.slackId === id) || {}).name || id;

  function renderRoster() {
    $('roster').innerHTML = PEOPLE.map((p, i) => {
      const b = C.parseIso(p.birthDate); const { m, d } = C.fromDayNumber(b);
      const c = C.celebrationFor(m, d, C.fromDayNumber(today).y);
      const chips = [!p.active ? '<span class="chip">inactive</span>' : '', p.active && c.celebrated < C.parseIso(GO_LIVE) ? '<span class="chip">before go-live</span>' : '', !p.slackId ? '<span class="chip warn">no Slack ID</span>' : '', c.movedToFriday && p.active ? '<span class="chip accent">→ Fri</span>' : ''].join('');
      return `<li class="${p.active ? '' : 'off'}"><div class="avatar" style="background:${colors[i % colors.length]}">${initials(p.name)}</div><div class="who">${p.name}<small>${short(c.actual)}</small></div><div class="chips">${chips}</div></li>`;
    }).join('');
  }

  function renderStrip() {
    const start = today - 7; const cells = [];
    const year = C.fromDayNumber(today).y;
    const marks = new Map();
    for (const p of PEOPLE.filter(x => x.active)) {
      const { m, d } = C.fromDayNumber(C.parseIso(p.birthDate));
      for (const y of [year - 1, year, year + 1]) {
        const c = C.celebrationFor(m, d, y);
        (marks.get(c.actual) || marks.set(c.actual, { a: [], c: [] }).get(c.actual)).a.push(p.name);
        (marks.get(c.celebrated) || marks.set(c.celebrated, { a: [], c: [] }).get(c.celebrated)).c.push(p.name);
      }
    }
    for (let dn = start; dn < start + 21; dn++) {
      const x = C.fromDayNumber(dn); const mk = marks.get(dn) || { a: [], c: [] };
      const title = [...mk.c.map(n => `celebrate ${n}`), ...mk.a.filter(n => !mk.c.includes(n)).map(n => `${n}'s birthday`)].join(', ');
      cells.push(`<button type="button" class="day${C.isWeekend(dn) ? ' weekend' : ''}${dn === today ? ' today' : ''}" data-dn="${dn}" title="${title}">${'SMTWTFS'[x.dow]}<b>${x.d}</b>${mk.c.length ? '<span class="dot cel"></span>' : mk.a.length ? '<span class="dot actual"></span>' : ''}</button>`);
    }
    $('strip').innerHTML = cells.join('');
    $('strip').querySelectorAll('.day').forEach(el => el.addEventListener('click', () => setToday(Number(el.dataset.dn))));
  }

  function mrkdwn(text) {
    return text.replace(/<@([A-Z0-9]+)>/g, (_, id) => `<span class="mention">@${nameById(id)}</span>`)
      .replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }

  const consoleLines = [];
  function log(line, cls = '') { consoleLines.push(`<div class="${cls}">${line}</div>`); $('console').innerHTML = consoleLines.slice(-60).join(''); $('console').scrollTop = 1e9; }

  function renderLog() {
    if (!history.length) { $('log').innerHTML = '<tr><td colspan="3" class="muted">Empty</td></tr>'; return; }
    $('log').innerHTML = history.slice().reverse().map(h => `<tr><td>${h.year} · ${h.name}<br><span class="muted small mono">${C.isoDate(h.celebrated)}</span></td><td class="mono">${h.messageCode}<br><span class="muted">${h.gifCode}</span></td><td>${h.late ? '<span class="chip warn">belated</span>' : ''}${h.moved ? '<span class="chip accent">moved to Fri</span>' : ''}${!h.late && !h.moved ? '<span class="chip ok">on the day</span>' : ''}</td></tr>`).join('');
  }

  function post(dn, items) {
    const feed = $('feed');
    if (feed.querySelector('.empty')) feed.innerHTML = '';
    feed.insertAdjacentHTML('beforeend', `<div class="daymark">${C.longDate(dn)}</div>`);
    for (const it of items) {
      const g = it.gif;
      feed.insertAdjacentHTML('beforeend', `<div class="msg"><div class="bot">🎂</div><div><div class="meta"><b>birthday-bot</b><span class="app">APP</span><time>8:00 AM</time></div><p>${mrkdwn(it.composed.body)}</p>${g ? `<figure class="gif" style="background:${g.bg}" aria-label="${g.alt}"><span>${g.emoji[0]}</span><span>${g.emoji[1]}</span><span>${g.emoji[2]}</span><span class="tag">GIF</span><figcaption>${g.code} · ${g.alt}</figcaption></figure>` : ''}<p>${mrkdwn(it.composed.closing)}</p><div class="thread">💬 ${3 + Math.floor(Math.random() * 9)} replies</div></div></div>`);
    }
    feed.scrollTop = 1e9;
  }

  function runJob(dn, outage) {
    const label = `${C.isoDate(dn)} 08:00`;
    if (C.isWeekend(dn)) { log(`${label} · weekend, nothing is posted`, 'dim'); return; }
    if (outage) { log(`${label} ✗ run failed (simulated outage) · nothing logged, will recover`, 'warn'); ranDays.add(dn); return; }
    log(`${label} · auth.test ok`, 'ok');
    const alreadySent = new Set(history.map(h => `${h.personId}|${h.year}`));
    const args = { people: PEOPLE, today: dn, windowDays: WINDOW, activeFrom: C.parseIso(GO_LIVE) };
    const skipped = C.findCelebrants({ ...args, alreadySent: new Set() }).filter(c => alreadySent.has(`${c.person.id}|${c.year}`));
    skipped.forEach(c => log(`  skip ${c.person.name}: already celebrated in ${c.year}`, 'dim'));
    let found = C.findCelebrants({ ...args, alreadySent });
    ranDays.add(dn);
    if (!found.length) { log('  nobody to celebrate today', 'dim'); return; }
    if (found.length > C.MAX_PER_RUN) { log(`  safety brake: ${found.length - C.MAX_PER_RUN} left for next run`, 'warn'); found = found.slice(0, C.MAX_PER_RUN); }
    const msgUsage = C.usageFrom(history, 'messageCode');
    const gifUsage = C.usageFrom(history, 'gifCode');
    const usedM = new Set(); const usedG = new Set(); const items = [];
    for (const c of found) {
      const composed = C.composeMessage(c, catalog, msgUsage, usedM); usedM.add(composed.messageCode);
      const pool = c.late ? GIFS.filter(g => g.type === 'Belated') : GIFS.filter(g => g.type !== 'Belated');
      const gif = C.pickLeastUsed(pool, gifUsage, usedG); usedG.add(gif.code);
      items.push({ composed, gif });
      history.push({ personId: c.person.id, name: c.person.name, year: c.year, celebrated: c.celebrated, messageCode: composed.messageCode, gifCode: gif.code, late: c.late, moved: c.movedToFriday });
      log(`  posted ${c.person.name} · ${composed.messageCode} + ${gif.code}${c.late ? ' · belated' : ''}${c.movedToFriday ? ' · moved to Friday' : ''}${composed.mentionedById ? '' : ' · ⚠ mentioned by name (no Slack ID)'}`, composed.mentionedById ? 'ok' : 'warn');
    }
    post(dn, items);
    renderLog();
  }

  function setToday(dn) { today = dn; $('today').value = C.isoDate(dn); renderStrip(); renderRoster(); }

  function reset() {
    history = []; ranDays = new Set(); consoleLines.length = 0;
    $('console').innerHTML = '<span class="dim">Waiting for the first run…</span>';
    $('feed').innerHTML = '<div class="empty">No posts yet. Press <b>Run today\'s job</b>.</div>';
    renderLog(); setToday(C.parseIso(START));
    log(`Go-live date: ${GO_LIVE}. Nothing dated earlier is ever "recovered".`, 'dim');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();
    $('today').addEventListener('change', e => { const dn = C.parseIso(e.target.value); if (dn !== null) setToday(dn); });
    $('run').addEventListener('click', () => { runJob(today, $('outage').checked); $('outage').checked = false; });
    $('next').addEventListener('click', () => { setToday(today + 1); runJob(today, $('outage').checked); $('outage').checked = false; });
    $('auto').addEventListener('click', async () => {
      const btns = ['run', 'next', 'auto', 'reset'].map($); btns.forEach(b => { b.disabled = true; });
      for (let i = 0; i < 14; i++) { if (i) setToday(today + 1); runJob(today, i === 0 && $('outage').checked); await new Promise(r => setTimeout(r, 260)); }
      $('outage').checked = false; btns.forEach(b => { b.disabled = false; });
    });
    $('reset').addEventListener('click', reset);
    reset();
  });
})();
