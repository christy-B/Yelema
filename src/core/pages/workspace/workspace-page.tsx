import { ArrowRight, ChevronDown, X, Sparkles, Image as ImageIcon, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { listMarketplaceAgents } from '../../../features/agents/api/api'
import type { AgentSummary } from '../../../features/agents/api/contracts'
import { listConversations } from '../../../features/conversations/api/api'
import { Card } from '../../../shared/components/card/card'
import { Button } from '../../../shared/components/button/button'
import { CustomExpertModal } from '../../../shared/components/custom-expert-modal/custom-expert-modal'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'
import { ONBOARDING_SEEN_KEY } from '../onboarding/onboarding-page'

/**
 * Mots outils du francais : ils n'apportent rien a une recherche et, laisses
 * dans la requete, feraient correspondre n'importe quel expert.
 */
const STOP_WORDS = new Set([
  'les', 'des', 'une', 'aux', 'pour', 'avec', 'dans', 'que', 'qui', 'quoi', 'dont', 'sur', 'par',
  'mes', 'mon', 'ton', 'ses', 'son', 'nos', 'vos', 'leur', 'nous', 'vous', 'ils', 'elle', 'elles',
  'est', 'sont', 'suis', 'etre', 'avoir', 'fait', 'faire', 'peut', 'veux', 'veut', 'vouloir',
  'besoin', 'expert', 'agent', 'quelqu', 'quelque', 'chose', 'plus', 'tout', 'tous', 'toute',
  'cette', 'celui', 'comme', 'afin', 'ainsi', 'donc', 'mais', 'pas', 'non', 'oui', 'ai', 'me',
  'cherche', 'chercher', 'gerer', 'gere', 'trouver', 'aide', 'aider',
])

/**
 * Racine grossière d'un mot : ses six premières lettres au plus, jamais moins
 * de quatre, et toujours plus courte que le mot lui-même.
 *
 * Deux raisons. D'abord les pluriels : la comparaison par sous-chaîne est à
 * sens unique, « recrutements » ne se trouve pas dans « recrutement » — mais
 * « recrut » s'y trouve. Ensuite les familles de mots : « directeur » et
 * « direction » ne partagent que « direct », et sans cette coupe la Chief of
 * Staff ne remontait pas sur « organiser les réunions du directeur ».
 */
const stem = (word: string) => word.slice(0, Math.max(4, Math.min(word.length - 1, 6)))

const normalize = (value: string) => value.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '')

