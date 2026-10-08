// Minimal static server for dist/ that mimics Vercel's cleanUrls (used by Lighthouse CI and local checks).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };

const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = path === '/' ? ['index.html'] : [path, `${path}.html`];
  for (const c of candidates) {
    const file = join(dist, c);
    if (file.startsWith(dist) && (await isFile(file))) {
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      return res.end(await readFile(file));
    }
  }
  res.writeHead(404, { 'content-type': types['.html'] });
  res.end(await readFile(join(dist, '404.html')).catch(() => 'Not found'));
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
