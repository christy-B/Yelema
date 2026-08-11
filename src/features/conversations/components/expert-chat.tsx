import { Paperclip, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { createConversation, listMessages, sendMessage } from '../api/api'
import type { ConversationSummary, Message } from '../api/contracts'
import { createHermesConversationId, hermesClientContextFromSession, hermesInitialConversationId, initializeHermesExpert, isHermesExpert, labelHermesConversation, listHermesMessages, sendHermesMessage } from '../api/hermes'
import type { HermesImageAttachment } from '../api/hermes'
import { useSession } from '../../auth/providers/session-context'
import { uploadFiles } from '../../files/api/api'
import { AgentAvatar } from '../../../shared/components/agent-avatar/agent-avatar'

const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const MAX_FILE_BYTES = 20 * 1024 * 1024
const INITIAL_MESSAGE_MIN_TYPING_MS = 1_400
const INITIAL_MESSAGE_ENTRANCE_MS = 280

interface ExpertChatProps {
  agent: { id: string; name: string; icon: string; avatarUrl?: string | null }
  /** Conversation à reprendre ; absent = nouvel échange. */
  conversationId?: string
  /** Notifié à la création d'une conversation (pour rafraîchir l'activité, l'URL…). */
  onCreated?: (conversation: ConversationSummary) => void
  /** Notifié après une nouvelle interaction dans une conversation existante. */
  onUpdated?: () => void
}

/**
 * Échange avec un expert IA : fil de discussion + saisie. Partagé par l'espace
 * de l'expert (où le chat est immédiatement disponible) et par l'écran d'une
 * conversation reprise depuis la liste.
 */
export function ExpertChat({ agent, conversationId, onCreated, onUpdated }: ExpertChatProps) {
  const { session } = useSession()
  const usesHermes = isHermesExpert(agent.id)
  const [messages, setMessages] = useState<Message[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [initializing, setInitializing] = useState(() => {
    if (!conversationId || !usesHermes || !session) return false
    const context = hermesClientContextFromSession(session)
    return conversationId === hermesInitialConversationId(context)
  })
  const [enteringMessageId, setEnteringMessageId] = useState<string>()
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [activeId, setActiveId] = useState(conversationId)
  const endRef = useRef<HTMLDivElement>(null)

  // Les appelants remontent le composant (prop `key`) quand la conversation
  // change : cet effet ne fait donc que charger l'historique du fil ouvert.
  useEffect(() => {
    if (!conversationId) return
    let current = true
    let startTimer = 0
    let revealTimer = 0
    let entranceTimer = 0
    const loadStartedAt = performance.now()
    const context = session ? hermesClientContextFromSession(session) : undefined
    const isInitialConversation = Boolean(
      usesHermes && context && conversationId === hermesInitialConversationId(context),
    )
    const shouldStageOpening = isInitialConversation
    if (shouldStageOpening) {
      startTimer = window.setTimeout(() => {
        if (current) setInitializing(true)
      })
    }
    const load = usesHermes
      ? (isInitialConversation && context
          ? initializeHermesExpert(agent.id, context).then(() => listHermesMessages(agent.id, conversationId, context))
          : context ? listHermesMessages(agent.id, conversationId, context) : Promise.resolve([]))
      : listMessages(conversationId)
    void load
      .then(async (items) => {
        if (!current) return
        const isFirstExpertMessage = items.length === 1 && items[0]?.role === 'agent'
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        if (shouldStageOpening && isFirstExpertMessage && !reducedMotion) {
          const remaining = Math.max(0, INITIAL_MESSAGE_MIN_TYPING_MS - (performance.now() - loadStartedAt))
          if (remaining > 0) {
            await new Promise<void>((resolve) => { revealTimer = window.setTimeout(resolve, remaining) })
          }
          if (!current) return
          setEnteringMessageId(items[0].id)
          entranceTimer = window.setTimeout(() => {
            if (current) setEnteringMessageId(undefined)
          }, INITIAL_MESSAGE_ENTRANCE_MS)
        }
        setMessages(items)
      })
      .catch(() => { if (current) setMessages([]) })
      .finally(() => { if (current) setInitializing(false) })
    return () => {
      current = false
      window.clearTimeout(startTimer)
      window.clearTimeout(revealTimer)
      window.clearTimeout(entranceTimer)
    }
  }, [agent.id, conversationId, session, usesHermes])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const runReply = async (text: string, files: File[]) => {
    setSending(true)
    const visibleMessage = [text, ...files.map((file) => `📎 ${file.name}`)].filter(Boolean).join('\n')
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'user', text: visibleMessage }])
    try {
      let currentId = activeId
      let createdConversation: ConversationSummary | undefined
      if (!currentId) {
        const conversationSeed = text || `Pièce jointe : ${files.map((file) => file.name).join(', ')}`
        if (usesHermes && !session) throw new Error('La session utilisateur est nécessaire pour ouvrir une conversation Hermes.')
        const created = usesHermes && session
          ? localConversation(
              agent.id,
              conversationSeed,
              createHermesConversationId(session.workspace.id),
              session.user.id,
              session.user.name,
            )
          : await createConversation({ agentId: agent.id, intake: { message: text } })
        createdConversation = created
        currentId = created.id
        setActiveId(created.id)
        // Prévenir le parent ici remonterait ce composant pendant le streaming
        // et la réponse arriverait dans l'ancienne instance, devenue invisible.
        if (!usesHermes) onCreated?.(created)
      }
      if (usesHermes) {
        const directAttachments = await Promise.all(files.map(toHermesAttachment))
        const outboundText = text || `Voici ${files.length > 1 ? 'les pièces jointes' : 'la pièce jointe'} : ${files.map((file) => file.name).join(', ')}`
        const replyId = crypto.randomUUID()
        const reply = await sendHermesMessage(
          agent.id,
          currentId,
          outboundText,
          (partial) => { setMessages((items) => upsertReply(items, replyId, partial)) },
          directAttachments,
          session ? hermesClientContextFromSession(session) : undefined,
        )
        setMessages((items) => upsertReply(items, replyId, reply.text))
        if (createdConversation) {
          if (session) {
            void labelHermesConversation(
              agent.id,
              createdConversation.id,
              createdConversation.title,
              hermesClientContextFromSession(session),
            ).catch(() => undefined)
          }
          onCreated?.(createdConversation)
        } else {
          onUpdated?.()
        }
      } else {
        const reply = await sendMessage(currentId, text)
        setMessages((items) => [...items, reply])
      }
    } catch {
      setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'agent', text: "Je n'ai pas pu traiter cette demande. Réessayez dans un instant." }])
    } finally {
      setSending(false)
    }
  }

  const submit = () => {
    const text = composer.trim()
    const files = attachments
    if ((!text && files.length === 0) || sending) return
    setComposer('')
    setAttachments([])
    setAttachmentError('')
    void runReply(text, files)
  }

  const attach = (files: File[]) => {
    if (!files.length) return
    if (!usesHermes) {
      void uploadFiles(files)
      return
    }

    const accepted: File[] = []
    const errors: string[] = []
    for (const file of files) {
      if (!isImageFile(file)) {
        errors.push(`${file.name} : le test local Hermes accepte uniquement les images`)
        continue
      }
      const limit = isImageFile(file) ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
      if (file.size > limit) {
        errors.push(`${file.name} : taille maximale ${formatFileSize(limit)}`)
        continue
      }
      accepted.push(file)
    }
    setAttachments((current) => [...current, ...accepted])
    setAttachmentError(errors.join(' · '))
  }

  return (
    <div className="chat-main">
      <div className="chat-thread">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-row message-row--${message.role}${message.id === enteringMessageId ? ' message-row--entering' : ''}`}
          >
            {message.role === 'agent' && <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} size={38} className="chat-message-avatar" />}
            <div className="message-bubble">{message.text}{message.sources?.length ? <small>Sources : {message.sources.join(', ')}</small> : null}</div>
          </div>
        ))}
        {(sending || initializing) && (
          <div className="typing-status" role="status" aria-label={`${agent.name} rédige`}>
            <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} size={38} className="chat-message-avatar" />
            <span className="typing-bubble" aria-hidden="true">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-composer-area">
        {usesHermes && attachments.length > 0 && (
          <div className="chat-attachments" aria-label="Pièces jointes sélectionnées">
            {attachments.map((file, index) => (
              <span className="chat-attachment" key={`${file.name}-${file.lastModified}-${index}`}>
                <span>{file.name}</span>
                <small>{formatFileSize(file.size)}</small>
                <button
                  type="button"
                  aria-label={`Retirer ${file.name}`}
                  onClick={() => { setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index)) }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        {usesHermes && attachmentError && <p className="chat-attachment-error" role="alert">{attachmentError}</p>}
        <div className="chat-composer">
          <label className="composer-action" aria-label="Joindre un fichier">
            <Paperclip size={20} />
            <input
              type="file"
              multiple
              hidden
              accept={usesHermes ? 'image/*' : undefined}
              onChange={(event) => {
                if (event.target.files) attach(Array.from(event.target.files))
                event.target.value = ''
              }}
            />
          </label>
          <textarea
            rows={1}
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }}
            placeholder={`Écrivez un message à ${agent.name}…`}
          />
          <button type="button" className="send-action" onClick={submit} disabled={(!composer.trim() && attachments.length === 0) || sending || initializing} aria-label="Envoyer"><Send size={19} /></button>
        </div>
      </div>
    </div>
  )
}

function localConversation(agentId: string, message: string, id: string, userId: string, owner: string): ConversationSummary {
  const now = new Date().toISOString()
  const title = message.length > 72 ? `${message.slice(0, 69).trimEnd()}…` : message
  return {
    id,
    userId,
    agentId,
    title,
    preview: message,
    owner,
    time: "à l'instant",
    createdAt: now,
    updatedAt: now,
  }
}

function upsertReply(messages: Message[], replyId: string, text: string): Message[] {
  const index = messages.findIndex((message) => message.id === replyId)
  if (index < 0) return [...messages, { id: replyId, role: 'agent', text }]
  return messages.map((message, current) => current === index ? { ...message, text } : message)
}

async function toHermesAttachment(file: File): Promise<HermesImageAttachment> {
  return {
    mimeType: file.type || 'application/octet-stream',
    content: await fileToBase64(file),
  }
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i.test(file.name)
}


function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const separator = result.indexOf(',')
      if (separator < 0) reject(new Error(`Impossible de lire ${file.name}.`))
      else resolve(result.slice(separator + 1))
    })
    reader.addEventListener('error', () => reject(reader.error ?? new Error(`Impossible de lire ${file.name}.`)))
    reader.readAsDataURL(file)
  })
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024) * 10) / 10} Mio`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Kio`
  return `${bytes} o`
}
