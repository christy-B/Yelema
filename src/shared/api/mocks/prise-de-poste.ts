import type { RosterExpert } from '../../../features/agents/roster'

/**
 * `intakeAsk` est écrit comme une RÉPONSE à une demande : il commence par une
 * formule de politesse (« Avec plaisir. », « Bien sûr. », « À vos ordres. »).
 * En ouverture elle ne répond à rien, on la retire — la question, elle, reste
 * intacte. Vérifié sur les 12 experts : la formule est toujours la première
 * phrase, courte et sans point d'interrogation.
 */
function questionOnly(intakeAsk: string): string {
  const cut = intakeAsk.indexOf('.')
  if (cut < 0 || cut > 20) return intakeAsk
  const rest = intakeAsk.slice(cut + 1).trim()
  return rest || intakeAsk
}

/**
 * Message d'ouverture d'un expert qui vient d'être recruté — sa prise de poste.
 * Il se présente, rappelle ce qu'il prend en charge, puis pose LA question dont
 * il a besoin pour démarrer.
 *
 * Le texte vient de la fiche de l'expert (`fonction`, `intakeAsk`) : rien n'est
 * inventé ici, et une correction dans le roster se répercute sur la prise de
 * poste. Côté production, ce message sera produit par le runtime de l'expert.
 *
 * `daily` est volontairement absent : ses entrées sont rédigées à la troisième
 * personne (« Répond aux commentaires », « Tient la comptabilité ») et sept des
 * vingt-huit formes changent au « je » (réponds, tiens, suis, produis…). Les
 * lister ici produirait des fautes ; il faudrait un libellé au « je » dans le
 * roster.
 */
export function openingMessage(expert: RosterExpert): string {
  return [
    `Bonjour, ${expert.name} à votre service.`,
    expert.fonction,
    questionOnly(expert.intakeAsk),
  ].join('\n\n')
}

/** Aperçu du fil dans les listes : la première phrase suffit. */
export function openingPreview(expert: RosterExpert): string {
  return `Bonjour, ${expert.name} à votre service.`
}
