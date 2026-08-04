/**
 * Simulation d'échange (mock front) — donne l'impression d'un expert qui
 * travaille vraiment, en attendant le runtime réel. La réponse :
 *  1. accuse réception EN CITANT la demande de l'utilisateur,
 *  2. propose la méthode de l'expert (adaptée à son métier),
 *  3. pose la bonne question (l'accroche `intakeAsk` de l'expert),
 * puis aux tours suivants produit un résultat concret dans son domaine.
 * À retirer quand l'agent-runtime branchera un vrai modèle.
 */
import type { RosterExpert } from '../../../features/agents/roster'

interface MetierPack {
  /** Méthode proposée au premier tour (étapes). */
  approach: string[]
  /** Livrable concret produit aux tours suivants. */
  result: string[]
  /** Relance de clôture (proposition d'action). */
  closer: string
}

const PACKS: Record<string, MetierPack> = {
  ventes: {
    approach: ['Je qualifie la demande et je vérifie que le besoin est réel', "Je prépare un message d'approche et une relance au bon moment", 'Je cadre une proposition (offre + prix) prête à envoyer'],
    result: ["J'ai rédigé un message d'approche personnalisé et une relance à J+3", 'Voici une trame de devis avec une fourchette de prix cohérente avec le marché local', 'Je peux programmer les relances pour ne rien laisser refroidir'],
    closer: 'Je lance les relances, ou vous relisez la proposition d’abord ?',
  },
  support: {
    approach: ["Je lis la demande et j'identifie l'intention du client", 'Je prépare une réponse claire, dans votre ton', "J'escalade à l'équipe si c'est sensible, avec une note de suivi"],
    result: ['Voici une réponse prête à envoyer, polie et concise', "J'ai ajouté une variante courte pour WhatsApp", 'Je garde une trace pour l’équipe et je relance sans réponse'],
    closer: 'Je l’envoie, ou vous préférez ajuster le ton ?',
  },
  marketing: {
    approach: ["Je clarifie l'objectif et l'audience", 'Je propose un angle et un plan de contenus', 'Je rédige et je prépare les visuels, prêts à programmer'],
    result: ['Voici 3 idées de posts avec accroche et légende', "J'ai décliné le format pour chaque réseau", 'Je peux programmer la semaine en un clic'],
    closer: 'On part sur ces angles, ou je vous en propose d’autres ?',
  },
  rh: {
    approach: ['Je cadre le sujet (paie, congés, contrat…)', 'Je vérifie la conformité OHADA et le droit local', 'Je prépare le document ou le calcul demandé'],
    result: ['Voici le calcul détaillé, ligne par ligne', "J'ai préparé le document correspondant, conforme OHADA", 'Je le fais valider par la RH avant tout envoi'],
    closer: 'Je génère le document définitif ?',
  },
  finance: {
    approach: ['Je réunis vos chiffres clés', 'Je bâtis le tableau ou le prévisionnel', 'Je repère les points faibles avant un rendez-vous bancaire'],
    result: ['Voici un prévisionnel synthétique (résultat, trésorerie)', "J'ai isolé deux points à sécuriser dans le dossier", 'Je peux sortir un PDF propre pour la banque'],
    closer: 'Je prépare la version PDF ?',
  },
  juridique: {
    approach: ["J'identifie le type d'acte et les parties", 'Je rédige ou je relis en signalant les risques', 'Je prépare une version conforme OHADA, prête à valider'],
    result: ['Voici un projet de document avec les clauses essentielles', "J'ai signalé deux clauses à surveiller", "Rien ne s'engage sans votre validation"],
    closer: 'Je prépare la version à signer ?',
  },
  operations: {
    approach: ['Je fais le point sur le périmètre (facturation, relances, stock)', 'Je liste ce qui est en retard ou en risque', 'Je prépare les actions et les relances'],
    result: ["J'ai repéré les impayés et préparé des relances graduées", 'Deux références sont proches de la rupture — je le signale', 'Je mets à jour le tableau de bord de la semaine'],
    closer: 'Je lance les relances ?',
  },
  data: {
    approach: ['Je clarifie la question à trancher', 'Je réunis les données utiles (période, source)', 'Je construis le tableau de bord ou la prévision'],
    result: ["Voici un classement clair avec l'évolution vs période précédente", "J'ai mis en avant 3 alertes qui comptent", 'Je peux en faire un tableau de bord partageable + alerte hebdo'],
    closer: 'Je vous prépare le tableau de bord ?',
  },
  recrutement: {
    approach: ['Je cadre le poste et le profil idéal', 'Je source et je présélectionne', "Je prépare l'entretien et le scoring"],
    result: ['Voici une fiche de poste claire et attractive', "J'ai présélectionné des profils notés sur l'adéquation", 'Je prépare un guide d’entretien et je programme les rendez-vous'],
    closer: 'Je lance le sourcing ?',
  },
  design: {
    approach: ["Je clarifie le support et l'occasion", "Je respecte votre charte (ou j'en pose une)", 'Je produis le visuel et ses déclinaisons'],
    result: ['Voici une proposition de visuel dans votre charte', "Je l'ai décliné en story, post et format imprimable", 'Je vérifie la cohérence avant publication'],
    closer: 'Je prépare les déclinaisons ?',
  },
}

const FALLBACK: MetierPack = {
  approach: ['Je clarifie votre besoin', 'Je prépare une première proposition', 'Je vous la soumets pour validation'],
  result: ["Voici une première version fondée sur ce que vous m'avez indiqué", 'Je peux l’affiner autant que nécessaire'],
  closer: 'On continue sur cette base ?',
}

const bullets = (items: string[]) => items.map((item) => `• ${item}`).join('\n')
const snippet = (text: string) => {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 90 ? `${clean.slice(0, 90)}…` : clean
}

/**
 * @param priorAgentCount nombre de réponses déjà données par l'expert (0 = première).
 */
export function simulateReply(expert: RosterExpert, userText: string, priorAgentCount: number): string {
  const pack = PACKS[expert.metierKey] ?? FALLBACK
  if (priorAgentCount === 0) {
    return `Bien reçu — vous voulez « ${snippet(userText)} ». Voici comment je m'y prends :\n${bullets(pack.approach)}\n\n${expert.intakeAsk}`
  }
  if (priorAgentCount === 1) {
    return `Parfait, merci pour ces précisions.\n${bullets(pack.result)}\n\n${pack.closer}`
  }
  return `C'est intégré. Je mets à jour en conséquence — ${pack.closer.charAt(0).toLowerCase()}${pack.closer.slice(1)}`
}
