import { DateTime } from 'luxon';
import type { WindowInstance } from '../lib/windows';
import type { NewsEvent } from '../lib/news';

interface Props {
  dayStart: DateTime; // in user tz
  now: DateTime;
  windows: WindowInstance[];
  news: NewsEvent[];
  lockMinutes: number;
  hour12: boolean;
  showMacros: boolean;
}

const LANES: { key: string; label: string }[] = [
  { key: 'killzone', label: 'Killzones' },
  { key: 'silverbullet', label: 'Silver Bullet' },
  { key: 'macro', label: 'Macros' },
  { key: 'news', label: 'News' },
];

export function Timeline({ dayStart, now, windows, news, lockMinutes, hour12, showMacros }: Props) {
  const dayEnd = dayStart.plus({ days: 1 });
  const total = dayEnd.toMillis() - dayStart.toMillis(); // handles 23/25h DST days
  const pct = (t: DateTime) =>
    Math.min(100, Math.max(0, ((t.toMillis() - dayStart.toMillis()) / total) * 100));
  const fmt = (t: DateTime) => t.setZone(dayStart.zone).toFormat(hour12 ? 'h:mm a' : 'HH:mm');

  const ticks: DateTime[] = [];
  for (let h = 0; h <= 24; h += 3) ticks.push(dayStart.plus({ hours: h }));

  const lanes = LANES.filter((l) => showMacros || l.key !== 'macro');
  const nowInDay = now >= dayStart && now < dayEnd;

  return (
    <div className="timeline" role="img" aria-label="Today's ICT windows and news on a 24 hour timeline">
      {lanes.map((lane) => (
        <div className="lane" key={lane.key}>
          <div className="lane-label">{lane.label}</div>
          <div className="lane-track">
            {lane.key === 'news'
              ? news.map((e) => {
                  const left = pct(e.time.minus({ minutes: lockMinutes }));
                  const right = pct(e.time.plus({ minutes: lockMinutes }));
                  return (
                    <div
                      key={e.id}
                      className={`blk news ${e.impact.toLowerCase()}`}
                      style={{ left: `${left}%`, width: `max(3px, ${right - left}%)` }}
                      title={`${fmt(e.time)} ${e.currency} ${e.title} (${e.impact})`}
                    />
                  );
                })
              : windows
                  .filter((w) => w.def.kind === lane.key)
                  .map((w) => {
                    const left = pct(w.start);
                    const width = pct(w.end) - left;
                    if (width <= 0) return null;
                    const live = w.start <= now && now < w.end;
                    return (
                      <div
                        key={w.key}
                        className={`blk ${w.def.kind}${live ? ' live' : ''}`}
                        style={{ left: `${left}%`, width: `${width}%`, background: w.def.color }}
                        title={`${w.def.name}: ${fmt(w.start)}–${fmt(w.end)}`}
                      >
                        {w.def.kind === 'killzone' && width > 6 ? <span>{w.def.short}</span> : null}
                      </div>
                    );
                  })}
          </div>
        </div>
      ))}
      <div className="ticks">
        <div className="lane-label" />
        <div className="lane-track">
          {ticks.map((t, i) => (
            <span key={i} className="tick" style={{ left: `${pct(t)}%` }}>
              {i === ticks.length - 1 ? '' : t.toFormat(hour12 ? 'ha' : 'HH')}
            </span>
          ))}
        </div>
      </div>
      {nowInDay && (
        <div className="now-wrap" aria-hidden>
          <div className="lane-label" />
          <div className="lane-track now-track">
            <div className="now-line" style={{ left: `${pct(now)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
