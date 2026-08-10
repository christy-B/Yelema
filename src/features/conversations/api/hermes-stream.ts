interface HermesChunk {
  choices?: Array<{ delta?: { content?: unknown } }>
  error?: { message?: unknown }
}

export async function consumeHermesChatStream(
  stream: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  const consumeBlock = (block: string) => {
    const lines = block.split(/\r?\n/)
    const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim()
    if (event && event !== 'message') return
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
    if (!data || data === '[DONE]') return

    const chunk = JSON.parse(data) as HermesChunk
    if (chunk.error) {
      throw new Error(typeof chunk.error.message === 'string' ? chunk.error.message : 'Hermes a interrompu la réponse.')
    }
    const delta = chunk.choices?.[0]?.delta?.content
    if (typeof delta !== 'string' || !delta) return
    accumulated += delta
    onDelta(accumulated)
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    for (const block of blocks) consumeBlock(block)
    if (done) break
  }
  if (buffer.trim()) consumeBlock(buffer)
  return accumulated
}
