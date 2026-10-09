# Can I Trade Now? — ICT killzone clock

Live ICT killzone / news-lock clock (React SPA at `/`) plus ~285 statically pre-rendered SEO pages.

## Stack

- **Vite 8 + React 19 + TypeScript**, Luxon for all time math (IANA tz data → DST handled per city).
- **Vercel**: static `dist/` + functions in `api/` (`news.ts` ForexFactory proxy, `og.ts` OG images via `@vercel/og`).
- **Static SEO pages**: React components rendered to HTML at build time (no SSR at runtime). A ~1.4 kB
  island (`src/islands/seo.ts`) drives the live countdowns; CSS is inlined so pages have no render-blocking requests.

## Routes

| Route | Count | Source |
| --- | --- | --- |
| `/` | 1 | SPA (`index.html`, `src/App.tsx`) |
| `/killzone`, `/killzone/[session]` | 1 + 5 | `src/seo/pages/pages.tsx` |
| `/killzone/[session]/[city]` | 5 × 46 | ” |
| `/market-hours`, `/market-hours/[city]` | 1 + 46 | ” |
| `/is-forex-market-open-now` | 1 | ” |
| `sitemap.xml`, `robots.txt`, `404.html` | — | `src/seo/render.tsx` |

Cities: `src/seo/data/cities.ts` · Sessions/copy: `src/seo/data/sessions.ts` · Session times: `src/lib/windows.ts` (single source of truth).

## Build

```sh
npm run build   # tsc → vite build (SPA + island) → vite build --ssr (renderer) → scripts/prerender.mjs
npm test        # vitest, incl. DST edge cases and content-quality checks
npm run lighthouse  # Lighthouse CI against dist/ (budgets in lighthouserc.json); set CHROME_PATH if needed
```

Env vars at build time:

- `SITE_URL` – canonical origin for canonical tags, sitemap, robots and OG (default `https://can-i-trade-now.vercel.app`).
  **Set this in Vercel once you add a custom domain.**
- `BUILD_DATE` – optional ISO date the 12-month DST tables start from (default: now).

The pages print a 12-month DST schedule computed at build time. `.github/workflows/monthly-rebuild.yml` triggers a
monthly redeploy if you add a Vercel Deploy Hook URL as the `VERCEL_DEPLOY_HOOK_URL` repo secret.

## Monetization (placeholders — fill in yourself)

- **Ads**: `src/config/ads.ts`. `mode: 'off'` (default) renders nothing; `'placeholder'` shows labelled boxes;
  `'live'` renders empty, height-reserved containers (`<aside class="ad-slot" data-slot=…>`) for your network's script.
  Add the network script/`ads.txt` when approved.
- **Affiliate CTA**: `src/config/affiliates.ts`. Renders only when `enabled: true` and `url` is an `https://` link.
  Replace every `TODO` with partner-approved copy and the partner's required risk warning.

## Analytics

Vercel Web Analytics (`@vercel/analytics`, cookieless) is injected on the SPA and all static pages.
Enable it in Vercel → Project → Analytics.
