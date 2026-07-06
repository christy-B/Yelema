import { RefreshCw } from 'lucide-react'

import { Button } from '../button/button'

/** État d'erreur de chargement uniforme (réseau/API indisponible). */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      <strong>Impossible de charger ces informations</strong>
      <span>Vérifiez votre connexion, puis réessayez.</span>
      <Button variant="tertiary" size="small" leadingIcon={<RefreshCw size={15} />} onClick={onRetry}>Réessayer</Button>
    </div>
  )
}
