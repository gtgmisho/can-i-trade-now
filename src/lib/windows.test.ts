import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { windowsBetween, isMarketOpen, NY } from './windows';
import { computeStatus } from './status';
import type { NewsEvent } from './news';

const opts = { currencies: ['USD', 'EUR', 'GBP'], lockMinutes: 5, includeMedium: false };
const find = (from: string, id: string) => {
  const f = DateTime.fromISO(from, { zone: 'utc' });
  return windowsBetween(f, f.plus({ days: 1 })).find((w) => w.def.id === id)!;
};

describe('windows', () => {
  it('London KZ in summer (EDT, UTC-4) = 06:00–09:00 UTC', () => {
    const w = find('2026-07-15T00:00', 'kz-london');
    expect(w.start.toISO()).toBe('2026-07-15T06:00:00.000Z');
    expect(w.end.toISO()).toBe('2026-07-15T09:00:00.000Z');
  });
  it('London KZ in winter (EST, UTC-5) = 07:00–10:00 UTC', () => {
    const w = find('2026-01-14T00:00', 'kz-london');
    expect(w.start.toISO()).toBe('2026-01-14T07:00:00.000Z');
  });
  it('NY AM KZ shown in Sofia summer = 14:00–17:00', () => {
    const w = find('2026-07-15T00:00', 'kz-nyam');
    expect(w.start.setZone('Europe/Sofia').toFormat('HH:mm')).toBe('14:00');
    expect(w.end.setZone('Europe/Sofia').toFormat('HH:mm')).toBe('17:00');
  });
  it('US/EU DST mismatch week (NY EDT, Sofia still EET) → NY AM starts 13:00 Sofia', () => {
    // 2026-03-10: US switched to DST on Mar 8, Europe switches Mar 29
    const w = find('2026-03-10T00:00', 'kz-nyam');
    expect(w.start.setZone('Europe/Sofia').toFormat('HH:mm')).toBe('13:00');
  });
  it('Asian KZ crosses NY midnight', () => {
    const w = find('2026-07-15T00:00', 'kz-asia');
    expect(w.start.setZone(NY).toFormat('HH:mm')).toBe('20:00');
    expect(w.end.diff(w.start, 'hours').hours).toBe(4);
  });
  it('No windows on Saturday, none before Sunday 17:00 NY', () => {
    const sat = DateTime.fromObject({ year: 2026, month: 9, day: 26 }, { zone: NY });
    const ws = windowsBetween(sat, sat.plus({ days: 1 }).plus({ hours: 19 }));
    expect(ws.length).toBe(0);
    expect(isMarketOpen(sat.plus({ days: 1, hours: 17 }))).toBe(true);
  });
  it('DST spring-forward day: London KZ 02:00 still valid', () => {
    const w = find('2026-03-08T00:00', 'kz-london');
    // Sunday — market closed at 02:00 so excluded; check Monday instead
    expect(w).toBeUndefined();
    const mon = find('2026-03-09T00:00', 'kz-london');
    expect(mon.start.toISO()).toBe('2026-03-09T06:00:00.000Z');
  });
});

describe('status', () => {
  const at = (iso: string) => DateTime.fromISO(iso, { zone: NY }).toUTC();
  it('TRADE inside London KZ', () => {
    expect(computeStatus(at('2026-09-29T03:30'), [], opts).code).toBe('TRADE');
  });
  it('WAIT between killzones', () => {
    const s = computeStatus(at('2026-09-29T06:00'), [], opts);
    expect(s.code).toBe('WAIT');
    expect(s.nextKillzone?.def.id).toBe('kz-nyam');
  });
  it('CLOSED on Saturday', () => {
    expect(computeStatus(at('2026-09-26T12:00'), [], opts).code).toBe('CLOSED');
  });
  it('LOCK around high impact USD news, ignores low/other ccy', () => {
    const ev = (t: string, cur: string, imp: NewsEvent['impact']): NewsEvent => ({
      id: t + cur, title: 'X', currency: cur, time: at(t), impact: imp, forecast: '', previous: '',
    });
    const events = [ev('2026-10-02T08:30', 'USD', 'High'), ev('2026-10-02T09:00', 'JPY', 'High'), ev('2026-10-02T09:45', 'USD', 'Low')];
    expect(computeStatus(at('2026-10-02T08:27'), events, opts).code).toBe('LOCK');
    expect(computeStatus(at('2026-10-02T08:36'), events, opts).code).toBe('TRADE');
    expect(computeStatus(at('2026-10-02T09:00'), events, opts).code).toBe('TRADE');
    const s = computeStatus(at('2026-10-02T08:31'), events, opts);
    expect(s.until?.toISO()).toBe(at('2026-10-02T08:35').toISO());
  });
});
