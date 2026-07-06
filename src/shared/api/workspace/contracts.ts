export interface Workspace {
  id: string
  name: string
  domain: string
  plan: string
  seats: number
  hosting: 'cloud-public' | 'cloud-dedie' | 'on-prem-souverain'
  logoUrl?: string
  restrictDomain: boolean
}
