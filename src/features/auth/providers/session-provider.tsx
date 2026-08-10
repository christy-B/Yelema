import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { getSession, logout as logoutRequest } from '../api/api'
import type { Session } from '../api/contracts'
import { getAuthToken, setAuthToken } from '../../../shared/api/client/http-client'
import { loadProtectedMedia } from '../../../shared/api/client/media'
import { getWorkspace } from '../../workspace/api/api'
import { applyBranding, resetBranding } from '../../workspace/branding'
import { SessionContext } from './session-context'

/**
 * Charge la session puis le branding du tenant (couleurs, police, logo) et
 * l'applique à l'interface. Le branding ne bloque jamais la session : en cas
 * d'échec, la charte Yelema par défaut reste en place.
 */
async function loadSessionWithBranding(): Promise<Session> {
  const session = await getSession()
  try {
    const workspace = await getWorkspace()
    applyBranding(workspace.branding)
    session.workspace.legalName = workspace.legalName
    session.workspace.sector = workspace.sector
    session.workspace.country = workspace.country
    // Le média est protégé (Authorization requis) : on le convertit en URL
    // blob affichable par une balise <img>.
    session.workspace.logoUrl = (await loadProtectedMedia(workspace.branding.logoUrl)) ?? undefined
  } catch {
    resetBranding()
  }
  return session
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(getAuthToken()))

  const refreshSession = useCallback(async () => {
    if (!getAuthToken()) {
      setSession(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setSession(await loadSessionWithBranding())
    } catch {
      setAuthToken(null)
      setSession(null)
      resetBranding()
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setAuthToken(null)
      setSession(null)
      resetBranding()
    }
  }, [])

  useEffect(() => {
    if (!getAuthToken()) return
    void loadSessionWithBranding().then(setSession).catch(() => {
      setAuthToken(null)
      setSession(null)
      resetBranding()
    }).finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({ session, loading, refreshSession, signOut }), [session, loading, refreshSession, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
