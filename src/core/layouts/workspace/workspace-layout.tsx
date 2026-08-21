import { BarChart3, ChevronDown, CircleHelp, CreditCard, FolderKanban, Grid2X2, Home, LogOut, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router'

import yelemaLogo from '../../../assets/brand/yelema_logo_final_long.svg'
import { can } from '../../../features/auth/api/permissions'
import { useSession } from '../../../features/auth/providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  /** Permission RBAC requise pour voir l'entrée (capacité + action). */
  permission?: { capability: string; action: string }
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const { session, signOut } = useSession()
  const navigation: NavigationItem[] = [
    { label: 'Experts', to: paths.workspace(workspaceId), icon: Home, end: true },
    { label: 'Mon équipe', to: paths.agents(workspaceId), icon: Grid2X2 },
    { label: 'Projets', to: paths.projects(workspaceId), icon: FolderKanban },
    { label: 'Facturation', to: paths.billing(workspaceId), icon: CreditCard, permission: { capability: 'invoices', action: 'view' } },
    { label: 'Membres', to: paths.members(workspaceId), icon: Users, permission: { capability: 'members', action: 'view' } },
    // Analytics : pas de capacité dédiée en v1 — alignée sur invoices·view.
    { label: 'Analytics', to: paths.analytics(workspaceId), icon: BarChart3, permission: { capability: 'invoices', action: 'view' } },
  ]
  const initials = session?.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)

  const handleLogout = async () => {
    await signOut()
    navigate(paths.login)
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <img className="sidebar-brand" src={yelemaLogo} alt="Yelema" />
        <NavLink className="workspace-selector" to={paths.workspaceSettings(workspaceId)}>
          <span className="workspace-mark">{session?.workspace.logoUrl ? <img src={session.workspace.logoUrl} alt="" /> : session?.workspace.name?.[0] ?? ''}</span>
          <span className="workspace-selector-copy"><strong>{session?.workspace.name}</strong><small>Organisation</small></span>
          <ChevronDown aria-hidden="true" size={16} />
        </NavLink>
        <nav className="sidebar-nav" aria-label="Navigation principale">
          {navigation.filter((item) => !item.permission || can(session, item.permission.capability, item.permission.action)).map(({ label, to, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
              <Icon aria-hidden="true" size={16} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to={paths.help(workspaceId)} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
            <CircleHelp aria-hidden="true" size={16} strokeWidth={1.8} /><span>Aide &amp; support</span>
          </NavLink>
          <div className="user-menu">
            <NavLink className="user-summary" to={paths.account(workspaceId)}>
              <span className="user-avatar">{initials}</span>
              <span><strong>{session?.user.name}</strong><small>{session?.user.title}</small></span>
            </NavLink>
            <button className="icon-action logout-action" type="button" onClick={handleLogout} aria-label="Se déconnecter"><LogOut aria-hidden="true" size={19} /></button>
          </div>
        </div>
      </aside>
      <main className="workspace-content"><Outlet /></main>
    </div>
  )
}
