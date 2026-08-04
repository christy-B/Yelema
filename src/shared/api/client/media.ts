import { getAuthToken } from './http-client'

/**
 * Les médias du control-plane (logo, avatar, PDF) sont PROTÉGÉS : ils exigent
 * le header Authorization, qu'une balise <img src> ne peut pas envoyer.
 * On télécharge donc l'image avec le jeton et on renvoie une URL blob
 * affichable. Null si l'image est inaccessible (repli visuel du composant).
 */
export async function loadProtectedMedia(url: string | null | undefined): Promise<string | null> {
  const token = getAuthToken()
  if (!url || !token) return null
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) return null
    return URL.createObjectURL(await response.blob())
  } catch {
    return null
  }
}
