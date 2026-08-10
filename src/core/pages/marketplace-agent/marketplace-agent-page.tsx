import { Check, Globe, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { getMarketplaceAgent, recruitAgent } from '../../../features/agents/api/api'
import type { AgentDetail } from '../../../features/agents/api/contracts'
import { CHANNEL_META, DEFAULT_CHANNEL, orderChannels } from '../../../features/agents/channels'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { useSession } from '../../../features/auth/providers/session-context'
import { hermesClientContextFromSession, initializeHermesExpert, isHermesExpert } from '../../../features/conversations/api/hermes'
import { Button } from '../../../shared/components/button/button'
import { ExpertDemoPhone } from '../../../shared/components/expert-demo-phone/expert-demo-phone'
import { ExpertRail } from '../../../shared/components/expert-rail/expert-rail'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { RecruitmentModal } from '../../../shared/components/recruitment-modal/recruitment-modal'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

/**
 * Fiche d'un expert IA du catalogue que l'organisation n'a pas encore recruté :
 * sa présentation, le choix des canaux de déploiement, puis la demande de
 * recrutement. Volontairement dépourvue des raccourcis de travail
 * (conversations, sources…) : ils n'ont de sens qu'une fois l'expert rattaché.
 */
export function MarketplaceAgentPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const { workspaceId = DEFAULT_WORKSPACE_ID, agentId = '' } = useParams()
  const [agent, setAgent] = useState<AgentDetail | null>(null)
  // Plusieurs canaux possibles : l'expert peut etre joignable sur WhatsApp et
  // par courriel a la fois. Au moins un est requis.
  const [channels, setChannels] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  // Mise en place après recrutement. Elle aboutit quand le back a répondu ET que
  // l'écran d'attente est allé au bout : on ne quitte pas la fiche avant les deux.
  const [setup, setSetup] = useState<'idle' | 'running' | 'failed'>('idle')
  const [accepted, setAccepted] = useState(false)
  const [shown, setShown] = useState(false)
  // Change à chaque tentative : sert de `key` à la modale pour que « Réessayer »
  // reparte d'une progression vierge et non de celle figée par l'échec.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!agentId) return
    void getMarketplaceAgent(agentId)
      .then((detail) => {
        setAgent(detail)
        // Le web est coche par defaut : il est operationnel sans configuration.
        const available = orderChannels(detail.channels)
        const start = available.includes(DEFAULT_CHANNEL) ? DEFAULT_CHANNEL : available[0]
        setChannels(start ? [start] : [])
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [agentId, retryKey])

  // Recruté = rattaché à l'équipe : on enchaîne sur son espace, prêt à échanger.
  const submit = async () => {
    if (!agent || setup === 'running' || channels.length === 0) return
    setSetup('running')
    setAccepted(false)
    setShown(false)
    setAttempt((count) => count + 1)
    try {
      await recruitAgent(agent.id, { channels })
      if (session && isHermesExpert(agent.id)) {
        // L'expert ouvre sa conversation en arrière-plan. Sa prise de poste ne
        // doit pas retenir l'utilisateur sur l'écran de provisionnement.
        void initializeHermesExpert(agent.id, hermesClientContextFromSession(session)).catch(() => undefined)
      }
      setAccepted(true)
    } catch {
      setSetup('failed')
    }
  }

  useEffect(() => {
    if (!agent || setup !== 'running' || !accepted || !shown) return
    navigate(paths.agent(agent.id, workspaceId), { replace: true, state: { openChat: true } })
  }, [agent, setup, accepted, shown, navigate, workspaceId])

  // Référence stable : la modale s'en sert en effet de fin de progression.
  const finished = useCallback(() => setShown(true), [])

  if (status === 'error') {
    return <div className="route-loader"><LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} /></div>
  }
  if (!agent) return <div className="route-loader">Chargement de la fiche…</div>

  const elle = agent.gender === 'f'

  return (
    <div className="expert-focus">
      <ExpertRail
        agent={agent}
        back={{ label: "Retour à l'accueil", onClick: () => navigate(paths.workspace(workspaceId)) }}
        showChannels={false}
      />

      <main className="expert-main">
        <div className="expert-work-inner work-fill">
          {agent.fonction && (
            <>
              <div className="expert-eyebrow">Sa fonction</div>
              <p className="work-fonction">{agent.fonction}</p>
              {/* La borne du poste se lit avec le poste, sur une ligne — pas en rubrique. */}
              {agent.approvals.length > 0 && (
                <p className="work-approval">
                  <ShieldCheck size={14} />
                  <span>Votre accord est requis pour : {agent.approvals.join(' · ')}</span>
                </p>
              )}
            </>
          )}

          <div className="work-top">
            <div className="work-top-main">
              {agent.skills.length > 0 && (
                <>
                  <div className="expert-eyebrow">Ses compétences</div>
                  <div className="skill-cols">{agent.skills.map((skill) => (
                    <div key={skill.key} className="skill-item2" title={skill.description}><span className="skill-check"><Sparkles size={13} /></span>{skill.label}</div>
                  ))}</div>
                </>
              )}
              {agent.daily.length > 0 && (
                <>
                  <div className="expert-eyebrow">Ce qu{'’'}{elle ? 'elle' : 'il'} fait au quotidien</div>
                  <ul className="work-daily">{agent.daily.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
                </>
              )}

              {/* Choix des canaux de déploiement — au cœur de la fiche de recrutement.
                  Plusieurs canaux à la fois : c'est un groupe de cases à cocher, et
                  le dernier coché ne peut pas être décoché. */}
              <div className="recruit-block">
                <div className="expert-eyebrow">Canaux de déploiement</div>
                <p className="recruit-note">Sur quels canaux souhaitez-vous rendre {agent.name} joignable ? Modifiable à tout moment.</p>
                <div className="chan-tiles" role="group" aria-label="Canaux de déploiement">
                  {orderChannels(agent.channels).map((option) => {
                    const meta = CHANNEL_META[option]
                    const logo = meta ? CONNECTOR_LOGOS[meta.logo] : undefined
                    const selected = channels.includes(option)
                    const last = selected && channels.length === 1
                    return (
                      <button
                        type="button"
                        key={option}
                        className={selected ? 'chan-tile is-on' : 'chan-tile'}
                        role="checkbox"
                        aria-checked={selected}
                        aria-disabled={last}
                        title={last ? 'Au moins un canal est requis.' : undefined}
                        onClick={() => setChannels((prev) => (
                          prev.includes(option)
                            ? (prev.length === 1 ? prev : prev.filter((value) => value !== option))
                            : [...prev, option]
                        ))}
                      >
                        {selected && <span className="chan-tile-tick"><Check size={12} /></span>}
                        <span className="chan-tile-ic">{logo ? <img src={logo} alt="" /> : <Globe size={24} />}</span>
                        <strong>{meta?.label ?? option}</strong>
                        {meta?.description && <small>{meta.description}</small>}
                      </button>
                    )
                  })}
                </div>

                <div className="recruit-action">
                  <Button leadingIcon={<UserPlus size={16} />} onClick={() => void submit()} disabled={setup === 'running' || channels.length === 0}>
                    {setup === 'running' ? 'Mise en place…' : `Recruter ${agent.name}`}
                  </Button>
                </div>
              </div>
            </div>
            {agent.usecase.conversation.length > 0 && (
              <div className="work-top-side">
                <div className="expert-eyebrow">En action</div>
                <ExpertDemoPhone agent={agent} conversation={agent.usecase.conversation} channels={agent.channels} />
              </div>
            )}
          </div>
        </div>
      </main>

      {setup !== 'idle' && (
        <RecruitmentModal
          key={attempt}
          agent={agent}
          channels={channels}
          failed={setup === 'failed'}
          onFinished={finished}
          onRetry={() => void submit()}
          onCancel={() => setSetup('idle')}
        />
      )}
    </div>
  )
}
