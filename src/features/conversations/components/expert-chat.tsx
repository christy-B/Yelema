import { Paperclip, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { createConversation, listMessages, sendMessage } from '../api/api'
import type { ConversationSummary, Message } from '../api/contracts'
import { uploadFiles } from '../../files/api/api'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'

interface ExpertChatProps {
  agent: { id: string; name: string; icon: string }
  /** Conversation à reprendre ; absent = nouvel échange. */
  conversationId?: string
  /** Notifié à la création d'une conversation (pour rafraîchir l'activité, l'URL…). */
  onCreated?: (conversation: ConversationSummary) => void
}

/**
 * Échange avec un expert IA : fil de discussion + saisie. Partagé par l'espace
 * de l'expert (où le chat est immédiatement disponible) et par l'écran d'une
 * conversation reprise depuis la liste.
 */
export function ExpertChat({ agent, conversationId, onCreated }: ExpertChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [activeId, setActiveId] = useState(conversationId)
  const endRef = useRef<HTMLDivElement>(null)

  // Les appelants remontent le composant (prop `key`) quand la conversation
  // change : cet effet ne fait donc que charger l'historique du fil ouvert.
  useEffect(() => {
    if (!conversationId) return
    void listMessages(conversationId).then(setMessages).catch(() => setMessages([]))
  }, [conversationId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const runReply = async (text: string) => {
    setSending(true)
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'user', text }])
    try {
      let currentId = activeId
      if (!currentId) {
        const created = await createConversation({ agentId: agent.id, intake: { message: text } })
        currentId = created.id
        setActiveId(created.id)
        onCreated?.(created)
      }
      const reply = await sendMessage(currentId, text)
      setMessages((items) => [...items, reply])
    } catch {
      setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'agent', text: "Je n'ai pas pu traiter cette demande. Réessayez dans un instant." }])
    } finally {
      setSending(false)
    }
  }

  const submit = () => {
    const text = composer.trim()
    if (!text || sending) return
    setComposer('')
    void runReply(text)
  }

  const attach = (files: File[]) => { if (files.length) void uploadFiles(files) }

  return (
    <div className="chat-main">
      <div className="chat-thread">
        {messages.map((message) => (
          <div key={message.id} className={`message-row message-row--${message.role}`}>
            {message.role === 'agent' && <span className="agent-icon"><AgentIcon name={agent.icon} size={18} /></span>}
            <div className="message-bubble">{message.text}{message.sources?.length ? <small>Sources : {message.sources.join(', ')}</small> : null}</div>
          </div>
        ))}
        {sending && <p className="typing-status">{agent.name} rédige…</p>}
        <div ref={endRef} />
      </div>

      <div className="chat-composer-area">
        <div className="chat-composer">
          <label className="composer-action" aria-label="Joindre un fichier">
            <Paperclip size={20} />
            <input type="file" multiple hidden onChange={(event) => { if (event.target.files) attach(Array.from(event.target.files)) }} />
          </label>
          <textarea
            rows={1}
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }}
            placeholder={`Écrivez un message à ${agent.name}…`}
          />
          <button type="button" className="send-action" onClick={submit} disabled={!composer.trim() || sending} aria-label="Envoyer"><Send size={19} /></button>
        </div>
      </div>
    </div>
  )
}
