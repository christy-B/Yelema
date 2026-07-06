import { Navigate, Outlet, useParams } from 'react-router'

import type { TenantCapability } from '../../shared/api/auth/contracts'
import { useSession } from '../providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from './paths'

/**
 * Garde d'accès par capacité (le front est le PDP). La sidebar masque déjà les
 * entrées non autorisées ; en accès direct par URL, on redirige vers l'accueil.
 * (Le cas « non connecté » est géré en amont par ProtectedRoute → login.)
 */
export function RequireCapability({ capability }: { capability: TenantCapability }) {
  const { session } = useSession()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()

  if (!session?.capabilities.includes(capability)) {
    return <Navigate to={paths.workspace(workspaceId)} replace />
  }

  return <Outlet />
}
