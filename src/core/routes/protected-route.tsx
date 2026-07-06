import { Navigate, Outlet, useLocation } from 'react-router'

import { useSession } from '../providers/session-context'
import { paths } from './paths'

export function ProtectedRoute() {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) return <div className="route-loader">Chargement de votre espace…</div>
  if (!session) return <Navigate to={paths.login} replace state={{ from: location.pathname }} />
  return <Outlet />
}
