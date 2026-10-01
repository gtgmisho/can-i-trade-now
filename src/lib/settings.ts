import { useEffect, useState } from 'react';

export interface Settings {
  tz: string; // 'auto' or IANA
  hour12: boolean;
  currencies: string[];
  lockMinutes: number;
  includeMedium: boolean;
  showMacros: boolean;
  alerts: { killzone: boolean; silverbullet: boolean; macro: boolean; news: boolean; sound: boolean };
}

export const DEFAULTS: Settings = {
  tz: 'auto',
  hour12: false,
  currencies: ['USD', 'EUR', 'GBP'],
  lockMinutes: 5,
  includeMedium: false,
  showMacros: true,
  alerts: { killzone: true, silverbullet: true, macro: false, news: true, sound: true },
};

const KEY = 'ict-day-planner:settings:v1';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const s = JSON.parse(raw);
    return { ...DEFAULTS, ...s, alerts: { ...DEFAULTS.alerts, ...(s.alerts ?? {}) } };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [s, set] = useState<Settings>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* private mode */
    }
  }, [s]);
  return [s, set] as const;
}

export function resolveTz(s: Settings): string {
  if (s.tz !== 'auto') return s.tz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
