import { http, HttpResponse } from 'msw'

import { ROSTER, type RosterExpert } from '../../../../features/agents/roster'
import { AVATAR_AXES, DEFAULT_PROFILE, getProfile, PORTRAIT_CROPS, setProfile, type ProfileSettings } from '../stores/agent-profile.store'
import { queueOpening } from '../stores/recruitment.store'
import { addToTeam, isInTeam } from '../stores/team.store'
import { agentActivityBrief } from './conversation.handlers'
import { API_BASE, getAuthenticatedUser, notFound, requireAuth, validationError } from './helpers'

// Provider (clé du logo) dérivé du nom d'affichage de l'intégration.
/** Longueurs maximales des champs de personnalité — miroir du contrat. */
const PERSONALITY_TRAITS = ['rigoureux', 'pedagogue', 'synthetique', 'proactif', 'prudent', 'diplomate', 'perseverant', 'curieux']
const PERSONALITY_TRAITS_MAX = 4

const providerSlug = (name: string) => name.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * EXPERTS IA — roster mock servi sur /agents (décoré du back en attendant le
 * modèle « expert IA » côté control-plane). Forme alignée sur le DTO réel
 * (id, displayName, type, suite, channels…) + description/skills pour la fiche.
 * À retirer quand le back exposera les experts nommés.
 */
const AGENT_TYPES = [
  { value: 'dust-agent', label: 'Agent Dust' },
  { value: 'native-agent', label: 'Agent natif' },
  { value: 'n8n-workflow', label: 'Workflow n8n' },
  { value: 'openclaw', label: 'OpenClaw' },
]

/**
 * Experts rattachés à l'organisation (son équipe). Les autres experts du
 * catalogue Yelema relèvent de la marketplace : l'organisation peut demander à
 * les recruter. Ce rattachement est un état d'organisation, pas une propriété
 * de l'expert — il viendra du control-plane (plan souscrit).
 */

/** Demandes d'experts sur mesure, en mémoire le temps de la démonstration. */
const EXPERT_REQUESTS: Record<string, unknown>[] = []

const teamAgents = () => ROSTER.filter((expert) => isInTeam(expert.id))
/**
 * Les experts que l'organisation a recrutes. Le chef de projet n'en fait pas
 * partie : il vient avec les projets, on ne le recrute pas et on ne l'affecte
 * pas a une tache. Sa fiche reste consultable par son identifiant.
 */
const listedAgents = () => teamAgents().filter((expert) => expert.role !== 'orchestrator')
const marketplaceAgents = () => ROSTER.filter((expert) => !isInTeam(expert.id) && expert.role !== 'orchestrator')


// Réglages par expert : magasin partagé avec /agents/:id/resources.
const TONES = ['direct', 'chaleureux', 'formel']
const LANGUAGES = ['fr', 'en', 'bilingue']
const DETAILS = ['court', 'standard', 'detaille']

function toListDto(expert: RosterExpert) {
  return {
    id: expert.id,
    displayName: expert.name,
    type: expert.type,
    suite: { key: expert.metierKey, label: expert.metier, icon: null },
    // Grand groupe de métier : c'est lui qui alimente les filtres du catalogue.
    group: { key: expert.groupKey, label: expert.group },
    channels: expert.channels,
    sovereignCapable: true,
    // Hors service, il ne repond plus : la carte doit pouvoir le dire sans
    // charger le profil de chacun.
    active: getProfile(expert.id).active,
    description: expert.description,
    /**
     * De quoi rendre l'expert trouvable quand on decrit un besoin plutot
     * qu'on cite un nom. Le nom, le metier et l'accroche ne suffisent pas :
     * « relancer mes impayes » n'y figure nulle part, alors que c'est le
     * quotidien de l'expert.
     */
    keywords: [
      expert.metier,
      expert.group,
      expert.fonction,
      ...expert.daily,
      ...expert.skills.flatMap((skill) => [skill.label, skill.description]),
      ...expert.connectors,
      ...expert.approvals,
      // Le cas d'usage est la partie la plus riche de la fiche : c'est le seul
      // endroit ou le vocabulaire du client apparait tel qu'il le dit — un
      // devis, un impaye, un comite de credit. L'ecarter privait la recherche
      // de sa meilleure source.
      expert.usecase.enAction,
      expert.usecase.valeur,
      ...expert.usecase.conversation.map((turn) => turn.text),
    ],
  }
}

