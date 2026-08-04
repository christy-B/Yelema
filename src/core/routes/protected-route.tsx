import { Navigate, Outlet, useLocation, useParams } from 'react-router'

import { useSession } from '../../features/auth/providers/session-context'
import { paths } from './paths'

export function ProtectedRoute() {
  const { session, loading } = useSession()
  const location = useLocation()
  const { workspaceId } = useParams()

  if (loading) return <div className="route-loader">Chargement de votre espace…</div>
  if (!session) return <Navigate to={paths.login} replace state={{ from: location.pathname }} />

  // Le workspace de l'URL doit être celui de la session : sinon on redirige
  // vers la même page dans le bon workspace (URL erronée ou obsolète).
  if (workspaceId && workspaceId !== session.workspace.id) {
    const corrected = location.pathname.replace(`/espace-client/${workspaceId}`, `/espace-client/${session.workspace.id}`)
    return <Navigate to={corrected} replace />
  }

  return <Outlet />
}
