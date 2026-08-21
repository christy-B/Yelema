/**
 * Roster des experts IA Yelema (personas nommés + métier + fonction + skills),
 * extrait du prototype HTML fourni par le design (« index (1).html »). MOCK
 * front en attendant que le back expose le modèle « expert IA ». Servi par MSW
 * sur /agents (voir agent.handlers).
 */
export interface RosterSkill {
  key: string
  label: string
  description: string
  inputs: string[]
  outputs: string[]
}

export interface RosterExpert {
  id: string
  name: string
  metier: string
  metierKey: string
  /**
   * Grand groupe de métier. Le métier ci-dessus est propre à l'expert et
   * s'affiche sur sa carte ; le groupe rassemble plusieurs experts et sert aux
   * filtres du catalogue.
   */
  group: string
  groupKey: string
  /** Genre de la persona (accord « il / elle ») — issu des accroches d'origine. */
  gender: 'f' | 'm'
  /** Runtime de l'expert. LOKOLI est livré sur un OpenClaw dédié. */
  type: 'native-agent' | 'openclaw'
  /**
   * Rôle particulier. Un `orchestrator` n'est ni recrutable ni membre de
   * l'équipe : il vient avec les projets. Sa fiche reste consultable, mais il
   * ne figure pas dans la liste des experts.
   */
  role?: 'orchestrator'
  channels: string[]
  /** Accroche courte (carte catalogue). */
  description: string
  /** Première relance de l'expert en début de conversation : demande les infos clés (guidage naturel). */
  intakeAsk: string
  /** Fonction détaillée de l'expert (« Sa fonction »). */
  fonction: string
  /** Ce qu'il fait au quotidien (peut être vide). */
  daily: string[]
  skills: RosterSkill[]
  /** Intégrations / connecteurs — noms d'affichage. */
  connectors: string[]
  /**
   * « Soumis à votre accord » — les actions de cet expert qui exigent une
   * validation humaine. Fixées au cadrage, fonction par fonction : la liste
   * figure dans la fiche de poste signée, elle se lit sans se modifier.
   */
  approvals: string[]
  /** Démo « En action » : récit, valeur ajoutée, mini-conversation. */
  usecase: { enAction: string; valeur: string; conversation: { dir: 'in' | 'out'; text: string }[] }
}

