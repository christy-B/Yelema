import { BatteryFull, CheckCheck, ChevronLeft, ChevronRight, Forward, Globe, Paperclip, Reply, Send, Signal, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { AgentConversationBubble } from '../../../features/agents/api/contracts'
import { orderChannels } from '../../../features/agents/channels'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { AgentAvatar } from '../agent-avatar/agent-avatar'

/** Horaires de la démo — fixes, pour un rendu stable (ce n'est pas un vrai échange). */
const BUBBLE_TIMES = ['10:22', '10:22', '10:23', '10:24']
/** Un courriel ne se répond pas en quarante secondes : les heures sont espacées. */
const MAIL_TIMES = ['10:22', '10:41', '11:06', '11:24', '14:02', '14:19', '15:35', '15:52']

/**
 * Habillage par canal. Le même échange se lit différemment selon l'endroit où il
 * a lieu : la teinte, le nom de l'application, la ligne d'état — et surtout la
 * MISE EN FORME. Une messagerie s'affiche en bulles ; un courriel s'affiche en
 * fil de messages, avec un objet et des expéditeurs.
 */
interface ChannelSkin {
  label: string
  logo?: string
  accent: string
  /** Sous le nom de l'expert : « en ligne », « Boîte de réception »… */
  status: string
  /** Texte grisé de la zone de saisie ; absent → pas de zone de saisie. */
  composer?: string
  /** Barre d'état du téléphone : seulement pour les messageries mobiles. */
  mobile: boolean
  /** Bulles de discussion, ou fil de courriels. */
  layout: 'chat' | 'mail'
}

const SKINS: Record<string, ChannelSkin> = {
  whatsapp: { label: 'WhatsApp', logo: 'whatsapp', accent: '#1da851', status: 'en ligne', composer: 'Message', mobile: true, layout: 'chat' },
  telegram: { label: 'Telegram', logo: 'telegram', accent: '#3390ec', status: 'en ligne', composer: 'Message', mobile: true, layout: 'chat' },
  email: { label: 'Courriel', logo: 'gmail', accent: '#c5462f', status: 'Boîte de réception', mobile: false, layout: 'mail' },
  web: { label: 'Espace client', logo: 'web', accent: '#5b34c4', status: 'Disponible', composer: 'Écrire…', mobile: false, layout: 'chat' },
}

interface ExpertDemoPhoneProps {
  agent: { id: string; name: string; avatarUrl?: string | null }
  conversation: AgentConversationBubble[]
  /** Canaux de l'expert. Le carrousel en présente un par vue. */
  channels: string[]
}

/**
 * « En action » : le même échange rejoué sur chacun des canaux de l'expert, en
 * carrousel qui défile de lui-même. Illustration statique — la zone de saisie et
 * la barre d'état font partie du décor.
 */
export function ExpertDemoPhone({ agent, conversation, channels }: ExpertDemoPhoneProps) {
  const available = orderChannels(channels).filter((channel) => channel in SKINS)
  const shown = available.length > 0 ? available : ['web']
  const [index, setIndex] = useState(0)
  // Le défilement s'arrête dès que l'utilisateur prend la main : son choix prime
  // sur l'animation.
  const [manual, setManual] = useState(false)

  useEffect(() => {
    if (manual || shown.length < 2) return
    // Une animation en boucle peut gêner : on respecte le réglage système.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setIndex((prev) => (prev + 1) % shown.length), 4500)
    return () => window.clearInterval(timer)
  }, [manual, shown.length])

  // Un canal retiré entre deux rendus ne doit pas laisser un index hors bornes.
  const current = Math.min(index, shown.length - 1)
  const skin = SKINS[shown[current]] ?? SKINS.web
  const logo = skin.logo ? CONNECTOR_LOGOS[skin.logo] : undefined
  const isMail = skin.layout === 'mail'

  const go = (step: number) => {
    setManual(true)
    setIndex((prev) => (Math.min(prev, shown.length - 1) + step + shown.length) % shown.length)
  }

  return (
    <div className="demo-stack">
      <div
        className={skin.mobile ? 'demo-phone' : 'demo-phone demo-phone--desk'}
        style={{ ['--demo-accent' as string]: skin.accent }}
        aria-label={`Exemple d'échange avec ${agent.name} sur ${skin.label}`}
      >
        {skin.mobile && (
          <div className="demo-phone-status">
            <span>9:41</span>
            <span className="demo-phone-signal"><Signal size={11} /><Wifi size={11} /><BatteryFull size={14} /></span>
          </div>
        )}

        <div className="demo-phone-top">
          {skin.mobile && <ChevronLeft size={17} />}
          <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} variant="square" className="demo-phone-av" />
          <div className="demo-phone-id">
            <b>{agent.name}</b>
            <span>{skin.status}</span>
          </div>
          <span className="demo-phone-app">
            {logo ? <img src={logo} alt="" /> : <Globe size={13} />}
            {skin.label}
          </span>
        </div>

        {isMail ? (
          /* Le fil ouvert : chaque message déplié avec son expéditeur et son
             corps entier. Ni bulles, ni accusés de lecture. */
          <div className="demo-mail">
            <div className="demo-mail-thread">{conversation.map((message, position) => {
              const me = message.dir === 'in'
              return (
                <div key={position} className="demo-mail-msg">
                  <div className="demo-mail-head">
                    {me
                      ? <span className="demo-mail-av demo-mail-av--me" aria-hidden="true">V</span>
                      : <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} variant="square" className="demo-mail-av" />}
                    <div className="demo-mail-who">
                      <b>{me ? 'Vous' : agent.name}</b>
                      <span>{me ? `à ${agent.name}` : 'à moi'}</span>
                    </div>
                    <span className="demo-mail-time">{MAIL_TIMES[position % MAIL_TIMES.length]}</span>
                  </div>
                  <p className="demo-mail-body">{message.text}</p>
                </div>
              )
            })}</div>
            <div className="demo-mail-acts">
              <span><Reply size={13} />Répondre</span>
              <span><Forward size={13} />Transférer</span>
            </div>
          </div>
        ) : (
          <div className="demo-phone-body">
            <span className="demo-phone-day">Aujourd{'’'}hui</span>
            {conversation.map((bubble, position) => (
              <div key={position} className={bubble.dir === 'out' ? 'demo-bub demo-bub--out' : 'demo-bub demo-bub--in'}>
                {bubble.text}
                <span className="demo-bub-meta">
                  {BUBBLE_TIMES[position % BUBBLE_TIMES.length]}
                  {bubble.dir === 'out' && skin.mobile && <CheckCheck size={11} />}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Le courriel n'a pas de zone de saisie permanente : ses actions
            « Répondre / Transférer » sont au pied du message. */}
        {skin.composer && (
          <div className="demo-phone-composer" aria-hidden="true">
            <Paperclip size={15} />
            <span>{skin.composer}</span>
            <Send size={15} />
          </div>
        )}
      </div>

      {/* Un seul canal : pas de carrousel, la commande n'aurait rien à faire. */}
      {shown.length > 1 && (
        <div className="demo-nav">
          <button type="button" className="demo-nav-arrow" aria-label="Canal précédent" onClick={() => go(-1)}>
            <ChevronLeft size={16} />
          </button>
          <div className="demo-dots" role="tablist" aria-label="Canaux">
            {shown.map((option, position) => (
              <button
                type="button"
                key={option}
                role="tab"
                aria-selected={position === current}
                aria-label={SKINS[option]?.label ?? option}
                className={position === current ? 'demo-dot is-on' : 'demo-dot'}
                onClick={() => { setManual(true); setIndex(position) }}
              />
            ))}
          </div>
          <button type="button" className="demo-nav-arrow" aria-label="Canal suivant" onClick={() => go(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