export function WorkspacePage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [conversationCount, setConversationCount] = useState(0)
  const [marketplace, setMarketplace] = useState<AgentSummary[]>([])
  const [need, setNeed] = useState('')
  const [metier, setMetier] = useState('all')
  /**
   * `need` est ce qui est tape, `query` ce qui est cherche. Les separer est
   * tout l'objet du changement : sans cela le catalogue se vidait a la
   * deuxieme lettre et se remplissait a la cinquieme.
   */
  const [query, setQuery] = useState('')
  /** Expert choisi dans la liste des noms. Vide = tous. */
  const [pickedAgent, setPickedAgent] = useState('')
  const [namesOpen, setNamesOpen] = useState(false)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  // Commander un metier absent du catalogue : la demande part au cadrage,
  // elle ne recrute personne.
  const [customOpen, setCustomOpen] = useState(false)
  const hasConversations = conversationCount > 0

  useEffect(() => {
    void listMarketplaceAgents().then(setMarketplace).catch(() => setMarketplace([]))
  }, [retryKey])

  // Le nombre de conversations ne sert qu'à savoir si le membre a déjà démarré
  // (redirection vers la présentation à la première visite).
  useEffect(() => {
    void listConversations()
      .then((items) => { setConversationCount(items.length); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [retryKey])

  // Grands groupes de métier présents au catalogue, avec leur nombre d'experts.
  // Un filtre rassemble ainsi plusieurs experts, au lieu d'un seul par métier.
  const chips = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const agent of marketplace) {
      const group = agent.group
      if (!group) continue
      const entry = counts.get(group.key) ?? { name: group.name, count: 0 }
      entry.count += 1
      counts.set(group.key, entry)
    }
    return [
      { id: 'all', name: 'Tous les agents', count: marketplace.length },
      ...[...counts].map(([key, entry]) => ({ id: key, name: entry.name, count: entry.count })),
    ]
  }, [marketplace])

  /**
   * Le besoin est décrit, pas dicté : on cherche donc mot à mot, et non la
   * phrase entière comme une sous-chaîne — « quelqu'un pour relancer mes
   * impayés » ne figure littéralement dans aucune fiche. Les mots trop courts
   * et les mots outils sont écartés : sans cela « je », « pour », « mes »
   * feraient correspondre tout le catalogue.
   */
  /**
   * Experts correspondant a une phrase, filtres du metier et du nom compris.
   * Extraite du rendu pour que la validation puisse savoir, AVANT de rendre,
   * s'il faut proposer un expert sur mesure.
   */
  const matches = (text: string): AgentSummary[] => {
    const terms = normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    const filtered = marketplace.filter((agent) => (
      (metier === 'all' || agent.group?.key === metier)
      && (!pickedAgent || agent.id === pickedAgent)
    ))
    if (terms.length === 0) return filtered

    return filtered
      .map((agent) => {
        const identity = normalize(`${agent.name} ${agent.tags.join(' ')}`)
        const corpus = `${identity} ${normalize(`${agent.description} ${(agent.keywords ?? []).join(' ')}`)}`
        // Un mot trouvé dans le nom ou le métier pèse plus qu'un mot trouvé
        // au fond d'une description : c'est le coeur de la fiche.
        let score = 0
        let core = false
        for (const term of terms) {
          const root = stem(term)
          if (identity.includes(root)) {
            score += 3
            core = true
          } else if (corpus.includes(root)) {
            score += 1
          }
        }
        return { agent, score, core }
      })
      // Un seul mot attrapé au fond d'une description ne fait pas une réponse :
      // il masquerait le fait que le catalogue ne couvre pas le besoin.
      .filter((entry) => entry.core || entry.score >= 2)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.agent)
  }


  /**
   * Chercher sans rien trouver n'est pas une impasse : le catalogue ne couvre
   * pas tout, et c'est précisément là qu'un expert sur mesure se commande. La
   * fenêtre s'ouvre à la validation, jamais pendant la frappe.
   */
  // Sans memoisation : le catalogue tient en une quinzaine d'experts, et un
  // tableau de dependances autour d'une fonction locale se perime en silence.
  const shown = matches(query)

  /**
   * La recherche part ici, pas a la frappe. Et si elle ne trouve rien, la
   * commande d'un expert sur mesure s'ouvre : le catalogue ne couvre pas tout,
   * et c'est le moment ou ca se voit.
   */
  const submitNeed = () => {
    const asked = need.trim()
    setQuery(asked)
    if (!asked) return
    if (matches(asked).length === 0) setCustomOpen(true)
  }

  // Session restaurée (rafraîchissement, nouvel onglet) : un membre sans aucune
  // conversation qui n'a pas encore vu la présentation y est conduit d'abord.
  if (status === 'ready' && !hasConversations && !sessionStorage.getItem(ONBOARDING_SEEN_KEY)) {
    return <Navigate to={paths.onboarding(workspaceId)} replace />
  }

  return (
    <div className="home-page">
      <header className="home-hero home-hero--recruit">
        <h1>Qui sera votre prochaine recrue ?</h1>
        <p>Décrivez votre besoin — ou parcourez les experts IA prêts à rejoindre votre équipe.</p>
        <form className="need-form" onSubmit={(event) => { event.preventDefault(); submitNeed() }}>
          <input
            className="need-input"
            aria-label="Décrivez l'expert IA dont vous avez besoin"
            placeholder="Décrivez l'expert IA dont vous avez besoin…"
            value={need}
            onChange={(event) => {
              setNeed(event.target.value)
              if (!event.target.value.trim()) setQuery('')
            }}
          />
          <button type="submit" className="need-go" aria-label="Rechercher"><ArrowRight size={19} /></button>
        </form>
      </header>

      <div className="home-body">
        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}

        {marketplace.length > 0 && (
          <section className="market-section">
            <div className="market-label">{need.trim() ? 'Experts IA correspondants' : "Choisissez un expert prêt à l'emploi"}</div>

            <div className="chip-row">
              {/* « Tous les agents », le nom, puis les metiers : on choisit qui
                  avant de se restreindre a un metier. */}
              {chips.slice(0, 1).map((chip) => (
                <button key={chip.id} type="button" className={metier === chip.id ? 'chip is-active' : 'chip'} onClick={() => setMetier(chip.id)}>
                  {chip.name}
                  <span className="chip-count">{chip.count}</span>
                </button>
              ))}
              {/* Vide, il montre son libelle ; renseigne, il porte le nom
                  choisi et sa croix. Pas d'etat « tous » : ce serait le meme
                  ensemble que la pastille « Tous les agents », juste a cote. */}
              <span className="name-pick">
                {pickedAgent ? (
                  <span className="chip is-active">
                    {marketplace.find((agent) => agent.id === pickedAgent)?.name}
                    <button type="button" aria-label="Effacer le nom choisi" onClick={() => setPickedAgent('')}><X size={13} /></button>
                  </span>
                ) : (
                  <button type="button" className="chip" onClick={() => setNamesOpen((open) => !open)}>
                    Nom de l’agent<ChevronDown size={14} />
                  </button>
                )}
                {namesOpen && !pickedAgent && (
                  <>
                    <span className="name-veil" onClick={() => setNamesOpen(false)} />
                    <span className="name-menu">
                      {[...marketplace].sort((left, right) => left.name.localeCompare(right.name, 'fr')).map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => { setPickedAgent(agent.id); setNamesOpen(false) }}
                        >
                          {agent.name}<small>{agent.tags[0] ?? ''}</small>
                        </button>
                      ))}
                    </span>
                  </>
                )}
              </span>
              {chips.slice(1).map((chip) => (
                <button key={chip.id} type="button" className={metier === chip.id ? 'chip is-active' : 'chip'} onClick={() => setMetier(chip.id)}>
                  {chip.name}
                  <span className="chip-count">{chip.count}</span>
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <div className="agents-empty">
                <strong>Aucun expert IA ne correspond</strong>
                <span>Reformulez votre besoin, choisissez un autre métier — ou demandez-nous cet expert.</span>
                <Button variant="tertiary" size="small" leadingIcon={<Sparkles size={15} />} onClick={() => setCustomOpen(true)}>
                  Commander un expert sur mesure
                </Button>
              </div>
            ) : (
              <div className="agent-grid">
                {shown.map((agent) => (
                  <Card key={agent.id} interactive className="agent-card" onClick={() => navigate(paths.marketplaceAgent(agent.id, workspaceId))}>
                    <div className="agent-card-photo">
                      {agent.avatarUrl
                        ? <img className="agent-card-cover" src={agent.avatarUrl} alt="" />
                        : <div className="agent-card-photo-empty"><ImageIcon size={30} strokeWidth={1.6} /><span className="agent-card-photo-label">Photo</span></div>}
                      <div className="agent-card-overlay">
                        <h2>{agent.name}</h2>
                        {agent.tags[0] && <span className="agent-card-metier">{agent.tags[0]}</span>}
                        <p>{agent.description}</p>
                        <span className="market-recruit"><UserPlus size={15} /> Recruter {agent.name}</span>
                      </div>
                    </div>
                  </Card>
                ))}
                {/* Le catalogue ne couvre pas tout : la sortie de secours est
                    dans la grille, la ou le manque se constate. */}
                <button type="button" className="agent-card-add" onClick={() => setCustomOpen(true)}>
                  <span className="agent-card-add-mark"><Sparkles size={22} /></span>
                  <strong>Vous ne trouvez pas ?</strong>
                  <span>Commander un expert sur mesure</span>
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {customOpen && <CustomExpertModal initialNeed={need} onClose={() => setCustomOpen(false)} />}
    </div>
  )
}
