export const DEFAULT_WORKSPACE_ID = 'ws_3'

export const paths = {
  login: '/espace-client/login',
  activation: '/espace-client/activation',
  forgotPassword: '/espace-client/mot-de-passe-oublie',
  resetPassword: '/espace-client/reinitialiser-mot-de-passe',
  workspace: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}`,
  onboarding: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/onboarding`,
  agents: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/agents`,
  agent: (agentId: string, workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/agents/${agentId}`,
  /** Fiche d'un expert du catalogue non encore recruté (marketplace, lecture seule). */
  marketplaceAgent: (agentId: string, workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/marketplace/${agentId}`,
  newConversation: (agentId: string, workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/${agentId}/conversation/new`,
  conversation: (agentId: string, conversationId: string, workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/${agentId}/conversation/${conversationId}`,
  members: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/members`,
  member: (memberId: string, workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/members/${memberId}`,
  billing: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/billing`,
  analytics: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/analytics`,
  account: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/settings/account`,
  workspaceSettings: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/settings/workspace`,
  help: (workspaceId = DEFAULT_WORKSPACE_ID) => `/espace-client/${workspaceId}/help`,
} as const
