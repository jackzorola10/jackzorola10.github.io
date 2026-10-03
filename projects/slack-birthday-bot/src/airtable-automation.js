/**
 * ======================================================================
 *  BIRTHDAY BOT — Airtable automation script → Slack
 * ======================================================================
 *  Paste this whole file into a "Run script" action of an Airtable
 *  automation with a daily trigger (e.g. every day at 8:00 AM).
 *  One step does everything: works out who is celebrated today, posts to
 *  Slack with a GIF, and logs the post.
 *
 *  Why a custom Slack app instead of Airtable's native "Send Slack message":
 *  the native action does not render GIFs inline reliably. A Block Kit image
 *  block posted through chat.postMessage does.
 *
 *  Behavior
 *   - Weekends post nothing. Saturday/Sunday birthdays are celebrated the
 *     Friday before, with a line that says when the real day is.
 *   - Only people with Status = Active are celebrated.
 *   - Messages and GIFs rotate fairly: least used first, ties at random.
 *     Messages that say "today" are only used on the actual birthday.
 *   - Every weekday the token is checked with auth.test, so a revoked token
 *     fails on a quiet Tuesday, not on someone's birthday.
 *   - If a run fails, the next weekday recovers it with a "belated" note
 *     (up to WINDOW_DAYS back, never before ACTIVE_FROM).
 *   - Posts first, logs second. If Slack fails nothing is logged, so the
 *     next run retries. Never more than 4 posts per run (safety brake).
 *   - The token is never printed, logged or included in an error.
 *
 *  Secret (left sidebar of the script step → Secrets):
 *   SLACK_BOT_TOKEN   the app's "Bot User OAuth Token" (xoxb-…)
 *
 *  Input variables (input.config()):
 *   MODE           LIVE = post to LIVE_CHANNEL. TEST = post to TEST_CHANNEL,
 *                  prefixed with [TEST]; test posts never count for rotation
 *                  or duplicates.
 *   PREVIEW_EMAIL  TEST only. Generates ONE preview for that person as if
 *                  today were their birthday.
 *   PREVIEW_STYLE  TEST only, with PREVIEW_EMAIL. Empty = on the day.
 *                  WEEKEND = as if the birthday were on Saturday.
 *                  LATE = as if it were posted a day late.
 *   SIMULATE_DATE  YYYY-MM-DD. TEST only: pretend today is that date.
 *   ACTIVE_FROM    YYYY-MM-DD. LIVE never celebrates anything dated before.
 *   WINDOW_DAYS    How many days back a missed celebration is recovered (4).
 *   TIME_ZONE      IANA zone that defines "today" (e.g. America/Chicago).
 *   UTC_OFFSET     Fallback offset in hours if the zone database is missing.
 *   LIVE_CHANNEL / TEST_CHANNEL   Slack IDs (channel "C…" or user "U…").
 *   TBL_PEOPLE / TBL_MESSAGES / TBL_GIFS / TBL_LOG   table IDs.
 *  A blank optional value (or "-") means "not set".
 * ======================================================================
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

const cfg = input.config();
const blank = v => v === undefined || v === null || ['', '-', 'n/a', 'none'].includes(String(v).trim().toLowerCase());
const str = v => (blank(v) ? '' : String(v).trim());
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const C = BirthdayCore;

const SECRET = 'SLACK_BOT_TOKEN';
const SLACK_API = 'https://slack.com/api';
const PAUSE_MS = 1100; // Slack accepts roughly one message per second per channel

const MODE = (str(cfg.MODE) || 'LIVE').toUpperCase();
if (MODE !== 'LIVE' && MODE !== 'TEST') throw new Error(`MODE must be LIVE or TEST (got "${cfg.MODE}")`);
const IS_TEST = MODE === 'TEST';
const CHANNEL = IS_TEST ? str(cfg.TEST_CHANNEL) : str(cfg.LIVE_CHANNEL);
if (!CHANNEL) throw new Error(`Missing destination channel (${IS_TEST ? 'TEST_CHANNEL' : 'LIVE_CHANNEL'})`);
const windowRaw = str(cfg.WINDOW_DAYS);
const WINDOW = IS_TEST ? 0 : windowRaw === '' || !Number.isFinite(Number(windowRaw)) ? 4 : Math.min(10, Math.max(0, Math.floor(Number(windowRaw))));
const PREVIEW_EMAIL = IS_TEST ? str(cfg.PREVIEW_EMAIL).toLowerCase() : '';
const PREVIEW_STYLE = IS_TEST && PREVIEW_EMAIL ? str(cfg.PREVIEW_STYLE).toUpperCase() : '';
if (PREVIEW_STYLE && !['WEEKEND', 'LATE'].includes(PREVIEW_STYLE)) throw new Error('PREVIEW_STYLE must be WEEKEND, LATE or blank');
const SIMULATED = IS_TEST ? C.parseIso(str(cfg.SIMULATE_DATE)) : null;
if (IS_TEST && str(cfg.SIMULATE_DATE) && SIMULATED === null) throw new Error('SIMULATE_DATE must be YYYY-MM-DD');
const ACTIVE_FROM = C.parseIso(str(cfg.ACTIVE_FROM));
const TODAY = SIMULATED !== null ? SIMULATED : C.todayIn(str(cfg.TIME_ZONE) || 'UTC', new Date(), Number(str(cfg.UTC_OFFSET) || 0));

// Fixes for the most common Slack errors, written for whoever reads the failure email.
const SLACK_HELP = {
  invalid_auth: 'The token is not valid. Check the SLACK_BOT_TOKEN secret: it must be the app\'s full "Bot User OAuth Token" (xoxb-…).',
  not_authed: 'Slack did not receive a token. Check the SLACK_BOT_TOKEN secret.',
  token_revoked: 'The token was revoked. Reinstall the app and update SLACK_BOT_TOKEN.',
  account_inactive: 'The app was deactivated or uninstalled. Reinstall it and update SLACK_BOT_TOKEN.',
  not_in_channel: 'The app is not in that channel. /invite it, or add the chat:write.public scope and reinstall.',
  channel_not_found: 'Slack cannot find the destination. Check LIVE_CHANNEL / TEST_CHANNEL.',
  is_archived: 'The destination channel is archived.',
  messages_tab_disabled: 'To post to a DM, enable "Messages Tab" under App Home in the Slack app settings.',
  missing_scope: 'The app is missing a scope. Add chat:write and chat:write.public, then reinstall.',
  invalid_blocks: 'Slack rejected the message format. Check that message text in the Messages table.',
  ratelimited: 'Slack asked us to slow down. The celebration is retried on the next run.',
};

function readToken() {
  let token;
  try { token = input.secret(SECRET); } catch (e) { /* checked below */ }
  token = token ? String(token).trim() : '';
  if (!token) throw new Error(`Missing secret ${SECRET}. Script step → Secrets → create ${SECRET} with the app's Bot User OAuth Token (xoxb-…).`);
  if (!/^xoxb-/.test(token)) throw new Error(`${SECRET} does not look like a Slack bot token (it should start with "xoxb-").`);
  return token;
}

