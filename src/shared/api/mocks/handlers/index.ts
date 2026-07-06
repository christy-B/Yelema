import { accountHandlers } from './account.handlers'
import { agentHandlers } from './agent.handlers'
import { analyticsHandlers } from './analytics.handlers'
import { authHandlers } from './auth.handlers'
import { billingHandlers } from './billing.handlers'
import { conversationHandlers } from './conversation.handlers'
import { fileHandlers } from './file.handlers'
import { memberHandlers } from './member.handlers'
import { workspaceHandlers } from './workspace.handlers'

export const handlers = [
  ...authHandlers,
  ...workspaceHandlers,
  ...agentHandlers,
  ...conversationHandlers,
  ...fileHandlers,
  ...memberHandlers,
  ...billingHandlers,
  ...analyticsHandlers,
  ...accountHandlers,
]
