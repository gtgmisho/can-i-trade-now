import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { NY, WINDOW_DEFS } from '../lib/windows';
import { cityBySlug } from './data/cities';
import { sessionBySlug } from './data/sessions';
import { killzoneModel, marketHoursModel, type Ctx } from './content';
import { dstRelation, forexSessionsOpen, liveOrNext, nextMarketClose, scheduleRange, utcLabels } from './times';

const build = DateTime.fromISO('2026-10-08T12:00:00Z');
const ctx: Ctx = { build, ...scheduleRange(build) };
const kz = (s: string, c: string) => killzoneModel(sessionBySlug(s)!, cityBySlug(c)!, ctx);
const table = (s: string, c: string) =>
  kz(s, c).regimes.map((r) => `${r.first.toISODate()}..${r.last.toISODate()} ${r.start}-${r.end}`);
const ny = (iso: string) => DateTime.fromISO(iso, { zone: NY });

describe('schedule range', () => {
  it('covers 12 months from the 1st of the build month (NY time)', () => {
    expect(ctx.from.toISO()).toBe('2026-10-01T00:00:00.000-04:00');
    expect(ctx.to.toISO()).toBe('2027-10-01T00:00:00.000-04:00');
  });
});

describe('killzone local times across DST', () => {
  it('London Open in London: shifts only in the US/UK mismatch weeks (autumn & spring)', () => {
    expect(table('london-open', 'london')).toEqual([
      '2026-10-01..2026-10-23 07:00-10:00',
      '2026-10-26..2026-10-30 06:00-09:00', // UK back on GMT Oct 25, US still EDT until Nov 1
      '2026-11-02..2027-03-12 07:00-10:00',
      '2027-03-15..2027-03-26 06:00-09:00', // US on EDT Mar 14, UK still GMT until Mar 28
      '2027-03-29..2027-09-30 07:00-10:00',
    ]);
    expect(kz('london-open', 'london').relation).toBe('different-dates');
    expect(kz('london-open', 'london').usual.start).toBe('07:00');
  });

  it('Asian KZ in Sydney: southern hemisphere DST runs opposite to New York (3 local variants)', () => {
    expect(table('asian', 'sydney')).toEqual([
      '2026-10-02..2026-10-02 10:00-14:00', // AEST + EDT (Sydney DST starts Oct 4)
      '2026-10-05..2026-10-30 11:00-15:00', // AEDT + EDT
      '2026-11-02..2027-03-12 12:00-16:00', // AEDT + EST
      '2027-03-15..2027-04-02 11:00-15:00', // AEDT + EDT (Sydney DST ends Apr 4)
      '2027-04-05..2027-10-01 10:00-14:00', // AEST + EDT
    ]);
    // local date is the day after the NY date
    expect(kz('asian', 'sydney').usual.dayShift).toBe(1);
  });

  it('Tokyo (no DST): NY AM moves by an hour with US DST, crossing local midnight in winter', () => {
    const m = kz('new-york-am', 'tokyo');
    expect(m.relation).toBe('no-dst');
    expect(m.variants.map((v) => `${v.start}-${v.end}`)).toEqual(['20:00-23:00', '21:00-00:00']);
  });

  it('Mexico City abolished DST in 2022 and must NOT follow US clock changes', () => {
    const m = kz('london-open', 'mexico-city');
    expect(m.relation).toBe('no-dst');
    expect(new Set(m.variants.map((v) => v.start))).toEqual(new Set(['00:00', '01:00']));
  });

  it('Chicago / Toronto change clocks with New York: one local time all year', () => {
    expect(table('london-open', 'chicago')).toEqual(['2026-10-01..2027-09-30 01:00-04:00']);
    expect(kz('london-open', 'toronto').relation).toBe('same-as-ny');
    expect(kz('london-open', 'new-york').relation).toBe('is-ny');
  });

  it('US fall-back weekend: first Asian KZ after the change starts 01:00 London, the one before 00:00', () => {
    const occ = kz('asian', 'london').regimes;
    const before = occ.find((r) => r.last.toISODate() === '2026-10-30')!;
    expect(before.start).toBe('00:00'); // Thu Oct 29 20:00 EDT = 00:00 GMT (UK already back on GMT)
    const after = occ.find((r) => r.first.toISODate() === '2026-11-02')!;
    expect(after.start).toBe('01:00'); // Sun Nov 1 20:00 EST = 01:00 GMT Monday
  });

  it('US spring-forward Sunday: Asian KZ that evening is already on EDT', () => {
    const r = kz('asian', 'london').regimes.find((x) => x.first.toISODate() === '2027-03-15')!;
    expect(r.start).toBe('00:00'); // Sun Mar 14 20:00 EDT = 00:00 GMT Monday
  });

  it('Casablanca: Ramadan clock change (UTC+1 -> UTC+0) shows up as its own regime', () => {
    const m = kz('new-york-pm', 'casablanca');
    expect(m.relation).toBe('different-dates');
    const feb = m.regimes.find((r) => r.first.year === 2027 && r.first.month === 2 && r.first.day > 1);
    expect(feb?.start).toBe('18:30'); // EST 13:30 = 18:30 UTC = 18:30 local during Ramadan
  });

  it('Cairo (DST reinstated 2023) is detected as changing clocks on other dates', () => {
    expect(dstRelation('Africa/Cairo', ctx.from, ctx.to)).toBe('different-dates');
  });

  it('half-hour and multi-offset UTC labels', () => {
    expect(utcLabels('Asia/Kolkata', ctx.from, ctx.to)).toBe('UTC+5:30');
    expect(utcLabels('Europe/London', ctx.from, ctx.to)).toBe('UTC+0 / UTC+1');
    expect(utcLabels('America/New_York', ctx.from, ctx.to)).toBe('UTC-5 / UTC-4');
  });

  it('first/last killzone of the week skips weekends', () => {
    const asia = kz('asian', 'tokyo');
    expect(asia.firstOfWeek.weekday).toBe(1); // Sun 20:00 NY = Mon morning Tokyo
    expect(asia.lastOfWeek.weekday).toBe(5); // Thu 20:00 NY = Fri morning Tokyo; Fri evening NY is closed
    expect(kz('new-york-pm', 'london').lastOfWeek.weekday).toBe(5);
  });
});

