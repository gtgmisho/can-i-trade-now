import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><circle cx="256" cy="256" r="150" fill="none" stroke="#e6ebf2" stroke-width="28"/><path d="M256 256 L256 150" stroke="#e6ebf2" stroke-width="28" stroke-linecap="round"/><path d="M256 256 L330 300" stroke="#22c55e" stroke-width="28" stroke-linecap="round"/><path d="M256 106 A150 150 0 0 1 386 181" fill="none" stroke="#22c55e" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="256" r="18" fill="#e6ebf2"/></svg>`;
const ICON = `data:image/svg+xml;base64,${btoa(ICON_SVG)}`;

type El = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): El => ({
  type,
  props: { style, children, ...extra },
});

const pill = (text: string, bg: string, fg: string) =>
  h('div', { display: 'flex', padding: '12px 26px', borderRadius: 999, background: bg, color: fg, fontSize: 32, fontWeight: 700 }, `● ${text}`);

/** Strip control chars and cap length so arbitrary query strings can't produce huge or broken images. */
const clean = (v: string | null, max: number) => [...(v ?? '')].filter((ch) => ch >= ' ').join('').trim().slice(0, max);

export default function handler(req: Request) {
  const url = new URL(req.url);
  const size = Number(url.searchParams.get('icon'));
  if (size === 192 || size === 512) {
    return new ImageResponse(
      h('div', { display: 'flex', width: '100%', height: '100%' }, h('img', { width: size, height: size }, undefined, { src: ICON, width: size, height: size })) as never,
      { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
    );
  }
  // Per-page cards for the static SEO pages: /api/og?title=...&sub=...
  const title = clean(url.searchParams.get('title'), 60);
  const sub = clean(url.searchParams.get('sub'), 80);
  if (title) {
    return new ImageResponse(
      h(
        'div',
        { display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', height: '100%', padding: '0 80px', background: '#0a0d12', color: '#e6ebf2' },
        [
          h('div', { display: 'flex', alignItems: 'center', marginBottom: 34 }, [
            h('img', {}, undefined, { src: ICON, width: 72, height: 72 }),
            h('div', { display: 'flex', marginLeft: 18, fontSize: 30, color: '#8a96a8' }, 'Can I Trade Now? · ICT Killzone Clock'),
          ]),
          h('div', { display: 'flex', fontSize: title.length > 32 ? 64 : 80, fontWeight: 800, letterSpacing: -2, lineHeight: 1.1 }, title),
          sub ? h('div', { display: 'flex', fontSize: 36, color: '#22c55e', marginTop: 32 }, sub) : h('div', { display: 'flex' }),
          h('div', { display: 'flex', fontSize: 26, color: '#8a96a8', marginTop: 40 }, 'Live countdown · DST-adjusted · Free'),
        ],
      ) as never,
      { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } },
    );
  }
  return new ImageResponse(
    h(
      'div',
      { display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', height: '100%', padding: '0 80px', background: '#0a0d12', color: '#e6ebf2' },
      [
        h('div', { display: 'flex', alignItems: 'center', marginBottom: 34 }, [
          h('img', {}, undefined, { src: ICON, width: 72, height: 72 }),
          h('div', { display: 'flex', marginLeft: 18, fontSize: 30, color: '#8a96a8' }, 'ICT Killzone Clock'),
        ]),
        h('div', { display: 'flex', fontSize: 88, fontWeight: 800, letterSpacing: -2 }, 'Can I Trade Now?'),
        h('div', { display: 'flex', gap: 18, marginTop: 44 }, [
          pill('TRADE', '#052e16', '#22c55e'),
          pill('WAIT', '#422006', '#f59e0b'),
          pill('NEWS LOCK', '#450a0a', '#ef4444'),
        ]),
        h('div', { display: 'flex', fontSize: 28, color: '#8a96a8', marginTop: 40 }, 'Killzones · Macros · Silver Bullet · Red-folder news, in your time'),
      ],
    ) as never,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
