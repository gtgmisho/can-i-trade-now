import { DateTime } from 'luxon';
import { isMarketOpen, nextMarketOpen, windowsBetween, type WindowInstance } from './windows';
import type { NewsEvent } from './news';

export type StatusCode = 'TRADE' | 'WAIT' | 'LOCK' | 'CLOSED';

export interface Status {
  code: StatusCode;
  headline: string;
  detail: string;
  /** moment the current state is expected to change */
  until: DateTime | null;
  activeKillzone: WindowInstance | null;
  activeExtras: WindowInstance[]; // silver bullet / macros active now
  lockEvent: NewsEvent | null;
  nextNews: NewsEvent | null;
  nextKillzone: WindowInstance | null;
}

export interface StatusOptions {
  currencies: string[];
  lockMinutes: number;
  includeMedium: boolean;
}

export function relevantNews(events: NewsEvent[], opts: StatusOptions): NewsEvent[] {
  return events.filter(
    (e) =>
      opts.currencies.includes(e.currency) &&
      (e.impact === 'High' || (opts.includeMedium && e.impact === 'Medium')),
  );
}

export function computeStatus(now: DateTime, events: NewsEvent[], opts: StatusOptions): Status {
  const wins = windowsBetween(now.minus({ hours: 12 }), now.plus({ days: 4 }));
  const active = wins.filter((w) => w.start <= now && now < w.end);
  const activeKillzone = active.find((w) => w.def.kind === 'killzone') ?? null;
  const activeExtras = active.filter((w) => w.def.kind !== 'killzone');
  const nextKillzone = wins.find((w) => w.def.kind === 'killzone' && w.start > now) ?? null;

  const news = relevantNews(events, opts);
  const lockMs = opts.lockMinutes * 60_000;
  const lockEvent =
    news.find((e) => Math.abs(e.time.toMillis() - now.toMillis()) <= lockMs) ?? null;
  const nextNews = news.find((e) => e.time > now) ?? null;

  const base = { activeKillzone, activeExtras, lockEvent, nextNews, nextKillzone };

  if (!isMarketOpen(now)) {
    return {
      ...base,
      code: 'CLOSED',
      headline: 'Market closed',
      detail: 'Forex reopens Sunday 17:00 New York time.',
      until: nextMarketOpen(now),
    };
  }

  if (lockEvent) {
    // lock lasts until lockMinutes after the LAST event in a cluster
    let end = lockEvent.time.plus({ minutes: opts.lockMinutes });
    for (const e of news) {
      if (e.time > lockEvent.time && e.time.minus({ minutes: opts.lockMinutes }) <= end) {
        end = e.time.plus({ minutes: opts.lockMinutes });
      }
    }
    return {
      ...base,
      code: 'LOCK',
      headline: 'News lock: hands off',
      detail: `${lockEvent.currency} ${lockEvent.title}`,
      until: end,
    };
  }

  if (activeKillzone) {
    return {
      ...base,
      code: 'TRADE',
      headline: `${activeKillzone.def.name} is live`,
      detail: activeKillzone.def.note ?? '',
      until: activeKillzone.end,
    };
  }

  return {
    ...base,
    code: 'WAIT',
    headline: 'Outside killzones: wait',
    detail: nextKillzone ? `Next: ${nextKillzone.def.name}` : '',
    until: nextKillzone?.start ?? null,
  };
}

export function fmtDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h ${pad(mm)}m`;
  return h > 0 ? `${h}h ${pad(mm)}m ${pad(ss)}s` : `${mm}m ${pad(ss)}s`;
}
