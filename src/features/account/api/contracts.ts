export interface Account {
  id: string
  name: string
  /** Fonction de la personne dans l'organisation (ex. « Administratrice », « Analyste budgétaire »). */
  title: string
  email: string
  language: string
  avatarUrl?: string
  twoFactorEnabled: boolean
  notificationsEnabled: boolean
}
