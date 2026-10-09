// Renders the static SEO pages into dist/ after `vite build` and `vite build --ssr`.
//   SITE_URL   canonical origin (default: src/config/site.ts DEFAULT_SITE_URL)
//   BUILD_DATE ISO date the schedule tables start from (default: now)
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const { renderSite, DEFAULT_SITE_URL } = await import(pathToFileURL(join(root, 'dist-ssr', 'render.js')).href);
const manifest = JSON.parse(await readFile(join(dist, '.vite', 'manifest.json'), 'utf8'));
const island = manifest['src/islands/seo.ts'];
if (!island) throw new Error('island entry missing from Vite manifest');

const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const files = renderSite({
  siteUrl,
  islandSrc: `/${island.file}`,
  buildIso: process.env.BUILD_DATE || new Date().toISOString(),
});

for (const f of files) {
  const out = join(dist, f.file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, f.content);
}

// Home page: keep its canonical/OG origin in sync with SITE_URL.
const indexPath = join(dist, 'index.html');
const index = await readFile(indexPath, 'utf8');
await writeFile(indexPath, index.replaceAll(DEFAULT_SITE_URL, siteUrl));

// The manifest is a build artefact, not something to serve publicly.
await rm(join(dist, '.vite'), { recursive: true, force: true });

console.log(`prerendered ${files.length} files for ${siteUrl}`);
