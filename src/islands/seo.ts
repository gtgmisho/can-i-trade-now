// Client island for the static SEO pages: fills the server-rendered live widget and loads analytics.
// Kept tiny and deferred (type="module") so it never competes with LCP.
import { DateTime } from 'luxon';
import { inject } from '@vercel/analytics';
import { isMarketOpen, nextMarketOpen, type WindowInstance } from '../lib/windows';
import { fmtDuration } from '../lib/status';
import { forexSessionsOpen, liveOrNext, nextMarketClose } from '../seo/times';
import { placementCodes, type AdPlacement } from '../config/ads';
import { enqueue, pick } from '../adsLoader';

inject();

const visitorTz = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

const set = (root: HTMLElement, role: string, text: string) => {
  const el = root.querySelector<HTMLElement>(`[data-r="${role}"]`);
  if (el && el.textContent !== text) el.textContent = text;
};

const span = (w: WindowInstance, tz: string) => {
  const s = w.start.setZone(tz);
  return `${s.toFormat('ccc d LLL')}, ${s.toFormat('HH:mm')}–${w.end.setZone(tz).toFormat('HH:mm')}`;
};

function killzone(root: HTMLElement, tz: string, place: string) {
  const defId = root.dataset.def!;
  let cache: ReturnType<typeof liveOrNext> = null;
  return (now: DateTime) => {
    if (!cache || (cache.live ? now >= cache.w.end : now >= cache.w.start)) cache = liveOrNext(defId, now);
    if (!cache) return;
    const { live, w } = cache;
    root.dataset.state = live ? 'live' : 'next';
    set(root, 'badge', live ? `${w.def.short} live now` : `Next ${w.def.short}`);
    set(root, 'cdlbl', live ? 'Ends in' : 'Starts in');
    set(root, 'cd', fmtDuration((live ? w.end : w.start).toMillis() - now.toMillis()));
    set(root, 'sub', `${live ? 'Now' : 'Next'}: ${span(w, tz)} ${place === 'You' ? 'your time' : `${place} time`}`);
    set(root, 'you', tz !== visitorTz ? `Your time (${visitorTz}): ${span(w, visitorTz)}` : ' ');
  };
}

function market(root: HTMLElement, tz: string, place: string) {
  return (now: DateTime) => {
    const open = isMarketOpen(now);
    root.dataset.state = open ? 'open' : 'closed';
    set(root, 'badge', open ? 'Forex open' : 'Forex closed');
    const next = open ? nextMarketClose(now) : nextMarketOpen(now);
    set(root, 'cdlbl', open ? 'Closes in' : 'Opens in');
    set(root, 'cd', fmtDuration(next.toMillis() - now.toMillis()));
    const sessions = forexSessionsOpen(now).map((s) => s.name);
    set(
      root,
      'sub',
      open
        ? sessions.length
          ? `Sessions open now: ${sessions.join(', ')}.`
          : 'Between the major sessions right now, so liquidity is usually thin.'
        : 'Weekend: the interbank market is closed until Sunday 17:00 New York time.',
    );
    set(root, 'you', `${open ? 'Weekly close' : 'Opens'}: ${next.setZone(tz).toFormat('cccc HH:mm')} ${place === 'You' || tz === visitorTz ? 'your time' : `${place} time`}`);
  };
}

const widgets = [...document.querySelectorAll<HTMLElement>('[data-live]')].map((root) => {
  const tz = root.dataset.tz === 'auto' ? visitorTz : root.dataset.tz!;
  const place = root.dataset.place ?? '';
  const tick = root.dataset.live === 'market' ? market(root, tz, place) : killzone(root, tz, place);
  return (now: DateTime) => {
    set(root, 'clock', now.setZone(tz).toFormat('HH:mm:ss'));
    if (root.dataset.tz === 'auto') set(root, 'clocklbl', `Your time (${tz.split('/').pop()?.replace(/_/g, ' ')})`);
    tick(now);
  };
});

if (widgets.length) {
  const run = () => {
    const now = DateTime.utc();
    for (const w of widgets) w(now);
  };
  run();
  setInterval(run, 1000);
}

// Ads: fill the server-rendered, height-reserved slots after the page has loaded so they never slow first paint.
function loadAds() {
  for (const slot of document.querySelectorAll<HTMLElement>('[data-placement]')) {
    const code = pick(placementCodes(slot.dataset.placement as AdPlacement));
    const box = slot.querySelector<HTMLElement>('.ad-box');
    if (code && box && !box.hasChildNodes()) enqueue(code, box);
  }
}
if (document.readyState === 'complete') setTimeout(loadAds, 300);
else window.addEventListener('load', () => setTimeout(loadAds, 300));
