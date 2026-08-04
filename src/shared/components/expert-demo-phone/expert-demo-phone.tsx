import { BatteryFull, CheckCheck, ChevronLeft, Paperclip, Send, Signal, Wifi } from 'lucide-react'

import type { AgentConversationBubble } from '../../../features/agents/api/contracts'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { AgentAvatar } from '../agent-avatar/agent-avatar'

/** Horaires de la démo — fixes, pour un rendu stable (ce n'est pas un vrai échange). */
const BUBBLE_TIMES = ['10:22', '10:22', '10:23', '10:24']

interface ExpertDemoPhoneProps {
  agent: { id: string; name: string; avatarUrl?: string | null }
  conversation: AgentConversationBubble[]
}

/**
 * « En action » : mise en situation de l'expert sous forme de capture d'écran de
 * téléphone (Telegram). Illustration statique — la barre de saisie et la barre
 * d'état font partie du décor.
 */
export function ExpertDemoPhone({ agent, conversation }: ExpertDemoPhoneProps) {
  return (
    <div className="demo-phone" aria-label={`Exemple d'échange avec ${agent.name} sur Telegram`}>
      <div className="demo-phone-status">
        <span>9:41</span>
        <span className="demo-phone-signal"><Signal size={11} /><Wifi size={11} /><BatteryFull size={14} /></span>
      </div>

      <div className="demo-phone-top">
        <ChevronLeft size={17} />
        <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} className="demo-phone-av" />
        <div className="demo-phone-id">
          <b>{agent.name}</b>
          <span>en ligne</span>
        </div>
        <span className="demo-phone-app">
          {CONNECTOR_LOGOS.telegram && <img src={CONNECTOR_LOGOS.telegram} alt="" />}
          Telegram
        </span>
      </div>

      <div className="demo-phone-body">
        <span className="demo-phone-day">Aujourd{'’'}hui</span>
        {conversation.map((bubble, index) => (
          <div key={index} className={bubble.dir === 'out' ? 'demo-bub demo-bub--out' : 'demo-bub demo-bub--in'}>
            {bubble.text}
            <span className="demo-bub-meta">
              {BUBBLE_TIMES[index % BUBBLE_TIMES.length]}
              {bubble.dir === 'out' && <CheckCheck size={11} />}
            </span>
          </div>
        ))}
      </div>

      <div className="demo-phone-composer" aria-hidden="true">
        <Paperclip size={15} />
        <span>Message</span>
        <Send size={15} />
      </div>
    </div>
  )
}
