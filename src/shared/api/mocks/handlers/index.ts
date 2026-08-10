import { accountHandlers } from './account.handlers'
import { agentHandlers } from './agent.handlers'
import { analyticsHandlers } from './analytics.handlers'
import { authHandlers } from './auth.handlers'
import { automationHandlers } from './automation.handlers'
import { billingHandlers } from './billing.handlers'
import { consoleHandlers } from './console.handlers'
import { conversationHandlers } from './conversation.handlers'
import { fileHandlers } from './file.handlers'
import { livrableHandlers } from './livrable.handlers'
import { memberHandlers } from './member.handlers'
import { portraitHandlers } from './portrait.handlers'
import { projectHandlers } from './project.handlers'
import { resourceHandlers } from './resource.handlers'
import { workspaceHandlers } from './workspace.handlers'

/**
 * TOUTE l'API v1 est simulée ici : le control-plane n'est plus sollicité.
 *
 * L'espace client tourne donc sur deux socles et deux seulement — MSW pour les
 * données de la plateforme, OpenClaw pour les experts réellement branchés
 * (Adjoua, Djénéba, Lokoli). L'intérêt est de pouvoir dérouler l'expérience
 * complète — inscription, activation, onboarding, travail, facturation — sans
 * dépendre d'un back en cours d'écriture.
 *
 * Toute route non couverte ici part en erreur visible (`onUnhandledRequest:
 * 'warn'`, voir `browser/enable-api-mocks.ts`) : un trou se voit, il ne se
 * traduit pas par un appel silencieux dans le vide.
 */
export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...workspaceHandlers,
  ...memberHandlers,
  ...billingHandlers,
  // Sous-routes de /agents/:id : déclarées avant le handler de la fiche.
  ...portraitHandlers,
  ...resourceHandlers,
  ...agentHandlers,
  ...projectHandlers,
  ...automationHandlers,
  ...conversationHandlers,
  ...fileHandlers,
  ...livrableHandlers,
  ...analyticsHandlers,
  // Hors API du produit : provisionnement de démonstration, sous /api/demo.
  ...consoleHandlers,
]
