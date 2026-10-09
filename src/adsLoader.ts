// Shared ad snippet loader (no CSS import, so the static SEO-page island can use it too).
import { DESKTOP_MIN_WIDTH } from './ads.config';

// Adsterra banner codes set a global `atOptions` and then load invoke.js,
// which reads it. Two banners loading at once would overwrite each other's
// options, so every snippet goes through one queue, one at a time.
let queue: Promise<void> = Promise.resolve();

function runSnippet(html: string, target: HTMLElement): Promise<void> {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  const nodes = Array.from(tpl.content.childNodes);

  return nodes.reduce<Promise<void>>(
    (p, node) =>
      p.then(
        () =>
          new Promise<void>((resolve) => {
            if (node.nodeName !== 'SCRIPT') {
              target.appendChild(node.cloneNode(true));
              return resolve();
            }
            const old = node as HTMLScriptElement;
            const s = document.createElement('script');
            for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
            if (old.src) {
              // protocol-relative URLs from ad networks -> force https
              if (s.getAttribute('src')!.startsWith('//')) s.src = 'https:' + s.getAttribute('src');
              s.async = false;
              const done = () => resolve();
              s.onload = done;
              s.onerror = done;
              setTimeout(done, 4000); // never let one slow ad block the rest
            } else {
              s.text = old.text;
            }
            target.appendChild(s);
            if (!old.src) resolve();
          }),
      ),
    Promise.resolve(),
  );
}

export function enqueue(html: string, target: HTMLElement) {
  queue = queue.then(() => runSnippet(html, target)).catch(() => {});
}

export function pick(slot: { desktop: string; mobile: string }): string {
  const wide = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches;
  return (wide ? slot.desktop : slot.mobile) || '';
}
