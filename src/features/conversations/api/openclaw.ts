import type { ConversationSummary, Message } from './contracts'
import type { Session } from '../../auth/api/contracts'
import { openClawActivityConversations } from './openclaw-activity'
import { openClawOnboardingConversationId, openClawSessionKey } from './openclaw-session'

const OPENCLAW_EXPERTS = {
  exp_adjoua: 'adjoua',
  exp_djeneba: 'djeneba',
  exp_lokoli: 'lokoli',
} as const

const CLIENT_ID = 'openclaw-control-ui'
const CLIENT_MODE = 'webchat'
const CLIENT_VERSION = 'yelema-web-test'
const DEVICE_STORAGE_KEY = 'yelema.openclaw.device.v1'
const OPERATOR_SCOPES = ['operator.read', 'operator.write'] as const
const PROTOCOL_VERSION = 4

interface GatewayRequest {
  type: 'req'
  id: string
  method: string
  params: unknown
}

interface GatewayResponse {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code?: string; message?: string; details?: unknown }
}

interface GatewayEvent {
  type: 'event'
  event: string
  payload?: unknown
}

interface StoredDeviceIdentity {
  version: 1
  deviceId: string
  publicKey: string
  privateKey: string
}

interface ChatEventPayload {
  runId?: string
  sessionKey?: string
  agentId?: string
  state?: 'delta' | 'final' | 'aborted' | 'error'
  deltaText?: string
  replace?: boolean
  message?: unknown
  errorMessage?: string
}

interface ChatSendResult {
  runId?: string
  status?: string
}

export interface OpenClawAttachment {
  type: 'image' | 'file'
  mimeType: string
  fileName: string
  content: string
}

export interface OpenClawClientContext {
  user: {
    name: string
    jobTitle: string
    language: string
  }
  organization: {
    id: string
    name: string
    legalName?: string | null
    sector?: string | null
    country?: string | null
  }
}

const CLIENT_CONTEXT_START = '<yelema_client_context>'
const CLIENT_CONTEXT_END = '</yelema_client_context>'
const INITIALIZATION_TASK_START = '<yelema_initialization_task>'
const INITIALIZATION_TASK_END = '</yelema_initialization_task>'
const initializationRuns = new Map<string, Promise<void>>()

type PendingRequest = {
  resolve: (payload: unknown) => void
  reject: (error: Error) => void
}

type GatewayEventListener = (event: GatewayEvent) => void

function gatewayUrl(): string {
  return (import.meta.env.VITE_OPENCLAW_GATEWAY_URL as string | undefined)?.trim() || 'ws://127.0.0.1:18789'
}

function gatewayToken(): string {
  const token = (import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN as string | undefined)?.trim()
  if (!token) throw new Error('Le jeton OpenClaw local est absent de VITE_OPENCLAW_GATEWAY_TOKEN.')
  return token
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
}

async function loadOrCreateDeviceIdentity(): Promise<StoredDeviceIdentity> {
  const saved = localStorage.getItem(DEVICE_STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<StoredDeviceIdentity>
      if (parsed.version === 1 && parsed.deviceId && parsed.publicKey && parsed.privateKey) {
        return parsed as StoredDeviceIdentity
      }
    } catch {
      localStorage.removeItem(DEVICE_STORAGE_KEY)
    }
  }

  if (!crypto.subtle) throw new Error("Ce navigateur ne fournit pas l'identité cryptographique requise par OpenClaw.")
  const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey))
  const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey))
  const identity: StoredDeviceIdentity = {
    version: 1,
    deviceId: await sha256Hex(publicKey),
    publicKey: bytesToBase64Url(publicKey),
    privateKey: bytesToBase64Url(privateKey),
  }
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(identity))
  return identity
}

function normalizeDeviceMetadata(value: string): string {
  return value.trim().toLocaleLowerCase('en-US')
}

async function signDeviceConnect(identity: StoredDeviceIdentity, nonce: string, token: string, platform: string, deviceFamily: string) {
  const signedAt = Date.now()
  const payload = [
    'v3',
    identity.deviceId,
    CLIENT_ID,
    CLIENT_MODE,
    'operator',
    OPERATOR_SCOPES.join(','),
    String(signedAt),
    token,
    nonce,
    normalizeDeviceMetadata(platform),
    normalizeDeviceMetadata(deviceFamily),
  ].join('|')
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64UrlToBytes(identity.privateKey),
    { name: 'Ed25519' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(payload))
  return {
    id: identity.deviceId,
    publicKey: identity.publicKey,
    signature: bytesToBase64Url(new Uint8Array(signature)),
    signedAt,
    nonce,
  }
}

