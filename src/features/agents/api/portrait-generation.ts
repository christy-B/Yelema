/**
 * GÉNÉRATION DES PORTRAITS.
 *
 * Ce module ne connaît aucun secret. Il appelle `/openai/v1/…` sur sa propre
 * origine ; c'est le proxy du serveur de développement qui pose l'en-tête
 * d'autorisation, à partir de `OPENAI_API_KEY` — une variable SANS préfixe, donc
 * lue côté serveur et jamais empaquetée (voir `vite.config.ts`).
 *
 * Conséquence utile : sans clé, la règle de proxy n'est pas posée et la réponse
 * n'est pas du JSON. On le détecte et l'appelant retombe sur les propositions
 * simulées, sans afficher d'erreur.
 *
 * Pour passer sur un vrai serveur, il suffit de changer `ENDPOINT` : aucun autre
 * fichier ne connaît OpenAI.
 *
 * Documentation consultée le 2026-08-03 :
 * https://developers.openai.com/api/docs/api-reference/images/createEdit
 * https://developers.openai.com/api/docs/guides/image-generation
 * — endpoint `/v1/images/edits`, le seul acceptant une image de référence ;
 * — tarifs `gpt-image-1.5` en 1024×1536 : low 0,013 $ · medium 0,05 $ · high 0,2 $.
 *
 * Si l'API refuse un paramètre, son message remonte tel quel dans la fenêtre.
 */
import type { AgentAvatarConfig, PortraitVariant } from './contracts'
import { AVATAR_PROMPT_FRAGMENTS } from './contracts'

/** Même origine : le proxy relaie vers api.openai.com en ajoutant l'autorisation. */
const ENDPOINT = '/openai/v1/images/edits'
/**
 * `gpt-image-1.5` plutôt que `gpt-image-2` : il accepte `input_fidelity`, seul
 * moyen de demander au modèle de préserver les traits du visage de référence.
 * `gpt-image-2` refuse ce paramètre (vérifié contre l'API le 2026-08-03), ce qui
 * le laisse réinterpréter librement la personne.
 */
const MODEL = 'gpt-image-1.5'
const SIZE = '1024x1536'
/**
 * Palier de rendu. Coût par image en 1024×1536 sur `gpt-image-2` :
 * low 0,005 $ · medium 0,041 $ · high 0,165 $. Trois propositions par génération,
 * donc respectivement 1,5 · 12 · 50 centimes.
 */
const QUALITY = 'high'

/** PNG sans perte : la compression ne peut pas être en cause dans le rendu. */
const OUTPUT_FORMAT = 'png'

/**
 * Une proposition par appel.
 *
 * Mesures faites contre l'API le 2026-08-03, en 1024×1536 : trois images en
 * qualité `low` demandent 39 secondes et rendent 8 Mo ; en `high`, l'attente
 * passe à plusieurs minutes pour des dizaines de mégaoctets. Une attente aussi
 * longue est indistinguable d'un blocage.
 *
 * On rend donc une proposition tout de suite, et « Relancer » en ajoute d'autres
 * à comparer. Le choix reste possible, sans immobiliser l'écran.
 */
const VARIANTS_PER_CALL = 1

/**
 * Consigne envoyée au modèle.
 *
 * L'ordre compte. En mode édition, le modèle est déjà ancré sur la référence :
 * ouvrir par ce qu'il faut conserver le rend conservateur et il rend une image
 * quasi identique. On énonce donc D'ABORD la transformation demandée, puis la
 * seule chose à préserver — l'identité — et on exige explicitement que la pose,
 * la tenue et le fond diffèrent de la référence.
 */
export function buildPrompt(config: AgentAvatarConfig): string {
  const fragments = [
    AVATAR_PROMPT_FRAGMENTS.position[config.position],
    AVATAR_PROMPT_FRAGMENTS.style[config.style],
    AVATAR_PROMPT_FRAGMENTS.accessory[config.accessory],
    AVATAR_PROMPT_FRAGMENTS.background[config.background],
  ].filter(Boolean)

  return [
    'Create a brand new full-body character illustration.',
    fragments.length > 0
      ? `The character must be ${fragments.join(', ')}.`
      : 'Give the character a new pose and a new plain studio background.',
    'The pose, the framing, the clothing and the background MUST clearly differ from the reference image.',
    'Preserve only the identity of the person in the reference image: same face,',
    'same skin tone, same hairstyle, same apparent age, same illustration style.',
    'Centred subject, plain studio background, no text, no logo, no watermark.',
  ].join(' ')
}

/** Message d'erreur exploitable : celui d'OpenAI quand il en donne un. */
async function readError(response: Response): Promise<string> {
  const raw = await response.text().catch(() => '')
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } }
    if (parsed.error?.message) return parsed.error.message
  } catch {
    // Corps non JSON : on rend le texte brut, tronqué.
  }
  return raw.slice(0, 300) || `Erreur HTTP ${response.status}`
}

/**
 * Produit `count` portraits à partir de celui de l'expert et des quatre axes.
 * Un seul appel : l'image de référence part une fois, le modèle rend plusieurs
 * propositions.
 */
export async function generatePortraits(
  /** Fichier fourni par l'organisation, ou URL du portrait courant de l'expert. */
  reference: Blob | string,
  config: AgentAvatarConfig,
  count = VARIANTS_PER_CALL,
): Promise<PortraitVariant[] | null> {
  let blob: Blob
  if (typeof reference === 'string') {
    const loaded = await fetch(reference)
    if (!loaded.ok) throw new Error("Le portrait de référence n'a pas pu être lu.")
    blob = await loaded.blob()
  } else {
    blob = reference
  }

  const form = new FormData()
  form.append('model', MODEL)
  // Nom de fichier cohérent avec le type reçu : l'API s'appuie dessus.
  form.append('image', blob, blob.type === 'image/png' ? 'reference.png' : 'reference.jpg')
  form.append('prompt', buildPrompt(config))
  form.append('size', SIZE)
  form.append('quality', QUALITY)
  form.append('n', String(count))
  form.append('output_format', OUTPUT_FORMAT)
  // Préserve les traits du visage de la référence plutôt qu'une réinterprétation.
  // Accepté par gpt-image-1.5, refusé par gpt-image-2.
  form.append('input_fidelity', 'high')

  const response = await fetch(ENDPOINT, { method: 'POST', body: form })

  // Sans clé, le proxy n'existe pas : le serveur de développement répond autre
  // chose que du JSON. La génération est alors indisponible, pas en erreur.
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) return null

  if (!response.ok) throw new Error(await readError(response))

  const payload = (await response.json()) as { data?: { b64_json?: string; url?: string }[] }
  const images = payload.data ?? []
  if (images.length === 0) throw new Error('Le modèle a répondu sans image.')

  // Les modèles GPT Image rendent des images encodées ; sinon une URL directe.
  // Cadrage `entier` pour toutes : les propositions sont déjà trois images
  // distinctes, leur imposer des zooms différents les ferait passer pour une
  // seule image recadrée.
  // Identifiant unique par appel : « Relancer » accumule les propositions.
  const batch = Date.now().toString(36)
  return images.map((image, index) => ({
    id: `gen-${batch}-${index}`,
    url: image.b64_json ? `data:image/${OUTPUT_FORMAT};base64,${image.b64_json}` : image.url ?? null,
    crop: 'entier' as const,
  }))
}
