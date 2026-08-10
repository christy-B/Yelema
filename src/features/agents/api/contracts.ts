export type ToolType = 'dust-agent' | 'native-agent' | 'n8n-workflow' | 'openclaw'

export interface AgentSummary {
  id: string
  name: string
  type?: ToolType
  icon: string
  description: string
  tags: string[]
  /**
   * Grand groupe de métier — Clients & Revenus, Finance & Juridique… Il
   * rassemble plusieurs experts et sert aux filtres du catalogue, là où
   * `tags[0]` porte le métier propre à l'expert.
   */
  group?: { key: string; name: string } | null
  /** Canaux où l'expert est joignable (web, whatsapp, slack…). */
  channels: string[]
  /** Portrait de l'employé IA — fourni par le back-office (pas encore prêt) ; sinon avatar généré. */
  avatarUrl?: string | null
}

/**
 * Un skill rattaché à un employé IA : c'est LUI qui porte ses inputs et ses
 * outputs — la fiche de l'employé IA les agrège (jamais saisis à plat).
 */
export interface AgentSkill {
  key: string
  label: string
  description: string
  inputs: string[]
  outputs: string[]
}

/** Connecteur (source de données) branché à l'expert IA — affiché sur sa fiche. */
export interface AgentConnector {
  provider: string
  name: string
}

/** Un livrable affiché sur la fiche (« Ce qu'il produit ») — dérivé des outputs des skills. */
export interface AgentProduct {
  /** Le skill d'origine du livrable. */
  format: string
  title: string
}

/** Un message de la mini-conversation de démo (« En action »). */
export interface AgentConversationBubble {
  dir: 'in' | 'out'
  text: string
}

/** Démo « En action » : mise en situation + valeur ajoutée + conversation. */
export interface AgentUsecase {
  enAction: string
  valeur: string
  conversation: AgentConversationBubble[]
}

export interface AgentDetail extends AgentSummary {
  /** Genre de la persona — accord « il / elle » dans la fiche. */
  gender: 'f' | 'm'
  /** Descriptif long de l'employé IA. */
  long: string
  /** Fonction détaillée de l'expert (« Sa fonction »). */
  fonction: string
  /** Ce qu'il fait au quotidien (peut être vide). */
  daily: string[]
  /** Démo « En action ». */
  usecase: AgentUsecase
  /** Les skills rattachés, listés sur la fiche. */
  skills: AgentSkill[]
  /** « Ce dont il a besoin » — union dédupliquée des inputs des skills. */
  inputs: string[]
  /** « Ce qu'il produit » — outputs des skills, rattachés à leur skill. */
  produces: AgentProduct[]
  /** Connecteurs (sources de données) branchés à l'expert. */
  connectors: AgentConnector[]
  /**
   * « Soumis à votre accord » — les actions de cet expert qui exigent une
   * validation humaine. Fixées au cadrage, fonction par fonction : la liste se
   * lit sans se modifier, elle figure dans la fiche de poste signée.
   */
  approvals: string[]
}

/**
 * Réglages de personnalité d'un expert IA, propres à l'organisation : ils
 * conditionnent la façon dont il s'exprime et travaille, sans toucher à ses
 * compétences (celles-ci lui sont intrinsèques).
 */
export type AgentTone = 'direct' | 'chaleureux' | 'formel'
export type AgentLanguage = 'fr' | 'en' | 'bilingue'
export type AgentDetailLevel = 'court' | 'standard' | 'detaille'

/**
 * Portrait d'un expert, réglé par l'organisation. Chaque axe porte une valeur
 * « auto » : l'organisation laisse alors le choix à Yelema. Le portrait lui-même
 * est produit côté plateforme ; l'espace client porte la demande.
 */