export const ROSTER: RosterExpert[] = [
  {
    id: "exp_kouassi", name: "Kouassi", metier: "Commercial & Ventes", metierKey: "ventes", group: "Commercial", groupKey: "commercial", gender: 'm', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Il ne laisse jamais une opportunité refroidir.",
    intakeAsk: "Avec plaisir. Pour vous aider au mieux : de quel produit ou service parle-t-on, et quels clients visez-vous ?",
    fonction: "Le développement commercial de bout en bout : trouver les bons prospects, les relancer au bon moment, préparer les devis et garder le pipeline vivant, du premier message à la signature.",
    daily: ["Qualifie les demandes entrantes (WhatsApp, e-mail, DM) et pose les bonnes questions","Relance les devis en attente avec le ton juste, sans harceler","Prend les rendez-vous et prépare les fiches commerciales","Signale au dirigeant les affaires chaudes et celles qui coincent"],
    connectors: ["WhatsApp","Gmail","LinkedIn","Google Sheets","Calendly","HubSpot"],
    approvals: ["Envoi d'un devis","Envoi d'un message à un prospect","Prise d'un engagement commercial","Remise / geste tarifaire"],
    usecase: {"enAction":"Un devis envoyé il y a 5 jours reste sans réponse. Kouassi relance avec un message personnalisé, propose un appel, et prévient le commercial que le prospect a rouvert le devis deux fois. L'affaire repart.","valeur":"Un pipeline toujours à jour et des relances jamais oubliées : mécaniquement, plus d'affaires signées, sans embaucher un commercial de plus.","conversation":[{"dir":"in","text":"Bonjour, vous livrez à Bouaké ?"},{"dir":"out","text":"Oui, livraison à Bouaké sous 48h 🚚. C'est pour votre entreprise ? Je peux vous préparer un devis."},{"dir":"in","text":"Oui on est un supermarché"},{"dir":"out","text":"Parfait. Je vous propose demain 10h avec notre commercial, et je prépare une offre grossiste. Ça vous va ?"},{"dir":"in","text":"10h ça me va"},{"dir":"out","text":"C'est noté ✅ Rendez-vous demain 10h. Je vous envoie l'offre grossiste ce soir."},{"dir":"in","text":"Merci"},{"dir":"out","text":"Avec plaisir. Je relance si je n'ai pas de retour sous 3 jours."}]},
    skills: [
      { key: "client-ideal-icp-0", label: "Client idéal (ICP)", description: "Définit le profil d'entreprise à cibler en priorité à partir de votre activité.", inputs: [], outputs: [] },
      { key: "prospection-b2b-1", label: "Prospection B2B", description: "Trouve et qualifie des profils d'entreprises correspondant à votre cible.", inputs: [], outputs: [] },
      { key: "sequences-de-relance-2", label: "Séquences de relance", description: "Rédige les messages d'approche J0/J3/J7 personnalisés — WhatsApp, e-mail, LinkedIn.", inputs: [], outputs: [] },
      { key: "tri-des-demandes-entrantes-3", label: "Tri des demandes entrantes", description: "Classe les messages par intention et température, répond et pousse au rendez-vous.", inputs: [], outputs: [] },
      { key: "signaux-d-achat-4", label: "Signaux d'achat", description: "Repère les signaux (recrutement, expansion, lancement) qui indiquent qu'un compte est prêt.", inputs: [], outputs: [] },
      { key: "scoring-suivi-des-leads-5", label: "Scoring & suivi des leads", description: "Note chaque piste de 0 à 100 et relance, sans laisser mourir une opportunité.", inputs: [], outputs: [] },
      { key: "pricing-local-fcfa-6", label: "Pricing local (FCFA)", description: "Recommande une grille de prix avec benchmark régional UEMOA, en FCFA et USD.", inputs: [], outputs: [] },
      { key: "playbook-de-vente-7", label: "Playbook de vente", description: "Construit l'argumentaire et le pitch, pour le B2B formel comme informel.", inputs: [], outputs: [] },
      { key: "analytics-des-ventes-8", label: "Analytics des ventes", description: "Teste les messages et suit le tunnel de conversion étape par étape.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_awa", name: "Awa", metier: "Support & Relation client", metierKey: "support", group: "Commercial", groupKey: "commercial", gender: 'f', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Elle répond à vos clients, jour et nuit, sur WhatsApp.",
    intakeAsk: "Bien sûr. Dites-m'en un peu plus : s'agit-il d'une demande client précise, ou voulez-vous que je prépare une réponse type ?",
    fonction: "Le guichet client de l'entreprise, ouvert 24h/24 : absorber les demandes entrantes, y répondre, et donner une suite à chacune.",
    daily: ["Répond aux clients à toute heure sur WhatsApp, Telegram et e-mail","Retrouve les commandes et donne le statut sans faire attendre","Trie les demandes et escalade les cas sensibles à la bonne personne","Laisse une note pour l'équipe et ne laisse aucun message sans suite"],
    connectors: ["WhatsApp","Telegram","Gmail","Google Sheets","Notion","Zendesk"],
    approvals: ["Réponse envoyée au client","Remboursement / geste commercial","Clôture d'un litige","Escalade externe"],
    usecase: {"enAction":"Un client écrit à 22h « ma livraison n'est pas arrivée ». Awa retrouve la commande, explique le statut, propose un créneau de rappel, et laisse une note pour l'équipe du matin. Le client a une réponse tout de suite ; l'équipe garde le contrôle.","valeur":"Zéro message client sans réponse, et un temps de réponse divisé par plusieurs — sans embaucher une équipe de nuit.","conversation":[{"dir":"in","text":"Bonjour, je n'ai pas reçu ma commande #4820"},{"dir":"out","text":"Bonjour 👋 Je vérifie… Votre colis est en livraison, arrivée prévue aujourd'hui avant 18h. Je vous envoie le suivi ?"},{"dir":"in","text":"Oui merci"},{"dir":"out","text":"Voici le lien de suivi 📦. J'ai noté votre message pour l'équipe. Autre chose ?"},{"dir":"in","text":"Et si je ne suis pas là ?"},{"dir":"out","text":"Le livreur vous appelle avant de passer. Sinon, nouvelle tentative demain sur le même créneau."},{"dir":"in","text":"Ok parfait"},{"dir":"out","text":"Je reste joignable si besoin 🙏 Bonne soirée."}]},
    skills: [
      { key: "tri-des-tickets-0", label: "Tri des tickets", description: "Classe chaque demande entrante par urgence, sentiment et sujet, et l'assigne au bon interlocuteur.", inputs: [], outputs: [] },
      { key: "faq-articles-d-aide-1", label: "FAQ & articles d'aide", description: "Repère les questions récurrentes et génère les réponses et articles d'aide prêts à publier.", inputs: [], outputs: [] },
      { key: "parcours-whatsapp-2", label: "Parcours WhatsApp", description: "Conçoit les flux WhatsApp de bout en bout : accueil, KYC, paiement, FAQ, escalade.", inputs: [], outputs: [] },
      { key: "analyse-de-satisfaction-nps-3", label: "Analyse de satisfaction (NPS)", description: "Analyse les retours clients, distingue promoteurs et détracteurs, remonte les verbatims.", inputs: [], outputs: [] },
      { key: "score-de-sante-client-4", label: "Score de santé client", description: "Note chaque client selon usage, paiements et tickets pour repérer ceux à risque.", inputs: [], outputs: [] },
      { key: "suivi-d-onboarding-5", label: "Suivi d'onboarding", description: "Accompagne les nouveaux clients sur leurs 30 premiers jours et détecte les décrochages.", inputs: [], outputs: [] },
      { key: "retention-anti-churn-6", label: "Rétention / anti-churn", description: "Déclenche une séquence de sauvetage dès qu'un client montre des signes de départ.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_alioune", name: "Alioune", metier: "Investissement", metierKey: "investissement", group: "Finance", groupKey: "finance", gender: 'm', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Il instruit chaque investissement avant qu'un euro ne parte.",
    intakeAsk: "Commençons par le cadre : capital-risque ou capital-investissement, quelle thèse, quel ticket et quel dossier faut-il instruire ?",
    fonction: "L'instruction des investissements de bout en bout : sourcing contre la thèse du fonds, lecture de la salle de données, audit du modèle, note au comité, valorisation et suivi de la participation.",
    daily: ["Note les dossiers contre la thèse réelle du fonds","Inventorie les pièces et signale les manques et incohérences","Audite les modèles financiers et prépare les questions à la direction","Suit les participations, la trésorerie et les alertes convenues"],
    connectors: ["Google Drive","Dropbox","Excel","Google Sheets","Notion","Gmail"],
    approvals: ["Transmission d'un prix ou d'une offre","Contact d'un dirigeant ou co-investisseur","Diffusion d'une note de comité hors du fonds","Rejet définitif d'un dossier"],
    usecase: {"enAction":"Avant un comité, Alioune inventorie la salle de données, recalcule les indicateurs depuis les pièces sources, liste les manques et contradictions, puis livre une note d'investissement avec scénarios, risques et questions à trancher.","valeur":"Des décisions d'investissement documentées, comparables et traçables — sans laisser un chiffre non vérifié passer au comité.","conversation":[{"dir":"in","text":"Analyse ce dossier pour le comité de vendredi"},{"dir":"out","text":"Je commence par la thèse du fonds, le type d'opération et l'inventaire de la data room. Quel est le ticket visé ?"},{"dir":"in","text":"Série A, 1,5 M€"},{"dir":"out","text":"Inventaire terminé : trois pièces manquent et deux chiffres de revenus se contredisent. Je prépare les questions au fondateur avant la note."},{"dir":"in","text":"Fais la note avec ce que nous avons"},{"dir":"out","text":"Note de comité prête, avec les écarts signalés, les scénarios de valorisation et les points bloquants marqués à confirmer."}]},
    skills: [
      { key: "tri-des-dossiers-entrants-0", label: "Tri des dossiers entrants", description: "Note chaque opportunité contre la thèse réelle du fonds.", inputs: [], outputs: [] },
      { key: "lecture-data-room-1", label: "Lecture de data room", description: "Inventorie les pièces et rattache chaque fait à sa source.", inputs: [], outputs: [] },
      { key: "due-diligence-2", label: "Due diligence", description: "Structure les vérifications financières, juridiques, commerciales et opérationnelles.", inputs: [], outputs: [] },
      { key: "audit-modele-financier-3", label: "Audit du modèle financier", description: "Recalcule les indicateurs depuis les données brutes et signale les hypothèses fragiles.", inputs: [], outputs: [] },
      { key: "note-de-comite-4", label: "Note de comité", description: "Produit une recommandation documentée, avec risques, scénarios et points à trancher.", inputs: [], outputs: [] },
      { key: "valorisation-term-sheet-5", label: "Valorisation & term sheet", description: "Modélise la dilution, le prix et le coût des clauses proposées.", inputs: [], outputs: [] },
      { key: "kyc-aml-6", label: "KYC / AML", description: "Vérifie les dirigeants, bénéficiaires effectifs et signaux de conformité.", inputs: [], outputs: [] },
      { key: "comparables-7", label: "Comparables", description: "Recherche et analyse les transactions et sociétés comparables pertinentes.", inputs: [], outputs: [] },
      { key: "suivi-participation-8", label: "Suivi de participation", description: "Suit trésorerie, écarts au plan, gouvernance et alertes post-investissement.", inputs: [], outputs: [] },
      { key: "reporting-souscripteurs-9", label: "Reporting souscripteurs", description: "Prépare le reporting périodique et la traçabilité des indicateurs servis.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_fatima", name: "Fatima", metier: "Marketing & Contenu", metierKey: "marketing", group: "Marketing", groupKey: "marketing", gender: 'f', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Elle fait vivre votre marque, chaque semaine.",
    intakeAsk: "Avec plaisir. Sur quel canal et pour quel objectif — notoriété, ventes, lancement ? Et avez-vous une échéance ?",
    fonction: "La présence de marque complète : stratégie, production et programmation des contenus, animation des réseaux et relation presse, dans votre voix.",
    daily: ["Rédige et programme les posts de la semaine dans votre voix","Prépare les visuels et les décline au format de chaque réseau","Répond aux commentaires et messages privés sur les réseaux","Surveille les tendances et propose les sujets à saisir"],
    connectors: ["Instagram","Facebook","LinkedIn","WhatsApp","Buffer","Canva"],
    approvals: ["Publication d'un post","Envoi d'un communiqué","Lancement d'une campagne payante","Réponse publique à un commentaire"],
    usecase: {"enAction":"Pour le lancement d'une offre, Fatima propose un plan de 6 posts, rédige les textes, prépare les visuels, programme la semaine et livre une newsletter prête à valider. Le fondateur relit et publie en un clic.","valeur":"Un calendrier éditorial tenu sans effort et une marque toujours présente — la régularité que personne n'a le temps d'assurer.","conversation":[{"dir":"in","text":"Il me faut 5 posts pour la promo de fin de mois"},{"dir":"out","text":"C'est parti 🎨 Je propose : teasing J-3, l'offre, un témoignage client, compte à rebours, dernier jour. Je rédige et je brande ?"},{"dir":"in","text":"Oui vas-y"},{"dir":"out","text":"Voici les 5 posts + visuels, programmés lun→ven. Tu relis et je publie ✅"},{"dir":"in","text":"Le post du jeudi est trop long"},{"dir":"out","text":"Raccourci à deux lignes, avec l'accroche en premier. Je te le remontre ?"},{"dir":"in","text":"Oui"},{"dir":"out","text":"Le voilà 👌 Programmation inchangée, jeudi 11h."}]},
    skills: [
      { key: "strategie-de-marque-0", label: "Stratégie de marque", description: "Positionnement, voix de marque et message — le socle de votre communication.", inputs: [], outputs: [] },
      { key: "calendrier-editorial-1", label: "Calendrier éditorial", description: "Planifie et produit les posts multi-réseaux (attirer / convertir / fidéliser).", inputs: [], outputs: [] },
      { key: "visuels-de-marque-canva-2", label: "Visuels de marque (Canva)", description: "Génère posts, carrousels et stories brandés, prêts à publier.", inputs: [], outputs: [] },
      { key: "programmation-multi-canaux-3", label: "Programmation multi-canaux", description: "Programme les publications au bon moment, au format natif de chaque plateforme.", inputs: [], outputs: [] },
      { key: "community-management-4", label: "Community management", description: "Trie et répond aux commentaires et messages privés sur les réseaux.", inputs: [], outputs: [] },
      { key: "veille-des-tendances-5", label: "Veille des tendances", description: "Suit chaque semaine les tendances des réseaux par canal et par pays.", inputs: [], outputs: [] },
      { key: "seo-6", label: "SEO", description: "Mots-clés, briefs et suivi de positions pour être trouvé sur Google.", inputs: [], outputs: [] },
      { key: "publicite-payante-7", label: "Publicité payante", description: "Décide où, combien et comment investir avant la première campagne.", inputs: [], outputs: [] },
      { key: "relations-presse-8", label: "Relations presse", description: "Sourcing de médias, communiqués et préparation des prises de parole.", inputs: [], outputs: [] },
      { key: "emailing-newsletters-9", label: "Emailing & newsletters", description: "Rédige relances et newsletters engageantes.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_fatou", name: "Fatou", metier: "RH & Paie", metierKey: "rh", group: "RH", groupKey: "rh", gender: 'f', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Elle allège tout ce qui pèse sur les équipes RH.",
    intakeAsk: "Bien sûr. Pour être précise : quel est le sujet — paie, congés, contrat — et quel salarié ou poste est concerné ? Je m'aligne sur l'OHADA.",
    fonction: "L'administration RH du quotidien, conforme OHADA : paie, congés, contrats, questions des salariés, évaluations. De quoi libérer le temps humain.",
    daily: ["Répond aux questions des salariés (congés, paie, frais)","Calcule les soldes de congés et prépare les attestations","Prépare la paie et les contrats conformes OHADA","Alerte la RH sur les échéances sociales à venir"],
    connectors: ["Google Workspace","Notion","WhatsApp","Slack","Gmail","Google Sheets"],
    approvals: ["Validation de la paie","Envoi d'un contrat","Communication RH aux salariés","Traitement de données personnelles"],
    usecase: {"enAction":"Un salarié demande son solde de congés et une attestation. Fatou répond avec le solde exact, génère l'attestation, la fait valider par la RH, et l'envoie — en dix minutes au lieu de deux jours.","valeur":"Les demandes RH traitées en minutes, une paie juste et plus aucune échéance sociale oubliée — sans DRH à plein temps.","conversation":[{"dir":"in","text":"Combien coûte un commercial payé 400 000 net ?"},{"dir":"out","text":"Je te calcule ça : à 400 000 net, compte environ 590–620 000 FCFA de coût total employeur (brut + charges CNPS/IGR). Je te sors le détail ligne par ligne ?"},{"dir":"in","text":"Oui stp"},{"dir":"out","text":"Voici la décomposition 📄. J'ai aussi préparé le contrat de travail OHADA correspondant."},{"dir":"in","text":"Et les charges patronales ?"},{"dir":"out","text":"Environ 18 % du brut (CNPS + accidents du travail). C'est déjà inclus dans le total que je t'ai donné."},{"dir":"in","text":"Ok merci"},{"dir":"out","text":"Je te prépare la fiche de paie type si tu veux la valider avant l'embauche."}]},
    skills: [
      { key: "simulation-de-paie-uemoa-0", label: "Simulation de paie (UEMOA)", description: "Calcule net, brut et charges sociales selon le barème UEMOA.", inputs: [], outputs: [] },
      { key: "politiques-rh-ohada-1", label: "Politiques RH & OHADA", description: "Rédige et met à jour les politiques RH conformes OHADA.", inputs: [], outputs: [] },
      { key: "conges-absences-2", label: "Congés & absences", description: "Clarifie les droits, calcule les soldes, gère les absences (OHADA + droit local).", inputs: [], outputs: [] },
      { key: "cas-rh-individuels-3", label: "Cas RH individuels", description: "Guide les procédures sensibles : avertissement, mise à pied, rupture, conformes OHADA.", inputs: [], outputs: [] },
      { key: "faq-rh-pour-les-salaries-4", label: "FAQ RH pour les salariés", description: "Répond aux questions des salariés (congés, paie, frais) en langage simple.", inputs: [], outputs: [] },
      { key: "plan-d-integration-30-60-90-5", label: "Plan d'intégration 30/60/90", description: "Construit le parcours d'onboarding par poste : objectifs, jalons, livrables.", inputs: [], outputs: [] },
      { key: "offboarding-solde-de-tout-compte-6", label: "Offboarding & solde de tout compte", description: "Orchestre les départs et calcule le solde de tout compte OHADA.", inputs: [], outputs: [] },
      { key: "campagnes-d-evaluation-7", label: "Campagnes d'évaluation", description: "Prépare les entretiens : objectifs SMART/OKR, auto-évaluation et évaluation manager.", inputs: [], outputs: [] },
      { key: "tableau-de-bord-rh-8", label: "Tableau de bord RH", description: "Effectifs, turnover, parité, coût par recrutement — les chiffres RH d'un coup d'œil.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_mamadou", name: "Mamadou", metier: "Finance & Comptabilité", metierKey: "finance", group: "Finance", groupKey: "finance", gender: 'm', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Il garde vos comptes clairs et vos dossiers bancables.",
    intakeAsk: "Avec plaisir. Il me faut trois repères : votre chiffre d'affaires récent, le besoin (montant) et l'échéance visée.",
    fonction: "Le pilotage financier de la PME : comptabilité OHADA, contrôle de gestion, business plan et prévisionnel. De quoi décider sur des chiffres justes et obtenir des financements.",
    daily: ["Structure et tient la comptabilité selon le référentiel OHADA","Prépare les tableaux de trésorerie et de marge","Monte les dossiers de financement (prêt, subvention)","Alerte le dirigeant dès qu'un chiffre sort des clous"],
    connectors: ["Google Sheets","Excel","Sage","QuickBooks","Gmail","Banques"],
    approvals: ["Tout paiement / virement","Clôture comptable","Envoi d'un reporting externe","Engagement de dépense"],
    usecase: {"enAction":"Avant un rendez-vous bancaire, Mamadou reconstitue le prévisionnel à 3 ans, prépare le plan de remboursement, repère les points faibles du dossier et livre un PDF propre. Le dirigeant arrive préparé.","valeur":"Des comptes carrés, une trésorerie sous contrôle et un business plan bancable — à la demande, sans directeur financier.","conversation":[{"dir":"in","text":"Prépare le prévisionnel pour ma demande de crédit"},{"dir":"out","text":"Ok. Il me faut 3 infos : chiffre d'affaires des 12 derniers mois, montant du crédit et durée. Tu me donnes ça ?"},{"dir":"in","text":"CA 45M, crédit 15M sur 3 ans"},{"dir":"out","text":"Voici le prévisionnel 3 ans (compte de résultat, trésorerie, plan de remboursement) prêt pour la banque 📊. Je te le mets en PDF ?"},{"dir":"in","text":"Oui en PDF"},{"dir":"out","text":"PDF envoyé 📄 Trois onglets : compte de résultat, trésorerie, plan de remboursement."},{"dir":"in","text":"La banque va demander des garanties ?"},{"dir":"out","text":"Très probablement. Je te liste ce qui est attendu et je complète le dossier."}]},
    skills: [
      { key: "comptabilite-ohada-0", label: "Comptabilité OHADA", description: "Structure la comptabilité de l'entreprise selon le référentiel OHADA.", inputs: [], outputs: [] },
      { key: "audit-controle-de-gestion-1", label: "Audit & contrôle de gestion", description: "Audit comptable et contrôle de gestion pour garder les comptes carrés.", inputs: [], outputs: [] },
      { key: "business-plan-2", label: "Business plan", description: "Construit le business plan (acquisition + revenus) pour un prêt bancaire ou une subvention.", inputs: [], outputs: [] },
      { key: "modelisation-financiere-3", label: "Modélisation financière", description: "Bâtit le prévisionnel et les projections à 3 ans.", inputs: [], outputs: [] },
      { key: "etude-de-marche-4", label: "Étude de marché", description: "Dimensionne le marché (TAM/SAM/SOM) pour cadrer une décision.", inputs: [], outputs: [] },
      { key: "veille-prix-finance-5", label: "Veille prix & finance", description: "Suit les prix et l'intelligence financière de votre secteur.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_ibrahim", name: "Ibrahim", metier: "Juridique & Conformité", metierKey: "juridique", group: "Juridique", groupKey: "juridique", gender: 'm', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Il tient le juridique carré, pour le privé comme pour le public.",
    intakeAsk: "Bien sûr. De quel type de document s'agit-il, et entre quelles parties ? Je le prépare conforme OHADA.",
    fonction: "Le réflexe juridique du quotidien : contrats OHADA, revue de documents, conformité et veille réglementaire. De quoi agir vite en restant couvert.",
    daily: ["Rédige et relit les contrats commerciaux et de travail","Signale les risques dans un document entrant","Suit les échéances contractuelles et réglementaires","Prépare les pièces pour l'administration"],
    connectors: ["DocuSign","Google Drive","Gmail","Notion","Google Sheets"],
    approvals: ["Signature / engagement contractuel","Envoi d'un document juridique","Position de conformité communiquée","Réponse à une autorité"],
    usecase: {"enAction":"Un partenaire envoie un contrat à signer. Ibrahim le relit, pointe deux clauses à risque, propose une reformulation, et attend la validation du dirigeant avant tout retour. Rien ne s'engage sans accord humain.","valeur":"Le réflexe juridique et la conformité OHADA à portée de main — des contrats propres, sans passer par un cabinet à chaque fois.","conversation":[{"dir":"in","text":"Fais-moi un contrat de prestation pour un client"},{"dir":"out","text":"Bien sûr. Objet de la prestation, durée et montant ? Je le rédige conforme OHADA."},{"dir":"in","text":"Community management, 6 mois, 300 000/mois"},{"dir":"out","text":"Voici le contrat (objet, durée, prix, résiliation, confidentialité) prêt à signer ✍. Je l'envoie en signature électronique ?"},{"dir":"in","text":"Oui envoie-le"},{"dir":"out","text":"Envoyé. Le client reçoit le lien de signature — je te préviens dès qu'il a signé."},{"dir":"in","text":"Et s'il ne paie pas ?"},{"dir":"out","text":"La clause de résiliation prévoit une mise en demeure à 15 jours. Je peux la durcir si tu préfères."}]},
    skills: [
      { key: "contrats-commerciaux-ohada-0", label: "Contrats commerciaux OHADA", description: "Rédige les contrats commerciaux conformes OHADA.", inputs: [], outputs: [] },
      { key: "contrats-de-travail-1", label: "Contrats de travail", description: "Génère les contrats de travail (OHADA + droit local).", inputs: [], outputs: [] },
      { key: "revue-juridique-2", label: "Revue juridique", description: "Relit les documents entrants et signale les risques.", inputs: [], outputs: [] },
      { key: "veille-contractuelle-3", label: "Veille contractuelle", description: "Surveille les échéances et clauses de vos contrats.", inputs: [], outputs: [] },
      { key: "conformite-des-donnees-dcp-4", label: "Conformité des données (DCP)", description: "Met en conformité la protection des données personnelles.", inputs: [], outputs: [] },
      { key: "risques-reglementaires-5", label: "Risques réglementaires", description: "Cartographie les risques réglementaires par activité et par pays.", inputs: [], outputs: [] },
      { key: "veille-reglementaire-6", label: "Veille réglementaire", description: "Suit la réglementation (fintech UEMOA et secteurs régulés).", inputs: [], outputs: [] },
      { key: "creation-de-societe-7", label: "Création de société", description: "Accompagne l'incorporation en Côte d'Ivoire et à l'international.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_salif", name: "Salif", metier: "Opérations & Admin", metierKey: "operations", group: "Opérations", groupKey: "operations", gender: 'm', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Il fait tourner l’administratif et la trésorerie du quotidien.",
    intakeAsk: "Avec plaisir. On parle de facturation, de relances ou de stock ? Donnez-moi la période et le périmètre concernés.",
    fonction: "Le moteur opérationnel : facturation, relances, stock et approvisionnements, suivi des tâches. De quoi garder la main sur chaque échéance.",
    daily: ["Émet les factures et relance les impayés avec méthode","Surveille les stocks et alerte avant la rupture","Transforme réunions et échanges en tâches suivies","Produit les indicateurs clés de la semaine"],
    connectors: ["Google Sheets","Notion","WhatsApp","QuickBooks","Shopify","Gmail"],
    approvals: ["Émission d'une facture","Relance d'impayé envoyée","Commande fournisseur","Ajustement de stock"],
    usecase: {"enAction":"En fin de mois, Salif repère les impayés, lance des relances graduées, signale deux produits en rupture imminente et met à jour le tableau de bord. Le dirigeant voit tout d'un coup d'œil.","valeur":"Facturation, relances et stock sous contrôle, en pilote automatique — la rigueur d'un directeur d'exploitation, sans le poste.","conversation":[{"dir":"in","text":"Relance tous les clients qui n'ont pas payé leur facture de mai"},{"dir":"out","text":"J'ai trouvé 7 factures impayées (total 2,3M FCFA). J'envoie une relance personnalisée à chacun et je programme un rappel dans 5 jours ?"},{"dir":"in","text":"Oui"},{"dir":"out","text":"7 relances envoyées ✅. 2 clients ont déjà répondu, je te les remonte. Rappel programmé pour les autres."},{"dir":"in","text":"Et le stock de savon ?"},{"dir":"out","text":"Il reste 12 jours au rythme actuel. Je prépare la commande fournisseur ?"},{"dir":"in","text":"Oui prépare"},{"dir":"out","text":"Commande prête 📦 J'attends ta validation avant de l'envoyer."}]},
    skills: [
      { key: "facturation-automatique-0", label: "Facturation automatique", description: "Émet les factures et les envoie automatiquement.", inputs: [], outputs: [] },
      { key: "relance-des-impayes-1", label: "Relance des impayés", description: "Relance les clients en retard de paiement, avec méthode et bon ton.", inputs: [], outputs: [] },
      { key: "suivi-de-stock-2", label: "Suivi de stock", description: "Surveille les stocks, alerte avant la rupture et calcule le réassort.", inputs: [], outputs: [] },
      { key: "approvisionnements-3", label: "Approvisionnements", description: "Suit les sources d'approvisionnement et les commandes fournisseurs.", inputs: [], outputs: [] },
      { key: "kpi-hebdomadaires-4", label: "KPI hebdomadaires", description: "Produit chaque semaine les indicateurs clés, brandés.", inputs: [], outputs: [] },
      { key: "suivi-des-taches-5", label: "Suivi des tâches", description: "Transforme réunions et échanges en tâches suivies (Notion + e-mail).", inputs: [], outputs: [] },
      { key: "cartographie-clients-6", label: "Cartographie clients", description: "Cartographie votre portefeuille clients pour piloter le terrain.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_nadia", name: "Nadia", metier: "Data & Analytics", metierKey: "data", group: "Data", groupKey: "data", gender: 'f', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Elle transforme vos chiffres en décisions.",
    intakeAsk: "Avec plaisir. Quelle question voulez-vous trancher, et sur quelles données — période, source ?",
    fonction: "L'intelligence des données de l'entreprise : tableaux de bord, rapports, prévisions et scoring. De quoi piloter sur des chiffres plutôt qu'à l'intuition.",
    daily: ["Met à jour les tableaux de bord et les indicateurs clés","Repère les alertes qui comptent et les remonte au dirigeant","Prévoit la trésorerie et la demande des prochaines semaines","Transforme les comptes-rendus de réunion en décisions et tâches"],
    connectors: ["Google Sheets","Looker","Notion","Fireflies","Gmail"],
    approvals: ["Diffusion d'un rapport externe","Accès à une donnée sensible","Modification d'une source de données","Partage d'un tableau de bord"],
    usecase: {"enAction":"Chaque lundi, Nadia envoie le tableau de bord de la semaine, met en avant les 3 alertes qui comptent et prévoit la trésorerie à 30 jours. Le comité de direction démarre sur des faits.","valeur":"Vos données en tableaux de bord clairs et en prévisions fiables — sans recruter un data analyst.","conversation":[{"dir":"in","text":"Quels sont mes 10 meilleurs points de vente ce mois ?"},{"dir":"out","text":"Voici le top 10 par chiffre d'affaires 📈 (avec évolution vs mois dernier). 3 points de vente décrochent : je te les signale ?"},{"dir":"in","text":"Oui montre"},{"dir":"out","text":"Ces 3 PDV baissent de plus de 20 %. J'ai préparé un tableau de bord partageable et une alerte hebdo automatique."},{"dir":"in","text":"Pourquoi ils baissent ?"},{"dir":"out","text":"Deux ruptures de stock en fin de mois et un changement de gérant. Je te détaille PDV par PDV."},{"dir":"in","text":"Envoie le tableau de bord"},{"dir":"out","text":"Lien envoyé 📊 Il se met à jour tout seul, chaque lundi à 8h."}]},
    skills: [
      { key: "tableaux-de-bord-0", label: "Tableaux de bord", description: "Transforme vos Google Sheets en tableaux de bord clairs et partageables.", inputs: [], outputs: [] },
      { key: "rapports-kpi-1", label: "Rapports KPI", description: "Produit les rapports hebdo, mensuels et trimestriels automatiquement.", inputs: [], outputs: [] },
      { key: "prevision-de-la-demande-2", label: "Prévision de la demande", description: "Prévoit la demande par produit pour ajuster les commandes.", inputs: [], outputs: [] },
      { key: "prevision-de-tresorerie-3", label: "Prévision de trésorerie", description: "Projette les besoins de cash à J+7 / J+14 / J+30.", inputs: [], outputs: [] },
      { key: "scoring-de-performance-4", label: "Scoring de performance", description: "Note et classe vos points de vente ou distributeurs (haut / moyen / faible).", inputs: [], outputs: [] },
      { key: "synthese-de-reunions-5", label: "Synthèse de réunions", description: "Analyse les comptes-rendus et en extrait décisions et tâches.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_adjoua", name: "Adjoua", metier: "Recrutement", metierKey: "recrutement", group: "RH", groupKey: "rh", gender: 'f', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Elle trouve et évalue les bons profils.",
    intakeAsk: "Avec plaisir. Quel poste recrutez-vous, à quel niveau et dans quelle fourchette de rémunération ?",
    fonction: "Le recrutement de bout en bout : de la fiche de poste au sourcing, à l'évaluation et à la lettre d'offre. De quoi embaucher juste et vite.",
    daily: ["Rédige les fiches de poste et lance le sourcing des profils","Présélectionne et note les candidats reçus","Prépare les guides d'entretien et programme les rendez-vous","Suit le pipeline et relance les profils en attente"],
    connectors: ["LinkedIn","Gmail","Google Sheets","Calendly","Notion"],
    approvals: ["Envoi d'une lettre d'offre","Contact d'un candidat","Décision d'embauche","Traitement de données candidats"],
    usecase: {"enAction":"Pour un poste de comptable, Adjoua rédige la fiche, source 15 profils, en présélectionne 5 notés, prépare le guide d'entretien et programme les rendez-vous. Le dirigeant n'a plus qu'à rencontrer les meilleurs.","valeur":"Du sourcing à la lettre d'offre, un recrutement carré et rapide — sans cabinet ni des semaines perdues.","conversation":[{"dir":"in","text":"Trouve-moi 5 comptables à Abidjan"},{"dir":"out","text":"Je lance le sourcing 🔎 Junior ou confirmé, et quel budget ?"},{"dir":"in","text":"Confirmé, 500–700k"},{"dir":"out","text":"Voici 5 profils notés sur l'expérience et l'adéquation, avec un message d'approche prêt pour chacun. J'en contacte combien ?"},{"dir":"in","text":"Les 3 meilleurs"},{"dir":"out","text":"Messages envoyés 📩 Je te remonte les réponses au fur et à mesure."},{"dir":"in","text":"Prépare l'entretien"},{"dir":"out","text":"Guide d'entretien et grille de notation prêts. Créneaux proposés : jeudi et vendredi matin."}]},
    skills: [
      { key: "fiche-de-poste-0", label: "Fiche de poste", description: "Rédige des fiches de poste claires et attractives.", inputs: [], outputs: [] },
      { key: "sourcing-candidats-1", label: "Sourcing candidats", description: "Trouve des profils sur LinkedIn, ciblés par poste et localisation.", inputs: [], outputs: [] },
      { key: "matching-cv-offre-2", label: "Matching CV ↔ offre", description: "Note l'adéquation d'un CV ou profil LinkedIn à vos offres.", inputs: [], outputs: [] },
      { key: "messages-d-approche-3", label: "Messages d'approche", description: "Rédige les messages d'approche et e-mails de recrutement personnalisés.", inputs: [], outputs: [] },
      { key: "guide-d-entretien-scoring-4", label: "Guide d'entretien & scoring", description: "Prépare l'entretien structuré et la grille de notation du candidat.", inputs: [], outputs: [] },
      { key: "business-case-candidat-5", label: "Business case candidat", description: "Génère un exercice de mise en situation et le corrige.", inputs: [], outputs: [] },
      { key: "verification-de-references-6", label: "Vérification de références", description: "Structure et mène la prise de références.", inputs: [], outputs: [] },
      { key: "suivi-du-pipeline-ats-7", label: "Suivi du pipeline (ATS)", description: "Suit chaque candidat étape par étape, relances et échéances.", inputs: [], outputs: [] },
      { key: "lettre-d-offre-ohada-8", label: "Lettre d'offre OHADA", description: "Rédige la lettre d'offre et le contrat conformes OHADA.", inputs: [], outputs: [] },
      { key: "benchmark-remuneration-9", label: "Benchmark rémunération", description: "Compare salaire et avantages au marché.", inputs: [], outputs: [] },
    ],
  },
  {
    id: "exp_koffi", name: "Koffi", metier: "Design & Brand", metierKey: "design", group: "Marketing", groupKey: "marketing", gender: 'm', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Il habille votre marque, du logo au site.",
    intakeAsk: "Avec plaisir. Quel support voulez-vous — affiche, post, logo… —, pour quelle occasion, et avez-vous une charte à respecter ?",
    fonction: "Le studio de design de la marque : identité, visuels, affiches, landing pages et vidéos. De quoi tenir une image cohérente partout.",
    daily: ["Produit affiches, posts et visuels brandés à la demande","Tient la cohérence visuelle sur tous les supports","Décline une création en plusieurs formats (print, story, web)","Vérifie chaque visuel avant publication"],
    connectors: ["Canva","Figma","Google Drive","Instagram","Gmail"],
    approvals: ["Diffusion d'un visuel","Publication d'une landing page","Usage d'un asset de marque","Achat de média / stock"],
    usecase: {"enAction":"Pour l'ouverture d'une boutique, Koffi produit l'affiche dans la charte, la décline en story, post et statut WhatsApp, vérifie la cohérence et livre le tout imprimable. La communication est prête en une heure.","valeur":"Un studio de design de marque à la demande — des visuels pros et cohérents, sans agence ni graphiste à plein temps.","conversation":[{"dir":"in","text":"Il me faut une affiche pour l'ouverture de ma 2e boutique"},{"dir":"out","text":"Avec plaisir 🎨 Date, adresse et une promo d'ouverture ? Je la fais dans ta charte."},{"dir":"in","text":"Samedi, Cocody, -20%"},{"dir":"out","text":"Voici l'affiche (format story + A3 imprimable) 🖼. Je te la décline en post Instagram et WhatsApp ?"},{"dir":"in","text":"Oui décline tout"},{"dir":"out","text":"Post Instagram, story et statut WhatsApp prêts. Même charte, formats natifs."},{"dir":"in","text":"Ajoute le numéro de téléphone"},{"dir":"out","text":"Ajouté en bas, bien lisible. Je te renvoie les fichiers imprimables."}]},
    skills: [
      { key: "nom-identite-0", label: "Nom & identité", description: "Génère noms de marque, domaines et bases de charte graphique.", inputs: [], outputs: [] },
      { key: "charte-de-marque-1", label: "Charte de marque", description: "Construit l'identité visuelle, du logo aux couleurs et typographies.", inputs: [], outputs: [] },
      { key: "visuels-canva-2", label: "Visuels (Canva)", description: "Produit posts, carrousels, stories et affiches brandés.", inputs: [], outputs: [] },
      { key: "landing-page-3", label: "Landing page", description: "Rédige et structure une page d'atterrissage (copy, CTA, SEO).", inputs: [], outputs: [] },
      { key: "site-vitrine-4", label: "Site vitrine", description: "Maquette et rédige un site vitrine simple.", inputs: [], outputs: [] },
      { key: "goodies-print-5", label: "Goodies & print", description: "Prépare les goodies et supports print-ready.", inputs: [], outputs: [] },
      { key: "controle-qualite-visuel-6", label: "Contrôle qualité visuel", description: "Vérifie chaque visuel avant publication : charte et tabous.", inputs: [], outputs: [] },
      { key: "video-de-marque-7", label: "Vidéo de marque", description: "Génère des contenus vidéo courts brandés.", inputs: [], outputs: [] },
    ],
  },
  {
    // Fiche de poste 11/11 du catalogue de juillet 2026.
    id: "exp_djeneba", name: "Djénéba", metier: "Chief of Staff & Direction", metierKey: "direction", group: "Direction", groupKey: "direction", gender: 'f', type: 'native-agent',
    channels: ["whatsapp","telegram","email","web"],
    description: "Elle tient l'agenda, les décisions et les engagements du dirigeant.",
    intakeAsk: "Avec plaisir. De quel rendez-vous ou de quelle décision s'agit-il, et qui sont les interlocuteurs concernés ?",
    fonction: "Le bras droit du dirigeant : préparer ses réunions, filtrer ses sollicitations, tenir le relevé des décisions et suivre les engagements pris.",
    daily: ["Prépare vos rendez-vous, avec contexte et historique","Filtre et priorise ce qui arrive","Prend le relevé des décisions","Relance les engagements en attente"],
    connectors: ["Agenda","Gmail","WhatsApp","Notion","Google Drive","Slack"],
    approvals: ["Envoi d'un message en votre nom","Acceptation ou refus d'un rendez-vous","Diffusion d'un relevé de décisions","Engagement pris auprès d'un tiers"],
    usecase: {"enAction":"Avant un comité de direction, Djénéba rassemble le contexte de chaque point, produit l'ordre du jour, note les décisions pendant la séance et relance trois jours plus tard ceux qui se sont engagés. Rien ne se perd entre deux réunions.","valeur":"Le dirigeant garde la main sur ses priorités : ses réunions sont préparées, ses décisions écrites, ses engagements suivis.","conversation":[{"dir":"in","text":"J'ai un point avec la banque demain 10h"},{"dir":"out","text":"Je prépare le brief 📋 Je reprends vos échanges, l'état du dossier et les trois questions ouvertes. Un objectif particulier ?"},{"dir":"in","text":"Obtenir l'accord sur la ligne de crédit"},{"dir":"out","text":"Brief prêt : historique, chiffres à l'appui, objections probables et l'ordre du jour en trois points."},{"dir":"in","text":"Ils ont demandé un délai de deux semaines"},{"dir":"out","text":"C'est noté au relevé de décisions ✅ Je relance le 18 si rien n'est venu."},{"dir":"in","text":"Parfait"},{"dir":"out","text":"Je vous fais le point hebdomadaire vendredi sur ce qui reste en attente."}]},
    skills: [
      { key: "brief-de-rendez-vous-0", label: "Brief de rendez-vous", description: "Rassemble contexte, historique et enjeux avant chaque rencontre.", inputs: [], outputs: [] },
      { key: "ordre-du-jour-1", label: "Ordre du jour & note de cadrage", description: "Structure la réunion et pose le cadre de la discussion.", inputs: [], outputs: [] },
      { key: "releve-de-decisions-2", label: "Relevé de décisions", description: "Consigne ce qui a été décidé, par qui, et pour quand.", inputs: [], outputs: [] },
      { key: "suivi-des-engagements-3", label: "Suivi des engagements", description: "Tient le tableau des engagements pris et relance les retards.", inputs: [], outputs: [] },
      { key: "filtre-des-sollicitations-4", label: "Filtre des sollicitations", description: "Trie et priorise ce qui arrive au dirigeant.", inputs: [], outputs: [] },
      { key: "point-hebdomadaire-5", label: "Point hebdomadaire", description: "Fait le tour de ce qui reste en attente, chaque semaine.", inputs: [], outputs: [] },
    ],
  },
  {
    // Pack « Agent du Directeur de Cabinet » v1.5, août 2026. Profil institutionnel :
    // livré sur un OpenClaw dédié, avec une mémoire du pays déjà remplie.
    // Sa règle cardinale : aucun document ne sort sans cinq passes de vérification
    // sur des sources distinctes et sans le visa qui l'atteste.
    id: "exp_lokoli", name: "Lokoli", metier: "Direction de cabinet", metierKey: "cabinet", group: "Direction", groupKey: "direction", gender: 'm', type: 'openclaw',
    channels: ["whatsapp","telegram","email","web"],
    description: "Il tient la mémoire du cabinet et ne laisse sortir aucun document sans visa.",
    intakeAsk: "À vos ordres. Deux questions pour commencer : à qui je parle — le directeur de cabinet, un conseiller, le secrétariat — et quels sont vos cinq dossiers du moment ?",
    fonction: "L'agent du directeur de cabinet : mémoire institutionnelle, briefs vérifiés, notes d'arbitrage, relevés de décisions et suivi des engagements. Aucun document ne sort sans cinq passes de vérification et le visa qui les atteste.",
    daily: ["Produit les briefs de rendez-vous et les notes d'arbitrage, sur demande","Trie ce qui remonte au cabinet : traiter, déléguer en nommant qui, décliner ou différer","Capte chaque engagement pris et prépare la relance avant l'échéance","Tient la mémoire du cabinet à jour, chaque fait daté de sa dernière vérification"],
    connectors: [],
    approvals: ["Envoi d'une relance ou d'une réponse","Sortie d'un document du cabinet","Branchement d'un outil ou d'un accès","Création ou arrêt d'un automatisme"],
    usecase: {"enAction":"Le secrétariat écrit « brief sur la réunion bailleurs de jeudi ». Lokoli produit la fiche d'une page : interlocuteurs avec l'acte qui fonde leur fonction, état réel du financement, positions publiques déjà tenues, et la ligne à ne pas ouvrir. Le visa en pied énumère les cinq sources ouvertes et les deux points restés « à vérifier ».","valeur":"Le cabinet ne perd plus le fil de ce qui a été promis, et ne remet plus un document dont il ne peut pas nommer les sources.","conversation":[{"dir":"in","text":"Brief sur la réunion bailleurs de jeudi"},{"dir":"out","text":"Je m'en occupe. Quels bailleurs sont attendus, et faut-il couvrir l'énergie ?"},{"dir":"in","text":"BAD et Banque mondiale, énergie comprise"},{"dir":"out","text":"Brief prêt, une page : interlocuteurs sourcés, état réel des décaissements, positions déjà tenues. Visa : 5 passes, 11 sources, 2 points à vérifier."},{"dir":"in","text":"Lesquels ?"},{"dir":"out","text":"Le montant de la 2e tranche — deux sources se contredisent — et la fonction du contact BAD, nommé il y a plus de trois mois."},{"dir":"in","text":"Vérifie et renvoie"},{"dir":"out","text":"Repris sur source primaire, les deux points sont levés et redatés. Le brief attend votre accord pour sortir."}]},
    skills: [
      { key: "suivi-engagements-0", label: "Suivi des engagements", description: "Capte chaque engagement pris devant ou par le directeur de cabinet et propose la relance avant l'échéance.", inputs: [], outputs: [] },
      { key: "filtre-sollicitations-1", label: "Filtre des sollicitations", description: "Trie ce qui remonte : traiter, déléguer en nommant qui, décliner ou différer.", inputs: [], outputs: [] },
      { key: "note-de-decision-2", label: "Note de décision", description: "Transforme un sujet flou en arbitrage d'une page : options, recommandation nette, et la seule question à trancher.", inputs: [], outputs: [] },
      { key: "note-de-cadrage-3", label: "Note de cadrage de réunion", description: "Prépare la réunion et non la personne : ce qu'on veut en sortir, la ligne à tenir, ce qu'il ne faut pas ouvrir.", inputs: [], outputs: [] },
      { key: "releve-de-decisions-4", label: "Relevé de décisions", description: "Transforme une réunion en relevé diffusable : décisions, actions nominatives datées, points en suspens.", inputs: [], outputs: [] },
      { key: "radar-hebdomadaire-5", label: "Radar hebdomadaire", description: "État de tous les dossiers, trié par ce qui attend une décision. Lit les sources réelles, jamais la mémoire.", inputs: [], outputs: [] },
      { key: "rite-d-amorcage-6", label: "Rite d'amorçage", description: "Le premier échange en trois minutes : deux questions, puis un premier livrable que personne n'a demandé.", inputs: [], outputs: [] },
      { key: "voix-du-cabinet-7", label: "Voix du directeur de cabinet", description: "Extrait sa manière d'écrire de ses textes passés — ouvertures, formules, rythme, ce qu'il ne dit jamais — et l'applique.", inputs: [], outputs: [] },
      { key: "memoire-du-cabinet-8", label: "Mémoire du cabinet", description: "Une fiche par dossier et par projet, et les positions publiques déjà tenues.", inputs: [], outputs: [] },
      { key: "connexion-des-outils-9", label: "Connexion des outils", description: "Ce que chaque accès débloque, ce qu'il coûte en confidentialité, ce qui se passe sans lui.", inputs: [], outputs: [] },
      { key: "reglage-des-automatismes-10", label: "Réglage des automatismes", description: "Régler, créer ou couper ce qui part tout seul, en français et en heure d'Abidjan.", inputs: [], outputs: [] },
      { key: "carnet-de-contacts-11", label: "Carnet de contacts", description: "Qui écrit au cabinet, sur quel dossier, par quel canal. Révèle aussi les silences et les insistances.", inputs: [], outputs: [] },
      { key: "brief-de-rendez-vous-12", label: "Brief de rendez-vous", description: "Une page, photo vérifiée, remise sur demande du secrétariat.", inputs: [], outputs: [] },
      { key: "brief-institutionnel-13", label: "Brief institutionnel", description: "Les institutions, leurs dirigeants et l'acte qui fonde chaque fonction.", inputs: [], outputs: [] },
      { key: "verification-des-faits-14", label: "Vérification des faits", description: "Recroise chaque fait et tranche quand deux sources se contredisent.", inputs: [], outputs: [] },
      { key: "controle-qualite-15", label: "Contrôle qualité", description: "Cinq passes sur des sources distinctes, sanctionnées par un visa qui énumère les sources ouvertes.", inputs: [], outputs: [] },
      { key: "boucle-qualite-adverse-16", label: "Boucle qualité adverse", description: "Relecture par une IA d'un autre fournisseur dès qu'un document quitte le cabinet ou engage l'institution.", inputs: [], outputs: [] },
      { key: "cartographie-des-acteurs-17", label: "Cartographie des acteurs", description: "Une fiche par personne, avec l'acte qui fonde sa fonction et sa date de vérification.", inputs: [], outputs: [] },
      { key: "veille-nationale-18", label: "Veille nationale", description: "Tout ce qui bouge dans le pays : économie, social, catastrophes.", inputs: [], outputs: [] },
      { key: "revue-de-presse-19", label: "Revue de presse", description: "La presse du jour, triée et sourcée.", inputs: [], outputs: [] },
      { key: "veille-regionale-20", label: "Veille régionale", description: "La région dont le directeur de cabinet a la charge.", inputs: [], outputs: [] },
      { key: "veille-des-financements-21", label: "Veille des financements", description: "Qui finance quoi, pour quel montant, et à quel état réel de décaissement.", inputs: [], outputs: [] },
      { key: "preuves-22", label: "Preuves", description: "Dix-neuf cas à passer avant toute remise, et après chaque modification de son comportement.", inputs: [], outputs: [] },
      { key: "gabarits-institutionnels-23", label: "Gabarits institutionnels", description: "Dix documents types à la charte de l'institution, fournis en PDF et en modèle HTML.", inputs: [], outputs: [] },
      { key: "redaction-de-discours-24", label: "Rédaction de discours", description: "Protocole d'adresse relevé mot pour mot, formules de clôture selon le rang de l'auditoire.", inputs: [], outputs: [] },
      { key: "note-blanche-25", label: "Note blanche", description: "Note neutre, sans en-tête ni signataire.", inputs: [], outputs: [] },
    ],
  },
  {
    // Chef de projet. Il n'appartient a aucun metier client : son metier, c'est
    // de faire travailler les autres ensemble.
    id: "orc_dany", name: "Dany", metier: "Gestion de projet", metierKey: "projet", group: "Direction", groupKey: "direction", gender: 'm', type: 'native-agent',
    role: 'orchestrator',
    channels: ["web","email","whatsapp"],
    description: "Il découpe le travail, mobilise les experts et ne lance rien sans votre accord.",
    intakeAsk: "Volontiers. Quel est l'objectif du projet, et pour quelle échéance ?",
    fonction: "Le chef de projet des équipes IA : lire la fiche de mission, découper le travail en tâches, proposer les experts à mobiliser, réclamer la matière qui manque, puis coordonner l'exécution — sans jamais démarrer avant votre validation.",
    daily: ["Découpe l'objectif en tâches et propose qui fait quoi","Réclame les documents et les accès qui manquent","Suit l'avancement et signale ce qui bloque","Remonte les décisions qui vous appartiennent"],
    connectors: ["Google Drive","Slack","Notion","Agenda"],
    approvals: ["Lancement d'un projet","Mobilisation d'un expert sur un projet","Modification du plan de travail après lancement","Sollicitation d'un renfort externe"],
    usecase: {"enAction":"On lui donne un objectif — « monter le dossier de financement de la nouvelle agence » — et une échéance. Dany revient avec un plan de quatre tâches, deux experts à mobiliser, et la liste des pièces qui manquent pour que le travail vaille quelque chose. Rien ne démarre tant que vous n'avez pas validé.","valeur":"Vous gardez la décision sur tout : le découpage, les experts, le moment du lancement. Lui garantit que rien n'est oublié et que personne n'attend.","conversation":[{"dir":"in","text":"Il me faut le dossier de financement pour le 15"},{"dir":"out","text":"Compris. Deux questions : quel montant visez-vous, et le dossier passe devant quel comité ?"},{"dir":"in","text":"80 millions, comité de crédit interne"},{"dir":"out","text":"Plan proposé : 4 tâches, Mamadou sur le prévisionnel, Salif sur la conformité. Il me manque vos relevés bancaires et le bail."},{"dir":"in","text":"Le bail arrive demain"},{"dir":"out","text":"Noté. Je peux déjà lancer les deux premières tâches si vous validez le plan — la troisième attendra le bail."},{"dir":"in","text":"Valide, lance"},{"dir":"out","text":"C'est parti. Je vous signale dès qu'une décision vous revient."}]},
    skills: [
      { key: "lecture-de-mission-0", label: "Lecture de la fiche de mission", description: "Traduit un objectif en travail concret : livrables, contraintes, échéance.", inputs: [], outputs: [] },
      { key: "decoupage-du-plan-1", label: "Découpage du plan de travail", description: "Décompose l'objectif en tâches, dans l'ordre où elles peuvent être faites.", inputs: [], outputs: [] },
      { key: "mobilisation-des-experts-2", label: "Mobilisation des experts", description: "Propose qui fait quoi, et appelle un renfort quand le métier manque.", inputs: [], outputs: [] },
      { key: "reclamation-de-la-matiere-3", label: "Réclamation de la matière", description: "Dit quels documents et quels accès changent le résultat, et pourquoi.", inputs: [], outputs: [] },
      { key: "suivi-de-l-avancement-4", label: "Suivi de l'avancement", description: "Tient l'état réel de chaque tâche et signale ce qui bloque.", inputs: [], outputs: [] },
      { key: "remontee-des-decisions-5", label: "Remontée des décisions", description: "Isole ce qui vous appartient et ne tranche jamais à votre place.", inputs: [], outputs: [] },
    ],
  },
]
