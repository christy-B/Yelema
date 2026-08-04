import { apiRequest } from '../../../shared/api/client/http-client'
import type { Workspace, WorkspaceBranding, WorkspaceNotifications } from './contracts'

/** DTO RÉEL de GET /workspace (control-plane, v1). */
interface RealWorkspace {
  id: string
  name: string
  legalName: string | null
  slug: string | null
  status: string
  hosting: string
  sector: string | null
  country: string | null
  plan: { key: string; name: string } | null
  branding: {
    logoUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
    buttonColor: string | null
    fontPrimaryColor: string | null
    fontSecondaryColor: string | null
    fontFamily: string | null
  }
  notifications: {
    digestFrequency: string | null
    alertEmail: string | null
    channels: string[]
  }
}

const HOSTINGS = ['cloud-public', 'hybride', 'on-prem-souverain'] as const
const FREQUENCIES = ['daily', 'weekly', 'none'] as const

function toWorkspace(real: RealWorkspace): Workspace {
  return {
    id: real.id,
    name: real.name,
    legalName: real.legalName,
    plan: real.plan?.name ?? real.plan?.key ?? '',
    hosting: HOSTINGS.find((value) => value === real.hosting) ?? 'cloud-public',
    sector: real.sector,
    country: real.country,
    branding: {
      logoUrl: real.branding?.logoUrl ?? null,
      primaryColor: real.branding?.primaryColor ?? null,
      secondaryColor: real.branding?.secondaryColor ?? null,
      buttonColor: real.branding?.buttonColor ?? null,
      fontPrimaryColor: real.branding?.fontPrimaryColor ?? null,
      fontSecondaryColor: real.branding?.fontSecondaryColor ?? null,
      fontFamily: real.branding?.fontFamily ?? null,
    },
    notifications: {
      digestFrequency: FREQUENCIES.find((value) => value === real.notifications?.digestFrequency) ?? null,
      alertEmail: real.notifications?.alertEmail ?? null,
      channels: real.notifications?.channels ?? [],
    },
  }
}

export async function getWorkspace(): Promise<Workspace> {
  return toWorkspace(await apiRequest<RealWorkspace>('/workspace'))
}

/**
 * PATCH /workspace n'accepte que `branding` et `notifications` : l'identité
 * de l'organisation (nom, formule, hébergement…) est gérée par Yelema.
 * Le logo n'est pas modifiable ici (POST /workspace/logo dédié) ; les couleurs
 * (hex) et la police (liste fermée) sont validées côté back.
 */
export async function updateWorkspaceSettings(payload: {
  branding: Omit<WorkspaceBranding, 'logoUrl'>
  notifications: WorkspaceNotifications
}): Promise<Workspace> {
  return toWorkspace(
    await apiRequest<RealWorkspace>('/workspace', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  )
}

export function updateWorkspaceLogo(file: File): Promise<{ logoUrl: string }> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest('/workspace/logo', { method: 'POST', body })
}
