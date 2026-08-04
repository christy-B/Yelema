import { Navigate, Outlet, useParams } from 'react-router'

import { can } from '../../features/auth/api/permissions'
import { useSession } from '../../features/auth/providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from './paths'

/**
 * Garde d'accès par permission RBAC (capacité + action). La sidebar masque
 * déjà les entrées non autorisées ; en accès direct par URL, on redirige vers
 * l'accueil. (Le cas « non connecté » est géré en amont par ProtectedRoute.)
 */
export function RequireCapability({ capability, action = 'view' }: { capability: string; action?: string }) {
  const { session } = useSession()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()

  if (!can(session, capability, action)) {
    return <Navigate to={paths.workspace(workspaceId)} replace />
  }

  return <Outlet />
}
