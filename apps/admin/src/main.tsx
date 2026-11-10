import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { z } from 'zod'

// Validation messages in Spanish (display only; the schema itself is unchanged).
z.config(z.locales.es())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