export type AvatarPosition = 'auto' | 'face' | 'trois-quarts' | 'profil' | 'bras-croises' | 'assis' | 'marche' | 'reunion'
export type AvatarStyle = 'auto' | 'casual' | 'smart-casual' | 'blazer' | 'business' | 'traditionnel' | 'terrain' | 'ceremonie'
export type AvatarAccessory = 'auto' | 'aucun' | 'casque' | 'ordinateur' | 'tablette' | 'telephone' | 'documents' | 'badge' | 'lunettes'
export type AvatarBackground = 'auto' | 'blanc' | 'beige' | 'gris' | 'violet' | 'bleu' | 'vert' | 'fonce'

export interface AgentAvatarConfig {
  position: AvatarPosition
  style: AvatarStyle
  accessory: AvatarAccessory
  background: AvatarBackground
}

export const AVATAR_POSITION_LABELS: Record<AvatarPosition, string> = {
  auto: 'Auto', face: 'De face', 'trois-quarts': 'De trois quarts', profil: 'De profil',
  'bras-croises': 'Bras croisés', assis: 'Assis', marche: 'En marche', reunion: 'En réunion',
}
export const AVATAR_STYLE_LABELS: Record<AvatarStyle, string> = {
  auto: 'Auto', casual: 'Décontracté', 'smart-casual': 'Ville', blazer: 'Blazer',
  business: 'Costume', traditionnel: 'Traditionnel', terrain: 'Terrain', ceremonie: 'Cérémonie',
}
export const AVATAR_ACCESSORY_LABELS: Record<AvatarAccessory, string> = {
  auto: 'Auto', aucun: 'Aucun', casque: 'Casque', ordinateur: 'Ordinateur',
  tablette: 'Tablette', telephone: 'Téléphone', documents: 'Documents', badge: 'Badge',
  lunettes: 'Lunettes',
}
export const AVATAR_BACKGROUND_LABELS: Record<AvatarBackground, string> = {
  auto: 'Auto', blanc: 'Blanc', beige: 'Beige', gris: 'Gris',
  violet: 'Violet', bleu: 'Bleu', vert: 'Vert', fonce: 'Foncé',
}

/** Teintes de fond, pour l'aperçu et les pastilles de choix. */
export const AVATAR_BACKGROUND_COLORS: Record<AvatarBackground, string> = {
  auto: '#e8e4d8', blanc: '#f6f7f9', beige: '#e4dcc8', gris: '#dfe3ea',
  violet: '#8b6bb1', bleu: '#cfe0f2', vert: '#d6e8d8', fonce: '#39405a',
}

export const DEFAULT_AVATAR_CONFIG: AgentAvatarConfig = {
  position: 'auto', style: 'auto', accessory: 'auto', background: 'auto',
}

/**
 * Fragments de consigne par valeur d'axe. Le portrait est produit à partir de la
 * photo de référence de l'expert et de ces fragments assemblés. Ils vivent ici
 * pour que l'interface, le mock et le back-office parlent des mêmes valeurs ;
 * la formulation définitive appartient à la plateforme.
 */
export const AVATAR_PROMPT_FRAGMENTS = {
  position: {
    auto: '', face: 'facing the camera, centred', 'trois-quarts': 'three-quarter view',
    profil: 'side profile view', 'bras-croises': 'standing with arms crossed',
    assis: 'seated at a desk', marche: 'walking, mid-stride',
    reunion: 'seated at a meeting table, presenting to colleagues',
  } satisfies Record<AvatarPosition, string>,
  style: {
    auto: '', casual: 'casual clothing', 'smart-casual': 'smart casual outfit',
    blazer: 'a blazer over a plain shirt', business: 'a formal business suit',
    traditionnel: 'elegant West African traditional attire',
    terrain: 'field workwear with a high-visibility vest',
    ceremonie: 'formal ceremonial attire',
  } satisfies Record<AvatarStyle, string>,
  accessory: {
    auto: '', aucun: 'no accessories', casque: 'wearing a headset',
    ordinateur: 'holding an open laptop', tablette: 'holding a tablet',
    telephone: 'holding a smartphone', documents: 'holding a folder of documents',
    badge: 'wearing a lanyard badge', lunettes: 'wearing glasses',
  } satisfies Record<AvatarAccessory, string>,
  background: {
    auto: '', blanc: 'plain white background', beige: 'plain beige background',
    gris: 'plain light grey background', violet: 'plain purple background',
    bleu: 'plain light blue background', vert: 'plain sage green background',
    fonce: 'plain dark navy background',
  } satisfies Record<AvatarBackground, string>,
}