class OpenClawGatewayClient {
  private socket: WebSocket | null = null
  private connecting: Promise<void> | null = null
  private pending = new Map<string, PendingRequest>()
  private listeners = new Set<GatewayEventListener>()

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return
    if (this.connecting) return this.connecting

    this.connecting = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(gatewayUrl())
      this.socket = socket
      let settled = false
      const timeout = window.setTimeout(() => {
        if (settled) return
        settled = true
        socket.close()
        reject(new Error("OpenClaw n'a pas répondu à temps."))
      }, 10_000)

      const fail = (error: Error) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        reject(error)
      }

      socket.addEventListener('message', (message) => {
        let frame: GatewayResponse | GatewayEvent
        try {
          frame = JSON.parse(String(message.data)) as GatewayResponse | GatewayEvent
        } catch {
          return
        }

        if (frame.type === 'event' && frame.event === 'connect.challenge') {
          const challenge = frame.payload as { nonce?: string } | undefined
          if (!challenge?.nonce) {
            fail(new Error('OpenClaw a envoyé un défi de connexion invalide.'))
            return
          }
          void this.sendConnect(challenge.nonce)
            .then(() => {
              if (settled) return
              settled = true
              window.clearTimeout(timeout)
              resolve()
            })
            .catch(fail)
          return
        }

        this.handleFrame(frame)
      })

      socket.addEventListener('error', () => fail(new Error('Connexion WebSocket à OpenClaw impossible.')))
      socket.addEventListener('close', (event) => {
        this.socket = null
        const error = new Error(event.reason || `Connexion OpenClaw fermée (${event.code}).`)
        for (const pending of this.pending.values()) pending.reject(error)
        this.pending.clear()
        fail(error)
      })
    }).finally(() => { this.connecting = null })

    return this.connecting
  }

  private async sendConnect(nonce: string): Promise<void> {
    const token = gatewayToken()
    const identity = await loadOrCreateDeviceIdentity()
    const platform = navigator.platform || 'web'
    const deviceFamily = 'browser'
    await this.request('connect', {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: CLIENT_ID,
        version: CLIENT_VERSION,
        platform,
        deviceFamily,
        mode: CLIENT_MODE,
      },
      role: 'operator',
      scopes: [...OPERATOR_SCOPES],
      caps: [],
      auth: { token },
      userAgent: navigator.userAgent,
      locale: navigator.language,
      device: await signDeviceConnect(identity, nonce, token, platform, deviceFamily),
    })
  }

  private handleFrame(frame: GatewayResponse | GatewayEvent): void {
    if (frame.type === 'res') {
      const pending = this.pending.get(frame.id)
      if (!pending) return
      this.pending.delete(frame.id)
      if (frame.ok) pending.resolve(frame.payload)
      else pending.reject(new Error(frame.error?.message || frame.error?.code || 'Requête OpenClaw refusée.'))
      return
    }

    for (const listener of this.listeners) listener(frame)
  }

  async request<T>(method: string, params: unknown): Promise<T> {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("La connexion à OpenClaw n'est pas ouverte.")
    const id = crypto.randomUUID()
    const request: GatewayRequest = { type: 'req', id, method, params }
    const response = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (payload) => resolve(payload as T), reject })
    })
    socket.send(JSON.stringify(request))
    return response
  }

  onEvent(listener: GatewayEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

const gateway = new OpenClawGatewayClient()

function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part
      if (!part || typeof part !== 'object') return ''
      const block = part as { text?: unknown; content?: unknown }
      if (typeof block.text === 'string') return block.text
      if (typeof block.content === 'string') return block.content
      return ''
    }).filter(Boolean).join('\n')
  }
  if (content && typeof content === 'object') {
    const block = content as { text?: unknown; content?: unknown }
    if (typeof block.text === 'string') return block.text
    return textFromContent(block.content)
  }
  return ''
}

function textFromGatewayMessage(message: unknown): string {
  if (!message || typeof message !== 'object') return ''
  const item = message as { text?: unknown; content?: unknown }
  if (typeof item.text === 'string') return item.text
  return textFromContent(item.content)
}

function messageWithClientContext(message: string, context?: OpenClawClientContext): string {
  if (!context) return message
  const payload = JSON.stringify(context)
  return [
    CLIENT_CONTEXT_START,
    "Contexte fourni par l'espace client Yelema authentifié. Utilise ces informations comme contexte de la conversation. Ne redemande pas le nom, la fonction ou l'organisation lorsqu'ils sont renseignés.",
    payload,
    CLIENT_CONTEXT_END,
    message,
  ].join('\n')
}

