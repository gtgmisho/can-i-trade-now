import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { NY, windowsBetween, type WindowInstance } from './lib/windows';
import { CURRENCIES, fetchNews, type NewsEvent } from './lib/news';
import { computeStatus, fmtDuration, relevantNews, type StatusCode } from './lib/status';
import { resolveTz, useSettings, type Settings } from './lib/settings';
import { beep, notificationsSupported, useAlerts } from './lib/alerts';
import { Timeline } from './components/Timeline';
import { AffiliateCta } from './components/AffiliateCta';

const SITE = 'Can I Trade Now?';

const STATUS_UI: Record<StatusCode, { icon: string; label: string; cls: string }> = {
  TRADE: { icon: '🟢', label: 'TRADE', cls: 'st-trade' },
  WAIT: { icon: '🟡', label: 'WAIT', cls: 'st-wait' },
  LOCK: { icon: '🔴', label: 'NEWS LOCK', cls: 'st-lock' },
  CLOSED: { icon: '⚫', label: 'CLOSED', cls: 'st-closed' },
};

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => DateTime.utc());
  useEffect(() => {
    const id = setInterval(() => setNow(DateTime.utc()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function useNews() {
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    let alive = true;
    const run = () =>
      fetchNews()
        .then((e) => alive && (setEvents(e), setState('ok')))
        .catch(() => alive && setState((s) => (s === 'ok' ? 'ok' : 'error')));
    run();
    const id = setInterval(run, 15 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return { events, state };
}

export default function App() {
  const [s, setS] = useSettings();
  const tz = resolveTz(s);
  const now = useNow();
  const { events, state: newsState } = useNews();
  const [dayOffset, setDayOffset] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    notificationsSupported() ? Notification.permission : 'unsupported',
  );

  const fmt = useCallback(
    (t: DateTime) => t.setZone(tz).toFormat(s.hour12 ? 'h:mm a' : 'HH:mm'),
    [tz, s.hour12],
  );

  const opts = { currencies: s.currencies, lockMinutes: s.lockMinutes, includeMedium: s.includeMedium };
  const status = computeStatus(now, events, opts);
  const ui = STATUS_UI[status.code];

  // recompute day windows once a minute is enough, but cheap anyway
  const minuteKey = Math.floor(now.toMillis() / 60_000);
  const dayStart = useMemo(
    () => now.setZone(tz).startOf('day').plus({ days: dayOffset }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tz, dayOffset, Math.floor(minuteKey / 60)],
  );
  const dayWindows = useMemo(() => windowsBetween(dayStart, dayStart.plus({ days: 1 })), [dayStart]);
  const dayNews = useMemo(
    () => relevantNews(events, opts).filter((e) => e.time >= dayStart && e.time < dayStart.plus({ days: 1 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, dayStart, s.currencies, s.includeMedium],
  );
  const alertWindows = useMemo(
    () => windowsBetween(DateTime.utc().minus({ hours: 1 }), DateTime.utc().plus({ days: 2 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(minuteKey / 60)],
  );
  const alertNews = useMemo(() => relevantNews(events, opts), // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, s.currencies, s.includeMedium]);
  useAlerts(now, alertWindows, alertNews, s, fmt);

  useEffect(() => {
    document.title = `${ui.icon} ${ui.label}${status.until ? ' · ' + fmtDuration(status.until.toMillis() - now.toMillis()) : ''} | ${SITE}`;
  });

  const enableAlerts = async () => {
    if (!notificationsSupported()) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') beep();
  };

  const share = async () => {
    const text = `${ui.icon} ${ui.label}: ${status.headline}. Check your ICT killzones, macros & news lock in your timezone:`;
    const url = location.origin;
    try {
      if (navigator.share) await navigator.share({ title: SITE, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert('Copied to clipboard');
      }
    } catch {
      /* cancelled */
    }
  };

  const agenda = useMemo(() => {
    type Row = { t: DateTime; end?: DateTime; kind: string; title: string; sub?: string; color: string; w?: WindowInstance; e?: NewsEvent };
    const rows: Row[] = [
      ...dayWindows
        .filter((w) => s.showMacros || w.def.kind !== 'macro')
        .map((w) => ({ t: w.start, end: w.end, kind: w.def.kind, title: w.def.name, sub: w.def.note, color: w.def.color, w })),
      ...dayNews.map((e) => ({
        t: e.time,
        kind: 'news',
        title: `${e.currency} · ${e.title}`,
        sub: [e.forecast && `F: ${e.forecast}`, e.previous && `P: ${e.previous}`].filter(Boolean).join('  '),
        color: e.impact === 'High' ? '#ef4444' : '#f59e0b',
        e,
      })),
    ];
    return rows.sort((a, b) => a.t.toMillis() - b.t.toMillis());
  }, [dayWindows, dayNews, s.showMacros]);

  const nyNow = now.setZone(NY);
  const localNow = now.setZone(tz);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img className="logo" src="/icon.svg" alt="" width={44} height={44} />
          <div>
            <h1>{SITE}</h1>
            <p className="tag">ICT killzones, macros, Silver Bullet &amp; red-folder news in <b>your</b> time</p>
          </div>
        </div>
        <div className="clocks">
          <div>
            <span className="lbl">You · {tz.split('/').pop()?.replace('_', ' ')}</span>
            <span className="big">{localNow.toFormat(s.hour12 ? 'h:mm:ss a' : 'HH:mm:ss')}</span>
          </div>
          <div>
            <span className="lbl">New York</span>
            <span className="big dim">{nyNow.toFormat(s.hour12 ? 'h:mm a' : 'HH:mm')}</span>
          </div>
        </div>
      </header>

      <section className={`status ${ui.cls}`} aria-live="polite">
        <div className="status-main">
          <div className="status-badge">
            <span className="status-icon" aria-hidden />
            <span className="status-code">{ui.label}</span>
          </div>
          <div className="status-text">
            <h2>{status.headline}</h2>
            {status.detail && <p>{status.detail}{status.lockEvent ? ` at ${fmt(status.lockEvent.time)}` : ''}</p>}
            <div className="chips">
              {status.activeExtras.map((w) => (
                <span key={w.key} className={`chip chip-${w.def.kind}`}>
                  {w.def.kind === 'silverbullet' ? '🎯 ' : '⏱ '}
                  {w.def.name} · ends {fmt(w.end)}
                </span>
              ))}
            </div>
          </div>
        </div>
        {status.until && (
          <div className="countdown">
            <span className="lbl">
              {status.code === 'TRADE' ? 'Ends in' : status.code === 'LOCK' ? 'Lock lifts in' : status.code === 'CLOSED' ? 'Opens in' : 'Starts in'}
            </span>
            <span className="cd">{fmtDuration(status.until.toMillis() - now.toMillis())}</span>
            <span className="lbl">at {fmt(status.until)}{status.until.setZone(tz).hasSame(localNow, 'day') ? '' : ' ' + status.until.setZone(tz).toFormat('ccc')}</span>
          </div>
        )}
        <div className="status-foot">
          {status.nextNews ? (
            <span>
              📰 Next {status.nextNews.impact.toLowerCase()} impact: <b>{status.nextNews.currency} {status.nextNews.title}</b> at{' '}
              {fmt(status.nextNews.time)}
              {status.nextNews.time.setZone(tz).hasSame(localNow, 'day') ? '' : ` (${status.nextNews.time.setZone(tz).toFormat('ccc')})`} · in{' '}
              {fmtDuration(status.nextNews.time.toMillis() - now.toMillis())}
            </span>
          ) : newsState === 'loading' ? (
            <span>📰 Loading economic calendar…</span>
          ) : newsState === 'error' ? (
            <span className="warn">⚠ News calendar unavailable right now: news lock is off. Check your calendar manually.</span>
          ) : (
            <span>📰 No upcoming {s.currencies.join('/')} high-impact news this week</span>
          )}
          <div className="actions">
            {perm !== 'granted' && perm !== 'unsupported' && (
              <button className="btn primary" onClick={enableAlerts}>🔔 Enable alerts</button>
            )}
            {perm === 'granted' && <span className="ok">🔔 Alerts on</span>}
            <button className="btn" onClick={share}>Share</button>
            <button className="btn" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
              ⚙ Settings
            </button>
          </div>
        </div>
      </section>

      {showSettings && <SettingsPanel s={s} setS={setS} tz={tz} />}

      <section className="card">
        <div className="card-head">
          <h3>
            {dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : dayStart.toFormat('cccc')}
            <span className="dim"> · {dayStart.toFormat('ccc d LLL')}</span>
          </h3>
          <div className="seg">
            {[0, 1, 2].map((d) => (
              <button key={d} className={dayOffset === d ? 'on' : ''} onClick={() => setDayOffset(d)}>
                {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : now.setZone(tz).plus({ days: 2 }).toFormat('ccc')}
              </button>
            ))}
          </div>
        </div>
        <Timeline
          dayStart={dayStart}
          now={now}
          windows={dayWindows}
          news={dayNews}
          lockMinutes={s.lockMinutes}
          hour12={s.hour12}
          showMacros={s.showMacros}
        />
        {dayWindows.length === 0 ? (
          <p className="empty">No killzones on this day. Forex is closed from Friday 17:00 to Sunday 17:00 New York time.</p>
        ) : null}
        {agenda.length > 0 && (
          <ol className="agenda">
            {agenda.map((r, i) => {
              const live = r.end ? r.t <= now && now < r.end : Math.abs(r.t.toMillis() - now.toMillis()) <= s.lockMinutes * 60_000;
              const past = (r.end ?? r.t) <= now && !live;
              return (
                <li key={i} className={`${past ? 'past' : ''} ${live ? 'live' : ''} k-${r.kind}`}>
                  <span className="dot" style={{ background: r.color }} />
                  <span className="time">
                    {fmt(r.t)}
                    {r.end ? <span className="dim">–{fmt(r.end)}</span> : null}
                  </span>
                  <span className="what">
                    <b>{r.title}</b>
                    {r.sub ? <small>{r.sub}</small> : null}
                  </span>
                  <span className="when">
                    {live ? 'LIVE' : past ? 'done' : `in ${fmtDuration(r.t.toMillis() - now.toMillis()).replace(/ \d+s$/, '')}`}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <AffiliateCta placement="home" />

      <footer className="foot">
        <p>
          Times follow ICT's New York-based schedule and adjust automatically for US and local daylight saving. Economic calendar data:{' '}
          <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener">ForexFactory</a>, refreshed every 30 min.
          Your settings stay in this browser.
        </p>
        <p className="dim">Educational tool, not financial advice. Trading carries a high risk of loss. Always verify news times with your broker or prop firm.</p>
      </footer>
    </div>
  );
}

function SettingsPanel({ s, setS, tz }: { s: Settings; setS: (f: (s: Settings) => Settings) => void; tz: string }) {
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone');
    } catch {
      return [tz];
    }
  }, [tz]);
  const toggleCur = (c: string) =>
    setS((p) => ({ ...p, currencies: p.currencies.includes(c) ? p.currencies.filter((x) => x !== c) : [...p.currencies, c] }));
  const setAlert = (k: keyof Settings['alerts'], v: boolean) => setS((p) => ({ ...p, alerts: { ...p.alerts, [k]: v } }));

  return (
    <section className="card settings">
      <div className="grid">
        <label>
          <span>Timezone</span>
          <select value={s.tz} onChange={(e) => setS((p) => ({ ...p, tz: e.target.value }))}>
            <option value="auto">Auto ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Clock</span>
          <select value={s.hour12 ? '12' : '24'} onChange={(e) => setS((p) => ({ ...p, hour12: e.target.value === '12' }))}>
            <option value="24">24-hour</option>
            <option value="12">12-hour</option>
          </select>
        </label>
        <label>
          <span>News lock window</span>
          <select value={s.lockMinutes} onChange={(e) => setS((p) => ({ ...p, lockMinutes: Number(e.target.value) }))}>
            {[2, 5, 10, 15, 30].map((n) => (
              <option key={n} value={n}>±{n} min</option>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <span className="lbl">News currencies</span>
        <div className="chips">
          {CURRENCIES.map((c) => (
            <button key={c} className={`chip toggle ${s.currencies.includes(c) ? 'on' : ''}`} onClick={() => toggleCur(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="row checks">
        <label><input type="checkbox" checked={s.includeMedium} onChange={(e) => setS((p) => ({ ...p, includeMedium: e.target.checked }))} /> Include medium-impact news</label>
        <label><input type="checkbox" checked={s.showMacros} onChange={(e) => setS((p) => ({ ...p, showMacros: e.target.checked }))} /> Show ICT macros</label>
      </div>
      <div className="row checks">
        <span className="lbl">Alert me for</span>
        <label><input type="checkbox" checked={s.alerts.killzone} onChange={(e) => setAlert('killzone', e.target.checked)} /> Killzones</label>
        <label><input type="checkbox" checked={s.alerts.silverbullet} onChange={(e) => setAlert('silverbullet', e.target.checked)} /> Silver Bullet</label>
        <label><input type="checkbox" checked={s.alerts.macro} onChange={(e) => setAlert('macro', e.target.checked)} /> Macros</label>
        <label><input type="checkbox" checked={s.alerts.news} onChange={(e) => setAlert('news', e.target.checked)} /> News lock</label>
        <label><input type="checkbox" checked={s.alerts.sound} onChange={(e) => setAlert('sound', e.target.checked)} /> Sound</label>
      </div>
      <p className="dim small">Alerts fire while this tab or the installed app is open (a background tab works). Add it to your home screen for an app-like experience.</p>
    </section>
  );
}