// Calls a Slack Web API method. Retries on 429 and network errors. Never writes the token anywhere.
async function slack(token, method, body) {
  for (let attempt = 1; ; attempt++) {
    let r;
    try {
      const opts = { method: 'POST', headers: { Authorization: `Bearer ${token}` } };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json; charset=utf-8';
        opts.body = JSON.stringify(body);
      }
      r = await fetch(`${SLACK_API}/${method}`, opts);
    } catch (e) {
      if (attempt < 3) { await sleep(2000); continue; }
      throw new Error(`Could not reach Slack (${method}): ${(e && e.message) || e}`);
    }
    if (r.status === 429 && attempt < 3) {
      const wait = Math.min(20, Math.max(1, Number(r.headers.get('retry-after')) || 3));
      await sleep(wait * 1000);
      continue;
    }
    let data = null;
    try { data = await r.json(); } catch (e) { /* not JSON */ }
    return data || { ok: false, error: r.status === 429 ? 'ratelimited' : `invalid_response_http_${r.status}` };
  }
}

async function gifIsAlive(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const type = (r.headers.get('content-type') || '').toLowerCase();
    return { ok: r.ok && type.includes('image/gif'), detail: `HTTP ${r.status} ${type}`.trim() };
  } catch (e) {
    return { ok: false, detail: String((e && e.message) || e) };
  }
}

