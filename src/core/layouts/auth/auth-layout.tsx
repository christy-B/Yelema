import { Outlet } from 'react-router'

/**
 * Les écrans d'authentification précèdent l'identification du tenant : ils
 * restent TOUJOURS à la charte Yelema. La classe re-fixe les variables CSS
 * du design system, neutralisant tout branding tenant encore appliqué à la
 * racine (jeton présent au chargement, instant connexion → redirection).
 */
export function AuthLayout() {
  return <div className="auth-scope"><Outlet /></div>
}
