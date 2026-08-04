import { ArrowLeft, Globe } from 'lucide-react'
import type { ReactNode } from 'react'

import type { AgentDetail } from '../../../features/agents/api/contracts'
import { CHANNEL_META, orderChannels } from '../../../features/agents/channels'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { AgentAvatar } from '../agent-avatar/agent-avatar'

interface ExpertRailProps {
  agent: AgentDetail
  /** Lien de retour (haut du rail) — libellé + action selon le contexte. */
  back: { label: string; onClick: () => void }
  /** Action principale en pied de rail. */
  footer?: ReactNode
  /**
   * Afficher les canaux où l'expert est joignable. Masqué là où l'écran présente
   * déjà les canaux (fiche de recrutement) pour ne pas les répéter.
   */
  showChannels?: boolean
}

/**
 * Rail latéral de l'expert (mode focus). La carte-portrait est la MÊME que dans
 * l'espace d'un expert de l'équipe : un expert a le même visage partout.
 */
export function ExpertRail({ agent, back, footer, showChannels = true }: ExpertRailProps) {
  return (
    <aside className="wk-rail">
      <button type="button" className="expert-nav-back" onClick={back.onClick}><ArrowLeft size={16} /> {back.label}</button>

      <div className="wk-card">
        <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} className="wk-photo" />
        <div className="wk-card-id">
          <strong>{agent.name}</strong>
          {agent.tags[0] && <span>{agent.tags[0]}</span>}
        </div>
      </div>

      {agent.long && <p className="expert-nav-tagline">{agent.long}</p>}

      {showChannels && agent.channels.length > 0 && (
        <div className="expert-nav-channels">
          {orderChannels(agent.channels).map((ch) => {
            const meta = CHANNEL_META[ch]
            const logo = meta ? CONNECTOR_LOGOS[meta.logo] : undefined
            return (
              <span key={ch} className="nav-chan" title={meta?.label ?? ch}>
                {logo ? <img className="nav-chan-logo" src={logo} alt="" /> : <Globe size={13} />}
                {meta?.label ?? ch}
              </span>
            )
          })}
        </div>
      )}

      {/* Repères chiffrés, tous dérivés de la fiche (aucune donnée inventée).
          Libellés courts : les trois badges tiennent sur une seule ligne dans la
          largeur du rail. L'intitulé complet reste disponible au survol. */}
      <div className="expert-nav-stats">
        {agent.skills.length > 0 && <div title="Compétences"><strong>{agent.skills.length}</strong><span>compétences</span></div>}
        {agent.daily.length > 0 && <div title="Tâches au quotidien"><strong>{agent.daily.length}</strong><span>tâches</span></div>}
        {agent.connectors.length > 0 && <div title="Outils connectables"><strong>{agent.connectors.length}</strong><span>outils</span></div>}
      </div>

      {footer && <div className="wk-rail-actions">{footer}</div>}
    </aside>
  )
}