function messageWithoutClientContext(message: string): string {
  const start = message.indexOf(CLIENT_CONTEXT_START)
  if (start < 0) return message
  const end = message.indexOf(CLIENT_CONTEXT_END, start)
  if (end < 0) return message
  return `${message.slice(0, start)}${message.slice(end + CLIENT_CONTEXT_END.length)}`.trim()
}

function visibleUserMessage(message: string): string {
  const withoutContext = messageWithoutClientContext(message)
  const start = withoutContext.indexOf(INITIALIZATION_TASK_START)
  const end = withoutContext.indexOf(INITIALIZATION_TASK_END, start)
  if (start >= 0 && end >= 0) return ''
  return withoutContext
}

function runtimeAgentId(frontAgentId: string): string | null {
  return OPENCLAW_EXPERTS[frontAgentId as keyof typeof OPENCLAW_EXPERTS] ?? null
}

function sessionKey(frontAgentId: string, conversationId: string): string {
  const runtimeId = runtimeAgentId(frontAgentId)
  if (!runtimeId) throw new Error(`L'expert ${frontAgentId} n'est pas branché à OpenClaw.`)
  return openClawSessionKey(runtimeId, conversationId)
}

/**
 * COPIE AUTONOME — intégration désactivée.
 *
 * Cette copie du front tourne seule, sur les seuls mocks MSW : ni passerelle
 * OpenClaw, ni compte, ni jeton. Le garde-fou ci-dessous répond donc toujours
 * « non », et tous les appelants empruntent d'eux-mêmes le chemin simulé —
 * aucun d'eux n'a été modifié.
 *
 * Le reste du module est conservé tel quel pour que les types et les signatures
 * restent alignés sur le monorepo : réactiver l'intégration se limite à
 * rétablir la ligne d'origine, indiquée juste en dessous.
 */
export function isOpenClawExpert(frontAgentId: string): boolean {
  void frontAgentId
  // Origine : return runtimeAgentId(frontAgentId) !== null
  return false
}

export function openClawClientContextFromSession(session: Session): OpenClawClientContext {
  return {
    user: {
      name: session.user.name,
      jobTitle: session.user.title,
      language: session.user.language,
    },
    organization: {
      id: session.workspace.id,
      name: session.workspace.name,
      legalName: session.workspace.legalName,
      sector: session.workspace.sector,
      country: session.workspace.country,
    },
  }
}

/** Fil de prise de poste ouvert par l'expert, stable par organisation. */
export function openClawInitialConversationId(clientContext: OpenClawClientContext): string {
  return openClawOnboardingConversationId(clientContext.organization.id)
}

/**
 * Première tâche autonome d'un expert : prendre connaissance du contexte puis
 * ouvrir lui-même la conversation. L'instruction interne reste invisible ; la
 * réponse de l'expert constitue le premier message visible du fil.
 */
export function initializeOpenClawExpert(frontAgentId: string, clientContext: OpenClawClientContext): Promise<void> {
  if (!isOpenClawExpert(frontAgentId)) return Promise.resolve()
  const key = `${frontAgentId}:${clientContext.organization.id}`
  const active = initializationRuns.get(key)
  if (active) return active

  const conversationId = openClawInitialConversationId(clientContext)
  const run = listOpenClawMessages(frontAgentId, conversationId)
    .then(async (messages) => {
      if (messages.some((message) => message.role === 'agent')) return
      await sendOpenClawMessage(
        frontAgentId,
        conversationId,
        [
          INITIALIZATION_TASK_START,
          "Première tâche autonome, exécutée avant toute intervention de l'utilisateur.",
          "Prends connaissance du contexte client authentifié puis initialise toi-même la conversation.",
          "Écris un premier message de prise de poste naturel et concis, adapté à la personne, à sa fonction et à son organisation.",
          "Ne demande ni son identité, ni sa fonction, ni le nom de son organisation lorsque ces informations sont renseignées.",
          "Ce premier message doit être directement utile et inviter la personne à commencer le travail avec toi.",
          INITIALIZATION_TASK_END,
        ].join('\n'),
        () => undefined,
        undefined,
        clientContext,
      )
    })
    .finally(() => { initializationRuns.delete(key) })

  initializationRuns.set(key, run)
  return run
}

/**
 * Historique durable de l'expert pour l'organisation authentifiée. Le filtre
 * tenant est refait côté client sur les clés, même si le Gateway filtre déjà
 * par agent : ces deux dimensions ne sont pas interchangeables.
 */
