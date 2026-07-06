import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { enableApiMocks } from './shared/api/mocks/browser/enable-api-mocks'
import './styles/global.css'

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error("L’élément racine #root est introuvable.")
  }

  await enableApiMocks()

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
