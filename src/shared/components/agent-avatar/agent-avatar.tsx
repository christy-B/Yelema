import type { CSSProperties } from 'react'

/**
 * Portrait d'un employé IA.
 *
 * À terme le portrait viendra du BACK-OFFICE (`avatarUrl` par agent). En
 * attendant, on utilise les portraits déposés dans `assets/avatars/`
 * (photos .png/.jpg/.webp ou illustrations .svg), choisis de façon
 * déterministe → même agent = même portrait. Repli sobre (monogramme sur
 * dégradé violet) si aucun portrait n'est encore fourni.
 */

// Portraits embarqués (résolus en URLs par Vite). Formats photo + svg acceptés.
const AVATARS = Object.entries(
  import.meta.glob('../../../assets/avatars/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)

const IGNORED = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l'])
function hash(seed: string): number {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}
function initials(name: string): string {
  const words = name.trim().split(/[\s-]+/).filter((w) => !IGNORED.has(w.toLowerCase()))
  return (words.length ? words : name.split(/\s+/)).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase('fr') ?? '').join('') || '?'
}

interface AgentAvatarProps {
  id: string
  name: string
  /** Portrait du back-office quand disponible ; sinon portrait bundlé. */
  avatarUrl?: string | null
  /** Taille (carré). Omis → piloté par le CSS (ex. bannière plein-largeur). */
  size?: number
  className?: string
  /**
   * Repli sobre (monogramme) au lieu des illustrations bundlées quand aucune
   * vraie photo n'est fournie. Utilisé là où une photo manquante doit rester
   * discrète (ex. cartes du catalogue) plutôt que d'afficher un dessin.
   */
  mono?: boolean
  /** Retouches ponctuelles (cadrage de l'image, par exemple). */
  style?: CSSProperties
}

export function AgentAvatar({ id, name, avatarUrl, size, className, mono = false, style }: AgentAvatarProps) {
  const cls = `agent-avatar ${className ?? ''}`.trim()
  const pooled = mono || !AVATARS.length ? null : AVATARS[hash(id || name) % AVATARS.length]
  const src = avatarUrl || pooled

  if (src) {
    return <img className={cls} src={src} alt="" aria-hidden="true" width={size} height={size} style={{ ...(size ? { borderRadius: Math.round(size * 0.28) } : {}), ...style }} />
  }

  // Repli sans portrait : monogramme sur le dégradé Yelema.
  return (
    <span
      className={`${cls} agent-avatar--monogram`}
      aria-hidden="true"
      style={{ ...(size ? { width: size, height: size, borderRadius: Math.round(size * 0.28), fontSize: Math.round(size * 0.36) } : {}), ...style }}
    >
      {initials(name)}
    </span>
  )
}