/** Fiche complète : connecteurs = intégrations (nom d'affichage → provider slugifié pour le logo). */
function toDetailDto(expert: RosterExpert) {
  return {
    ...toListDto(expert),
    gender: expert.gender,
    fonction: expert.fonction,
    daily: expert.daily,
    usecase: expert.usecase,
    skills: expert.skills,
    approvals: expert.approvals,
    connectors: expert.connectors.map((name) => ({ provider: providerSlug(name), name })),
  }
}

export const agentHandlers = [
  http.get(`${API_BASE}/agents`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    // Chaque expert de l'equipe porte son brief d'activite : la carte
    // l'affiche sans avoir a charger les taches de tout le monde.
    const currentUser = await getAuthenticatedUser(request)
    return HttpResponse.json(listedAgents().map((expert) => ({
      ...toListDto(expert),
      activity: currentUser ? agentActivityBrief(expert.id, currentUser) : null,
    })))
  }),

  /**
   * Demande d'un expert SUR MESURE — un métier que le catalogue ne couvre pas
   * encore. Ce n'est pas un recrutement : rien ne rejoint l'équipe, la demande
   * part au cadrage. Elle est enregistrée telle quelle, le back décidera de son
   * cheminement (revue, devis, création d'un expert).
   */
  http.post(`${API_BASE}/agents/requests`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const currentUser = await getAuthenticatedUser(request)
    const body = (await request.json()) as { need?: string; metier?: string; dataKinds?: unknown }
    const need = body.need?.trim()
    const metier = body.metier?.trim()
    const texte = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
    const dataKinds = texte(body.dataKinds)
    if (!need) return validationError('Décrivez le besoin auquel cet expert doit répondre.')
    if (need.length > 2000) return validationError('La description ne peut pas dépasser 2000 caractères.')
    // Le métier et la nature des données conditionnent la faisabilité : sans
    // eux le cadrage recommence à zéro par un échange avec le client.
    if (!metier) return validationError('Indiquez le métier concerné.')
    if (dataKinds.length === 0) return validationError('Indiquez sur quelles données cet expert travaillera.')

    const created = {
      id: `req_${crypto.randomUUID().slice(0, 8)}`,
      need,
      metier,
      dataKinds,
      status: 'received',
      requestedBy: currentUser?.email ?? null,
      createdAt: new Date().toISOString(),
    }
    EXPERT_REQUESTS.unshift(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get(`${API_BASE}/agents/requests`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    return unauthorized ?? HttpResponse.json(EXPERT_REQUESTS)
  }),

  http.get(`${API_BASE}/agents/types`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    return unauthorized ?? HttpResponse.json(AGENT_TYPES)
  }),

  // Marketplace : experts du catalogue non encore rattachés à l'organisation.
  // Déclaré avant /agents/:id pour ne pas être capté par le paramètre d'id.
  http.get(`${API_BASE}/agents/marketplace`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    return HttpResponse.json(marketplaceAgents().map(toListDto))
  }),

  // Fiche d'un expert de la marketplace : sa présentation, consultable avant recrutement.
  http.get(`${API_BASE}/agents/marketplace/:id`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const id = String(params.id)
    const expert = marketplaceAgents().find((item) => item.id === id)
    if (!expert) return notFound('Expert IA introuvable.')
    return HttpResponse.json(toDetailDto(expert))
  }),

  // Recrutement : l'expert rejoint l'équipe immédiatement et quitte le catalogue.
  http.post(`${API_BASE}/agents/:id/recruit`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const id = String(params.id)
    const expert = marketplaceAgents().find((item) => item.id === id)
    if (!expert) return notFound('Expert IA introuvable.')

    const body = (await request.json()) as { channels?: unknown }
    const sent = Array.isArray(body.channels) ? body.channels.filter((value): value is string => typeof value === 'string') : []
    if (sent.length === 0) return validationError('Choisissez au moins un canal de déploiement.')
    // On n'accepte que des canaux effectivement pris en charge par l'expert.
    const refused = sent.filter((value) => !expert.channels.includes(value))
    if (refused.length > 0) return validationError(`Canaux non pris en charge par ${expert.name} : ${refused.join(', ')}.`)

    addToTeam(id)
    setProfile(id, { ...DEFAULT_PROFILE, channels: [...new Set(sent)] })
    // L'expert engage la conversation : sa prise de poste l'attend dès l'arrivée
    // dans son espace, il n'attend pas d'être sollicité.
    queueOpening(id)
    return HttpResponse.json(toListDto(expert), { status: 201 })
  }),

  // Réglages de personnalité — déclarés avant /agents/:id (segment supplémentaire).
  http.get(`${API_BASE}/agents/:id/profile`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const id = String(params.id)
    if (!isInTeam(id)) return notFound('Expert IA introuvable.')
    return HttpResponse.json(getProfile(id))
  }),

  http.patch(`${API_BASE}/agents/:id/profile`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    const id = String(params.id)
    const expert = teamAgents().find((item) => item.id === id)
    if (!expert) return notFound('Expert IA introuvable.')

    const body = (await request.json()) as Partial<ProfileSettings>
    const current = getProfile(id)
    const pick = (value: unknown, allowed: string[], fallback: string) =>
      typeof value === 'string' && allowed.includes(value) ? value : fallback
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : current.instructions
    if (instructions.length > 2000) return validationError('Les consignes ne peuvent pas dépasser 2000 caractères.')

    // Personnalité : une liste de caractères choisis parmi ceux que le
    // catalogue propose. Tout ce qui n'y figure pas est écarté sans bruit —
    // c'est une valeur d'énumération, pas un champ de saisie.
    const envoyee = (body as { personality?: { traits?: unknown } }).personality
    const personality = { ...current.personality }
    if (envoyee && Array.isArray(envoyee.traits)) {
      const retenus = [...new Set(envoyee.traits.filter((value): value is string => typeof value === 'string' && PERSONALITY_TRAITS.includes(value)))]
      if (retenus.length > PERSONALITY_TRAITS_MAX) return validationError(`Quatre caractères au maximum.`)
      personality.traits = retenus
    }

    const next: ProfileSettings = {
      active: typeof body.active === 'boolean' ? body.active : current.active,
      // Canaux : on ne garde que ceux que l'expert prend en charge, et jamais une
      // liste vide — un expert injoignable n'aurait aucun sens.
      channels: (() => {
        if (!Array.isArray(body.channels)) return current.channels
        const kept = [...new Set(body.channels.filter((value): value is string => typeof value === 'string' && expert.channels.includes(value)))]
        return kept.length > 0 ? kept : current.channels
      })(),
      tone: pick(body.tone, TONES, current.tone),
      language: pick(body.language, LANGUAGES, current.language),
      detail: pick(body.detail, DETAILS, current.detail),
      instructions,
      personality,
      requireApproval: typeof body.requireApproval === 'boolean' ? body.requireApproval : current.requireApproval,
      shareResources: typeof body.shareResources === 'boolean' ? body.shareResources : current.shareResources,
      // Portrait : chaque axe est validé contre ses valeurs admises.
      avatar: Object.fromEntries(
        Object.entries(AVATAR_AXES).map(([axis, allowed]) => {
          const sent = (body.avatar as Record<string, unknown> | undefined)?.[axis]
          const kept = current.avatar[axis as keyof typeof current.avatar]
          return [axis, typeof sent === 'string' && allowed.includes(sent) ? sent : kept]
        }),
      ) as ProfileSettings['avatar'],
      // Proposition retenue : cadrage borné, null remet le portrait du catalogue.
      portrait: (() => {
        if (body.portrait === null) return null
        const sent = body.portrait as { url?: unknown; crop?: unknown } | undefined
        if (!sent) return current.portrait
        const crop = typeof sent.crop === 'string' && PORTRAIT_CROPS.includes(sent.crop) ? sent.crop : 'buste'
        return { url: typeof sent.url === 'string' ? sent.url : null, crop }
      })(),
    }
    setProfile(id, next)
    return HttpResponse.json(next)
  }),

  http.get(`${API_BASE}/agents/:id`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    // Seuls les experts de l'équipe ont une fiche accessible.
    const expert = teamAgents().find((item) => item.id === String(params.id))
    if (!expert) return notFound('Expert IA introuvable.')
    return HttpResponse.json(toDetailDto(expert))
  }),
]
