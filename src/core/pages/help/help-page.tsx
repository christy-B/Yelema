import { CreditCard, LifeBuoy, MessageSquareText, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { Card } from '../../../shared/components/card/card'
import { Input } from '../../../shared/components/input/input'
import { PageBody, PageHeader } from '../../../shared/components/page/page'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

const categories = [
  { name: 'Démarrer avec Yelema', desc: 'Premiers pas, métiers et agents.', icon: Sparkles },
  { name: 'Agents & conversations', desc: 'Lancer une demande, reprendre un échange.', icon: MessageSquareText },
  { name: 'Facturation & accès', desc: 'Consommation, factures, rôles des membres.', icon: CreditCard },
]
const faqs = [
  { question: 'Comment donner accès à un agent à un collègue ?', answer: 'Dans Membres, ouvrez le profil de la personne puis activez le ou les agents auxquels vous voulez lui donner accès.' },
  { question: 'Qui peut voir mes conversations ?', answer: 'Vos conversations sont privées. Un administrateur gère les accès aux agents mais ne voit pas le contenu de vos échanges.' },
  { question: 'Comment est calculée la consommation ?', answer: 'Elle dépend du modèle utilisé (Opus, Sonnet, Haiku) et du volume traité. Le détail figure dans Facturation.' },
  { question: 'Puis-je importer mes propres documents ?', answer: 'Oui, depuis l\'écran Fichiers ou directement dans une conversation via le panneau Contexte.' },
  { question: 'Comment ajouter un collègue ?', answer: 'Dans Membres, cliquez sur « Inviter un membre » : il recevra un e-mail pour définir son mot de passe et accéder au workspace.' },
]

export function HelpPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [query, setQuery] = useState('')

  return (
    <>
      <PageHeader title="Aide & support" subtitle="Trouvez une réponse, ou contactez notre équipe." />
      <PageBody>
        <div className="help-column">
          <Input className="help-search" aria-label="Rechercher dans l'aide" placeholder="Rechercher dans l'aide…" value={query} onChange={(event) => setQuery(event.target.value)} icon={<Search size={17} />} />

          <div className="help-cats">
            {categories.map(({ name, desc, icon: Icon }) => (
              <Card key={name} interactive className="help-cat"><span className="help-cat-icon"><Icon size={22} /></span><h3>{name}</h3><p>{desc}</p></Card>
            ))}
          </div>

          <div className="help-label">Questions fréquentes</div>
          <Card className="faq-card">
            {faqs.map((faq) => (
              <div key={faq.question} className="faq-item"><strong>{faq.question}</strong><p>{faq.answer}</p></div>
            ))}
          </Card>

          <Card className="help-callout">
            <span className="help-callout-icon"><Sparkles size={22} /></span>
            <div><h2>Revoir la présentation</h2><p>Rejouez l'introduction à Yelema en quelques écrans.</p></div>
            <button type="button" className="help-callout-action" onClick={() => navigate(paths.onboarding(workspaceId))}>Relancer</button>
          </Card>

          <Card className="help-support">
            <span className="help-support-icon"><LifeBuoy size={22} /></span>
            <div><h2>Besoin d'aide supplémentaire ?</h2><p>Notre équipe répond sous 24 h ouvrées.</p></div>
            <a className="help-support-action" href="mailto:support@yelema.vc">Contacter le support</a>
          </Card>
        </div>
      </PageBody>
    </>
  )
}
