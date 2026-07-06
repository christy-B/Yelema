import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { getSession, logout as logoutRequest } from '../../shared/api/auth/api'
import type { Session } from '../../shared/api/auth/contracts'
import { getAuthToken, setAuthToken } from '../../shared/api/client/http-client'
import { SessionContext } from './session-context'

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
      setSession(await getSession())
    } catch {
      setAuthToken(null)
      setSession(null)
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
    }
  }, [])

  useEffect(() => {
    if (!getAuthToken()) return
    void getSession().then(setSession).catch(() => {
      setAuthToken(null)
      setSession(null)
    }).finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({ session, loading, refreshSession, signOut }), [session, loading, refreshSession, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
