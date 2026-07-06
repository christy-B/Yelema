import type { Account } from '../../account/contracts'
import accountsFixture from '../fixtures/accounts.json'

/**
 * Store partagé des profils : source unique du nom/fonction affichés partout
 * (page Compte, /auth/me → sidebar), pour rester cohérent après modification.
 */
const accounts = structuredClone(accountsFixture) as Record<string, Account>
const FALLBACK_USER_ID = 'u_12'

export function getAccountRecord(userId: string | undefined): Account {
  return accounts[userId ?? ''] ?? accounts[FALLBACK_USER_ID]
}

export function updateAccountRecord(userId: string, patch: Partial<Account>): Account {
  const current = getAccountRecord(userId)
  accounts[current.id] = { ...current, ...patch }
  return accounts[current.id]
}
