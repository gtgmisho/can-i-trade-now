import { DateTime } from 'luxon';

export type Impact = 'High' | 'Medium' | 'Low' | 'Holiday';

export interface RawEvent {
  title: string;
  country: string;
  date: string;
  impact: Impact;
  forecast?: string;
  previous?: string;
}

export interface NewsEvent {
  id: string;
  title: string;
  currency: string;
  time: DateTime; // UTC
  impact: Impact;
  forecast: string;
  previous: string;
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY'];

export function parseEvents(raw: RawEvent[]): NewsEvent[] {
  return raw
    .map((e, i) => {
      const time = DateTime.fromISO(e.date, { setZone: true }).toUTC();
      return {
        id: `${e.country}-${e.date}-${i}`,
        title: e.title,
        currency: e.country,
        time,
        impact: e.impact,
        forecast: e.forecast ?? '',
        previous: e.previous ?? '',
      };
    })
    .filter((e) => e.time.isValid)
    .sort((a, b) => a.time.toMillis() - b.time.toMillis());
}

export async function fetchNews(): Promise<NewsEvent[]> {
  const res = await fetch('/api/news');
  if (!res.ok) throw new Error(`news ${res.status}`);
  const data = (await res.json()) as { events: RawEvent[] };
  return parseEvents(data.events ?? []);
}
