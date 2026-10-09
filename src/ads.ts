import './ads.css';
import { ADS } from './ads.config';
import { enqueue, pick } from './adsLoader';

function makeSlot(name: string): HTMLElement {
  const el = document.createElement('aside');
  el.className = `ad-slot ad-${name}`;
  el.setAttribute('aria-label', 'Advertisement');
  const label = document.createElement('div');
  label.className = 'ad-label';
  label.textContent = 'Ad';
  const box = document.createElement('div');
  box.className = 'ad-box';
  el.append(label, box);
  return el;
}

/** The direct child of .app that contains `el`. */
function sectionOf(el: Element, app: Element): Element | null {
  let cur: Element | null = el;
  while (cur && cur.parentElement !== app) cur = cur.parentElement;
  return cur;
}

function place(): boolean {
  const app = document.querySelector('.app');
  if (!app) return false;

  const status = app.querySelector('.st-trade, .st-wait, .st-lock, .st-closed');
  if (!status) return false; // app not rendered yet

  const topCode = pick(ADS.top);
  if (topCode && !document.querySelector('.ad-top')) {
    const slot = makeSlot('top');
    const after = sectionOf(status, app);
    if (after) after.after(slot);
    else app.prepend(slot);
    enqueue(topCode, slot.querySelector('.ad-box') as HTMLElement);
  }

  const bottomCode = pick(ADS.bottom);
  if (bottomCode && !document.querySelector('.ad-bottom')) {
    const slot = makeSlot('bottom');
    const footer = app.querySelector(':scope > footer, footer');
    const anchor = footer ? sectionOf(footer, app) : null;
    if (anchor) anchor.before(slot);
    else app.append(slot);
    enqueue(bottomCode, slot.querySelector('.ad-box') as HTMLElement);
  }
  return true;
}

export function initAds() {
  if (typeof window === 'undefined') return;
  const hasAny = ADS.socialBar || ADS.top.desktop || ADS.top.mobile || ADS.bottom.desktop || ADS.bottom.mobile;
  if (!hasAny) return;

  const start = () => {
    if (!place()) {
      // wait for React to render the status card (give up after 15 s)
      const mo = new MutationObserver(() => {
        if (place()) mo.disconnect();
      });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => mo.disconnect(), 15000);
    }
    if (ADS.socialBar) enqueue(ADS.socialBar, document.body);
  };

  // Load ads after the clock is on screen so they never slow the first paint.
  if (document.readyState === 'complete') setTimeout(start, 300);
  else window.addEventListener('load', () => setTimeout(start, 300));
}
