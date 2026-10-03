/**
 * Birthday bot — pure logic (no Airtable, no Slack, no network).
 *
 * This file is the single source of truth for "who gets celebrated today and
 * what does the message say". It runs in three places:
 *   - Node, for the test suite (tests/core.test.js)
 *   - the browser, for the interactive demo (index.html)
 *   - inside the Airtable automation script, pasted verbatim between the
 *     CORE:START / CORE:END markers (a test checks the copy never drifts).
 *
 * Dates are handled as "day numbers" (days since 1970-01-01, UTC) so that no
 * time zone can shift a birthday by one day.
 */
// CORE:START
const BirthdayCore = (() => {
  const DAY_MS = 86400000;
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNumber = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
  const fromDayNumber = dn => {
    const t = new Date(dn * DAY_MS);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
  };
  const isoDate = dn => {
    const x = fromDayNumber(dn);
    return `${x.y}-${String(x.m).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`;
  };
  const parseIso = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? dayNumber(+m[1], +m[2], +m[3]) : null;
  };
  const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const longDate = dn => {
    const x = fromDayNumber(dn);
    return `${WEEKDAYS[x.dow]}, ${MONTHS[x.m - 1]} ${x.d}`;
  };
  const isWeekend = dn => {
    const dow = fromDayNumber(dn).dow;
    return dow === 0 || dow === 6;
  };

  /** "Today" as a day number in the given IANA time zone. Falls back to a fixed UTC offset. */
  function todayIn(timeZone, now = new Date(), fallbackOffsetHours = 0) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
      const get = type => Number(parts.find(p => p.type === type).value);
      return dayNumber(get('year'), get('month'), get('day'));
    } catch (e) {
      const t = new Date(now.getTime() + fallbackOffsetHours * 3600 * 1000);
      return dayNumber(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    }
  }

  /**
   * When is a birthday celebrated in a given year?
   * Saturday and Sunday birthdays move to the Friday before, so nobody is
   * celebrated in an empty channel. Feb 29 becomes Feb 28 in non-leap years.
   */
  function celebrationFor(birthMonth, birthDay, year) {
    const day = birthMonth === 2 && birthDay === 29 && !isLeap(year) ? 28 : birthDay;
    const actual = dayNumber(year, birthMonth, day);
    const dow = fromDayNumber(actual).dow;
    const celebrated = dow === 6 ? actual - 1 : dow === 0 ? actual - 2 : actual;
    return { actual, celebrated, movedToFriday: celebrated !== actual };
  }

  /**
   * Who should be celebrated in today's run?
   *
   * people:      [{ id, name, slackId, birthDate: 'YYYY-MM-DD', active: bool }]
   * today:       day number
   * windowDays:  how many days back a missed celebration can still be recovered
   * activeFrom:  day number (or null) — never celebrate anything dated before go-live
   * alreadySent: Set of `${personId}|${year}` already posted for real
   *
   * Returns candidates sorted by celebration date, then name.
   */
  function findCelebrants({ people, today, windowDays = 4, activeFrom = null, alreadySent = new Set() }) {
    const { y } = fromDayNumber(today);
    const out = [];
    for (const p of people) {
      if (!p.active) continue;
      const birth = parseIso(p.birthDate);
      if (birth === null) continue;
      const { m, d } = fromDayNumber(birth);
      // A celebration window can cross New Year, so look at last, this and next year.
      for (const year of [y - 1, y, y + 1]) {
        const c = celebrationFor(m, d, year);
        const daysLate = today - c.celebrated;
        if (daysLate < 0 || daysLate > windowDays) continue;
        if (activeFrom !== null && c.celebrated < activeFrom) continue;
        if (alreadySent.has(`${p.id}|${year}`)) continue;
        out.push({ person: p, year, actual: c.actual, celebrated: c.celebrated, movedToFriday: c.movedToFriday, late: daysLate > 0, daysLate });
      }
    }
    return out.sort((a, b) => a.celebrated - b.celebrated || a.person.name.localeCompare(b.person.name));
  }

  /**
   * Fair rotation: among the available items, take the least used; break ties at random.
   * Items already used in this same run are skipped while alternatives exist.
   */
  function pickLeastUsed(pool, usage, usedThisRun = new Set(), random = Math.random) {
    if (!pool.length) return null;
    let available = pool.filter(x => !usedThisRun.has(x.code));
    if (!available.length) available = pool;
    const count = x => usage.get(x.code) || 0;
    const min = Math.min(...available.map(count));
    const tied = available.filter(x => count(x) === min);
    return tied[Math.floor(random() * tied.length)];
  }

  /** Count how many times each code was used in past real posts. */
  function usageFrom(history, key) {
    const usage = new Map();
    for (const h of history) {
      const code = h[key];
      if (code) usage.set(code, (usage.get(code) || 0) + 1);
    }
    return usage;
  }

  const escapeMrkdwn = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const isSlackUserId = id => /^[UW][A-Z0-9]{7,}$/.test(id || '');

  /**
   * Build the message for one celebrant.
   * Messages that say "today" are only allowed when the post lands on the actual birthday.
   * catalog: { main: [], weekendSuffix: [], lateSuffix: [], closing: [] }
   *          each item: { code, text, saysToday }
   */
  function composeMessage(candidate, catalog, usage, usedThisRun, random = Math.random) {
    const onTheDay = !candidate.movedToFriday && !candidate.late;
    const allowed = catalog.main.filter(m => onTheDay || !m.saysToday);
    const message = pickLeastUsed(allowed.length ? allowed : catalog.main, usage, usedThisRun, random);
    if (!message) throw new Error('No active main messages in the catalog');

    const p = candidate.person;
    const tag = isSlackUserId(p.slackId) ? `<@${p.slackId}>` : `*${escapeMrkdwn(p.name)}*`;
    let body = escapeMrkdwn(message.text);
    body = body.includes('{tag}') ? body.split('{tag}').join(tag) : `${body} ${tag}`;

    const anyOf = list => (list.length ? list[Math.floor(random() * list.length)] : null);
    if (candidate.movedToFriday) {
      const s = anyOf(catalog.weekendSuffix);
      if (s) body += ' ' + escapeMrkdwn(s.text).split('{date}').join(longDate(candidate.actual));
    }
    if (candidate.late) {
      const s = anyOf(catalog.lateSuffix);
      if (s) body += ' ' + escapeMrkdwn(s.text);
    }
    const closingItem = anyOf(catalog.closing);
    const closing = closingItem ? escapeMrkdwn(closingItem.text) : '';
    return { messageCode: message.code, body, closing, plainText: body + (closing ? '\n' + closing : ''), mentionedById: isSlackUserId(p.slackId) };
  }

  /** Slack Block Kit payload: text, the GIF as an image block, and the closing line. */
  function slackPayload(channel, composed, gif) {
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: composed.body } }];
    if (gif) blocks.push({ type: 'image', image_url: gif.url, alt_text: gif.alt || 'Birthday GIF' });
    if (composed.closing) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: composed.closing } });
    return { channel, text: composed.plainText, blocks, unfurl_links: false, unfurl_media: false };
  }

  return {
    MAX_PER_RUN: 4, dayNumber, fromDayNumber, isoDate, parseIso, isLeap, longDate, isWeekend, todayIn,
    celebrationFor, findCelebrants, pickLeastUsed, usageFrom, escapeMrkdwn, isSlackUserId, composeMessage, slackPayload,
  };
})();
// CORE:END

if (typeof module !== 'undefined' && module.exports) module.exports = BirthdayCore;
