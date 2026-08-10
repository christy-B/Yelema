/**
 * Boîte d'envoi de démonstration.
 *
 * Il n'y a pas de serveur de courriel derrière l'espace client, et il n'y en
 * aura pas : l'envoi appartient au control-plane. Pour pouvoir dérouler le
 * parcours en entier — inviter quelqu'un, recevoir son lien, activer le compte
 * — les messages que la plateforme *aurait* envoyés sont empilés ici et
 * relevés dans la console de démonstration.
 *
 * Ce module ne fait pas partie du produit : il disparaît le jour où le
 * control-plane envoie de vrais courriels.
 */
export type DemoMessageKind = 'activation' | 'invitation' | 'reset'

export interface DemoMessage {
  id: string
  kind: DemoMessageKind
  /** Destinataire — l'adresse à qui la plateforme aurait écrit. */
  to: string
  toName: string
  subject: string
  body: string
  /** Chemin interne à ouvrir, jeton compris. */
  link: string
  sentAt: string
}

/**
 * Persistée comme les comptes provisionnés : ouvrir un lien d'activation
 * recharge la page, et une boîte vidée au retour n'aurait aucun sens.
 */
const STORAGE_KEY = 'yelema.demo.outbox.v1'

function read(): DemoMessage[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as DemoMessage[] | null
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function write(messages: DemoMessage[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch { /* stockage indisponible */ }
}

const outbox: DemoMessage[] = read()

/** Dépose un message. Le plus récent est toujours en tête. */
export function deliver(message: Omit<DemoMessage, 'id' | 'sentAt'>): DemoMessage {
  const full: DemoMessage = { ...message, id: crypto.randomUUID(), sentAt: new Date().toISOString() }
  outbox.unshift(full)
  write(outbox)
  return full
}

export function listMessages(): DemoMessage[] {
  return [...outbox]
}

export function clearMessages(): void {
  outbox.length = 0
  write(outbox)
}
