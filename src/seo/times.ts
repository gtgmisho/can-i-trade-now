import { DateTime } from 'luxon';
import { NY, WINDOW_DEFS, isMarketOpen, windowsBetween, type WindowDef, type WindowInstance } from '../lib/windows';
import { FOREX_SESSIONS, type ForexSession } from './data/forexSessions';

/** A span of interval occurrences that share the same local wall-clock times in one timezone. */
export interface Regime {
  /** local start of the first / last occurrence in this run */
  first: DateTime;
  last: DateTime;
  /** local wall-clock, 24h "HH:mm" */
  start: string;
  end: string;
  /** local weekday (1=Mon..7=Sun); only meaningful for weekly events */
  weekday: number;
  /** local calendar day minus NY calendar day of the occurrence start (-1, 0, +1) */
  dayShift: number;
  count: number;
}

export interface Span {
  start: DateTime;
  end: DateTime;
}

/** The 12-month window the static pages describe: from the 1st of the build month. */
export function scheduleRange(build: DateTime): { from: DateTime; to: DateTime } {
  const from = build.setZone(NY).startOf('month');
  return { from, to: from.plus({ months: 12 }) };
}

const yearCache = new Map<string, WindowInstance[]>();
/** Every trading-day occurrence of a window definition in [from, to). Weekend (market-closed) ones are excluded. */
export function occurrences(def: WindowDef, from: DateTime, to: DateTime): WindowInstance[] {
  const key = `${from.toMillis()}|${to.toMillis()}`;
  let all = yearCache.get(key);
  if (!all) {
    all = windowsBetween(from, to).filter((w) => w.start >= from && w.start < to);
    yearCache.set(key, all);
  }
  return all.filter((w) => w.def.id === def.id);
}

const dayDiff = (a: DateTime, b: DateTime) =>
  Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000);
const pad2 = (n: number) => String(n).padStart(2, '0');
const hm = (d: DateTime) => `${pad2(d.hour)}:${pad2(d.minute)}`;

/** Group consecutive spans by their local wall-clock times in `tz`. */
export function regimes(spans: Span[], tz: string, opts: { weekly?: boolean; refTz?: string } = {}): Regime[] {
  const out: Regime[] = [];
  for (const s of spans) {
    const ls = s.start.setZone(tz);
    const le = s.end.setZone(tz);
    const ns = s.start.setZone(opts.refTz ?? NY);
    const r = {
      start: hm(ls),
      end: hm(le),
      weekday: opts.weekly ? ls.weekday : 0,
      dayShift: dayDiff(ls, ns),
    };
    const prev = out[out.length - 1];
    if (prev && prev.start === r.start && prev.end === r.end && prev.weekday === r.weekday && prev.dayShift === r.dayShift) {
      prev.last = ls;
      prev.count++;
    } else {
      out.push({ ...r, first: ls, last: ls, count: 1 });
    }
  }
  return out;
}

/** The regime covering the most occurrences ("usually"). Ties go to the earlier one. */
export function usual(rs: Regime[]): Regime {
  const totals = new Map<string, { r: Regime; n: number }>();
  for (const r of rs) {
    const k = `${r.start}|${r.end}|${r.weekday}|${r.dayShift}`;
    const t = totals.get(k);
    if (t) t.n += r.count;
    else totals.set(k, { r, n: r.count });
  }
  let best: { r: Regime; n: number } | null = null;
  for (const t of totals.values()) if (!best || t.n > best.n) best = t;
  return best!.r;
}

/** Distinct local time variants, most common first. */
export function variants(rs: Regime[]): { start: string; end: string; days: number; ranges: Regime[] }[] {
  const m = new Map<string, { start: string; end: string; days: number; ranges: Regime[] }>();
  for (const r of rs) {
    const k = `${r.start}|${r.end}`;
    const v = m.get(k) ?? { start: r.start, end: r.end, days: 0, ranges: [] };
    v.days += r.count;
    v.ranges.push(r);
    m.set(k, v);
  }
  return [...m.values()].sort((a, b) => b.days - a.days);
}

export type DstRelation = 'is-ny' | 'same-as-ny' | 'no-dst' | 'different-dates';

/** How a timezone's clock changes relate to New York's, derived purely from tz data. */
export function dstRelation(tz: string, from: DateTime, to: DateTime): DstRelation {
  if (tz === NY) return 'is-ny';
  const offs: number[] = [];
  const diffs: number[] = [];
  for (let d = from; d < to; d = d.plus({ days: 7 })) {
    const o = d.setZone(tz).offset;
    offs.push(o);
    diffs.push(o - d.setZone(NY).offset);
  }
  if (new Set(diffs).size === 1) return 'same-as-ny';
  if (new Set(offs).size === 1) return 'no-dst';
  return 'different-dates';
}

