import { Activity, ArrowLeft, Blocks, Check, CircleCheckBig, ClipboardList, Database, Download, FileCheck2, Gauge, LineChart, Maximize2, Minimize2, Pause, Play, Pencil, Plus, Repeat, Search, ShieldCheck, Sparkles, Trash2, Upload, UserCog, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { getAgent, getAgentProfile, listAgentResources, updateAgentProfile } from '../../../features/agents/api/api'
import type { AgentAvatarConfig, AgentConnector, AgentDetail, AgentPortrait, AgentProfile, AgentResource, AgentResources } from '../../../features/agents/api/contracts'
import { DETAIL_LABELS, LANGUAGE_LABELS, TONE_LABELS } from '../../../features/agents/api/contracts'
import { channelLabel, orderChannels } from '../../../features/agents/channels'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { useSession } from '../../../features/auth/providers/session-context'
import { deleteAutomation, listAutomations, setAutomationActive } from '../../../features/automations/api/api'
import type { Automation } from '../../../features/automations/api/contracts'
import { triggerLabel } from '../../../features/automations/api/contracts'
import { listConversations } from '../../../features/conversations/api/api'
import { conversationHistoryForAgent, defaultHermesConversationId, userActivityConversations } from '../../../features/conversations/api/conversation-activity'
import { conversationTrackingSummary } from '../../../features/conversations/api/conversation-tracking'
import type { ConversationStatus, ConversationSummary } from '../../../features/conversations/api/contracts'
import { CONVERSATION_STATUSES } from '../../../features/conversations/api/contracts'
import { hermesClientContextFromSession, hermesInitialConversationId, initializeHermesExpert, isHermesExpert, listHermesConversations } from '../../../features/conversations/api/hermes'
import { ExpertChat } from '../../../features/conversations/components/expert-chat'
import { listConnectors, listFiles, uploadFiles } from '../../../features/files/api/api'
import type { Connector, FileItem } from '../../../features/files/api/contracts'
import { CONNECTOR_CATEGORIES } from '../../../features/files/connector-categories'
import { downloadLivrable, listLivrables } from '../../../features/livrables/api/api'
import type { Livrable } from '../../../features/livrables/api/contracts'
import { AgentAvatar } from '../../../shared/components/agent-avatar/agent-avatar'
import { AutomationCreateModal } from '../../../shared/components/automation-create-modal/automation-create-modal'
import { AvatarConfigModal } from '../../../shared/components/avatar-config-modal/avatar-config-modal'
import { Button } from '../../../shared/components/button/button'
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

type View = 'activite' | 'competences' | 'suivi' | 'profil' | 'connecteurs' | 'sources' | 'artefacts'
type Picker = null | 'source' | 'connector' | 'automation'
const DAY_MS = 86_400_000
/** Panneau d'échange : largeur d'ouverture, plancher, et bande de page toujours visible. */
const CHAT_WIDTH_DEFAULT = 560
const CHAT_WIDTH_MIN = 360
const CHAT_MARGIN_MIN = 72
const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const WEEK_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Cadrage d'un portrait retenu, appliqué à l'image du rail. */
const CROP_POSITION: Record<string, string> = { entier: 'center', serre: 'center 6%', buste: 'center 12%', plein: 'center 30%' }

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()

/** Comparaison insensible à la casse et aux accents : « comptabilite » trouve « Comptabilité ». */
const normalize = (value: string) => value.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()

/** Étiquette du jour d'une tâche : aujourd'hui, hier, sinon la date. */
function dayLabel(time: number, today: number): string {
  const diff = Math.round((today - startOfDay(new Date(time))) / DAY_MS)
  if (diff <= 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(time))
}

function mergeConversations(...groups: ConversationSummary[][]): ConversationSummary[] {
  const merged = new Map<string, ConversationSummary>()
  for (const item of groups.flat()) {
    const existing = merged.get(item.id)
    if (!existing || Date.parse(item.updatedAt) >= Date.parse(existing.updatedAt)) merged.set(item.id, item)
  }
  return [...merged.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

/**
 * Espace d'un expert IA de l'équipe : son activité (tâches traitées), ses
 * routines programmées, et l'accès à ses outils, ses données et ses productions.
 * Ce n'est pas une fiche de présentation — celle-ci sert avant le recrutement.
 */
export function AgentDetailPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const { workspaceId = DEFAULT_WORKSPACE_ID, agentId = '' } = useParams()
  const [agent, setAgent] = useState<AgentDetail | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [artefacts, setArtefacts] = useState<Livrable[]>([])
  const [sources, setSources] = useState<FileItem[]>([])
  // Ressources de l'équipe : ce que les collègues acceptent de partager, et ce
  // que cet expert leur a emprunté.
  const [shared, setShared] = useState<AgentResources | null>(null)
  const [borrowed, setBorrowed] = useState<AgentResource[]>([])
  const [connectors, setConnectors] = useState<AgentConnector[]>([])
  const [connectorCatalog, setConnectorCatalog] = useState<Connector[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])
  // Après un recrutement, on arrive directement dans l'échange (état de navigation).
  const location = useLocation()
  const [view, setView] = useState<View>('activite')
  // L'échange est une action : il s'ouvre par-dessus l'espace, sans le quitter.
  // Arrivée depuis un recrutement : la prise de poste de l'expert attend déjà,
  // on l'ouvre au lieu de démarrer un fil vide. Figé au montage — rouvrir
  // l'échange plus tard doit bien créer une nouvelle conversation.
  const [fromRecruitment] = useState((location.state as { openChat?: boolean } | null)?.openChat === true)
  const [openedConversation, setOpenedConversation] = useState<string | undefined>(undefined)
  const [chatKey, setChatKey] = useState(0)
  // L'échange est un panneau ancré à droite : sa largeur se règle à la souris ou
  // au clavier, et il peut passer en plein écran pour les longues sessions.
  const [chatFull, setChatFull] = useState(false)
  const [chatWidth, setChatWidth] = useState(() => Math.min(CHAT_WIDTH_DEFAULT, window.innerWidth - CHAT_MARGIN_MIN))
  const [newConversationRequested, setNewConversationRequested] = useState(false)
  /** Filtre d'état de l'accueil. « all » en tête : c'est la vue par défaut. */
  const [stateFilter, setStateFilter] = useState<ConversationStatus | 'all'>('all')
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [picker, setPicker] = useState<Picker>(null)
  const [sharedQuery, setSharedQuery] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Automation | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!agentId) return
    void getAgent(agentId)
      .then(async (detail) => {
        setAgent(detail)
        setConnectors(detail.connectors)
        const usesHermesRuntime = isHermesExpert(detail.id)
        const hermesHistory = session && usesHermesRuntime
          ? initializeHermesExpert(detail.id, hermesClientContextFromSession(session))
              .then(() => listHermesConversations(detail.id, session))
              .catch(() => [])
          : Promise.resolve([])
        // Un profil Hermes ne doit jamais recevoir les conversations de démo
        // servies par MSW : son écran ne reflète que son historique réel.
        const simulatedHistory = usesHermesRuntime
          ? Promise.resolve([])
          : listConversations({ agent: agentId }).catch(() => [])
        const [convs, indexedConvs, arts, autos, files, catalog, team] = await Promise.all([
          simulatedHistory,
          hermesHistory,
          listLivrables({ agent: agentId }).catch(() => []),
          listAutomations().catch(() => []),
          listFiles().catch(() => []),
          listConnectors().catch(() => []),
          listAgentResources(agentId).catch(() => null),
        ])
        setShared(team)
        setConversations(conversationHistoryForAgent(usesHermesRuntime, convs, indexedConvs))
        if (fromRecruitment && convs.length > 0 && !usesHermesRuntime) {
          setOpenedConversation([...convs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0].id)
        }
        setArtefacts(arts)
        setAutomations(autos.filter((item) => item.agentId === agentId))
        // Seuls les documents de cet expert : le reste du fonds de l'organisation
        // passe par le partage consenti, pas par un accès direct.
        setSources(files.filter((file) => file.agent === detail.name))
        setConnectorCatalog(catalog)
        setStatus('ready')
      })
      .catch(() => navigate(paths.agents(workspaceId), { replace: true }))
  }, [agentId, navigate, workspaceId, retryKey, fromRecruitment, session])

  // Réglages de personnalité : chargés à part (leur absence ne bloque pas la page).
  useEffect(() => {
    if (!agentId) return
    void getAgentProfile(agentId).then(setProfile).catch(() => setProfile(null))
  }, [agentId, retryKey])

  /**
   * Accueil : les tâches rangées par état, l'en cours d'abord. C'est la
   * question à laquelle cette page doit répondre — que fait l'expert en ce
   * moment, et qu'est-ce qui attend. Une tâche sans état est tenue pour livrée.
   */
  const activityConversations = useMemo(() => userActivityConversations(conversations), [conversations])
  const tracking = useMemo(() => conversationTrackingSummary(activityConversations), [activityConversations])

  const statusGroups = useMemo(() => {
    const sorted = [...activityConversations].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    return CONVERSATION_STATUSES.map((status) => ({
      ...status,
      items: sorted.filter((item) => (item.status ?? 'done') === status.key),
    }))
  }, [activityConversations])

  /**
   * Tâches affichées : une liste à plat, la plus récente en tête. Le filtre
   * porte le regroupement — les empiler par état en plus ferait doublon.
   */
  const visibleTasks = useMemo(() => {
    const sorted = [...activityConversations].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    return stateFilter === 'all' ? sorted : sorted.filter((item) => (item.status ?? 'done') === stateFilter)
  }, [activityConversations, stateFilter])

  // Activité : tâches groupées par jour + volume des 7 derniers jours.
  const activity = useMemo(() => {
    const today = startOfDay(new Date())
    const sorted = [...activityConversations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    const groups: { label: string; items: ConversationSummary[] }[] = []
    for (const item of sorted) {
      const label = dayLabel(Date.parse(item.createdAt), today)
      const last = groups[groups.length - 1]
      if (last?.label === label) last.items.push(item)
      else groups.push({ label, items: [item] })
    }
    // Sept derniers jours, du plus ancien au plus récent.
    const days = Array.from({ length: 7 }, (_, index) => {
      const start = today - (6 - index) * DAY_MS
      const count = sorted.filter((item) => startOfDay(new Date(item.createdAt)) === start).length
      return { key: start, letter: WEEK_DAYS[new Date(start).getDay()], count }
    })
    const week = days.reduce((total, day) => total + day.count, 0)
    // Huit dernières semaines, pour le suivi.
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const end = today - (7 - index) * 7 * DAY_MS + 7 * DAY_MS
      const start = end - 7 * DAY_MS
      const count = sorted.filter((item) => {
        const at = Date.parse(item.createdAt)
        return at >= start && at < end
      }).length
      return { key: start, letter: `S${index + 1}`, count }
    })
    const busiest = Array.from({ length: 7 }, (_, day) => ({
      day,
      count: sorted.filter((item) => new Date(item.createdAt).getDay() === day).length,
    })).sort((a, b) => b.count - a.count)[0]
    return {
      groups, days, week,
      peak: Math.max(1, ...days.map((day) => day.count)),
      weeks, weekPeak: Math.max(1, ...weeks.map((item) => item.count)),
      perWeek: Math.round((sorted.length / 8) * 10) / 10,
      lastLabel: sorted[0] ? `dernière ${sorted[0].time}` : 'aucune pour l’instant',
      busiestDay: busiest && busiest.count > 0 ? WEEK_FULL[busiest.day] : '—',
    }
  }, [activityConversations])

  // Répartition des productions : compétences sollicitées et natures de livrables.
  const production = useMemo(() => {
    const tally = (values: string[]) => {
      const counts = new Map<string, number>()
      for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
      return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
    }
    return {
      topSkills: tally(artefacts.map((item) => item.skill)).slice(0, 5),
      formats: tally(artefacts.map((item) => item.format)).slice(0, 5),
    }
  }, [artefacts])

  if (status === 'error') return <div className="route-loader"><LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} /></div>
  if (!agent) return <div className="route-loader">Chargement de l'expert IA…</div>

  // À l'ouverture d'un profil Hermes, le chat se positionne tout seul : la
  // dernière interaction réelle si elle existe, sinon la prise de poste afin
  // que l'expert décline immédiatement son identité. « Nouvelle conversation »
  // reste la seule action qui ouvre volontairement un fil vide.
  const onboardingHermesConversation = session && isHermesExpert(agent.id)
    ? hermesInitialConversationId(hermesClientContextFromSession(session))
    : undefined
  const automaticHermesConversation = status === 'ready' && !newConversationRequested && onboardingHermesConversation
    ? defaultHermesConversationId(conversations, onboardingHermesConversation)
    : undefined
  const activeConversation = openedConversation ?? automaticHermesConversation

  // Un profil non encore chargé ne bloque pas l'usage : l'expert est présumé en service.
  const inService = profile?.active !== false
  const serviceLabel = inService ? 'En service' : 'Désactivé'
  // Un expert fraîchement recruté n'a rien à mesurer : on le dit plutôt que
  // d'afficher une série de zéros et des graphiques plats.
  const hasHistory = activityConversations.length > 0 || artefacts.length > 0
  const activeRoutines = automations.filter((item) => item.active).length
  // L'échange est en permanence à l'écran sur l'accueil : « démarrer » ou
  // « reprendre » ne fait plus qu'y désigner la conversation affichée.
  const askExpert = () => { setNewConversationRequested(true); setOpenedConversation(undefined); setChatKey((key) => key + 1); setView('activite') }
  const openConversation = (id: string) => { setNewConversationRequested(false); setOpenedConversation(id); setView('activite') }
  const refreshHermesActivity = () => {
    if (!session || !isHermesExpert(agent.id)) return
    void listHermesConversations(agent.id, session)
      .then((indexed) => setConversations((current) => mergeConversations(current, indexed)))
      .catch(() => undefined)
  }

  /** Élargit (delta > 0) ou rétrécit le panneau, en gardant la page visible. */
  const resizeBy = (delta: number) => {
    setChatWidth((current) => Math.min(Math.max(current + delta, CHAT_WIDTH_MIN), window.innerWidth - CHAT_MARGIN_MIN))
  }

  // Glisser le bord gauche. Les écouteurs vivent sur la fenêtre : le pointeur
  // peut sortir du panneau sans que le geste se perde.
  const startResize = (event: React.PointerEvent) => {
    event.preventDefault()
    const originX = event.clientX
    const originWidth = chatWidth
    const move = (moved: PointerEvent) => {
      const next = originWidth + (originX - moved.clientX)
      setChatWidth(Math.min(Math.max(next, CHAT_WIDTH_MIN), window.innerWidth - CHAT_MARGIN_MIN))
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.classList.remove('is-resizing')
    }
    document.body.classList.add('is-resizing')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }
  // Ressources d'un collègue déjà proposées : celles qu'il partage, moins celles
  // que cet expert exploite déjà.
  const availableShared = (shared?.shared ?? []).filter((item) => !borrowed.some((b) => b.id === item.id))
  // Recherche sur ce que le serveur a déjà autorisé : un seul champ pour le nom
  // du fichier, le métier et l'auteur. Le champ n'apparaît qu'au-delà d'un
  // volume où le coup d'œil ne suffit plus.
  const searchableShared = availableShared.length >= 8
  const query = normalize(sharedQuery)
  const matchingShared = query
    ? availableShared.filter((item) => [item.name, item.ownerMetier, item.ownerName].some((field) => normalize(field).includes(query)))
    : availableShared
  // Regroupé par métier de l'auteur : on cherche « ce que la finance a produit »
  // avant de chercher un fichier précis. L'ordre suit celui de l'équipe.
  const sharedGroups = matchingShared.reduce<{ key: string; label: string; items: AgentResource[] }[]>((groups, item) => {
    const group = groups.find((entry) => entry.key === item.ownerMetier)
    if (group) group.items.push(item)
    else groups.push({ key: item.ownerMetier, label: item.ownerMetier, items: [item] })
    return groups
  }, [])
  // Chaque expert a son propre environnement : tout le catalogue lui est proposé,
  // regroupé par thématique comme ailleurs dans l'application.
  const connectorGroups = CONNECTOR_CATEGORIES
    .map((category) => ({ ...category, items: connectorCatalog.filter((c) => c.category === category.name) }))
    .filter((group) => group.items.length > 0)
  const borrowResource = (item: AgentResource) => { setBorrowed((prev) => [...prev, item]); setPicker(null) }
  // Téléverser depuis l'expert : le document rejoint aussitôt ses sources.
  const uploadSources = async (files: File[]) => {
    if (!files.length) return
    const created = await uploadFiles(files).catch(() => [])
    if (created.length) setSources((prev) => [...created, ...prev])
    setPicker(null)
  }
  const addConnector = (c: Connector) => setConnectors((prev) => prev.some((k) => k.provider === c.provider) ? prev : [...prev, { provider: c.provider, name: c.name }])
  const downloadArtefact = (artefact: Livrable) => void downloadLivrable(artefact.id).then((r) => r.blob()).then((b) => {
    const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = artefact.title; a.click(); URL.revokeObjectURL(url)
  })
  const toggleRoutine = (routine: Automation) => void setAutomationActive(routine.id, !routine.active)
    .then((updated) => setAutomations((prev) => prev.map((item) => item.id === updated.id ? updated : item)))
    .catch(() => undefined)
  const confirmDelete = () => {
    if (!toDelete) return
    const id = toDelete.id
    setToDelete(null)
    void deleteAutomation(id).then(() => setAutomations((prev) => prev.filter((item) => item.id !== id))).catch(() => undefined)
  }

  const patchProfile = (patch: Partial<AgentProfile>) => { setProfile((prev) => prev ? { ...prev, ...patch } : prev); setProfileSaved(false) }
  // Le portrait s'enregistre seul : il se règle dans sa fenêtre, pas dans le formulaire.
  const saveAvatar = async (next: AgentAvatarConfig, retained: AgentPortrait | null) => {
    if (!profile) return
    const saved = await updateAgentProfile(agent.id, { ...profile, avatar: next, portrait: retained }).catch(() => null)
    if (saved) setProfile(saved)
  }
  const saveProfile = () => {
    if (!profile || savingProfile) return
    setSavingProfile(true)
    void updateAgentProfile(agent.id, profile)
      .then((saved) => { setProfile(saved); setProfileSaved(true) })
      .catch(() => undefined)
      .finally(() => setSavingProfile(false))
  }

  const views: { key: View; icon: ReactNode; label: string }[] = [
    { key: 'activite', icon: <ClipboardList size={16} />, label: 'Accueil' },
    { key: 'competences', icon: <Sparkles size={16} />, label: 'Compétences' },
    { key: 'suivi', icon: <LineChart size={16} />, label: 'Suivi' },
  ]
  // Toutes les entrées du rail changent la vue principale — aucun comportement à part.
  const manageViews: { key: View; icon: ReactNode; label: string; count?: number }[] = [
    { key: 'profil', icon: <UserCog size={16} />, label: 'Profil' },
    { key: 'connecteurs', icon: <Blocks size={16} />, label: 'Connecteurs', count: connectors.length },
    { key: 'sources', icon: <Database size={16} />, label: 'Sources de données', count: sources.length },
    { key: 'artefacts', icon: <FileCheck2 size={16} />, label: 'Artefacts', count: artefacts.length },
  ]

  return (
    <div className="expert-focus">
      <aside className="wk-rail">
        <button type="button" className="expert-nav-back" onClick={() => navigate(paths.agents(workspaceId))}><ArrowLeft size={16} /> Tous les experts</button>

        <div className="wk-card">
          <AgentAvatar
            id={agent.id}
            name={agent.name}
            avatarUrl={profile?.portrait?.url ?? agent.avatarUrl}
            className="wk-photo"
            style={profile?.portrait ? { objectPosition: CROP_POSITION[profile.portrait.crop] } : undefined}
          />
          {profile && (
            <button type="button" className="wk-card-edit" onClick={() => setAvatarOpen(true)} aria-label={`Modifier le portrait de ${agent.name}`} title="Modifier le portrait">
              <Pencil size={14} />
            </button>
          )}
          <div className="wk-card-id">
            <strong>{agent.name}</strong>
            {agent.tags[0] && <span>{agent.tags[0]}</span>}
          </div>
          <span className={inService ? 'wk-card-dot' : 'wk-card-dot is-off'} title={serviceLabel} aria-label={serviceLabel} />
        </div>


        <nav className="wk-nav" aria-label="Espace de l'expert">
          {views.map((item) => (
            <button type="button" key={item.key} className={view === item.key ? 'wk-nav-link is-active' : 'wk-nav-link'} onClick={() => setView(item.key)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          <span className="wk-nav-label">Gérer</span>
          {manageViews.map((item) => (
            <button type="button" key={item.key} className={view === item.key ? 'wk-nav-link is-active' : 'wk-nav-link'} onClick={() => setView(item.key)}>
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && <em>{item.count}</em>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="wk-main">
        {view === 'competences' && (
          <>
            <div className="wk-view-head">
              <h2>Ses compétences <em>{agent.skills.length}</em></h2>
              <p>Ce que {agent.name} sait faire.</p>
            </div>
            <div className="wk-skills">
              {agent.skills.map((skill) => (
                <article key={skill.key} className="wk-skill">
                  <span className="wk-skill-ic"><Sparkles size={15} /></span>
                  <strong>{skill.label}</strong>
                  <p>{skill.description}</p>
                </article>
              ))}
            </div>
          </>
        )}

        {view === 'suivi' && (
          <>
            <div className="wk-view-head">
              <h2>Suivi</h2>
              <p>L'historique de {agent.name} : ce qui a été traité, produit, et à quel rythme.</p>
            </div>
            {!hasHistory ? (
              <div className="wk-blank">
                <span className="wk-blank-ic"><LineChart size={22} /></span>
                <strong>Les mesures apparaîtront ici</strong>
                <p>{agent.name} vient de rejoindre votre équipe. Dès {agent.gender === 'f' ? 'ses' : 'ses'} premières tâches, vous verrez le temps de travail, le rythme, les compétences les plus sollicitées et la nature de ce {agent.gender === 'f' ? 'qu’elle' : 'qu’il'} produit.</p>
                <Button variant="tertiary" size="small" onClick={askExpert}>Lui confier une première tâche</Button>
              </div>
            ) : (
            <>
            <div className="tracking-dashboard">
              <div className="tracking-kpis">
                <article className="tracking-kpi">
                  <span className="tracking-kpi-icon tracking-kpi-icon--purple"><ClipboardList size={18} /></span>
                  <div><small>Tâches suivies</small><strong>{tracking.total}</strong><span>{activity.lastLabel}</span></div>
                </article>
                <article className="tracking-kpi">
                  <span className="tracking-kpi-icon tracking-kpi-icon--amber"><Activity size={18} /></span>
                  <div><small>À suivre maintenant</small><strong>{tracking.active}</strong><span>{tracking.running} en cours · {tracking.paused} en pause</span></div>
                </article>
                <article className="tracking-kpi">
                  <span className="tracking-kpi-icon tracking-kpi-icon--green"><CircleCheckBig size={18} /></span>
                  <div><small>Taux de livraison</small><strong>{tracking.completionRate}%</strong><span>{tracking.done} tâche{tracking.done > 1 ? 's' : ''} terminée{tracking.done > 1 ? 's' : ''}</span></div>
                </article>
                <article className="tracking-kpi">
                  <span className="tracking-kpi-icon tracking-kpi-icon--blue"><FileCheck2 size={18} /></span>
                  <div><small>Livrables produits</small><strong>{artefacts.length}</strong><span>{activity.perWeek} tâche{activity.perWeek > 1 ? 's' : ''} / semaine</span></div>
                </article>
              </div>

              <section className="tracking-card tracking-workload">
                <header className="tracking-card-head">
                  <div><span>Activité</span><h3>Charge sur les 8 dernières semaines</h3></div>
                  <strong>{activity.weeks.reduce((sum, week) => sum + week.count, 0)} tâche{activity.weeks.reduce((sum, week) => sum + week.count, 0) > 1 ? 's' : ''}</strong>
                </header>
                <div className="tracking-chart" aria-label="Charge de travail hebdomadaire">
                  {activity.weeks.map((week) => (
                    <div key={week.key} className="tracking-bar" title={`${week.count} tâche${week.count > 1 ? 's' : ''}`}>
                      <span className="tracking-bar-value">{week.count || ''}</span>
                      <i style={{ height: `${Math.max(week.count > 0 ? 12 : 2, Math.round((week.count / activity.weekPeak) * 100))}%` }} className={week.count > 0 ? 'is-on' : undefined} />
                      <em>{week.letter}</em>
                    </div>
                  ))}
                </div>
              </section>

              <div className="tracking-grid">
                <section className="tracking-card">
                  <header className="tracking-card-head"><div><span>État des tâches</span><h3>Répartition actuelle</h3></div><Gauge size={18} /></header>
                  <div className="tracking-status-list">
                    {CONVERSATION_STATUSES.map((entry) => {
                      const count = tracking[entry.key]
                      return (
                        <div className="tracking-status" key={entry.key}>
                          <span className={`tracking-status-dot tracking-status-dot--${entry.key}`} />
                          <span>{entry.plural}</span>
                          <i><b style={{ width: `${tracking.total ? Math.round((count / tracking.total) * 100) : 0}%` }} /></i>
                          <strong>{count}</strong>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="tracking-card">
                  <header className="tracking-card-head"><div><span>Historique</span><h3>Activités récentes</h3></div><strong>{tracking.total}</strong></header>
                  <div className="tracking-recent-list">
                    {[...activityConversations]
                      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
                      .slice(0, 4)
                      .map((item) => {
                        const key = item.status ?? 'done'
                        const state = CONVERSATION_STATUSES.find((entry) => entry.key === key)
                        return (
                          <button type="button" key={item.id} onClick={() => openConversation(item.id)} className="tracking-recent-row">
                            <span className={`tracking-recent-state tracking-recent-state--${key}`} />
                            <span className="tracking-recent-copy"><strong>{item.title}</strong><small>{item.time}</small></span>
                            <em>{state?.label}</em>
                          </button>
                        )
                      })}
                  </div>
                </section>
              </div>

              <div className="tracking-grid tracking-grid--production">
                <section className="tracking-card">
                  <header className="tracking-card-head"><div><span>Expertise</span><h3>Compétences les plus sollicitées</h3></div></header>
                  {production.topSkills.length === 0
                    ? <p className="act-empty">Rien à mesurer pour l'instant.</p>
                    : production.topSkills.map((entry) => (
                      <div key={entry.label} className="wk-meter">
                        <span className="wk-meter-txt">{entry.label}</span>
                        <span className="wk-meter-bar"><i style={{ width: `${Math.round((entry.count / production.topSkills[0].count) * 100)}%` }} /></span>
                        <span className="wk-meter-n">{entry.count}</span>
                      </div>
                    ))}
                </section>

                <section className="tracking-card">
                  <header className="tracking-card-head"><div><span>Production</span><h3>Nature des livrables</h3></div></header>
                  {production.formats.length === 0
                    ? <p className="act-empty">Aucun livrable enregistré.</p>
                    : production.formats.map((entry) => (
                      <div key={entry.label} className="wk-meter">
                        <span className="wk-meter-txt">{entry.label}</span>
                        <span className="wk-meter-bar"><i style={{ width: `${Math.round((entry.count / production.formats[0].count) * 100)}%` }} /></span>
                        <span className="wk-meter-n">{entry.count}</span>
                      </div>
                    ))}
                </section>
              </div>

              <div className="tracking-facts">
                <div><small>Jour le plus actif</small><strong>{activity.busiestDay}</strong></div>
                <div><small>Routines exécutées</small><strong>{automations.filter((a) => a.lastRunAt).length} sur {automations.length}</strong></div>
                <div><small>Sources reliées</small><strong>{sources.length}</strong></div>
                <div><small>Outils connectés</small><strong>{connectors.length}</strong></div>
              </div>
            </div>
            </>
            )}
          </>
        )}

        {view === 'connecteurs' && (
          <>
            <div className="wk-view-head">
              <h2>Connecteurs</h2>
              <p>Connectez les outils que {agent.name} doit pouvoir utiliser.</p>
            </div>
            {connectorGroups.length === 0
              ? <p className="act-empty">Aucun connecteur disponible pour l'instant.</p>
              : connectorGroups.map((group) => (
                <section className="connectors-section" key={group.name}>
                  <h3 className="section-title">{group.name}</h3>
                  <div className="connectors-grid">
                    {group.items.map((connector) => {
                      const connected = connectors.some((k) => k.provider === connector.provider)
                      return (
                        <div key={connector.id} className={connected ? 'connector-card is-connected' : 'connector-card'}>
                          {CONNECTOR_LOGOS[connector.provider]
                            ? <span className="connector-icon connector-icon--logo"><img src={CONNECTOR_LOGOS[connector.provider]} alt="" /></span>
                            : <span className="connector-icon" style={{ background: group.color }}>{connector.name[0]}</span>}
                          <div className="connector-copy">
                            <strong>{connector.name}</strong>
                            <small>{connected ? 'Connecté' : 'Disponible'}</small>
                          </div>
                          {connected
                            ? <span className="connector-badge"><Check size={13} /> Connecté</span>
                            : <button type="button" className="connector-add" onClick={() => addConnector(connector)}><Plus size={14} /> Connecter</button>}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
          </>
        )}

        {view === 'sources' && (
          <>
            <div className="wk-view-head wk-view-head--action">
              <div>
                <h2>Sources de données</h2>
                <p>Les documents sur lesquels {agent.name} s'appuie pour travailler.</p>
              </div>
              <Button variant="tertiary" size="small" leadingIcon={<Plus size={14} />} onClick={() => { setSharedQuery(''); setPicker('source') }}>Ajouter un document</Button>
            </div>
            {sources.length === 0
              ? <p className="act-empty">Aucune source reliée.</p>
              : (
                <div className="wk-rows">
                  {sources.map((f) => (
                    <div key={f.id} className="expert-list-row expert-list-row--static">
                      <span className="expert-list-icon"><Database size={17} /></span>
                      <span className="expert-list-main"><strong>{f.name}</strong><small>{f.kind}</small></span>
                      <span className="expert-list-meta">{f.size}</span>
                    </div>
                  ))}
                </div>
              )}

            {borrowed.length > 0 && (
              <>
                <span className="wk-group-label">Partagé par l'équipe</span>
                <div className="wk-rows">
                  {borrowed.map((item) => (
                    <div key={item.id} className="expert-list-row expert-list-row--static">
                      <span className="expert-list-icon">{item.kind === 'artefact' ? <FileCheck2 size={17} /> : <Database size={17} />}</span>
                      <span className="expert-list-main"><strong>{item.name}</strong><small>{item.meta}</small></span>
                      <span className="wk-owner">{item.ownerName}</span>
                      <span className="expert-list-meta">{item.size}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {view === 'artefacts' && (
          <>
            <div className="wk-view-head">
              <h2>Artefacts</h2>
              <p>Tout ce que {agent.name} a produit, prêt à télécharger.</p>
            </div>
            {artefacts.length === 0
              ? <p className="act-empty">Rien de produit pour l'instant.</p>
              : (
                <div className="wk-rows">
                  {artefacts.map((a) => (
                    <div key={a.id} className="expert-list-row expert-list-row--static">
                      <span className="expert-list-icon"><FileCheck2 size={17} /></span>
                      <span className="expert-list-main"><strong>{a.title}</strong><small>{a.skill} · {a.format} · {a.size}</small></span>
                      <span className="expert-list-meta">{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(Date.parse(a.createdAt))}</span>
                      <button type="button" className="expert-list-action" aria-label={`Télécharger « ${a.title} »`} onClick={() => downloadArtefact(a)}><Download size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
          </>
        )}

        {view === 'profil' && (
          <>
            <div className="wk-view-head">
              <h2>Profil</h2>
              <p>Comment {agent.name} s'exprime et travaille, dans tous ses échanges.</p>
            </div>
            {!profile ? <p className="act-empty">Réglages indisponibles pour l'instant.</p> : (
              <div className="wk-form">
                <section className="wk-settings">
                  <div className="wk-set-row">
                    <span className="wk-set-txt"><strong>Canaux</strong></span>
                    {/* Plusieurs canaux à la fois. Le dernier coché reste coché :
                        un expert joignable nulle part n'aurait aucun sens. */}
                    <div className="wk-seg wk-seg--multi" role="group" aria-label="Canaux">
                      {orderChannels(agent.channels).map((option) => {
                        const on = profile.channels.includes(option)
                        const last = on && profile.channels.length === 1
                        return (
                          <button
                            type="button"
                            key={option}
                            role="checkbox"
                            aria-checked={on}
                            aria-disabled={last}
                            title={last ? 'Au moins un canal est requis.' : undefined}
                            className={on ? 'is-on' : undefined}
                            onClick={() => patchProfile({
                              channels: on
                                ? (last ? profile.channels : profile.channels.filter((value) => value !== option))
                                : [...profile.channels, option],
                            })}
                          >
                            {channelLabel(option)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="wk-set-row">
                    <span className="wk-set-txt"><strong>Ton employé</strong></span>
                    <div className="wk-seg">
                      {(Object.keys(TONE_LABELS) as (keyof typeof TONE_LABELS)[]).map((key) => (
                        <button type="button" key={key} className={profile.tone === key ? 'is-on' : undefined} onClick={() => patchProfile({ tone: key })}>{TONE_LABELS[key]}</button>
                      ))}
                    </div>
                  </div>

                  <div className="wk-set-row">
                    <span className="wk-set-txt"><strong>Langue de réponse</strong></span>
                    <div className="wk-seg">
                      {(Object.keys(LANGUAGE_LABELS) as (keyof typeof LANGUAGE_LABELS)[]).map((key) => (
                        <button type="button" key={key} className={profile.language === key ? 'is-on' : undefined} onClick={() => patchProfile({ language: key })}>{LANGUAGE_LABELS[key]}</button>
                      ))}
                    </div>
                  </div>

                  <div className="wk-set-row">
                    <span className="wk-set-txt"><strong>Niveau de détail</strong></span>
                    <div className="wk-seg">
                      {(Object.keys(DETAIL_LABELS) as (keyof typeof DETAIL_LABELS)[]).map((key) => (
                        <button type="button" key={key} className={profile.detail === key ? 'is-on' : undefined} onClick={() => patchProfile({ detail: key })}>{DETAIL_LABELS[key]}</button>
                      ))}
                    </div>
                  </div>

                  <button type="button" className="wk-set-row wk-set-row--action" aria-pressed={profile.shareResources} onClick={() => patchProfile({ shareResources: !profile.shareResources })}>
                    <span className="wk-set-txt">
                      <strong>Partage de son travail</strong>
                      <small>{profile.shareResources ? 'Ses sources et ses artefacts servent à toute l’équipe.' : 'Ses sources et ses artefacts restent dans son espace.'}</small>
                    </span>
                    <span className={profile.shareResources ? 'switch is-on' : 'switch'}><b /></span>
                  </button>

                  {/* Arrêté au cadrage : on le signale parmi les réglages, sans commande. */}
                  {agent.approvals.length > 0 && (
                    <div className="wk-set-row">
                      <span className="wk-set-txt">
                        <strong>Soumis à votre accord</strong>
                        <small>{agent.approvals.join(' · ')}</small>
                      </span>
                      <ShieldCheck className="wk-set-mark" size={17} />
                    </div>
                  )}
                </section>

                <section className="wk-settings wk-settings--stack">
                  <label className="wk-set-txt" htmlFor="wk-instructions">
                    <strong>Consignes permanentes</strong>
                  </label>
                  <textarea id="wk-instructions" className="wk-textarea" rows={2} maxLength={2000} value={profile.instructions} onChange={(event) => patchProfile({ instructions: event.target.value })} placeholder="Ex. toujours vouvoyer, montants en FCFA, ne s'engager sur un délai qu'après validation." />
                  <span className="wk-count">{profile.instructions.length} / 2000</span>
                </section>

                <div className="wk-form-foot">
                  <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Enregistrement…' : 'Enregistrer'}</Button>
                  {profileSaved && <span className="wk-saved"><Check size={15} /> Enregistré</span>}
                </div>

                <section className="wk-settings">
                  <button type="button" className="wk-set-row wk-set-row--action" aria-pressed={profile.active} onClick={() => patchProfile({ active: !profile.active })}>
                    <span className="wk-set-txt">
                      <strong>{agent.name} en service</strong>
                      <small>Hors service, {agent.gender === 'f' ? 'elle' : 'il'} suspend ses routines et ses réponses.</small>
                    </span>
                    <span className={profile.active ? 'switch is-on' : 'switch'}><b /></span>
                  </button>
                </section>
              </div>
            )}
          </>
        )}

        {view === 'activite' && <>
        {/* Filtres d'état, « Tout » en tête. Un seul à la fois : c'est ce
            sélecteur qui range les tâches, il n'y a donc plus de regroupement
            en dessous — ce serait dire deux fois la même chose. */}
        <div className="wk-filters" role="tablist" aria-label="Filtrer les tâches par état">
          <button
            type="button"
            role="tab"
            aria-selected={stateFilter === 'all'}
            className={stateFilter === 'all' ? 'wk-filter is-on' : 'wk-filter'}
            onClick={() => setStateFilter('all')}
          >
            Tout <b>{activityConversations.length}</b>
          </button>
          {statusGroups.map((group) => (
            <button
              type="button"
              key={group.key}
              role="tab"
              aria-selected={stateFilter === group.key}
              disabled={group.items.length === 0}
              className={`wk-filter is-${group.key}${stateFilter === group.key ? ' is-on' : ''}`}
              onClick={() => setStateFilter(group.key)}
            >
              <i aria-hidden="true" />{group.plural} <b>{group.items.length}</b>
            </button>
          ))}
        </div>

        <div className="wk-timeline">
          {activityConversations.length === 0 ? (
            <p className="act-empty">Aucune tâche confiée à {agent.name} pour l'instant. Demandez-lui quelque chose pour démarrer.</p>
          ) : (
            <table className="wk-log" aria-label={`Activité de ${agent.name}`}>
              <thead>
                <tr><th>État</th><th>Tâche</th><th>Résultat</th><th>Quand</th></tr>
              </thead>
              <tbody>
                {visibleTasks.map((item) => {
                  const key = item.status ?? 'done'
                  const state = CONVERSATION_STATUSES.find((entry) => entry.key === key)
                  const open = () => openConversation(item.id)
                  return (
                    <tr
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.title} — ${state?.label}`}
                      onClick={open}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        open()
                      }}
                    >
                      {/* La couleur ne porte jamais l'information seule : la
                          pastille contient toujours le mot. */}
                      <td><span className={`wk-pill is-${key}`}>{state?.label}</span></td>
                      <td className="wk-log-task">{item.title}</td>
                      <td className="wk-log-result">{item.preview}</td>
                      <td className="wk-log-when">{item.time}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        </>}
      </main>

      {/* Colonne de droite : l'échange, toujours là. Ce n'est plus une fenêtre
          qu'on ouvre et qu'on ferme — c'est un bloc de la page, qu'on élargit
          en tirant son bord ou qu'on passe en plein écran. */}
      {view === 'activite' && !chatFull && (
        <aside className="wk-side wk-side--chat" style={{ ['--side-w' as string]: `${chatWidth}px` }}>
          <div
            className="wk-side-grip"
            role="separator"
            aria-label="Largeur de l’échange"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              resizeBy(event.key === 'ArrowLeft' ? 40 : -40)
            }}
          />
          {/* Les routines coiffent la colonne : toujours visibles, quelle que
              soit la longueur de la frise d'activité à gauche. */}
          <section className="wk-routines">
            <div className="wk-side-head">
              {/* Le compteur « routines actives » vivait dans la rangée de
                  compteurs de l'accueil : il se lit désormais ici, à sa place. */}
              <h2>Ses routines <em>({activeRoutines} active{activeRoutines > 1 ? 's' : ''} sur {automations.length})</em></h2>
              <button type="button" className="act-more" onClick={() => setPicker('automation')}><Plus size={14} /> Ajouter</button>
            </div>
            {automations.length === 0 ? (
              <p className="act-empty">Aucune routine programmée. {agent.name} n'agit que sur demande.</p>
            ) : automations.map((routine) => (
              <div key={routine.id} className={routine.active ? 'wk-routine' : 'wk-routine is-paused'}>
                <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} className="wk-routine-av" />
                <div className="wk-routine-txt">
                  <strong>{routine.name}</strong>
                  <small><Repeat size={12} /> {triggerLabel(routine.trigger)}</small>
                </div>
                <button type="button" className="wk-routine-btn" aria-label={routine.active ? `Mettre « ${routine.name} » en pause` : `Activer « ${routine.name} »`} onClick={() => toggleRoutine(routine)}>
                  {routine.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button type="button" className="wk-routine-btn wk-routine-btn--danger" aria-label={`Supprimer « ${routine.name} »`} onClick={() => setToDelete(routine)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </section>

          <div className="wk-chat-block">
            <div className="wk-chat-head">
              <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} className="chat-modal-av" />
              <span className="chat-modal-id">{agent.name}</span>
              <button type="button" className="chat-modal-x" aria-label="Passer en plein écran" onClick={() => setChatFull(true)}>
                <Maximize2 size={16} />
              </button>
            </div>
            <ExpertChat
              key={activeConversation ?? `nouveau-${chatKey}`}
              agent={agent}
              conversationId={activeConversation}
              onUpdated={refreshHermesActivity}
              onCreated={(created) => {
                setConversations((prev) => [created, ...prev])
                setOpenedConversation(created.id)
                // L'échange ne se ferme plus : la relecture de l'activité
                // Hermes se déclenche donc ici, au moment où un fil naît.
                refreshHermesActivity()
              }}
            />
          </div>
        </aside>
      )}

      {/* Plein écran : le même échange, l'espace entier. On en sort par le
          bouton ou par Échap — il n'y a rien à « fermer », le bloc reste dans
          la page en dessous. */}
      {chatFull && (
        <div className="chat-modal-overlay chat-modal-overlay--dock" role="dialog" aria-modal="true" aria-label={`Échange avec ${agent.name}`}>
          <div className="chat-modal chat-modal--dock chat-modal--full">
            <div className="chat-modal-head">
              <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} className="chat-modal-av" />
              <span className="chat-modal-id">{agent.name}</span>
              <button type="button" className="chat-modal-x" aria-label="Réduire en panneau" onClick={() => setChatFull(false)}>
                <Minimize2 size={16} />
              </button>
            </div>
            <ExpertChat
              key={activeConversation ?? `nouveau-${chatKey}`}
              agent={agent}
              conversationId={activeConversation}
              onUpdated={refreshHermesActivity}
              onCreated={(created) => {
              setConversations((prev) => [created, ...prev])
              setOpenedConversation(created.id)
              // L'échange ne se ferme plus : la relecture de l'activité Hermes
              // se déclenche donc ici, au moment où un fil naît.
              refreshHermesActivity()
            }}
            />
          </div>
        </div>
      )}

      {picker === 'source' && (
        <div className="picker-overlay" role="dialog" aria-modal="true" onClick={() => setPicker(null)}>
          <div className="picker-modal" onClick={(event) => event.stopPropagation()}>
            <div className="picker-head"><h3>Ajouter un document</h3><button type="button" className="picker-close" aria-label="Fermer" onClick={() => setPicker(null)}><X size={17} /></button></div>
            <label className="picker-drop">
              <Upload size={20} />
              <span>Choisir un fichier sur votre ordinateur</span>
              <input type="file" multiple hidden onChange={(event) => { if (event.target.files) void uploadSources(Array.from(event.target.files)) }} />
            </label>
            {availableShared.length > 0 && <div className="picker-or">ou dans le travail partagé par l'équipe</div>}
            {searchableShared && (
              <div className="picker-search">
                <Search size={16} />
                <input
                  type="search"
                  value={sharedQuery}
                  onChange={(event) => setSharedQuery(event.target.value)}
                  placeholder="Métier, auteur ou nom du fichier"
                  aria-label="Rechercher dans le travail partagé"
                />
              </div>
            )}
            {availableShared.length > 0 && (
              <div className="picker-scroll">
                {sharedGroups.length === 0 && <p className="picker-empty">Aucune ressource partagée ne correspond à « {sharedQuery.trim()} ».</p>}
                {sharedGroups.map((group) => (
                  <div className="picker-group" key={group.key}>
                    <span className="picker-group-label">{group.label}</span>
                    <div className="picker-list">{group.items.map((item) => (
                      <button type="button" key={item.id} className="picker-row" onClick={() => borrowResource(item)}>
                        <span className="picker-row-ic">{item.kind === 'artefact' ? <FileCheck2 size={17} /> : <Database size={17} />}</span>
                        <span className="picker-row-main"><strong>{item.name}</strong><small>{item.ownerName} · {item.meta}</small></span>
                        <span className="picker-row-add"><Plus size={17} /></span>
                      </button>
                    ))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {avatarOpen && profile && (
        <AvatarConfigModal
          agent={agent}
          value={profile.avatar}
          portrait={profile.portrait}
          onClose={() => setAvatarOpen(false)}
          onSave={saveAvatar}
        />
      )}

      {picker === 'automation' && (
        <AutomationCreateModal
          lockedAgentId={agent.id}
          lockedAgentName={agent.name}
          onCreated={(created) => { setAutomations((prev) => [created, ...prev]); setPicker(null) }}
          onClose={() => setPicker(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Supprimer cette routine ?"
          message={`« ${toDelete.name} » ne se déclenchera plus. Cette action est définitive.`}
          confirmLabel="Supprimer"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}
