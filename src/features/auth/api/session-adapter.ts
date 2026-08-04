import type { Session, SessionPermission } from './contracts'

/**
 * Formes RÉELLES renvoyées par l'API v1 du control-plane (GET /auth/me).
 * La matrice de permissions du rôle est conservée telle quelle dans la
 * session : chaque affichage/action se teste avec can(capacité, action).
 */
export interface MePermission {
  capability: string
  actions: string[]
}

export interface MeResponse {
  user: {
    id: string
    name: string
    email: string
    status: string
    isFirstAdmin?: boolean
    avatarUrl?: string | null
  }
  workspace: {
    id: string
    name: string
    slug?: string
    hosting?: string
    logoUrl?: string | null
    plan?: { key: string; name?: string } | null
  }
  role: {
    key: string
    name: string
    permissions: MePermission[]
  } | null
  entitledAgents?: string[]
}

const HOSTINGS = ['cloud-public', 'hybride', 'on-prem-souverain'] as const

export function toSession(me: MeResponse, jobTitle: string): Session {
  const hosting = HOSTINGS.find((value) => value === me.workspace.hosting) ?? 'cloud-public'

  return {
    user: {
      id: me.user.id,
      name: me.user.name,
      title: jobTitle,
      email: me.user.email,
      language: 'fr',
      avatarUrl: me.user.avatarUrl ?? undefined,
    },
    workspace: {
      id: me.workspace.id,
      name: me.workspace.name,
      domain: me.user.email.split('@')[1] ?? '',
      plan: me.workspace.plan?.name ?? me.workspace.plan?.key ?? '',
      hosting,
      logoUrl: me.workspace.logoUrl ?? undefined,
    },
    permissions: (me.role?.permissions ?? []) as SessionPermission[],
  }
}
