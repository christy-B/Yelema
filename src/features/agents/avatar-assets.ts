/**
 * Portraits d'un expert, par variante de cadrage.
 *
 * Les fichiers sont déposés dans `assets/avatars/` et nommés d'après l'expert :
 *
 *   kouassi.jpg          plan large, vertical  — cartes, rail, fiche
 *   kouassi-carre.jpg    tête, carré           — vignettes rondes
 *   fatima-carre2.jpg    cadrages alternatifs  — proposés dans le profil
 *
 * L'usage commande la variante : dans une pastille de 28 px, un plan large ne
 * montre qu'un buste flou et illisible — c'est la tête qu'il faut.
 */
const basename = (path: string) => path.split('/').pop()!.replace(/\.\w+$/, '')

/**
 * Les portraits, indexés par nom de fichier. Les illustrations `.svg` sont
 * chargées d'abord et les photos ensuite : déposer `dany.jpg` remplace donc
 * `dany.svg` sans avoir à supprimer quoi que ce soit.
 */
const FILES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(
      import.meta.glob('../../assets/avatars/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
    ).map(([path, url]) => [basename(path), url]),
  ),
  ...Object.fromEntries(
    Object.entries(
      import.meta.glob('../../assets/avatars/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
    ).map(([path, url]) => [basename(path), url]),
  ),
}

/** « Djénéba » → « djeneba », pour retrouver son fichier. */
export function slugOf(name: string): string {
  return name.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export type PortraitVariant = 'long' | 'square'

/** Une variante précise, ou `null` si l'expert ne l'a pas. */
export function portraitOf(name: string, variant: PortraitVariant): string | null {
  const base = slugOf(name)
  if (variant === 'long') return FILES[base] ?? null
  // Le premier carré disponible fait office de vignette par défaut.
  return FILES[`${base}-carre`] ?? FILES[`${base}-carre2`] ?? null
}

export interface PortraitChoice {
  /** Identifiant stable, utilisable comme clé et comme valeur enregistrée. */
  key: string
  url: string
  variant: PortraitVariant
  label: string
}

/**
 * Tous les cadrages disponibles pour un expert, le plan large d'abord.
 * Sert au profil, où l'on choisit son visage parmi ce qui existe.
 */
export function portraitsOf(name: string): PortraitChoice[] {
  const base = slugOf(name)
  const choices: PortraitChoice[] = []
  if (FILES[base]) choices.push({ key: base, url: FILES[base], variant: 'long', label: 'Plan large' })
  const carres = Object.keys(FILES)
    .filter((file) => file === `${base}-carre` || new RegExp(`^${base}-carre\\d+$`).test(file))
    .sort()
  carres.forEach((file, index) => {
    choices.push({ key: file, url: FILES[file], variant: 'square', label: index === 0 ? 'Portrait' : `Portrait ${index + 1}` })
  })
  return choices
}
