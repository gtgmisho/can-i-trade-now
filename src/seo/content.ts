import { DateTime } from 'luxon';
import { NY, type WindowDef, type WindowInstance } from '../lib/windows';
import { CITIES, type City } from './data/cities';
import { SESSIONS, defOf, type SessionInfo } from './data/sessions';
import { FOREX_SESSIONS } from './data/forexSessions';
import {
  WEEKDAY,
  dstRelation,
  fmtRange,
  forexSessionSpans,
  occurrences,
  partOfDay,
  regimes,
  span12,
  span24,
  usual,
  utcLabels,
  variants,
  weeklyBoundaries,
  type DstRelation,
  type Regime,
  type Span,
} from './times';

export interface Faq {
  q: string;
  a: string;
}

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const nySpan = (def: WindowDef) => ({ start: hhmm(def.start), end: hhmm(def.end) });

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const both = (s: string, e: string) => `${span24(s, e)} (${span12(s, e)})`;
const fnv = (str: string) => {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** First / last occurrence of each trading week. */
function weekEdges(occ: WindowInstance[]): { firsts: WindowInstance[]; lasts: WindowInstance[] } {
  const gap = 36 * 3600_000;
  const firsts = occ.filter((w, i) => i === 0 || w.start.toMillis() - occ[i - 1].start.toMillis() > gap).slice(1);
  const lasts = occ.filter((w, i) => i === occ.length - 1 || occ[i + 1].start.toMillis() - w.start.toMillis() > gap).slice(0, -1);
  return { firsts, lasts };
}

export interface Ctx {
  build: DateTime;
  from: DateTime;
  to: DateTime;
}

export const multiYear = (ctx: Ctx) => ctx.from.year !== ctx.to.minus({ days: 1 }).year;

/** Which local variant applies while New York is on daylight time (EDT) vs standard time (EST). */
function nyDstSplit(rs: Regime[]) {
  const edt = rs.find((r) => r.first.setZone(NY).offset === -240);
  const est = rs.find((r) => r.first.setZone(NY).offset === -300);
  return { edt, est };
}

export interface KillzoneModel {
  session: SessionInfo;
  city: City;
  def: WindowDef;
  ny: { start: string; end: string };
  regimes: Regime[];
  usual: Regime;
  variants: ReturnType<typeof variants>;
  relation: DstRelation;
  firstOfWeek: Regime;
  lastOfWeek: Regime;
  utc: string;
  /** other killzones in this city, with usual local times */
  others: { session: SessionInfo; usual: Regime }[];
}

const kzCache = new Map<string, KillzoneModel>();
export function killzoneModel(session: SessionInfo, city: City, ctx: Ctx, withOthers = true): KillzoneModel {
  const key = `${session.slug}|${city.slug}|${withOthers}`;
  const hit = kzCache.get(key);
  if (hit) return hit;
  const def = defOf(session);
  const occ = occurrences(def, ctx.from, ctx.to);
  const rs = regimes(occ, city.tz);
  const u = usual(rs);
  const { firsts, lasts } = weekEdges(occ);
  const m: KillzoneModel = {
    session,
    city,
    def,
    ny: nySpan(def),
    regimes: rs,
    usual: u,
    variants: variants(rs),
    relation: dstRelation(city.tz, ctx.from, ctx.to),
    firstOfWeek: usual(regimes(firsts, city.tz, { weekly: true })),
    lastOfWeek: usual(regimes(lasts, city.tz, { weekly: true })),
    utc: utcLabels(city.tz, ctx.from, ctx.to),
    others: withOthers
      ? SESSIONS.filter((s) => s.slug !== session.slug).map((s) => ({ session: s, usual: killzoneModel(s, city, ctx, false).usual }))
      : [],
  };
  kzCache.set(key, m);
  return m;
}

const signature = (rs: Regime[]) => rs.map((r) => `${r.first.toISODate()}${r.start}${r.end}`).join('|');

/** Cities (in CITIES order) whose local schedule for this session is identical to this one, including itself. */
function scheduleGroup(m: KillzoneModel, ctx: Ctx): City[] {
  const sig = signature(m.regimes);
  return CITIES.filter((c) => signature(killzoneModel(m.session, c, ctx, false).regimes) === sig);
}

/**
 * Phrasing-variant chooser. Cities with identical schedules would otherwise produce near-identical text, so
 * members of one group get consecutive (hence distinct) variant combinations from a group-specific base.
 */
function variantPicker(m: KillzoneModel, ctx: Ctx) {
  const group = scheduleGroup(m, ctx);
  let n = fnv(m.session.slug + signature(m.regimes)) + group.findIndex((c) => c.slug === m.city.slug);
  return <T,>(xs: T[]): T => {
    const v = xs[n % xs.length];
    n = Math.floor(n / xs.length);
    return v;
  };
}

/** Names a different subset of same-schedule cities on each page (list rotated to start after this city). */
function sharesSentence(m: KillzoneModel, ctx: Ctx): string {
  const group = scheduleGroup(m, ctx);
  const i = group.findIndex((c) => c.slug === m.city.slug);
  const same = [...group.slice(i + 1), ...group.slice(0, i)];
  if (same.length === 0) return `No other city among the ${CITIES.length} we track has exactly the same ${m.session.label} schedule as ${m.city.name}.`;
  const shown = same.slice(0, 3).map((c) => c.name);
  const more = same.length - shown.length;
  return `Traders in ${list(more > 0 ? [...shown, `${more} other tracked ${more === 1 ? 'city' : 'cities'}`] : shown)} see exactly the same local times.`;
}

function dstSentence(m: KillzoneModel, ctx: Ctx): string {
  const { city, session, variants: vs, regimes: rs } = m;
  const label = `${session.label} window`;
  switch (m.relation) {
    case 'is-ny':
      return `Because ${city.name} runs on New York time, the ${label} never moves on your clock. Daylight saving only shifts it in UTC terms, by an hour between summer and winter.`;
    case 'same-as-ny':
      return `${city.name} changes its clocks on the same dates as New York, so the ${label} stays at ${span24(m.usual.start, m.usual.end)} local time all year with no DST surprises.`;
    case 'no-dst': {
      const { edt, est } = nyDstSplit(rs);
      if (!edt || !est) return `${city.country} does not use daylight saving time, so the ${label} shifts when the US changes its clocks.`;
      return `${city.country} does not observe daylight saving time, so the ${label} moves by an hour whenever the US changes clocks: it is ${span24(edt.start, edt.end)} while New York is on summer time (March to November) and ${span24(est.start, est.end)} during US winter time.`;
    }
    case 'different-dates': {
      const off = vs.slice(1).reduce((n, v) => n + v.days, 0);
      const alt = vs.slice(1).map((v) => span24(v.start, v.end));
      if (vs.length === 1)
        return `${city.name} changes its clocks, but the shift lines up with New York's, so the ${label} stays at ${span24(m.usual.start, m.usual.end)} locally all year.`;
      const firstAlt = vs[1].ranges[0];
      return `${city.name} also changes its clocks, but on different dates from New York, so the local time is not fixed. On about ${off} trading days in the year ahead the window runs at ${list(alt)} instead of ${span24(m.usual.start, m.usual.end)} (for example ${fmtRange(firstAlt, multiYear(ctx))}).`;
    }
  }
}

function neighbourSentence(m: KillzoneModel): string {
  const { city, usual: u } = m;
  const h = Number(u.start.slice(0, 2));
  if (h < 6 || h >= 23) {
    const friendly = m.others
      .filter((o) => {
        const oh = Number(o.usual.start.slice(0, 2));
        return oh >= 7 && oh < 22;
      })
      .map((o) => `the ${o.session.label} killzone (${span24(o.usual.start, o.usual.end)})`);
    return friendly.length
      ? `That is ${partOfDay(u.start)} in ${city.name}, so many local traders set an alert for it or concentrate on windows that fall in waking hours, such as ${list(friendly.slice(0, 2))}.`
      : `That is ${partOfDay(u.start)} in ${city.name}, so many local traders rely on alerts rather than watching the screen live.`;
  }
  const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const sorted = [...m.others].sort((a, b) => mins(a.usual.start) - mins(b.usual.start));
  const next = sorted.find((o) => mins(o.usual.start) >= mins(u.end)) ?? sorted[0];
  return `It lands in ${partOfDay(u.start)} for traders in ${city.name}; the next killzone on the local clock is the ${next.session.label} at ${next.usual.start}.`;
}

export function killzoneExplainer(m: KillzoneModel, ctx: Ctx): string[] {
  const { session, city, usual: u } = m;
  const shift = u.dayShift > 0 ? ', on the following calendar day' : u.dayShift < 0 ? ', on the previous calendar day' : '';
  const p1 = `The ${session.name} runs ${span12(m.ny.start, m.ny.end)} New York time. In ${city.name} (${m.utc}) that is usually ${both(u.start, u.end)} local time${shift}. ${neighbourSentence(m)}`;
  const pick = variantPicker(m, ctx);
  const p2 = `${dstSentence(m, ctx)} ${sharesSentence(m, ctx)}`;
  const p3 = `${pick(session.about)} ${pick(session.marketContext)}`;
  const f = m.firstOfWeek;
  const l = m.lastOfWeek;
  const p4 = pick(
    [
      `Forex reopens on Sunday at 17:00 New York time, so the first ${session.label} killzone of the week usually starts on ${WEEKDAY[f.weekday]} at ${f.start} in ${city.name}. The last one normally begins on ${WEEKDAY[l.weekday]} at ${l.start}, before the market shuts for the weekend.`,
      `On the ${city.name} calendar, the trading week's first ${session.label} killzone typically opens on ${WEEKDAY[f.weekday]} at ${f.start}, and the final one of the week on ${WEEKDAY[l.weekday]} at ${l.start}. Nothing runs between Friday 17:00 and Sunday 17:00 New York time, when forex is closed.`,
    ],
  );
  return [p1, p2, p3, p4];
}

export function killzoneFaqs(m: KillzoneModel, ctx: Ctx): Faq[] {
  const { session, city, usual: u } = m;
  const vs = m.variants;
  const extra =
    vs.length > 1
      ? ` Because of daylight saving differences it can also be ${list(vs.slice(1).map((v) => span24(v.start, v.end)))} on some dates.`
      : ' It does not change during the year.';
  return [
    {
      q: `What time is the ${session.name} in ${city.name}?`,
      a: `The ${session.name} is usually ${both(u.start, u.end)} in ${city.name} (${m.utc}), which is ${span12(m.ny.start, m.ny.end)} in New York.${extra}`,
    },
    { q: `Does the ${session.label} killzone change with daylight saving time in ${city.name}?`, a: dstSentence(m, ctx) },
    { q: `What is the ${session.name}?`, a: session.faqWhat },
    {
      q: `When is the first ${session.label} killzone of the week in ${city.name}?`,
      a: `Usually on ${WEEKDAY[m.firstOfWeek.weekday]} at ${m.firstOfWeek.start} ${city.name} time. Forex is closed from Friday 17:00 to Sunday 17:00 New York time, so there is no ${session.label} killzone on weekend days.`,
    },
  ];
}

// ---------- Market hours ----------

export interface MarketHoursModel {
  city: City;
  relation: DstRelation;
  open: Regime[];
  close: Regime[];
  usualOpen: Regime;
  usualClose: Regime;
  utc: string;
  sessions: { name: string; regimes: Regime[]; usual: Regime }[];
  overlap: { regimes: Regime[]; usual: Regime };
  killzones: { session: SessionInfo; usual: Regime }[];
}

function intersectByDay(a: Span[], b: Span[]): Span[] {
  const out: Span[] = [];
  for (const x of a) {
    for (const y of b) {
      const s = x.start > y.start ? x.start : y.start;
      const e = x.end < y.end ? x.end : y.end;
      if (s < e) out.push({ start: s, end: e });
    }
  }
  return out.sort((p, q) => p.start.toMillis() - q.start.toMillis());
}

const mhCache = new Map<string, MarketHoursModel>();
export function marketHoursModel(city: City, ctx: Ctx): MarketHoursModel {
  const hit = mhCache.get(city.slug);
  if (hit) return hit;
  const { opens, closes } = weeklyBoundaries(ctx.from, ctx.to);
  const toSpan = (d: DateTime) => ({ start: d, end: d });
  const open = regimes(opens.map(toSpan), city.tz, { weekly: true });
  const close = regimes(closes.map(toSpan), city.tz, { weekly: true });
  const spans = Object.fromEntries(FOREX_SESSIONS.map((fs) => [fs.id, forexSessionSpans(fs, ctx.from, ctx.to)]));
  const sessions = FOREX_SESSIONS.map((fs) => {
    const rs = regimes(spans[fs.id], city.tz, { refTz: fs.tz });
    return { name: fs.name, regimes: rs, usual: usual(rs) };
  });
  const ov = regimes(intersectByDay(spans['london'], spans['new-york']), city.tz, { refTz: 'Europe/London' });
  const m: MarketHoursModel = {
    city,
    relation: dstRelation(city.tz, ctx.from, ctx.to),
    open,
    close,
    usualOpen: usual(open),
    usualClose: usual(close),
    utc: utcLabels(city.tz, ctx.from, ctx.to),
    sessions,
    overlap: { regimes: ov, usual: usual(ov) },
    killzones: SESSIONS.map((s) => ({ session: s, usual: killzoneModel(s, city, ctx, false).usual })),
  };
  mhCache.set(city.slug, m);
  return m;
}

export function marketHoursExplainer(m: MarketHoursModel): string[] {
  const { city, usualOpen: o, usualClose: c } = m;
  const dst =
    m.relation === 'is-ny'
      ? 'The open and close are defined in New York time, so they never move on your clock.'
      : m.relation === 'same-as-ny'
        ? `${city.name} changes its clocks on the same dates as New York, so these local times hold all year.`
        : m.relation === 'no-dst'
          ? `${city.country} does not observe daylight saving time, so the local open and close shift by an hour when the US changes its clocks in March and November.`
          : `${city.name} changes its clocks on different dates from New York, so for a few weeks a year the local open and close move by an hour. The table below lists the exact dates.`;
  const sess = m.sessions.map((s) => `${s.name} about ${span24(s.usual.start, s.usual.end)}`);
  const kzDay = m.killzones.filter((k) => {
    const h = Number(k.usual.start.slice(0, 2));
    return h >= 7 && h < 22;
  });
  return [
    `The forex market trades continuously from Sunday 17:00 to Friday 17:00 New York time. In ${city.name} (${m.utc}) that usually means the week opens on ${WEEKDAY[o.weekday]} at ${o.start} and closes on ${WEEKDAY[c.weekday]} at ${c.start} local time. ${dst}`,
    `Within that week, liquidity rotates through four financial centres. On the ${city.name} clock the commonly quoted sessions are roughly: ${list(sess)}. Session hours are conventions rather than official exchange times, so different sources quote them slightly differently.`,
    `The London–New York overlap, usually the most liquid part of the trading day, falls at ${both(m.overlap.usual.start, m.overlap.usual.end)} in ${city.name}.` +
      (kzDay.length
        ? ` ICT killzones that land in daytime hours locally include ${list(kzDay.map((k) => `the ${k.session.label} (${span24(k.usual.start, k.usual.end)})`))}.`
        : ''),
  ];
}

export function marketHoursFaqs(m: MarketHoursModel): Faq[] {
  const { city, usualOpen: o, usualClose: c } = m;
  return [
    {
      q: `What time does the forex market open in ${city.name}?`,
      a: `Forex opens on Sunday at 17:00 New York time, which is usually ${WEEKDAY[o.weekday]} ${o.start} in ${city.name}${m.open.length > 1 ? '; daylight saving changes can move it by an hour on some weeks' : ''}.`,
    },
    {
      q: `What time does the forex market close on Friday in ${city.name}?`,
      a: `The weekly close is Friday 17:00 New York time, usually ${WEEKDAY[c.weekday]} ${c.start} in ${city.name}. Individual brokers may stop quoting a few minutes earlier.`,
    },
    {
      q: `What is the best time to trade forex in ${city.name}?`,
      a: `Liquidity is typically deepest during the London–New York overlap, which is ${span24(m.overlap.usual.start, m.overlap.usual.end)} in ${city.name}. ICT traders also focus on the London Open and New York AM killzones. The right time depends on the pairs you trade and your strategy.`,
    },
    {
      q: 'Is the forex market open on weekends?',
      a: 'No. The interbank forex market closes from Friday 17:00 to Sunday 17:00 New York time. Some brokers offer weekend quotes on synthetic or crypto products, but major currency pairs do not trade.',
    },
  ];
}

export const OPEN_NOW_FAQS: Faq[] = [
  {
    q: 'Is the forex market open right now?',
    a: 'Forex is open 24 hours a day from Sunday 17:00 to Friday 17:00 New York time. The live indicator on this page checks the current time against that schedule and shows which major sessions are active.',
  },
  {
    q: 'What time does forex open on Sunday?',
    a: 'At 17:00 (5:00 PM) New York time, when the Sydney and Wellington markets start their Monday. In UTC that is 21:00 while New York is on daylight time and 22:00 in US winter.',
  },
  {
    q: 'Is forex open on holidays?',
    a: 'The market usually keeps trading on most bank holidays, but liquidity can be thin and spreads wider. Around Christmas and New Year many brokers shorten their hours, so check your broker’s holiday schedule.',
  },
  {
    q: 'Why is forex closed on weekends?',
    a: 'Forex is traded between banks and institutions in financial centres that close at the weekend, so there is no continuous interbank market from Friday evening to Sunday evening in New York.',
  },
];

export const wordCount = (ps: string[]) => ps.join(' ').split(/\s+/).filter(Boolean).length;
