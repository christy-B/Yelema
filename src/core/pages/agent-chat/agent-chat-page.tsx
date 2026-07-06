import { ArrowLeft, Check, FileText, ListChecks, Paperclip, Send, Sparkles, Table, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { getAgent } from '../../../shared/api/agent/api'
import type { AgentDetail } from '../../../shared/api/agent/contracts'
import { createConversation, listMessages, sendMessage } from '../../../shared/api/conversation/api'
import type { IntakePayload, Message } from '../../../shared/api/conversation/contracts'
import { uploadFiles } from '../../../shared/api/files/api'
import { AgentIcon } from '../../../shared/components/agent-icon/agent-icon'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

type Deliverable = IntakePayload['deliverable']
type Detail = IntakePayload['detail']

const deliverables: { key: Deliverable; name: string; sub: string; icon: typeof FileText }[] = [
  { key: 'note', name: 'Note de synthèse', sub: 'Un texte clair et structuré', icon: FileText },
  { key: 'table', name: 'Tableau récapitulatif', sub: 'Les points classés par ligne', icon: Table },
  { key: 'actions', name: "Liste d'actions", sub: "Ce qu'il faut faire ensuite", icon: ListChecks },
]
const pointsOptions = [
  { key: 'risks', label: 'Risques majeurs' },
  { key: 'figures', label: 'Chiffres clés' },
  { key: 'reco', label: 'Recommandations' },
  { key: 'deadlines', label: 'Échéances / jalons' },
]
const detailOptions: { key: Detail; label: string }[] = [
  { key: 'court', label: 'Court' },
  { key: 'standard', label: 'Standard' },
  { key: 'detaille', label: 'Détaillé' },
]
const deliverableLabel = (key: Deliverable) => deliverables.find((item) => item.key === key)?.name ?? ''
const pointLabel = (key: string) => pointsOptions.find((item) => item.key === key)?.label ?? key
const detailLabel = (key: Detail) => detailOptions.find((item) => item.key === key)?.label ?? key

const contextFiles = [
  { name: 'Rapport_Q1.pdf', meta: '28 pages' },
  { name: 'Annexe_budget.xlsx', meta: '3 onglets' },
]

export function AgentChatPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, agentId = '', conversationId } = useParams()
  const [agent, setAgent] = useState<AgentDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState(conversationId)
  const [deliverable, setDeliverable] = useState<Deliverable>('note')
  const [points, setPoints] = useState<string[]>(['risks', 'figures'])
  const [detail, setDetail] = useState<Detail>('court')
  const [precisions, setPrecisions] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  // Agent retiré au membre (403) ou inconnu (404) → retour au catalogue.
  useEffect(() => {
    if (!agentId) return
    void getAgent(agentId).then(setAgent).catch(() => navigate(paths.agents(workspaceId), { replace: true }))
  }, [agentId, navigate, workspaceId])
  useEffect(() => { if (conversationId) void listMessages(conversationId).then(setMessages).catch(() => setMessages([])) }, [conversationId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const showIntake = messages.length === 0
  const togglePoint = (key: string) => setPoints((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key])

  const runReply = async (text: string, intake?: IntakePayload) => {
    setSending(true)
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'user', text }])
    try {
      let currentId = activeConversationId
      if (!currentId) {
        const created = await createConversation({ agentId, intake: intake ?? { deliverable, points, detail, precisions: precisions.trim() || undefined } })
        currentId = created.id
        setActiveConversationId(created.id)
        navigate(paths.conversation(agentId, created.id, workspaceId), { replace: true })
      }
      const reply = await sendMessage(currentId, text)
      setMessages((items) => [...items, reply])
    } catch {
      setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'agent', text: "Je n'ai pas pu traiter cette demande. Réessayez dans un instant." }])
    } finally {
      setSending(false)
    }
  }

  const launchIntake = () => {
    const pts = points.map(pointLabel).join(', ') || 'points clés'
    let summary = `${deliverableLabel(deliverable)} · ${pts} · niveau ${detailLabel(detail).toLowerCase()}`
    if (precisions.trim()) summary += ` · ${precisions.trim()}`
    void runReply(summary, { deliverable, points, detail, precisions: precisions.trim() || undefined })
  }

  const sendComposer = () => {
    const text = composer.trim()
    if (!text || sending) return
    setComposer('')
    void runReply(text)
  }

  const attach = async (files: File[]) => { await uploadFiles(files) }
  if (!agent) return <div className="route-loader">Chargement de la conversation…</div>

  return (
    <div className="chat-page">
      <div className="chat-main">
        <header className="chat-header">
          <button type="button" className="chat-back" onClick={() => navigate(paths.conversations(workspaceId))}><ArrowLeft size={16} /> Conversations</button>
          <span className="agent-icon"><AgentIcon name={agent.icon} size={20} /></span>
          <div><h1>{agent.name} <small>· agent</small></h1><p>Renseignez votre demande en une fois — l'agent s'occupe du reste.</p></div>
        </header>

        <div className="chat-thread">
          {showIntake && (
            <div className="intake">
              <div className="intake-label">Ce que vous voulez obtenir</div>
              <div className="intake-deliverables">
                {deliverables.map(({ key, name, sub, icon: Icon }) => (
                  <button type="button" key={key} className={deliverable === key ? 'deliverable is-active' : 'deliverable'} onClick={() => setDeliverable(key)}>
                    {deliverable === key && <span className="deliverable-tick"><Check size={12} /></span>}
                    <Icon size={22} />
                    <strong>{name}</strong>
                    <small>{sub}</small>
                  </button>
                ))}
              </div>

              <div className="intake-label">Points à couvrir <em>· plusieurs possibles</em></div>
              <div className="intake-points">
                {pointsOptions.map((point) => {
                  const active = points.includes(point.key)
                  return (
                    <button type="button" key={point.key} className={active ? 'point-chip is-active' : 'point-chip'} onClick={() => togglePoint(point.key)}>
                      <span className="point-box">{active && <Check size={10} />}</span>{point.label}
                    </button>
                  )
                })}
              </div>

              <div className="intake-row">
                <div>
                  <div className="intake-label">Niveau de détail</div>
                  <div className="segmented">
                    {detailOptions.map((option) => (
                      <button type="button" key={option.key} className={detail === option.key ? 'is-active' : ''} onClick={() => setDetail(option.key)}>{option.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="intake-label">Précisions <em>· optionnel</em></div>
                  <input className="intake-precisions" value={precisions} onChange={(event) => setPrecisions(event.target.value)} placeholder="Ex. à destination du comité de direction…" />
                </div>
              </div>

              <button type="button" className="intake-launch" onClick={launchIntake}><Sparkles size={18} /> Lancer l'agent</button>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`message-row message-row--${message.role}`}>
              {message.role === 'agent' && <span className="agent-icon"><AgentIcon name={agent.icon} size={18} /></span>}
              <div className="message-bubble">{message.text}{message.sources?.length ? <small>Sources : {message.sources.join(', ')}</small> : null}</div>
            </div>
          ))}
          {sending && <p className="typing-status">L'agent rédige…</p>}
          <div ref={endRef} />
        </div>

        {!showIntake && (
          <div className="chat-composer-area">
            <div className="chat-composer">
              <label className="composer-action" aria-label="Joindre un fichier"><Paperclip size={20} /><input type="file" multiple hidden onChange={(event) => { if (event.target.files) void attach(Array.from(event.target.files)) }} /></label>
              <textarea rows={1} value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendComposer() } }} placeholder="Écrivez un message à l'agent…" />
              <button type="button" className="send-action" onClick={sendComposer} disabled={!composer.trim() || sending} aria-label="Envoyer"><Send size={19} /></button>
            </div>
          </div>
        )}
      </div>

      <aside className="chat-context">
        <div className="chat-context-label">Contexte</div>
        <label className="context-dropzone">
          <Upload size={22} />
          <span>Glissez un document<br />pour enrichir le contexte</span>
          <input type="file" multiple hidden onChange={(event) => { if (event.target.files) void attach(Array.from(event.target.files)) }} />
        </label>
        <div className="context-files">
          {contextFiles.map((file) => (
            <div key={file.name} className="context-file"><span className="file-icon"><FileText size={15} /></span><div><strong>{file.name}</strong><small>{file.meta}</small></div></div>
          ))}
        </div>
      </aside>
    </div>
  )
}