/**
 * Cadrage à l'affichage. `entier` = l'image est montrée telle qu'elle a été
 * produite ; c'est le cas des portraits générés, dont le cadrage vient du modèle.
 * Les trois autres valeurs ne servent qu'à distinguer des propositions issues
 * d'une même image (simulation sans clé).
 */
export type PortraitCrop = 'entier' | 'serre' | 'buste' | 'plein'

export interface PortraitVariant {
  id: string
  url: string | null
  crop: PortraitCrop
}

/** Portrait retenu par l'organisation. `null` = le portrait du catalogue. */
export interface AgentPortrait {
  url: string | null
  crop: PortraitCrop
}

/**
 * Une génération de portrait. La production prend quelques secondes : la demande
 * crée un travail, l'interface en suit l'état jusqu'aux propositions.
 */
export interface PortraitJob {
  id: string
  status: 'pending' | 'ready' | 'failed'
  variants: PortraitVariant[]
}

export interface AgentProfile {
  /** Expert en service. Désactivé, il ne répond plus et ses routines sont suspendues. */
  active: boolean
  /**
   * Canaux sur lesquels l'expert est joignable, parmi ceux qu'il prend en
   * charge. Plusieurs sont possibles : un expert peut répondre sur WhatsApp et
   * par courriel à la fois. Au moins un est requis.
   */
  channels: string[]
  tone: AgentTone
  language: AgentLanguage
  detail: AgentDetailLevel
  /** Consignes permanentes, rappelées à chaque échange. */
  instructions: string
  /** Exiger une validation humaine avant tout envoi vers l'extérieur. */
  requireApproval: boolean
  /**
   * L'expert met ses sources de données et ses artefacts à disposition des
   * autres experts de l'organisation. Désactivé, son travail reste dans son
   * espace — le filtrage est appliqué côté serveur.
   */
  shareResources: boolean
  /** Portrait demandé pour cet expert (voir AgentAvatarConfig). */
  avatar: AgentAvatarConfig
  /** Proposition retenue. `null` tant que l'organisation garde le portrait du catalogue. */
  portrait: AgentPortrait | null
}

/** Une ressource d'un expert : un document qu'il exploite, ou un artefact qu'il a produit. */
export interface AgentResource {
  id: string
  name: string
  kind: 'source' | 'artefact'
  /** Nature lisible : « PDF · 28 pages », « Tableau · XLSX »… */
  meta: string
  size: string
  ownerId: string
  ownerName: string
  /** Métier de l'auteur — axe de regroupement dans le sélecteur. */
  ownerMetier: string
}

/** Ce à quoi un expert a accès : ses ressources, plus celles que ses collègues partagent. */
export interface AgentResources {
  own: AgentResource[]
  shared: AgentResource[]
  /** Experts de l'équipe qui gardent leur travail pour leurs propres tâches. */
  withheldBy: string[]
}

export const TONE_LABELS: Record<AgentTone, string> = { direct: 'Direct', chaleureux: 'Chaleureux', formel: 'Formel' }
export const LANGUAGE_LABELS: Record<AgentLanguage, string> = { fr: 'Français', en: 'Anglais', bilingue: 'Bilingue' }
export const DETAIL_LABELS: Record<AgentDetailLevel, string> = { court: 'Court', standard: 'Standard', detaille: 'Détaillé' }

/** Recrutement d'un expert : canal sur lequel il sera joignable en priorité. */
export interface RecruitmentRequest {
  /** Canaux retenus, parmi ceux que l'expert prend en charge. Au moins un. */
  channels: string[]
}

/** Un métier regroupe plusieurs agents (dérivé des suites côté API réelle). */
export interface Metier {
  id: string
  name: string
  agentIds: string[]
}
