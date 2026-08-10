export async function enableApiMocks(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'false') {
    return
  }

  const { worker } = await import('./worker')
  // Le control-plane n'est plus branché : TOUTE l'API v1 est servie ici. Une
  // route oubliée doit donc s'entendre — `warn` la signale dans la console au
  // lieu de la laisser partir dans le vide comme le faisait `bypass`.
  await worker.start({ onUnhandledRequest: 'warn' })
}
