import { DateTime } from 'luxon';

export const NY = 'America/New_York';

export type WindowKind = 'killzone' | 'silverbullet' | 'macro';

export interface WindowDef {
  id: string;
  kind: WindowKind;
  name: string;
  short: string;
  /** minutes after NY midnight (wall clock) */
  start: number;
  /** minutes after NY midnight; 1440 = next midnight */
  end: number;
  color: string;
  note?: string;
}

const m = (h: number, min = 0) => h * 60 + min;

/**
 * All times are New York wall-clock time (ICT convention). They move with US DST
 * automatically because we build them in the America/New_York zone.
 */
export const WINDOW_DEFS: WindowDef[] = [
  // Killzones
  { id: 'kz-asia', kind: 'killzone', name: 'Asian Killzone', short: 'Asia', start: m(20), end: m(24), color: '#a78bfa', note: 'Range building. Mark the Asian high/low for London.' },
  { id: 'kz-london', kind: 'killzone', name: 'London Open Killzone', short: 'London', start: m(2), end: m(5), color: '#60a5fa', note: 'Judas swing: often sweeps the Asian range first.' },
  { id: 'kz-nyam', kind: 'killzone', name: 'New York AM Killzone', short: 'NY AM', start: m(7), end: m(10), color: '#fb923c', note: '8:30 data + 9:30 equity open. Highest volume.' },
  { id: 'kz-lclose', kind: 'killzone', name: 'London Close Killzone', short: 'LDN Close', start: m(10), end: m(12), color: '#2dd4bf', note: 'Profit taking and retracements toward the daily range midpoint.' },
  { id: 'kz-nypm', kind: 'killzone', name: 'New York PM Session', short: 'NY PM', start: m(13, 30), end: m(16), color: '#f472b6', note: 'Afternoon session, indices mostly.' },
  // Silver Bullet (60 min)
  { id: 'sb-london', kind: 'silverbullet', name: 'London Silver Bullet', short: 'SB', start: m(3), end: m(4), color: '#facc15' },
  { id: 'sb-am', kind: 'silverbullet', name: 'NY AM Silver Bullet', short: 'SB', start: m(10), end: m(11), color: '#facc15' },
  { id: 'sb-pm', kind: 'silverbullet', name: 'NY PM Silver Bullet', short: 'SB', start: m(14), end: m(15), color: '#facc15' },
  // Macros (~20-30 min)
  { id: 'mc-0233', kind: 'macro', name: 'London Macro 1', short: 'M', start: m(2, 33), end: m(3), color: '#e5e7eb' },
  { id: 'mc-0403', kind: 'macro', name: 'London Macro 2', short: 'M', start: m(4, 3), end: m(4, 30), color: '#e5e7eb' },
  { id: 'mc-0850', kind: 'macro', name: 'NY AM Macro 1', short: 'M', start: m(8, 50), end: m(9, 10), color: '#e5e7eb' },
  { id: 'mc-0950', kind: 'macro', name: 'NY AM Macro 2', short: 'M', start: m(9, 50), end: m(10, 10), color: '#e5e7eb' },
  { id: 'mc-1050', kind: 'macro', name: 'NY AM Macro 3', short: 'M', start: m(10, 50), end: m(11, 10), color: '#e5e7eb' },
  { id: 'mc-1150', kind: 'macro', name: 'NY Lunch Macro', short: 'M', start: m(11, 50), end: m(12, 10), color: '#e5e7eb' },
  { id: 'mc-1310', kind: 'macro', name: 'NY PM Macro', short: 'M', start: m(13, 10), end: m(13, 40), color: '#e5e7eb' },
  { id: 'mc-1515', kind: 'macro', name: 'NY Last Hour Macro', short: 'M', start: m(15, 15), end: m(15, 45), color: '#e5e7eb' },
];

export interface WindowInstance {
  def: WindowDef;
  key: string; // unique per occurrence
  start: DateTime; // UTC
  end: DateTime; // UTC
}

/** Build a NY wall-clock time on a given NY date. Handles DST gaps (luxon shifts forward). */
function nyWall(nyDate: DateTime, minutes: number): DateTime {
  const base = nyDate.setZone(NY).startOf('day');
  const d = minutes >= 1440 ? base.plus({ days: 1 }) : base;
  const mm = minutes % 1440;
  return DateTime.fromObject(
    { year: d.year, month: d.month, day: d.day, hour: Math.floor(mm / 60), minute: mm % 60 },
    { zone: NY },
  ).toUTC();
}

/** Forex is closed from Friday 17:00 NY until Sunday 17:00 NY. */
export function isMarketOpen(t: DateTime): boolean {
  const ny = t.setZone(NY);
  const wd = ny.weekday; // 1=Mon..7=Sun
  const mins = ny.hour * 60 + ny.minute;
  if (wd === 6) return false;
  if (wd === 5 && mins >= 17 * 60) return false;
  if (wd === 7 && mins < 17 * 60) return false;
  return true;
}

export function nextMarketOpen(t: DateTime): DateTime {
  if (isMarketOpen(t)) return t;
  const ny = t.setZone(NY);
  // next Sunday 17:00 NY
  let d = ny.startOf('day');
  while (d.weekday !== 7) d = d.plus({ days: 1 });
  let open = DateTime.fromObject({ year: d.year, month: d.month, day: d.day, hour: 17 }, { zone: NY });
  if (open <= ny) open = open.plus({ weeks: 1 });
  return open.toUTC();
}

/** All window occurrences overlapping [from, to). */
export function windowsBetween(from: DateTime, to: DateTime): WindowInstance[] {
  const out: WindowInstance[] = [];
  let d = from.setZone(NY).startOf('day').minus({ days: 1 });
  const last = to.setZone(NY).startOf('day').plus({ days: 1 });
  while (d <= last) {
    for (const def of WINDOW_DEFS) {
      const start = nyWall(d, def.start);
      const end = nyWall(d, def.end);
      if (end <= from || start >= to) continue;
      if (!isMarketOpen(start)) continue;
      out.push({ def, key: `${def.id}@${d.toISODate()}`, start, end });
    }
    d = d.plus({ days: 1 });
  }
  return out.sort((a, b) => a.start.toMillis() - b.start.toMillis());
}
