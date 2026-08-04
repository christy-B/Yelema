import { accountHandlers } from './account.handlers'
import { agentHandlers } from './agent.handlers'
import { analyticsHandlers } from './analytics.handlers'
import { authHandlers } from './auth.handlers'
import { automationHandlers } from './automation.handlers'
import { billingHandlers } from './billing.handlers'
import { conversationHandlers } from './conversation.handlers'
import { fileHandlers } from './file.handlers'
import { livrableHandlers } from './livrable.handlers'
import { memberHandlers } from './member.handlers'
import { portraitHandlers } from './portrait.handlers'
import { resourceHandlers } from './resource.handlers'
import { workspaceHandlers } from './workspace.handlers'

/**
 * Version AUTONOME : l'application est déployée seule, sans control-plane.
 * MSW couvre donc la TOTALITÉ de l'API v1 — authentification comprise — pour que
 * la démonstration fonctionne sur un hébergement statique.
 */
export const handlers = [
  // Authentification d'abord : tout le reste en dépend.
  ...authHandlers,
  ...accountHandlers,
  ...workspaceHandlers,
  ...memberHandlers,
  ...billingHandlers,
  // Sous-routes de /agents/:id : déclarées avant le handler de la fiche.
  ...portraitHandlers,
  ...resourceHandlers,
  ...agentHandlers,
  ...automationHandlers,
  ...conversationHandlers,
  ...fileHandlers,
  ...livrableHandlers,
  ...analyticsHandlers,
]
