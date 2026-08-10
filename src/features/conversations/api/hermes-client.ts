import { consumeHermesChatStream } from './hermes-stream.ts'

export type HermesChatContent = string | Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
>

export interface HermesChatMessage {
  role: 'user' | 'assistant'
  content: HermesChatContent
}

interface SendHermesChatOptions {
  apiBaseUrl: string
  apiKey: string
  model: string
  messages: HermesChatMessage[]
  onDelta: (text: string) => void
  signal?: AbortSignal
}

export async function sendHermesChat(options: SendHermesChatOptions): Promise<string> {
  const response = await fetch(`${options.apiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      stream: true,
      messages: options.messages,
    }),
    signal: options.signal,
  })

  if (!response.ok) throw new Error(`Hermes a refusé la demande (${response.status}).`)
  if (!response.body) throw new Error("Hermes n'a pas fourni de flux de réponse.")
  return consumeHermesChatStream(response.body, options.onDelta)
}
