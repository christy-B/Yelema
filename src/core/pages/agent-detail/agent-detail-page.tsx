import { Activity, ArrowLeft, Blocks, Check, CircleCheckBig, ClipboardList, Database, Download, FileCheck2, Gauge, LineChart, Maximize2, Minimize2, Pause, Play, Pencil, Plus, Repeat, Search, Sparkles, Trash2, Upload, UserCog, Users, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { deleteAgentResource, getAgent, getAgentProfile, listAgentResources, shareAgentResource, updateAgentProfile } from '../../../features/agents/api/api'
import type { AgentAvatarConfig, AgentConnector, AgentDetail, AgentPortrait, AgentProfile, AgentResource, AgentResources } from '../../../features/agents/api/contracts'
import { DETAIL_LABELS, LANGUAGE_LABELS, PERSONALITY_TRAITS, PERSONALITY_TRAITS_MAX, TONE_LABELS } from '../../../features/agents/api/contracts'
import { portraitsOf } from '../../../features/agents/avatar-assets'
import { CHANNEL_META, orderChannels } from '../../../features/agents/channels'
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

type View = 'activite' | 'competences' | 'suivi' | 'profil' | 'connecteurs' | 'drive'
type Picker = null | 'source' | 'connector' | 'automation'
const DAY_MS = 86_400_000
/** Panneau d'échange : largeur d'ouverture, plancher, et bande de page toujours visible. */
const CHAT_WIDTH_DEFAULT = 560
const CHAT_WIDTH_MIN = 360
const CHAT_MARGIN_MIN = 72
const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const WEEK_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Cadrage d'un portrait retenu, appliqué à l'image du rail. */
/** Champs de personnalité : libellé, aide et exemple, décrits une seule fois. */

/** Vues du Drive : ce qui entre, ce qui sort, ce que l'equipe met a disposition. */
type DriveTab = 'sources' | 'partagees' | 'livrables'
/* Les livrables d'abord : c'est ce que l'expert a produit, donc ce qu'on vient
   chercher. Les donnees qu'on lui fournit viennent ensuite. */
const DRIVE_TABS: { key: DriveTab; label: string }[] = [
  { key: 'livrables', label: 'Livrables' },
  { key: 'sources', label: 'Mes données' },
  { key: 'partagees', label: 'Données partagées' },
]
const DRIVE_EMPTY: Record<DriveTab, string> = {
  sources: 'Aucune donnée reliée.',
  partagees: 'Aucun collègue ne partage de donnée pour l’instant.',
  livrables: 'Rien de produit pour l’instant.',
}

const CROP_POSITION: Record<string, string> = { entier: 'center', serre: 'center 6%', buste: 'center 12%', plein: 'center 30%' }

/** « dim. 9 août » — repère de journée, comme dans la maquette. */
const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
const shortDay = (time: number) => dayFormatter.format(new Date(time))

/** « 22:07 » — l'heure seule suffit, le jour est porté par le groupe. */
const hourFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const hourOf = (iso: string) => hourFormatter.format(new Date(iso))

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
  /** Contenu affiché dans le Drive : ce qui entre, ou ce qui sort. */
  const [drive, setDrive] = useState<DriveTab>('livrables')
  /** Ressource dont la suppression est en attente de confirmation. */
  const [toRemove, setToRemove] = useState<AgentResource | null>(null)
  /** Filtre d'état de l'accueil. « all » en tête : c'est la vue par défaut. */
  const [stateFilter, setStateFilter] = useState<ConversationStatus | 'all'>('all')
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  /** Une saisie attend d'etre ecrite : declenche l'enregistrement differe. */
  const [profileDirty, setProfileDirty] = useState(false)
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
   * Tâches du jour par jour, filtre d'état appliqué. Le regroupement par date
   * vient de la maquette : il donne le rythme de travail, ce qu'une liste à
   * plat ne montre pas.
   */
  const activityDays = useMemo(() => {
    const retenues = stateFilter === 'all'
      ? activityConversations
      : activityConversations.filter((item) => (item.status ?? 'done') === stateFilter)
    const sorted = [...retenues].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    const days: { label: string; items: ConversationSummary[] }[] = []
    for (const item of sorted) {
      const label = shortDay(Date.parse(item.updatedAt))
      const last = days[days.length - 1]
      if (last && last.label === label) last.items.push(item)
      else days.push({ label, items: [item] })
    }
    return days
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

  /**
   * Enregistrement automatique. Il n'y a plus de bouton : attendre une action
   * explicite pour un ecran de reglages n'apportait rien, et un reglage change
   * mais non enregistre est un piege. On laisse retomber la frappe avant
   * d'ecrire, sinon chaque caractere partirait au serveur.
   */
  useEffect(() => {
    if (!profileDirty || !profile) return
    const timer = window.setTimeout(() => {
      setSavingProfile(true)
      void updateAgentProfile(agentId, profile)
        .then((saved) => { setProfileDirty(false); setProfile(saved); setProfileSaved(true) })
        .catch(() => undefined)
        .finally(() => setSavingProfile(false))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [profileDirty, profile, agentId])

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
  /** Les pieces de la vue courante du Drive. */
  const driveItems = drive === 'partagees'
    ? (shared?.shared ?? []).filter((item) => item.kind === 'source')
    : (shared?.own ?? []).filter((item) => (drive === 'livrables' ? item.kind === 'artefact' : item.kind === 'source'))

  /** Partage d'une piece : le serveur tranche, l'ecran suit sa reponse. */
  const toggleShare = async (item: AgentResource) => {
    const updated = await shareAgentResource(agent.id, item.id, !item.shared).catch(() => null)
    if (!updated) return
    setShared((current) => current ? { ...current, own: current.own.map((piece) => piece.id === item.id ? updated : piece) } : current)
  }

  const removeResource = async (item: AgentResource) => {
    await deleteAgentResource(agent.id, item.id).catch(() => undefined)
    setShared((current) => current ? { ...current, own: current.own.filter((piece) => piece.id !== item.id) } : current)
    setToRemove(null)
  }

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
  const downloadArtefact = (id: string, title: string) => void downloadLivrable(id).then((r) => r.blob()).then((b) => {
    const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = title; a.click(); URL.revokeObjectURL(url)
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

  const patchProfile = (patch: Partial<AgentProfile>) => {
    setProfile((prev) => prev ? { ...prev, ...patch } : prev)
    setProfileSaved(false)
    setProfileDirty(true)
  }
  // Le portrait s'enregistre seul : il se règle dans sa fenêtre, pas dans le formulaire.
  const saveAvatar = async (next: AgentAvatarConfig, retained: AgentPortrait | null) => {
    if (!profile) return
    const saved = await updateAgentProfile(agent.id, { ...profile, avatar: next, portrait: retained }).catch(() => null)
    if (saved) setProfile(saved)
  }
  const views: { key: View; icon: ReactNode; label: string }[] = [
    { key: 'activite', icon: <ClipboardList size={16} />, label: 'Accueil' },
    { key: 'competences', icon: <Sparkles size={16} />, label: 'Compétences' },
    { key: 'suivi', icon: <LineChart size={16} />, label: 'Suivi' },
  ]
  // Toutes les entrées du rail changent la vue principale — aucun comportement à part.
  // Aucun compteur dans la navigation : un nombre a cote d'un libelle attire
  // l'oeil sans rien apprendre, et vieillit mal des que la liste s'allonge.
  const manageViews: { key: View; icon: ReactNode; label: string }[] = [
    { key: 'profil', icon: <UserCog size={16} />, label: 'Profil' },
    { key: 'connecteurs', icon: <Blocks size={16} />, label: 'Intégrations' },
    // Un seul espace de fichiers : ce dont l'expert se sert et ce qu'il produit
    // sont deux moments du meme travail, les separer obligeait a chercher deux
    // fois.
    { key: 'drive', icon: <Database size={16} />, label: 'Drive' },
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
              <h2>Intégrations</h2>
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

        {view === 'drive' && (
          <>
            <div className="wk-view-head">
              <h2>Drive</h2>
            </div>

            {/* TROIS vues, jamais empilees : avec cent sources de l'expert,
                les sources partagees disparaissaient sous la liste. On choisit
                ce qu'on regarde. L'ajout flotte a droite de la barre, la ou se
                placent les actions. */}
            <div className="drive-bar">
              <div className="wk-filters" role="tablist" aria-label="Contenu du Drive">
                {DRIVE_TABS.map((entry) => (
                  <button
                    type="button"
                    key={entry.key}
                    role="tab"
                    aria-selected={drive === entry.key}
                    className={drive === entry.key ? 'wk-filter is-on' : 'wk-filter'}
                    onClick={() => setDrive(entry.key)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            {/* L'ajout ne concerne que les donnees de l'expert, et il se place
                juste au-dessus de la liste qu'il alimente. */}
            {drive === 'sources' && (
              <div className="drive-actions">
                {/* Une commande visible : c'est le seul geste de cette vue, on
                    ne doit pas avoir a le chercher. */}
                <Button leadingIcon={<Plus size={17} />} onClick={() => { setSharedQuery(''); setPicker('source') }}>
                  Ajouter un document
                </Button>
              </div>
            )}

            {driveItems.length === 0 ? (
              <p className="act-empty">{DRIVE_EMPTY[drive]}</p>
            ) : (
              <div className="wk-rows drive-rows">
                {driveItems.map((item) => (
                  <div key={item.id} className="expert-list-row expert-list-row--static">
                    <span className="expert-list-icon">{item.kind === 'artefact' ? <FileCheck2 size={17} /> : <Database size={17} />}</span>
                    <span className="expert-list-main"><strong>{item.name}</strong><small>{item.meta}</small></span>
                    {drive === 'partagees' && <span className="wk-owner">{item.ownerName}</span>}
                    <span className="expert-list-meta">{item.size}</span>
                    {/* Les pieces d'un collegue ne se pilotent pas d'ici : elles
                        appartiennent a quelqu'un d'autre. */}
                    {drive !== 'partagees' && (
                      <>
                        {/* Une commande nommee, pas un interrupteur : le rail
                            gris ne disait ni ce qu'il declenchait, ni avec
                            qui. L'etat se lit dans le libelle. */}
                        <button
                          type="button"
                          className={item.shared ? 'drive-share is-on' : 'drive-share'}
                          aria-pressed={item.shared}
                          title={item.shared ? 'Retirer du partage avec les autres experts' : 'Partager avec les autres experts'}
                          onClick={() => void toggleShare(item)}
                        >
                          {item.shared ? <><Check size={12} />Partagé</> : <><Users size={12} />Partager</>}
                        </button>
                        {item.kind === 'artefact' && (
                          <button type="button" className="expert-list-action" aria-label={`Télécharger « ${item.name} »`} onClick={() => downloadArtefact(item.id, item.name)}>
                            <Download size={16} />
                          </button>
                        )}
                        <button type="button" className="expert-list-action" aria-label={`Supprimer « ${item.name} »`} onClick={() => setToRemove(item)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'profil' && (
          <>
            {/* En-tete : identite a gauche, portraits a droite. Le choix du
                visage rouvre la configuration d'avatar, qui existe deja. */}
            <div className="pf-head">
              <div className="pf-id">
                {/* Son etat seul : la langue se regle plus bas, elle n'a pas
                    a occuper l'en-tete de sa fiche. */}
                {/* Son etat seul : la langue se regle plus bas dans la
                    meme page, elle n'a pas a occuper l'en-tete. */}
                <span className={profile?.active === false ? 'pf-eyebrow is-off' : 'pf-eyebrow'}>
                  <i aria-hidden="true" />{profile?.active === false ? 'Hors service' : 'En service'}
                </span>
                <h2>{agent.name}</h2>
                {agent.tags[0] && <p className="pf-role">{agent.tags[0]}</p>}
              </div>
              {/* Tous les cadrages livres pour cet expert : plan large et
                  portraits. Celui qui est retenu s'affiche partout ou l'usage
                  demande ce cadrage. */}
              <div className="pf-faces">
                <div className="pf-faces-row">
                  {portraitsOf(agent.name).map((choice) => (
                    <button
                      type="button"
                      key={choice.key}
                      className={profile?.portrait?.url === choice.url ? 'pf-face-pick is-on' : 'pf-face-pick'}
                      aria-pressed={profile?.portrait?.url === choice.url}
                      title={choice.label}
                      onClick={() => patchProfile({ portrait: { url: choice.url, crop: choice.variant === 'square' ? 'buste' : 'entier' } })}
                    >
                      <img className={choice.variant === 'square' ? 'pf-face pf-face--square' : 'pf-face'} src={choice.url} alt={choice.label} />
                    </button>
                  ))}
                </div>
                <button type="button" className="pf-faces-action" onClick={() => setAvatarOpen(true)}>
                  <Sparkles size={14} /> Générer un autre visage
                </button>
              </div>
            </div>
            {!profile ? <p className="act-empty">Réglages indisponibles pour l'instant.</p> : (
              <div className="wk-form">
                {/* Integration des canaux : des cartes portant le logo du
                    service — on branche l'expert la ou l'equipe parle deja. */}
                <section className="pf-block">
                  <h3>Intégration des canaux</h3>
                  <p>Branchez {agent.name} là où votre équipe échange déjà.</p>
                  <div className="pf-channels" role="group" aria-label="Canaux de déploiement">
                    {orderChannels(agent.channels).map((option) => {
                      const meta = CHANNEL_META[option]
                      const logo = meta ? CONNECTOR_LOGOS[meta.logo] : undefined
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
                          className={on ? 'pf-channel is-on' : 'pf-channel'}
                          onClick={() => patchProfile({
                            channels: on
                              ? (last ? profile.channels : profile.channels.filter((value) => value !== option))
                              : [...profile.channels, option],
                          })}
                        >
                          {on && <span className="pf-channel-tick"><Check size={12} /></span>}
                          <span className="pf-channel-logo">{logo ? <img src={logo} alt="" /> : <Blocks size={20} />}</span>
                          {meta?.label ?? option}
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="wk-settings">
                  <button type="button" className="wk-set-row wk-set-row--action" aria-pressed={profile.shareResources} onClick={() => patchProfile({ shareResources: !profile.shareResources })}>
                    <span className="wk-set-txt">
                      <strong>Partage de son travail</strong>
                      <small>{profile.shareResources ? 'Ses sources et ses livrables servent à toute l’équipe.' : 'Ses sources et ses livrables restent dans son espace.'}</small>
                    </span>
                    <span className={profile.shareResources ? 'switch is-on' : 'switch'}><b /></span>
                  </button>
                </section>

                {/* A plat, dans la meme carte que les autres reglages. Le
                    depliant disait « Ton » sur son en-tete puis « Ton » sur sa
                    premiere ligne, et « Personnalite » n'abritait plus qu'un
                    seul reglage : deux raisons de s'en passer. */}
                <section className="wk-settings">
                  <div className="wk-set-row">
                    <span className="wk-set-txt"><strong>Ton</strong></span>
                    <div className="pf-opts">
                      {Object.entries(TONE_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={profile.tone === key ? 'pf-opt is-on' : 'pf-opt'}
                          aria-pressed={profile.tone === key}
                          onClick={() => patchProfile({ tone: key as AgentProfile['tone'] })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="wk-set-row">
                    <span className="wk-set-txt"><strong>Longueur des réponses</strong></span>
                    <div className="pf-opts">
                      {Object.entries(DETAIL_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={profile.detail === key ? 'pf-opt is-on' : 'pf-opt'}
                          aria-pressed={profile.detail === key}
                          onClick={() => patchProfile({ detail: key as AgentProfile['detail'] })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="wk-set-row">
                    <span className="wk-set-txt"><strong>Langue</strong></span>
                    <div className="pf-opts">
                      {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={profile.language === key ? 'pf-opt is-on' : 'pf-opt'}
                          aria-pressed={profile.language === key}
                          onClick={() => patchProfile({ language: key as AgentProfile['language'] })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Huit choix ne tiennent pas au bout d'une ligne : celui-la
                      passe sous son libelle. */}
                  <div className="wk-set-row wk-set-row--stack">
                    <span className="wk-set-txt">
                      <strong>Caractère</strong>
                      <small>Comment il aborde le travail — {PERSONALITY_TRAITS_MAX} au maximum, {profile.personality.traits.length} choisi{profile.personality.traits.length > 1 ? 's' : ''}.</small>
                    </span>
                    <div className="pf-opts pf-opts--wrap">
                      {PERSONALITY_TRAITS.map((trait) => {
                        const chosen = profile.personality.traits.includes(trait.key)
                        // Au-dela du maximum on bloque l'ajout, jamais le retrait.
                        const full = !chosen && profile.personality.traits.length >= PERSONALITY_TRAITS_MAX
                        return (
                          <button
                            key={trait.key}
                            type="button"
                            className={chosen ? 'pf-opt is-on' : 'pf-opt'}
                            aria-pressed={chosen}
                            disabled={full}
                            title={trait.hint}
                            onClick={() => patchProfile({
                              personality: {
                                traits: chosen
                                  ? profile.personality.traits.filter((key) => key !== trait.key)
                                  : [...profile.personality.traits, trait.key],
                              },
                            })}
                          >
                            {trait.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </section>

                <section className="wk-settings wk-settings--stack">
                  <label className="wk-set-txt" htmlFor="wk-instructions">
                    <strong>Consignes permanentes</strong>
                  </label>
                  <textarea id="wk-instructions" className="wk-textarea" rows={2} maxLength={2000} value={profile.instructions} onChange={(event) => patchProfile({ instructions: event.target.value })} placeholder="Ex. toujours vouvoyer, montants en FCFA, ne s'engager sur un délai qu'après validation." />
                  <span className="wk-count">{profile.instructions.length} / 2000</span>
                </section>

                <section className="wk-settings">
                  <button type="button" className="wk-set-row wk-set-row--action" aria-pressed={profile.active} onClick={() => patchProfile({ active: !profile.active })}>
                    <span className="wk-set-txt">
                      <strong>{agent.name} en service</strong>
                      <small>Hors service, {agent.gender === 'f' ? 'elle' : 'il'} suspend ses routines et ses réponses.</small>
                    </span>
                    <span className={profile.active ? 'switch is-on' : 'switch'}><b /></span>
                  </button>
                </section>

                {/* Pas de bouton : l'ecran s'enregistre seul. Reste la trace
                    de ce qui vient d'etre ecrit, sans quoi on douterait. */}
                {(savingProfile || profileSaved) && (
                  <p className="wk-autosave">
                    {savingProfile ? 'Enregistrement…' : <><Check size={14} /> Enregistré</>}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {view === 'activite' && (
          <div className="wk-conversation">
            <div className="wk-chat-block">
              <div className="wk-chat-head">
                <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} variant="square" className="chat-modal-av" />
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
          </div>
        )}
      </main>

      {/* Colonne de droite : ce que l'expert a fait, et ce qu'il fait tout seul.
          La conversation occupe le centre — c'est elle qu'on vient chercher. */}
      {view === 'activite' && !chatFull && (
        <aside className="wk-side wk-side--work" style={{ ['--side-w' as string]: `${chatWidth}px` }}>
          <div
            className="wk-side-grip"
            role="separator"
            aria-label="Largeur de la colonne"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              resizeBy(event.key === 'ArrowLeft' ? 40 : -40)
            }}
          />
          <div className="wk-side-scroll">
          {/* Journal d'activité : un en-tête, des filtres portant leur
              compte, puis les tâches groupées par jour. Chaque ligne se réduit
              à l'essentiel — une pastille d'état, un intitulé, une heure. */}
          <section className="act">
            <div className="act-head"><ClipboardList size={14} aria-hidden="true" /><h2>Activité</h2></div>

            <div className="act-chips" role="tablist" aria-label="Filtrer par état">
              {statusGroups.map((group) => (
                <button
                  type="button"
                  key={group.key}
                  role="tab"
                  aria-selected={stateFilter === group.key}
                  className={stateFilter === group.key ? `act-chip is-${group.key} is-on` : `act-chip is-${group.key}`}
                  onClick={() => setStateFilter((current) => (current === group.key ? 'all' : group.key))}
                >
                  <b>{group.items.length}</b>{group.plural}
                </button>
              ))}
            </div>

            {activityDays.length === 0 ? (
              <p className="act-blank">Aucune activité récente.</p>
            ) : activityDays.map((day) => (
              <div className="act-day" key={day.label}>
                <div className="act-day-label">{day.label}</div>
                {day.items.map((item) => (
                  <button type="button" key={item.id} className="act-row" onClick={() => openConversation(item.id)}>
                    <i aria-hidden="true" className={`is-${item.status ?? 'done'}`} />
                    <span className="act-row-title">{item.title}</span>
                    <em>{hourOf(item.updatedAt)}</em>
                  </button>
                ))}
              </div>
            ))}
          </section>

          <section className="wk-routines">
            {/* Meme en-tete que l'activite : icone, titre, action a droite. */}
            <div className="act-head">
              <Repeat size={14} aria-hidden="true" />
              <h2>Routines <em>({activeRoutines}/{automations.length})</em></h2>
              <button type="button" className="act-head-action" aria-label="Ajouter une routine" onClick={() => setPicker('automation')}><Plus size={15} /></button>
            </div>
            {automations.length === 0 ? (
              <p className="act-blank">Aucune routine programmée.</p>
            ) : automations.map((routine) => (
              <div key={routine.id} className={routine.active ? 'wk-routine' : 'wk-routine is-paused'}>
                <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} variant="square" className="wk-routine-av" />
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
              <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} variant="square" className="chat-modal-av" />
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

      {toRemove && (
        <ConfirmDialog
          title="Supprimer cette ressource ?"
          message={`« ${toRemove.name} » sera retirée de l'espace de ${agent.name}, et de ceux qui y avaient accès par partage.`}
          confirmLabel="Supprimer"
          onConfirm={() => void removeResource(toRemove)}
          onCancel={() => setToRemove(null)}
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
