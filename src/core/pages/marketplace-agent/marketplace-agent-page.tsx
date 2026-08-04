import { Check, Globe, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { getMarketplaceAgent, recruitAgent } from '../../../features/agents/api/api'
import type { AgentDetail } from '../../../features/agents/api/contracts'
import { CHANNEL_META, DEFAULT_CHANNEL, orderChannels } from '../../../features/agents/channels'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { Button } from '../../../shared/components/button/button'
import { ExpertDemoPhone } from '../../../shared/components/expert-demo-phone/expert-demo-phone'
import { ExpertRail } from '../../../shared/components/expert-rail/expert-rail'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

/**
 * Fiche d'un expert IA du catalogue que l'organisation n'a pas encore recruté :
 * sa présentation, le choix des canaux de déploiement, puis la demande de
 * recrutement. Volontairement dépourvue des raccourcis de travail
 * (conversations, sources…) : ils n'ont de sens qu'une fois l'expert rattaché.
 */
export function MarketplaceAgentPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, agentId = '' } = useParams()
  const [agent, setAgent] = useState<AgentDetail | null>(null)
  const [channel, setChannel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!agentId) return
    void getMarketplaceAgent(agentId)
      .then((detail) => {
        setAgent(detail)
        // Un seul canal de déploiement : le web par défaut (disponible sans configuration).
        const available = orderChannels(detail.channels)
        setChannel(available.includes(DEFAULT_CHANNEL) ? DEFAULT_CHANNEL : available[0] ?? '')
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [agentId, retryKey])

  // Recruté = rattaché à l'équipe : on enchaîne directement sur son espace, prêt à échanger.
  const submit = async () => {
    if (!agent || submitting || !channel) return
    setSubmitting(true)
    try {
      await recruitAgent(agent.id, { channel })
      navigate(paths.agent(agent.id, workspaceId), { replace: true, state: { openChat: true } })
    } catch {
      setSubmitting(false)
    }
  }

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

              {/* Choix des canaux de déploiement — au cœur de la fiche de recrutement. */}
              <div className="recruit-block">
                <div className="expert-eyebrow">Canal de déploiement</div>
                <p className="recruit-note">Sur quel canal souhaitez-vous rendre {agent.name} joignable ? Modifiable à tout moment.</p>
                <div className="chan-tiles" role="radiogroup" aria-label="Canal de déploiement">
                  {orderChannels(agent.channels).map((option) => {
                    const meta = CHANNEL_META[option]
                    const logo = meta ? CONNECTOR_LOGOS[meta.logo] : undefined
                    const selected = channel === option
                    return (
                      <button type="button" key={option} className={selected ? 'chan-tile is-on' : 'chan-tile'} role="radio" aria-checked={selected} onClick={() => setChannel(option)}>
                        {selected && <span className="chan-tile-tick"><Check size={12} /></span>}
                        <span className="chan-tile-ic">{logo ? <img src={logo} alt="" /> : <Globe size={24} />}</span>
                        <strong>{meta?.label ?? option}</strong>
                        {meta?.description && <small>{meta.description}</small>}
                      </button>
                    )
                  })}
                </div>

                <div className="recruit-action">
                  <Button leadingIcon={<UserPlus size={16} />} onClick={() => void submit()} disabled={submitting || !channel}>
                    {submitting ? 'Recrutement…' : `Recruter ${agent.name}`}
                  </Button>
                </div>
              </div>
            </div>
            {agent.usecase.conversation.length > 0 && (
              <div className="work-top-side">
                <div className="expert-eyebrow">En action</div>
                <ExpertDemoPhone agent={agent} conversation={agent.usecase.conversation} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
