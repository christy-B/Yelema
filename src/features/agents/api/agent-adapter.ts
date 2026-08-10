import catalogueJson from './catalogue.json'
import type { AgentConnector, AgentDetail, AgentSkill, AgentSummary, AgentUsecase, Metier, ToolType } from './contracts'

/**
 * Payload RÉEL renvoyé par GET /agents et GET /agents/{id} (control-plane, v1).
 * Volontairement pauvre côté back (MVP) : la fiche riche n'existe pas encore.
 */
export interface RealAgent {
  id: string
  displayName: string
  type: ToolType
  suite: { key: string; label: string; icon: string | null } | null
  /** Grand groupe de métier, qui rassemble plusieurs experts. Sert aux filtres. */
  group?: { key: string; label: string } | null
  channels: string[]
  sovereignCapable: boolean
  /** Descriptif court (fourni par le roster/back). */
  description?: string
  /** Portrait de l'agent — pas encore fourni par le back (photo bundlée en attendant). */
  avatarUrl?: string | null
}

// Photos d'experts déposées dans assets/avatars/ nommées d'après l'expert
// (ex. kouassi.jpg). Résolues en URL par Vite ; affichées si présentes.
const PHOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../../../assets/avatars/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
    .map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url]),
)

function slug(name: string): string {
  return name.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Photo de l'expert par nom (kouassi → kouassi.jpg), sinon celle fournie par le back. */
function photoOf(agent: RealAgent): string | null {
  return PHOTOS[slug(agent.displayName)] ?? agent.avatarUrl ?? null
}

/**
 * Fiche = payload réel + FUTUR CONTRAT « employé IA » (description + skills),
 * aujourd'hui greffé par le handler MSW hybride en attendant le back.
 */
export interface RealAgentDetail extends RealAgent {
  description?: string
  gender?: 'f' | 'm'
  fonction?: string
  daily?: string[]
  usecase?: AgentUsecase
  skills?: AgentSkill[]
  connectors?: AgentConnector[]
  /** « Soumis à votre accord » — actions exigeant une validation humaine. */
  approvals?: string[]
}

/** Fiche du catalogue de démo — sert d'enrichissement visuel (icône, description courte, tags). */
interface CatalogueEntry {
  name: string
  icon?: string
  description?: string
  tags?: string[]
  long?: string
}

const catalogue = catalogueJson as CatalogueEntry[]

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('fr')
}

/**
 * Enrichissement : si un agent réel porte le même nom qu'une fiche du
 * catalogue de démo, on réutilise sa fiche riche. Sinon, repli honnête sur
 * les seules données réelles (pas de contenu inventé).
 */
function findCatalogueEntry(displayName: string): CatalogueEntry | undefined {
  return catalogue.find((entry) => normalize(entry.name) === normalize(displayName))
}

export function toAgentSummary(agent: RealAgent): AgentSummary {
  const entry = findCatalogueEntry(agent.displayName)
  return {
    id: agent.id,
    name: agent.displayName,
    type: agent.type,
    icon: entry?.icon ?? agent.suite?.icon ?? 'sparkles',
    description: agent.description ?? entry?.description ?? '',
    tags: entry?.tags ?? (agent.suite ? [agent.suite.label] : []),
    group: agent.group ? { key: agent.group.key, name: agent.group.label } : null,
    channels: agent.channels ?? [],
    avatarUrl: photoOf(agent),
  }
}

/**
 * Modèle « employé IA » : les inputs et outputs de la fiche ne sont jamais
 * saisis à plat — ils sont DÉRIVÉS des skills rattachés.
 */
export function toAgentDetail(agent: RealAgentDetail): AgentDetail {
  const entry = findCatalogueEntry(agent.displayName)
  const skills = agent.skills ?? []
  return {
    ...toAgentSummary(agent),
    gender: agent.gender ?? 'm',
    long: agent.description || entry?.long || '',
    fonction: agent.fonction ?? '',
    daily: agent.daily ?? [],
    usecase: agent.usecase ?? { enAction: '', valeur: '', conversation: [] },
    skills,
    inputs: [...new Set(skills.flatMap((skill) => skill.inputs))],
    produces: skills.flatMap((skill) => skill.outputs.map((output) => ({ format: skill.label, title: output }))),
    connectors: agent.connectors ?? [],
    approvals: agent.approvals ?? [],
  }
}

/**
 * L'API v1 n'a pas de route /metiers : les métiers sont dérivés des suites
 * portées par les agents accessibles au membre.
 */
export function deriveMetiers(agents: RealAgent[]): Metier[] {
  // Regroupement par GRAND GROUPE de métier : un filtre doit rassembler
  // plusieurs experts. Le métier, lui, reste propre à chacun et s'affiche sur
  // sa carte. Sans groupe fourni, on retombe sur la suite.
  const byGroup = new Map<string, Metier>()
  for (const agent of agents) {
    const key = agent.group?.key ?? agent.suite?.key ?? 'autres'
    const name = agent.group?.label ?? agent.suite?.label ?? 'Autres'
    const group = byGroup.get(key) ?? { id: key, name, agentIds: [] }
    group.agentIds.push(agent.id)
    byGroup.set(key, group)
  }
  return [...byGroup.values()]
}
