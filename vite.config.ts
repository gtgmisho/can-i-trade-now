import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only: serve /api/news with sample events (the real one is a Vercel function)
function mockNews(): Plugin {
  return {
    name: 'mock-news',
    configureServer(server) {
      server.middlewares.use('/api/news', (_req, res) => {
        const now = process.env.MOCK_NOW ? Date.parse(process.env.MOCK_NOW) : Date.now()
        const at = (min: number) => new Date(now + min * 60_000).toISOString()
        const events = [
          { title: 'CPI m/m', country: 'USD', date: at(-3), impact: 'High', forecast: '0.3%', previous: '0.2%' },
          { title: 'German Flash PMI', country: 'EUR', date: at(95), impact: 'High', forecast: '49.8', previous: '49.1' },
          { title: 'BoE Gov Speaks', country: 'GBP', date: at(240), impact: 'High' },
          { title: 'Unemployment Claims', country: 'USD', date: at(420), impact: 'Medium' },
          { title: 'Tankan', country: 'JPY', date: at(600), impact: 'High' },
        ]
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ events }))
      })
    },
  }
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), mockNews()],
  build: isSsrBuild
    ? { outDir: 'dist-ssr', emptyOutDir: true }
    : {
        // manifest lets scripts/prerender.mjs find the hashed island bundle for the static SEO pages
        manifest: true,
        rolldownOptions: {
          input: { main: 'index.html', seo: 'src/islands/seo.ts' },
        },
      },
}))
