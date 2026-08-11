import type { ConversationStatus } from './contracts.ts'

const STATUS_PATTERN = /<yelema_task_status>\s*(running|paused|done|failed)\s*<\/yelema_task_status>/i

const TASK_STATUS_PROTOCOL = `
<yelema_task_status_protocol>
À la toute fin de ta réponse, ajoute exactement un marqueur technique parmi :
<yelema_task_status>running</yelema_task_status>
<yelema_task_status>paused</yelema_task_status>
<yelema_task_status>done</yelema_task_status>
<yelema_task_status>failed</yelema_task_status>
Décide toi-même :
- running : le travail continue et n'est pas encore livré ;
- paused : tu attends une information, un document, une validation ou une décision de l'utilisateur ;
- done : le livrable demandé est effectivement terminé et utilisable ;
- failed : le travail ne peut pas aboutir malgré tes tentatives.
Une simple réponse intermédiaire ne signifie pas que la tâche est terminée.
N'explique jamais ce marqueur et n'en écris aucun autre.
</yelema_task_status_protocol>`

export function withHermesTaskStatusProtocol(message: string): string {
  return `${message}\n\n${TASK_STATUS_PROTOCOL}`
}

export function parseHermesTaskStatus(raw: string): { text: string; status: ConversationStatus } {
  const match = raw.match(STATUS_PATTERN)
  const status = (match?.[1]?.toLocaleLowerCase('en-US') as ConversationStatus | undefined) ?? 'running'
  const text = raw
    .replace(STATUS_PATTERN, '')
    // Pendant le streaming, ne jamais laisser apparaître le début du marqueur.
    .replace(/\s*<yelema_task_status>[\s\S]*$/i, '')
    .replace(/\s*<yelema_task_[\s\S]*$/i, '')
    .trimEnd()
  return { text, status }
}