// Posts text + GIF + closing. If Slack rejects the image, retries once, then posts without it.
async function post(token, composed, gif, warnings, name) {
  let res = await slack(token, 'chat.postMessage', C.slackPayload(CHANNEL, composed, gif));
  let withImage = !!gif;
  if (!res.ok && res.error === 'invalid_blocks' && gif) {
    await sleep(1500);
    res = await slack(token, 'chat.postMessage', C.slackPayload(CHANNEL, composed, gif));
    if (!res.ok && res.error === 'invalid_blocks') {
      withImage = false;
      warnings.push(`GIF ${gif.code} rejected twice; ${name} is celebrated without it.`);
      res = await slack(token, 'chat.postMessage', C.slackPayload(CHANNEL, composed, null));
    }
  }
  if (!res.ok) throw new Error(`Slack rejected the post for ${name} (${res.error}). ${SLACK_HELP[res.error] || 'Check the Slack app and the destination channel.'}`);
  return { ts: res.ts, channel: res.channel || CHANNEL, withImage };
}

async function permalink(token, channel, ts) {
  try {
    const r = await fetch(`${SLACK_API}/chat.getPermalink?channel=${encodeURIComponent(channel)}&message_ts=${encodeURIComponent(ts)}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    return d && d.ok ? String(d.permalink) : '';
  } catch (e) {
    return '';
  }
}

const selectName = (rec, field) => { const v = rec.getCellValue(field); return v && v.name ? v.name : ''; };

function finish(posted, summary) {
  console.log(summary);
  output.set('mode', MODE);
  output.set('total', posted.length);
  output.set('summary', summary);
}

async function main() {
  const warnings = [];
  const header = `Mode ${MODE} · today: ${C.longDate(TODAY)} (${C.isoDate(TODAY)})${SIMULATED !== null ? ' [simulated]' : ''}`;
  if (C.isWeekend(TODAY) && !PREVIEW_EMAIL) return finish([], `${header}. Weekend: nothing is posted (weekend birthdays are celebrated on Friday).`);

  // Check the token every weekday so a broken setup shows up before a birthday does.
  const token = readToken();
  const session = await slack(token, 'auth.test');
  if (!session.ok) throw new Error(`Slack rejected the token (${session.error}). ${SLACK_HELP[session.error] || ''}`);

  const tPeople = base.getTable(cfg.TBL_PEOPLE);
  const tMessages = base.getTable(cfg.TBL_MESSAGES);
  const tGifs = base.getTable(cfg.TBL_GIFS);
  const tLog = base.getTable(cfg.TBL_LOG);
  const peopleRecs = (await tPeople.selectRecordsAsync({ fields: ['Name', 'Work email', 'Slack user ID', 'Birth date', 'Status'] })).records;
  const messageRecs = (await tMessages.selectRecordsAsync({ fields: ['Code', 'Text', 'Type', 'Says today', 'Active'] })).records;
  const gifRecs = (await tGifs.selectRecordsAsync({ fields: ['Code', 'URL', 'Description', 'Type', 'Active'] })).records;
  const logRecs = (await tLog.selectRecordsAsync({ fields: ['Person ID', 'Birthday year', 'Message code', 'GIF code', 'Mode'] })).records;

  const people = peopleRecs.map(r => ({
    id: r.id,
    name: str(r.getCellValueAsString('Name')) || str(r.getCellValueAsString('Work email')) || r.id,
    email: str(r.getCellValueAsString('Work email')).toLowerCase(),
    slackId: str(r.getCellValueAsString('Slack user ID')),
    birthDate: r.getCellValue('Birth date'),
    active: selectName(r, 'Status') === 'Active',
  }));
  const history = logRecs.filter(r => selectName(r, 'Mode') === 'Live').map(r => ({
    personId: r.getCellValueAsString('Person ID'),
    year: r.getCellValue('Birthday year'),
    messageCode: r.getCellValueAsString('Message code'),
    gifCode: r.getCellValueAsString('GIF code'),
  }));
  const alreadySent = new Set(history.map(h => `${h.personId}|${h.year}`));
  const messageUsage = C.usageFrom(history, 'messageCode');
  const gifUsage = C.usageFrom(history, 'gifCode');

  let candidates;
  if (PREVIEW_EMAIL) {
    const p = people.find(x => x.email === PREVIEW_EMAIL);
    if (!p) throw new Error(`PREVIEW_EMAIL does not match anyone in People: ${PREVIEW_EMAIL}`);
    const toSaturday = (6 - C.fromDayNumber(TODAY).dow + 7) % 7 || 7;
    const weekend = PREVIEW_STYLE === 'WEEKEND';
    candidates = [{ person: p, year: C.fromDayNumber(TODAY).y, celebrated: TODAY, actual: weekend ? TODAY + toSaturday : TODAY, movedToFriday: weekend, late: PREVIEW_STYLE === 'LATE' }];
  } else {
    candidates = C.findCelebrants({ people, today: TODAY, windowDays: WINDOW, activeFrom: IS_TEST ? null : ACTIVE_FROM, alreadySent: IS_TEST ? new Set() : alreadySent });
  }
  if (!candidates.length) return finish([], `${header}. Nobody to celebrate today.`);
  if (candidates.length > C.MAX_PER_RUN) {
    warnings.push(`Safety brake: only ${C.MAX_PER_RUN} posts per run; pending: ${candidates.slice(C.MAX_PER_RUN).map(c => c.person.name).join(', ')}.`);
    candidates.length = C.MAX_PER_RUN;
  }

  const messages = messageRecs.filter(r => r.getCellValue('Active')).map(r => ({
    code: r.getCellValueAsString('Code'), text: r.getCellValueAsString('Text'), type: selectName(r, 'Type'), saysToday: !!r.getCellValue('Says today'),
  })).filter(m => m.text);
  const catalog = {
    main: messages.filter(m => m.type === 'Main'),
    weekendSuffix: messages.filter(m => m.type === 'Weekend suffix'),
    lateSuffix: messages.filter(m => m.type === 'Late suffix'),
    closing: messages.filter(m => m.type === 'Closing'),
  };
  const gifs = gifRecs.filter(r => r.getCellValue('Active') && r.getCellValueAsString('URL')).map(r => ({
    id: r.id, code: r.getCellValueAsString('Code'), url: r.getCellValueAsString('URL').trim(), type: selectName(r, 'Type'),
    alt: (r.getCellValueAsString('Description') || 'Birthday GIF').trim().slice(0, 200),
  }));
  const gifPool = late => {
    const belated = gifs.filter(g => g.type === 'Belated');
    return late && belated.length ? belated : gifs.filter(g => g.type !== 'Belated');
  };

  const usedMessages = new Set();
  const usedGifs = new Set();
  const posted = [];
  for (const [i, c] of candidates.entries()) {
    const composed = C.composeMessage(c, catalog, messageUsage, usedMessages);
    usedMessages.add(composed.messageCode);
    if (!composed.mentionedById) warnings.push(`${c.person.name}: no valid Slack user ID, mentioned by name only.`);

    let gif = null;
    const tried = new Set(usedGifs);
    for (let k = 0; k < 4 && !gif; k++) {
      const g = C.pickLeastUsed(gifPool(c.late), gifUsage, tried);
      if (!g || tried.has(g.code)) break;
      tried.add(g.code);
      const check = await gifIsAlive(g.url);
      if (check.ok) gif = g;
      else warnings.push(`GIF ${g.code} did not respond (${check.detail}).`);
    }
    if (gif) usedGifs.add(gif.code);

    if (IS_TEST) {
      const prefix = `🧪 *[TEST]* Preview, not a real post [${composed.messageCode}${gif ? ' + ' + gif.code : ''}].\n`;
      composed.body = prefix + composed.body;
      composed.plainText = prefix + composed.plainText;
    }

    const result = await post(token, composed, gif, warnings, c.person.name);
    const link = await permalink(token, result.channel, result.ts);
    try {
      await tLog.createRecordAsync({
        'Entry': `${c.year} · ${c.person.name}`,
        'Person ID': c.person.id,
        'Name': c.person.name,
        'Birthday year': c.year,
        'Celebrated on': C.isoDate(c.celebrated),
        'Actual birthday': C.isoDate(c.actual),
        'Message code': composed.messageCode,
        'GIF code': result.withImage && gif ? gif.code : '',
        'Mode': { name: IS_TEST ? 'Test' : 'Live' },
        'Late': !!c.late,
        'Slack permalink': link || null,
      });
    } catch (e) {
      throw new Error(`Posted ${c.person.name}'s celebration but could NOT log it (${(e && e.message) || e}). Log it by hand (Person ID ${c.person.id}, year ${c.year}) or it will repeat on the next run.`);
    }
    posted.push(`${c.year} · ${c.person.name} (${composed.messageCode}${c.late ? ', belated' : ''}${c.movedToFriday ? ', moved to Friday' : ''})`);
    if (i < candidates.length - 1) await sleep(PAUSE_MS);
  }
  finish(posted, `${header}. Posted ${posted.length}: ${posted.join('; ')}.${warnings.length ? ' WARNINGS: ' + warnings.join(' | ') : ''}`);
}

await main();
