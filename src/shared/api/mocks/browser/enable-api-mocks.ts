export async function enableApiMocks(): Promise<void> {
  // Cette copie autonome n'a PAS de back : les mocks doivent donc tourner aussi
  // en production, contrairement au monorepo où ils ne servent qu'en
  // développement. Sans cela, le site déployé reçoit index.html à la place du
  // JSON attendu — d'où « Unexpected token '<' » au premier appel.
  const demoMode = import.meta.env.VITE_ENABLE_MSW === 'true'
  const devMode = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== 'false'
  if (!demoMode && !devMode) {
    return
  }

  const { worker } = await import('./worker')
  await worker.start({
    // Toute l'API v1 est servie ici : une route oubliée doit s'entendre.
    onUnhandledRequest: 'warn',
    // Respecte le sous-chemin de déploiement (ex. /mon-repo/ sur GitHub Pages).
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
