import type { WorkspaceBranding } from './api/contracts'

/**
 * Applique le branding du tenant sur les variables CSS du design system.
 * Champ null ⇒ la variable est retirée et la valeur par défaut de la charte
 * Yelema (déclarée dans global.css) reprend la main.
 */
const CSS_BINDINGS: [keyof WorkspaceBranding, string][] = [
  ['primaryColor', '--primary'],
  ['secondaryColor', '--purple'],
  ['buttonColor', '--button'],
  ['buttonColor', '--button-hover'],
  ['fontPrimaryColor', '--ink'],
  ['fontSecondaryColor', '--muted'],
]

export function applyBranding(branding: WorkspaceBranding): void {
  const root = document.documentElement
  for (const [field, cssVariable] of CSS_BINDINGS) {
    const value = branding[field]
    if (value) root.style.setProperty(cssVariable, value)
    else root.style.removeProperty(cssVariable)
  }
  // Bannières (accueil, agents) : par défaut le dégradé bleu→violet du design ;
  // avec une couleur tenant, un dégradé monochrome (teinte claire → teinte).
  if (branding.primaryColor) {
    root.style.setProperty('--hero-from', `color-mix(in oklab, ${branding.primaryColor} 72%, white)`)
  } else {
    root.style.removeProperty('--hero-from')
  }
  if (branding.fontFamily) {
    root.style.fontFamily = `'${branding.fontFamily}', 'Funnel Display', Inter, system-ui, sans-serif`
  } else {
    root.style.removeProperty('font-family')
  }
}

/** Retour à la charte Yelema (déconnexion, changement de workspace…). */
export function resetBranding(): void {
  applyBranding({
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
    buttonColor: null,
    fontPrimaryColor: null,
    fontSecondaryColor: null,
    fontFamily: null,
  })
}
