export async function enableApiMocks(): Promise<void> {
  // Actifs en dev (sauf désactivation), et en production uniquement en mode
  // démo explicite (VITE_ENABLE_MSW=true — ex. déploiement GitHub Pages).
  const demoMode = import.meta.env.VITE_ENABLE_MSW === 'true'
  const devMode = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== 'false'
  if (!demoMode && !devMode) {
    return
  }

  const { worker } = await import('./worker')
  await worker.start({
    onUnhandledRequest: 'warn',
    // Respecte le sous-chemin de déploiement (ex. /mon-repo/ sur GitHub Pages).
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
