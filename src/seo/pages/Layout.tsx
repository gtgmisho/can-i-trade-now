import type { ReactNode } from 'react';
import { SITE_NAME } from '../../config/site';
import { KZ_INDEX, MH_INDEX, OPEN_NOW } from '../routes';
import type { Faq } from '../content';

export interface Crumb {
  name: string;
  path: string;
}

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** short headline + subline for the generated OG image */
  og: { title: string; sub: string };
  crumbs: Crumb[];
  faqs?: Faq[];
  /** extra JSON-LD nodes */
  jsonLd?: object[];
  noindex?: boolean;
}

export interface RenderEnv {
  siteUrl: string;
  /** hashed island script path from the Vite manifest */
  islandSrc: string;
  css: string;
  build: { iso: string; human: string };
  /** Vercel Analytics is loaded by the island; nothing else to configure here */
}

const abs = (env: RenderEnv, p: string) => `${env.siteUrl}${p === '/' ? '/' : p}`;

export function ogImage(env: RenderEnv, og: PageMeta['og']) {
  const q = new URLSearchParams({ title: og.title, sub: og.sub });
  return `${env.siteUrl}/api/og?${q.toString()}`;
}

export function jsonLd(env: RenderEnv, meta: PageMeta): object {
  const url = abs(env, meta.path);
  const graph: object[] = [
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript for the live countdown',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: meta.description,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: meta.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(env, c.path) })),
    },
    ...(meta.jsonLd ?? []),
  ];
  if (meta.faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: meta.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** JSON inside <script>: escape "<" so content can never close the tag. */
const safeJson = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c');

export function Document({ env, meta, children }: { env: RenderEnv; meta: PageMeta; children: ReactNode }) {
  const url = abs(env, meta.path);
  const img = ogImage(env, meta.og);
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={url} />
        {meta.noindex ? <meta name="robots" content="noindex" /> : null}
        <meta name="theme-color" content="#0a0d12" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={img} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={img} />
        <style dangerouslySetInnerHTML={{ __html: env.css }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(jsonLd(env, meta)) }} />
        <script type="module" src={env.islandSrc} />
      </head>
      <body>
        <header className="nav">
          <a className="nav-brand" href="/">
            <img src="/icon.svg" width="28" height="28" alt="" />
            <span>{SITE_NAME}</span>
          </a>
          <nav aria-label="Main">
            <a href="/">Live clock</a>
            <a href={KZ_INDEX}>Killzones</a>
            <a href={MH_INDEX}>Market hours</a>
            <a href={OPEN_NOW}>Open now?</a>
          </nav>
        </header>
        <main className="page">
          <Breadcrumbs crumbs={meta.crumbs} />
          {children}
        </main>
        <footer className="foot">
          <p>
            Killzone times follow ICT&apos;s New York-based schedule. Local times are computed from the IANA time zone database and
            account for daylight saving in both New York and each city. Schedule generated {env.build.human}.
          </p>
          <p className="dim">Educational tool, not financial advice. Trading carries a high risk of loss.</p>
        </footer>
      </body>
    </html>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((c, i) => (
          <li key={c.path}>{i === crumbs.length - 1 ? <span aria-current="page">{c.name}</span> : <a href={c.path}>{c.name}</a>}</li>
        ))}
      </ol>
    </nav>
  );
}

export function FaqBlock({ faqs, heading = 'FAQ' }: { faqs: Faq[]; heading?: string }) {
  return (
    <section className="faq" id="faq">
      <h2>{heading}</h2>
      {faqs.map((f) => (
        <div key={f.q} className="faq-item">
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
    </section>
  );
}

/** Server-rendered shell for the live widget; the island fills the data-r slots. Heights are fixed in CSS (no CLS). */
export function LiveCard(props: { kind: 'killzone' | 'market'; tz: string; place: string; defId?: string; fallback: string }) {
  return (
    <section className="live" data-live={props.kind} data-tz={props.tz} data-place={props.place} data-def={props.defId} aria-live="polite">
      <div className="live-top">
        <span className="live-badge" data-r="badge">
          Live
        </span>
        <span className="live-clock">
          <span data-r="clocklbl">{props.tz === 'auto' ? 'Your time' : `${props.place} time`}</span> <b data-r="clock">--:--:--</b>
        </span>
      </div>
      <div className="live-cd">
        <span className="lbl" data-r="cdlbl">
          &nbsp;
        </span>
        <span className="cd" data-r="cd">
          --:--:--
        </span>
      </div>
      <p className="live-sub" data-r="sub">
        {props.fallback}
      </p>
      <p className="live-you" data-r="you">
        &nbsp;
      </p>
    </section>
  );
}