describe('market hours', () => {
  it('weekly open in Sydney is Monday morning at 07:00, 08:00 or 09:00 depending on both DST regimes', () => {
    const m = marketHoursModel(cityBySlug('sydney')!, ctx);
    expect(new Set(m.open.map((r) => `${r.weekday} ${r.start}`))).toEqual(new Set(['1 07:00', '1 08:00', '1 09:00']));
  });
  it('London–New York overlap in London is usually 13:00–17:00, 12:00–17:00 in mismatch weeks', () => {
    const m = marketHoursModel(cityBySlug('london')!, ctx);
    expect(`${m.overlap.usual.start}-${m.overlap.usual.end}`).toBe('13:00-17:00');
    expect(m.overlap.regimes.some((r) => r.start === '12:00')).toBe(true);
  });
  it('nextMarketClose: Friday 16:59 -> same day 17:00; Friday 17:00 -> next week', () => {
    expect(nextMarketClose(ny('2026-10-09T16:59')).toISO()).toBe(ny('2026-10-09T17:00').toUTC().toISO());
    expect(nextMarketClose(ny('2026-10-09T17:00')).toISO()).toBe(ny('2026-10-16T17:00').toUTC().toISO());
  });
  it('forexSessionsOpen', () => {
    expect(forexSessionsOpen(ny('2026-10-07T09:00')).map((s) => s.id)).toEqual(['london', 'new-york']);
    expect(forexSessionsOpen(ny('2026-10-10T09:00'))).toEqual([]); // Saturday
    // Sun Jun 13 2027 17:30 EDT = Mon 07:30 AEST: market just reopened and Sydney is the only session open
    expect(forexSessionsOpen(ny('2027-06-13T17:30')).map((s) => s.id)).toEqual(['sydney']);
  });
});

describe('live countdown state', () => {
  const lo = WINDOW_DEFS.find((d) => d.id === 'kz-london')!.id;
  it('after Friday close, next London Open is Monday 02:00 NY', () => {
    const r = liveOrNext(lo, ny('2026-10-09T18:00'))!;
    expect(r.live).toBe(false);
    expect(r.w.start.setZone(NY).toISO()).toBe('2026-10-12T02:00:00.000-04:00');
  });
  it('Sunday 20:30 NY: Asian killzone is live', () => {
    const r = liveOrNext('kz-asia', ny('2026-10-11T20:30'))!;
    expect(r.live).toBe(true);
    expect(r.w.end.setZone(NY).toISO()).toBe('2026-10-12T00:00:00.000-04:00');
  });
  it('across the fall-back night the countdown uses real elapsed time', () => {
    // Sun Nov 1 2026 00:30 EDT -> Mon Nov 2 02:00 EST: 25.5h on the wall clock, but 26.5h of real time
    const now = ny('2026-11-01T00:30');
    const r = liveOrNext(lo, now)!;
    expect(r.w.start.diff(now, 'hours').hours).toBe(26.5);
  });
});
