import { renderToStaticMarkup } from 'react-dom/server';
import { DateTime } from 'luxon';
import css from './seo.css?inline';
import monetizationCss from '../components/monetization.css?inline';
import { CITIES } from './data/cities';
import { SESSIONS } from './data/sessions';
import { scheduleRange } from './times';
import type { Ctx } from './content';
import { Document, type RenderEnv } from './pages/Layout';
import {
  killzoneCityPage,
  killzoneIndexPage,
  marketHoursCityPage,
  marketHoursIndexPage,
  notFoundPage,
  openNowPage,
  sessionHubPage,
  type Page,
} from './pages/pages';

export interface RenderInput {
  siteUrl: string;
  islandSrc: string;
  /** ISO timestamp the schedule tables are computed from */
  buildIso: string;
}

export interface RenderedFile {
  /** path relative to the output dir */
  file: string;
  content: string;
}

export function allPages(ctx: Ctx): Page[] {
  return [
    killzoneIndexPage(ctx),
    ...SESSIONS.map((s) => sessionHubPage(s, ctx)),
    ...SESSIONS.flatMap((s) => CITIES.map((c) => killzoneCityPage(s, c, ctx))),
    marketHoursIndexPage(ctx),
    ...CITIES.map((c) => marketHoursCityPage(c, ctx)),
    openNowPage(),
    notFoundPage(),
  ];
}

export function makeCtx(buildIso: string): Ctx {
  const build = DateTime.fromISO(buildIso, { zone: 'utc' });
  return { build, ...scheduleRange(build) };
}

export function renderSite(input: RenderInput): RenderedFile[] {
  const siteUrl = input.siteUrl.replace(/\/$/, '');
  const ctx = makeCtx(input.buildIso);
  const env: RenderEnv = {
    siteUrl,
    islandSrc: input.islandSrc,
    css: monetizationCss + css,
    build: { iso: ctx.build.toISODate()!, human: ctx.build.toFormat('d LLLL yyyy') },
  };
  const pages = allPages(ctx);
  const files: RenderedFile[] = pages.map((p) => ({
    file: `${p.meta.path.slice(1)}.html`,
    content: '<!doctype html>' + renderToStaticMarkup(<Document env={env} meta={p.meta}>{p.body}</Document>),
  }));

  const urls = ['/', ...pages.filter((p) => !p.meta.noindex).map((p) => p.meta.path)];
  const lastmod = env.build.iso;
  files.push({
    file: 'sitemap.xml',
    content:
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map((u) => `  <url><loc>${siteUrl}${u}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n') +
      '\n</urlset>\n',
  });
  files.push({
    file: 'robots.txt',
    // /api/og must stay crawlable: social crawlers (e.g. Twitterbot) honour robots.txt when fetching og:image.
    content: `User-agent: *\nAllow: /\nDisallow: /api/news\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  });
  return files;
}
export { DEFAULT_SITE_URL } from '../config/site';
