import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/monetization.css'
import { inject } from '@vercel/analytics'
import App from './App.tsx'
import { initAds } from './ads'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

inject()
initAds()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