export async function listOpenClawConversations(frontAgentId: string, session: Session): Promise<ConversationSummary[]> {
  const agentId = runtimeAgentId(frontAgentId)
  if (!agentId) return []
  await gateway.connect()
  const result = await gateway.request<{ sessions?: unknown[] }>('sessions.list', {
    limit: 200,
    agentId,
    includeGlobal: false,
    includeUnknown: false,
    configuredAgentsOnly: true,
    includeDerivedTitles: true,
    includeLastMessage: true,
    archived: false,
  })
  return openClawActivityConversations({
    sessions: result.sessions ?? [],
    runtimeAgentId: agentId,
    frontAgentId,
    organizationId: session.workspace.id,
    userId: session.user.id,
    owner: session.user.name,
  })
}

/** Donne un sujet lisible à un fil déjà matérialisé par `chat.send`. */
export async function labelOpenClawConversation(frontAgentId: string, conversationId: string, title: string): Promise<void> {
  const agentId = runtimeAgentId(frontAgentId)
  if (!agentId) throw new Error(`L'expert ${frontAgentId} n'est pas branché à OpenClaw.`)
  await gateway.connect()
  await gateway.request('sessions.patch', {
    key: sessionKey(frontAgentId, conversationId),
    agentId,
    label: title.slice(0, 120),
  })
}

export async function listOpenClawMessages(frontAgentId: string, conversationId: string): Promise<Message[]> {
  const agentId = runtimeAgentId(frontAgentId)
  if (!agentId) return []
  await gateway.connect()
  const history = await gateway.request<{ messages?: unknown[] }>('chat.history', {
    sessionKey: sessionKey(frontAgentId, conversationId),
    agentId,
    limit: 200,
    maxChars: 200_000,
  })
  return (history.messages ?? []).flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return []
    const item = entry as { id?: unknown; role?: unknown; content?: unknown; text?: unknown }
    if (item.role !== 'user' && item.role !== 'assistant') return []
    const rawText = typeof item.text === 'string' ? item.text : textFromContent(item.content)
    const text = item.role === 'user' ? visibleUserMessage(rawText) : rawText
    if (!text.trim()) return []
    return [{
      id: typeof item.id === 'string' ? item.id : `${conversationId}-${index}`,
      role: item.role === 'assistant' ? 'agent' : 'user',
      text,
    } satisfies Message]
  })
}

export async function sendOpenClawMessage(
  frontAgentId: string,
  conversationId: string,
  message: string,
  onDelta: (text: string) => void,
  attachments?: OpenClawAttachment[],
  clientContext?: OpenClawClientContext,
): Promise<Message> {
  const agentId = runtimeAgentId(frontAgentId)
  if (!agentId) throw new Error(`L'expert ${frontAgentId} n'est pas branché à OpenClaw.`)
  await gateway.connect()

  const targetSession = sessionKey(frontAgentId, conversationId)
  let expectedRunId: string | undefined
  let accumulated = ''

  return new Promise<Message>((resolve, reject) => {
    let timeout = 0
    let unsubscribe: () => void = () => undefined
    const finish = (done: () => void) => {
      window.clearTimeout(timeout)
      unsubscribe()
      done()
    }

    timeout = window.setTimeout(() => finish(() => reject(new Error("La réponse d'OpenClaw a dépassé cinq minutes."))), 300_000)
    unsubscribe = gateway.onEvent((frame) => {
      if (frame.event !== 'chat') return
      const payload = frame.payload as ChatEventPayload | undefined
      if (!payload || payload.sessionKey !== targetSession) return
      if (expectedRunId && payload.runId !== expectedRunId) return
      if (!expectedRunId && payload.runId) expectedRunId = payload.runId

      if (payload.state === 'delta') {
        accumulated = payload.replace ? (payload.deltaText ?? '') : accumulated + (payload.deltaText ?? '')
        onDelta(accumulated)
        return
      }

      if (payload.state === 'final') {
        const finalText = textFromGatewayMessage(payload.message) || accumulated
        finish(() => resolve({ id: payload.runId || crypto.randomUUID(), role: 'agent', text: finalText }))
        return
      }

      if (payload.state === 'aborted' || payload.state === 'error') {
        finish(() => reject(new Error(payload.errorMessage || 'OpenClaw a interrompu la réponse.')))
      }
    })

    void gateway.request<ChatSendResult>('chat.send', {
      sessionKey: targetSession,
      agentId,
      message: messageWithClientContext(message, clientContext),
      attachments,
      deliver: false,
      timeoutMs: 300_000,
      idempotencyKey: crypto.randomUUID(),
    }).then((result) => {
      if (result.runId) expectedRunId = result.runId
      if (result.status === 'error') finish(() => reject(new Error("OpenClaw n'a pas démarré la réponse.")))
    }).catch((error: unknown) => finish(() => reject(error instanceof Error ? error : new Error(String(error)))))
  })
}