/** Weekly forex open (Sunday 17:00 NY) and close (Friday 17:00 NY) instants in [from, to). */
export function weeklyBoundaries(from: DateTime, to: DateTime): { opens: DateTime[]; closes: DateTime[] } {
  const opens: DateTime[] = [];
  const closes: DateTime[] = [];
  let d = from.setZone(NY).startOf('day');
  while (d < to) {
    const at17 = DateTime.fromObject({ year: d.year, month: d.month, day: d.day, hour: 17 }, { zone: NY });
    if (d.weekday === 7) opens.push(at17);
    if (d.weekday === 5) closes.push(at17);
    d = d.plus({ days: 1 });
  }
  return { opens, closes };
}

/** Next Friday 17:00 NY at or after t (the weekly close). */
export function nextMarketClose(t: DateTime): DateTime {
  const ny = t.setZone(NY);
  let d = ny.startOf('day');
  for (;;) {
    if (d.weekday === 5) {
      const c = DateTime.fromObject({ year: d.year, month: d.month, day: d.day, hour: 17 }, { zone: NY });
      if (c > ny) return c.toUTC();
    }
    d = d.plus({ days: 1 });
  }
}

/** Weekday occurrences of a forex centre's business hours, in [from, to). */
export function forexSessionSpans(fs: ForexSession, from: DateTime, to: DateTime): Span[] {
  const out: Span[] = [];
  let d = from.setZone(fs.tz).startOf('day');
  const end = to.setZone(fs.tz);
  while (d < end) {
    if (d.weekday <= 5) {
      const at = (h: number) => DateTime.fromObject({ year: d.year, month: d.month, day: d.day, hour: h }, { zone: fs.tz });
      out.push({ start: at(fs.open), end: at(fs.close) });
    }
    d = d.plus({ days: 1 });
  }
  return out;
}

/** Forex centres whose business hours contain `now` (only while the market is open). */
export function forexSessionsOpen(now: DateTime): ForexSession[] {
  if (!isMarketOpen(now)) return [];
  return FOREX_SESSIONS.filter((fs) => {
    const l = now.setZone(fs.tz);
    const h = l.hour + l.minute / 60;
    return l.weekday <= 5 && h >= fs.open && h < fs.close;
  });
}

/** Current occurrence of a window if live, otherwise the next one. */
export function liveOrNext(defId: string, now: DateTime): { live: boolean; w: WindowInstance } | null {
  const def = WINDOW_DEFS.find((d) => d.id === defId);
  if (!def) return null;
  const ws = windowsBetween(now.minus({ days: 1 }), now.plus({ days: 5 })).filter((w) => w.def.id === defId);
  const live = ws.find((w) => w.start <= now && now < w.end);
  if (live) return { live: true, w: live };
  const next = ws.find((w) => w.start > now);
  return next ? { live: false, w: next } : null;
}

/** "07:00" → "7:00 AM" */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "00:00" end times read better as "24:00"-style midnight in prose; keep 24h but label midnight. */
export const span24 = (s: string, e: string) => `${s}–${e}`;
export const span12 = (s: string, e: string) => `${to12h(s)}–${to12h(e)}`;

export const WEEKDAY = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "Mar 9" or "Mar 9, 2027" when the range spans two years */
export function fmtRange(r: Regime, multiYear: boolean): string {
  const f = multiYear ? 'LLL d, yyyy' : 'LLL d';
  return r.first.hasSame(r.last, 'day') ? r.first.toFormat(f) : `${r.first.toFormat(f)} – ${r.last.toFormat(f)}`;
}

/** UTC offset label like "UTC+5:30" for a zone at a moment. */
export function utcLabel(tz: string, at: DateTime): string {
  return fmtOffset(at.setZone(tz).offset);
}

/** "UTC+9" or "UTC+0 / UTC+1" when the zone changes offset within [from, to). Lowest offset first. */
export function utcLabels(tz: string, from: DateTime, to: DateTime): string {
  const seen = new Set<number>();
  for (let d = from; d < to; d = d.plus({ days: 7 })) seen.add(d.setZone(tz).offset);
  return [...seen]
    .sort((a, b) => a - b)
    .map(fmtOffset)
    .join(' / ');
}

const fmtOffset = (o: number) => {
  const a = Math.abs(o);
  return `UTC${o < 0 ? '-' : '+'}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`;
};

/** Hour of day → prose */
export function partOfDay(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  if (h < 5) return 'the middle of the night';
  if (h < 8) return 'the early morning';
  if (h < 12) return 'the morning';
  if (h < 17) return 'the afternoon';
  if (h < 21) return 'the evening';
  return 'the late evening';
}
