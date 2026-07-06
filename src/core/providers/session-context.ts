import { createContext, useContext } from 'react'

import type { Session } from '../../shared/api/auth/contracts'

export interface SessionContextValue {
  session: Session | null
  loading: boolean
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession doit être utilisé dans SessionProvider.')
  return context
}
