import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AgentLayout } from '../layouts/agent/agent-layout'
import { AuthLayout } from '../layouts/auth/auth-layout'
import { WorkspaceLayout } from '../layouts/workspace/workspace-layout'
import { AccountPage } from '../pages/account/account-page'
import { ActivationPage } from '../pages/activation/activation-page'
import { AgentChatPage } from '../pages/agent-chat/agent-chat-page'
import { AgentDetailPage } from '../pages/agent-detail/agent-detail-page'
import { AgentsPage } from '../pages/agents/agents-page'
import { AnalyticsPage } from '../pages/analytics/analytics-page'
import { BillingPage } from '../pages/billing/billing-page'
import { ConversationsPage } from '../pages/conversations/conversations-page'
import { ErrorPage } from '../pages/error/error-page'
import { FilesPage } from '../pages/files/files-page'
import { HelpPage } from '../pages/help/help-page'
import { LoginPage } from '../pages/login/login-page'
import { MemberDetailPage } from '../pages/member-detail/member-detail-page'
import { MembersPage } from '../pages/members/members-page'
import { OnboardingPage } from '../pages/onboarding/onboarding-page'
import { PasswordPage } from '../pages/password/password-page'
import { WorkspacePage } from '../pages/workspace/workspace-page'
import { WorkspaceSettingsPage } from '../pages/workspace-settings/workspace-settings-page'
import { SessionProvider } from '../providers/session-provider'
import { ProtectedRoute } from './protected-route'
import { RequireCapability } from './require-capability'
import { paths } from './paths'

// Sous-chemin de déploiement (ex. /mon-repo sur GitHub Pages) ; '/' en local.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function AppRouter() {
  return <BrowserRouter basename={routerBasename}><SessionProvider><Routes>
    <Route element={<AuthLayout />}><Route path={paths.login} element={<LoginPage />} /><Route path={paths.activation} element={<ActivationPage />} /><Route path={paths.forgotPassword} element={<PasswordPage mode="forgot" />} /><Route path={paths.resetPassword} element={<PasswordPage mode="reset" />} /></Route>
    <Route element={<ProtectedRoute />}><Route path="/espace-client/:workspaceId/onboarding" element={<OnboardingPage />} /><Route element={<WorkspaceLayout />}><Route path="/espace-client/:workspaceId" element={<WorkspacePage />} /><Route path="/espace-client/:workspaceId/agents" element={<AgentsPage />} /><Route path="/espace-client/:workspaceId/agents/:agentId" element={<AgentDetailPage />} /><Route path="/espace-client/:workspaceId/conversations" element={<ConversationsPage />} /><Route path="/espace-client/:workspaceId/files" element={<FilesPage />} /><Route element={<RequireCapability capability="members" />}><Route path="/espace-client/:workspaceId/members" element={<MembersPage />} /><Route path="/espace-client/:workspaceId/members/:memberId" element={<MemberDetailPage />} /></Route><Route element={<RequireCapability capability="billing" />}><Route path="/espace-client/:workspaceId/billing" element={<BillingPage />} /></Route><Route element={<RequireCapability capability="analytics" />}><Route path="/espace-client/:workspaceId/analytics" element={<AnalyticsPage />} /></Route><Route path="/espace-client/:workspaceId/settings/account" element={<AccountPage />} /><Route element={<RequireCapability capability="workspace" />}><Route path="/espace-client/:workspaceId/settings/workspace" element={<WorkspaceSettingsPage />} /></Route><Route path="/espace-client/:workspaceId/help" element={<HelpPage />} /><Route element={<AgentLayout />}><Route path="/espace-client/:workspaceId/:agentId/conversation/new" element={<AgentChatPage />} /><Route path="/espace-client/:workspaceId/:agentId/conversation/:conversationId" element={<AgentChatPage />} /></Route></Route></Route>
    <Route path="/" element={<Navigate to={paths.login} replace />} /><Route path="/espace-client" element={<Navigate to={paths.login} replace />} /><Route path="*" element={<ErrorPage />} />
  </Routes></SessionProvider></BrowserRouter>
}
