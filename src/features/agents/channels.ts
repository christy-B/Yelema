/**
 * Canaux sur lesquels un expert IA peut être déployé (joignable) : libellé
 * d'affichage + clé du logo de marque dans `assets/connectors/`. Source unique
 * partagée par le rail de l'expert et la demande de recrutement.
 */
export interface ChannelMeta {
  label: string
  /** Clé du logo (voir CONNECTOR_LOGOS) ; absent → repli sur une icône. */
  logo: string
  /** Qui le joint par ce canal — court, pour tenir sous le titre d'une tuile. */
  description: string
}

export const CHANNEL_META: Record<string, ChannelMeta> = {
  whatsapp: { label: 'WhatsApp', logo: 'whatsapp', description: 'Clients et équipes' },
  telegram: { label: 'Telegram', logo: 'telegram', description: 'Groupes et équipes' },
  email: { label: 'E-mail', logo: 'gmail', description: 'Adresse dédiée' },
  web: { label: 'Web', logo: 'web', description: 'Dans cet espace' },
}

/**
 * Ordre d'affichage canonique : le web (cet espace client) en premier — c'est le
 * canal disponible sans configuration, donc celui proposé par défaut.
 */
const CHANNEL_ORDER = ['web', 'whatsapp', 'telegram', 'email']
export const DEFAULT_CHANNEL = 'web'

const rank = (channel: string) => {
  const index = CHANNEL_ORDER.indexOf(channel)
  return index === -1 ? CHANNEL_ORDER.length : index
}

/** Canaux triés selon l'ordre canonique (les canaux inconnus passent en fin). */
export const orderChannels = (channels: string[]): string[] => [...channels].sort((a, b) => rank(a) - rank(b))

/** Libellé d'un canal ; repli sur la clé brute si le canal est inconnu. */
export const channelLabel = (channel: string): string => CHANNEL_META[channel]?.label ?? channel
