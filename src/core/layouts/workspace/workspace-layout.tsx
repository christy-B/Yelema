import { BarChart3, ChevronDown, CircleHelp, CreditCard, Folder, Grid2X2, Home, LogOut, MessageSquareText, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router'

import type { TenantCapability } from '../../../shared/api/auth/contracts'
import { useSession } from '../../providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  capability?: TenantCapability
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const { session, signOut } = useSession()
  const navigation: NavigationItem[] = [
    { label: 'Accueil', to: paths.workspace(workspaceId), icon: Home, end: true },
    { label: 'Agents', to: paths.agents(workspaceId), icon: Grid2X2 },
    { label: 'Conversations', to: paths.conversations(workspaceId), icon: MessageSquareText },
    { label: 'Fichiers', to: paths.files(workspaceId), icon: Folder },
    { label: 'Facturation', to: paths.billing(workspaceId), icon: CreditCard, capability: 'billing' },
    { label: 'Membres', to: paths.members(workspaceId), icon: Users, capability: 'members' },
    { label: 'Analytics', to: paths.analytics(workspaceId), icon: BarChart3, capability: 'analytics' },
  ]
  const initials = session?.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)

  const handleLogout = async () => {
    await signOut()
    navigate(paths.login)
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <NavLink className="workspace-selector" to={paths.workspaceSettings(workspaceId)}>
          <span className="workspace-mark">M</span>
          <span className="workspace-selector-copy"><strong>{session?.workspace.name}</strong><small>Organisation</small></span>
          <ChevronDown aria-hidden="true" size={16} />
        </NavLink>
        <nav className="sidebar-nav" aria-label="Navigation principale">
          {navigation.filter((item) => !item.capability || session?.capabilities.includes(item.capability)).map(({ label, to, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
              <Icon aria-hidden="true" size={20} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to={paths.help(workspaceId)} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
            <CircleHelp aria-hidden="true" size={20} strokeWidth={1.8} /><span>Aide &amp; support</span>
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
