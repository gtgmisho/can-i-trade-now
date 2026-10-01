import { useEffect, useRef } from 'react';
import type { DateTime } from 'luxon';
import type { WindowInstance } from './windows';
import type { NewsEvent } from './news';
import type { Settings } from './settings';

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

let ctx: AudioContext | null = null;
export function beep() {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.65);
  } catch {
    /* ignore */
  }
}

async function notify(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: '/icon-192.png', badge: '/icon-192.png' });
    else new Notification(title, { body, tag, icon: '/icon-192.png' });
  } catch {
    /* ignore */
  }
}

/** Fires alerts when "now" crosses a window start or news pre-alert. Works while the page is open. */
export function useAlerts(now: DateTime, windows: WindowInstance[], news: NewsEvent[], s: Settings, fmt: (t: DateTime) => string) {
  const fired = useRef<Set<string>>(new Set());
  const prev = useRef<number>(now.toMillis());

  useEffect(() => {
    const from = prev.current;
    const to = now.toMillis();
    prev.current = to;
    if (to - from > 120_000 || to <= from) return; // skip after sleep/large jumps
    const crossed = (t: number) => t > from && t <= to;
    const fire = (key: string, title: string, body: string) => {
      if (fired.current.has(key)) return;
      fired.current.add(key);
      notify(title, body, key);
      if (s.alerts.sound) beep();
    };
    for (const w of windows) {
      if (!s.alerts[w.def.kind]) continue;
      if (crossed(w.start.toMillis())) {
        fire(w.key, `${w.def.name} started`, `${fmt(w.start)}–${fmt(w.end)}${w.def.note ? ' · ' + w.def.note : ''}`);
      }
    }
    if (s.alerts.news) {
      for (const e of news) {
        const pre = e.time.minus({ minutes: s.lockMinutes }).toMillis();
        if (crossed(pre)) {
          fire(`news-${e.id}`, `News lock: ${e.currency} ${e.title}`, `High impact at ${fmt(e.time)}. Stay flat for ±${s.lockMinutes} min.`);
        }
      }
    }
  }, [now, windows, news, s, fmt]);
}
