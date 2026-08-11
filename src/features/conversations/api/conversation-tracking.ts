import type { ConversationSummary, ConversationStatus } from './contracts.ts'

export interface ConversationTrackingSummary {
  total: number
  running: number
  paused: number
  done: number
  failed: number
  active: number
  completionRate: number
}

export function conversationTrackingSummary(conversations: ConversationSummary[]): ConversationTrackingSummary {
  const count = (status: ConversationStatus) => conversations.filter((item) => (item.status ?? 'done') === status).length
  const running = count('running')
  const paused = count('paused')
  const done = count('done')
  const failed = count('failed')
  const total = conversations.length

  return {
    total,
    running,
    paused,
    done,
    failed,
    active: running + paused,
    completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}
