import { describe, it, expect } from 'vitest';
import { CITIES } from './data/cities';
import { SESSIONS } from './data/sessions';
import { killzoneExplainer, killzoneFaqs, killzoneModel, wordCount } from './content';
import { makeCtx, renderSite } from './render';

const ctx = makeCtx('2026-10-08T12:00:00Z');

/** word 3-gram Jaccard similarity */
function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const w = s.toLowerCase().split(/\s+/);
    return new Set(w.slice(2).map((_, i) => w.slice(i, i + 3).join(' ')));
  };
  const A = grams(a);
  const B = grams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

describe('killzone page content', { timeout: 60_000 }, () => {
  const all = SESSIONS.flatMap((s) =>
    CITIES.map((c) => ({ s, c, text: killzoneExplainer(killzoneModel(s, c, ctx), ctx).join(' ') })),
  );

  it(`has ${SESSIONS.length * CITIES.length} pages (5 sessions × ~40+ cities)`, () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(CITIES.map((c) => c.slug)).size).toBe(CITIES.length);
  });

  it('every explainer is 150–250 words', () => {
    for (const p of all) {
      const n = wordCount([p.text]);
      expect(n, `${p.s.slug}/${p.c.slug}`).toBeGreaterThanOrEqual(150);
      expect(n, `${p.s.slug}/${p.c.slug}`).toBeLessThanOrEqual(250);
    }
  });

  it('explainers are unique and not near-duplicates within a session', () => {
    expect(new Set(all.map((p) => p.text)).size).toBe(all.length);
    let worst = 0;
    for (const s of SESSIONS) {
      const ps = all.filter((p) => p.s === s);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) worst = Math.max(worst, similarity(ps[i].text, ps[j].text));
    }
    expect(worst).toBeLessThan(0.8);
  });

  it('every page has 4 FAQs mentioning the city', () => {
    for (const s of SESSIONS)
      for (const c of CITIES) {
        const f = killzoneFaqs(killzoneModel(s, c, ctx), ctx);
        expect(f).toHaveLength(4);
        expect(f[0].q).toContain(c.name);
      }
  });
});

describe('rendered site', { timeout: 60_000 }, () => {
  const files = renderSite({ siteUrl: 'https://example.com/', islandSrc: '/assets/seo.js', buildIso: '2026-10-08T12:00:00Z' });
  const html = files.filter((f) => f.file.endsWith('.html'));

  it('renders all route families', () => {
    const paths = html.map((f) => f.file);
    expect(paths).toContain('killzone/london-open/london.html');
    expect(paths).toContain('killzone/new-york-am.html');
    expect(paths).toContain('killzone.html');
    expect(paths).toContain('market-hours/tokyo.html');
    expect(paths).toContain('market-hours.html');
    expect(paths).toContain('is-forex-market-open-now.html');
    expect(paths).toContain('404.html');
  });

  it('each page: one h1, self-canonical, valid JSON-LD with FAQ matching visible FAQ', () => {
    for (const f of html) {
      const path = '/' + f.file.replace(/\.html$/, '');
      expect(f.content.match(/<h1>/g), f.file).toHaveLength(1);
      expect(f.content).toContain(`<link rel="canonical" href="https://example.com${path}"/>`);
      const ld = [...f.content.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
      expect(ld).toHaveLength(1);
      const types = ld[0]['@graph'].map((g: { '@type': string }) => g['@type']);
      expect(types).toContain('WebApplication');
      const faq = ld[0]['@graph'].find((g: { '@type': string }) => g['@type'] === 'FAQPage');
      if (faq) for (const q of faq.mainEntity) expect(f.content, f.file).toContain(`<h3>${q.name.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')}</h3>`);
    }
  });

  it('sitemap lists every indexable page plus home; robots points at it', () => {
    const sm = files.find((f) => f.file === 'sitemap.xml')!.content;
    const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(html.length); // all pages minus 404, plus home
    expect(locs).toContain('https://example.com/');
    expect(locs).not.toContain('https://example.com/404');
    expect(files.find((f) => f.file === 'robots.txt')!.content).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('killzone pages link to sibling sessions, related cities and market hours', () => {
    const p = html.find((f) => f.file === 'killzone/london-open/frankfurt.html')!.content;
    expect(p).toContain('href="/killzone/new-york-am/frankfurt"');
    expect(p).toContain('href="/market-hours/frankfurt"');
    expect(p).toContain('href="/killzone/london-open/paris"');
    expect(p).toContain('href="/killzone/london-open"');
  });
});
