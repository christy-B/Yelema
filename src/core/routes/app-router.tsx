import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthLayout } from '../layouts/auth/auth-layout'
import { WorkspaceLayout } from '../layouts/workspace/workspace-layout'
import { AccountPage } from '../pages/account/account-page'
import { ActivationPage } from '../pages/activation/activation-page'
import { AgentChatPage } from '../pages/agent-chat/agent-chat-page'
import { AgentDetailPage } from '../pages/agent-detail/agent-detail-page'
import { AgentsPage } from '../pages/agents/agents-page'
import { AnalyticsPage } from '../pages/analytics/analytics-page'
import { BillingPage } from '../pages/billing/billing-page'
import { ErrorPage } from '../pages/error/error-page'
import { HelpPage } from '../pages/help/help-page'
import { LoginPage } from '../pages/login/login-page'
import { MemberDetailPage } from '../pages/member-detail/member-detail-page'
import { MarketplaceAgentPage } from '../pages/marketplace-agent/marketplace-agent-page'
import { MembersPage } from '../pages/members/members-page'
import { OnboardingPage } from '../pages/onboarding/onboarding-page'
import { PasswordPage } from '../pages/password/password-page'
import { ProjectDetailPage } from '../pages/project-detail/project-detail-page'
import { ProjectsPage } from '../pages/projects/projects-page'
import { WorkspacePage } from '../pages/workspace/workspace-page'
import { WorkspaceSettingsPage } from '../pages/workspace-settings/workspace-settings-page'
import { ConsolePage } from '../../console/console-page'
import { SessionProvider } from '../../features/auth/providers/session-provider'
import { ProtectedRoute } from './protected-route'
import { RequireCapability } from './require-capability'
import { paths } from './paths'

export function AppRouter() {
  return <BrowserRouter><SessionProvider><Routes>
    <Route element={<AuthLayout />}><Route path={paths.login} element={<LoginPage />} /><Route path={paths.activation} element={<ActivationPage />} /><Route path={paths.forgotPassword} element={<PasswordPage mode="forgot" />} /><Route path={paths.resetPassword} element={<PasswordPage mode="reset" />} />{/* Cible des liens envoyés par email par le control-plane (invitation + réinitialisation) : CLIENT_APP_URL/reset-password?token=… */}<Route path="/reset-password" element={<ActivationPage />} /></Route>
    <Route element={<ProtectedRoute />}><Route path="/espace-client/:workspaceId/onboarding" element={<OnboardingPage />} /><Route path="/espace-client/:workspaceId/agents/:agentId" element={<AgentDetailPage />} />{/* Fiche marketplace (expert non encore recruté) — lecture seule, en mode focus. */}<Route path="/espace-client/:workspaceId/marketplace/:agentId" element={<MarketplaceAgentPage />} />{/* Conversation en mode focus (rail expert à gauche) — hors gabarit d'accueil, comme la fiche. */}<Route path="/espace-client/:workspaceId/:agentId/conversation/new" element={<AgentChatPage />} /><Route path="/espace-client/:workspaceId/:agentId/conversation/:conversationId" element={<AgentChatPage />} /><Route element={<WorkspaceLayout />}><Route path="/espace-client/:workspaceId" element={<WorkspacePage />} /><Route path="/espace-client/:workspaceId/agents" element={<AgentsPage />} /><Route path="/espace-client/:workspaceId/projects" element={<ProjectsPage />} /><Route path="/espace-client/:workspaceId/projects/:projectId" element={<ProjectDetailPage />} /><Route element={<RequireCapability capability="members" action="view" />}><Route path="/espace-client/:workspaceId/members" element={<MembersPage />} /><Route path="/espace-client/:workspaceId/members/:memberId" element={<MemberDetailPage />} /></Route><Route element={<RequireCapability capability="invoices" action="view" />}><Route path="/espace-client/:workspaceId/billing" element={<BillingPage />} />{/* Analytics : pas de capacité dédiée en v1 (télémétrie runtime à venir) — alignée sur invoices·view. */}<Route path="/espace-client/:workspaceId/analytics" element={<AnalyticsPage />} /></Route><Route path="/espace-client/:workspaceId/settings/account" element={<AccountPage />} /><Route element={<RequireCapability capability="branding" action="view" />}><Route path="/espace-client/:workspaceId/settings/workspace" element={<WorkspaceSettingsPage />} /></Route><Route path="/espace-client/:workspaceId/help" element={<HelpPage />} /></Route></Route>
    {/* Console de démonstration — hors espace client, sans authentification et sans lien entrant. */}
    <Route path={paths.console} element={<ConsolePage />} />
    <Route path="/" element={<Navigate to={paths.login} replace />} /><Route path="/espace-client" element={<Navigate to={paths.login} replace />} /><Route path="*" element={<ErrorPage />} />
  </Routes></SessionProvider></BrowserRouter>
}
