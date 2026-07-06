import { ArrowLeft, ArrowRight, Bot, Diamond, FolderClock, Loader, PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

/** Marqueur « présentation vue » (session navigateur) — évite de re-rediriger vers l'onboarding. */
export const ONBOARDING_SEEN_KEY = 'yelema.onboarding.seen'

import logo from '../../../assets/brand/logo-lockup-white.png'
import { Button } from '../../../shared/components/button/button'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

const steps = [
  {
    key: 'welcome',
    navLabel: 'Bienvenue',
    title: 'Bienvenue sur Yelema',
    body: "Yelema met des agents IA prêts à l'emploi au service de vos équipes : analyse de documents, synthèses, courriers, vérification, et bien plus — en français, adaptés à vos métiers.",
    note: 'En une minute, voyons comment ça marche.',
    icon: Loader,
  },
  {
    key: 'agents',
    navLabel: 'Les agents',
    title: 'Comment fonctionne un agent',
    body: 'Choisissez un agent, décrivez votre besoin en une fois, puis obtenez un résultat clair et sourcé.',
    note: 'Chaque agent est spécialisé dans une tâche métier précise.',
    icon: Bot,
  },
  {
    key: 'spaces',
    navLabel: 'Vos espaces',
    title: 'Retrouvez tout au même endroit',
    body: 'Vos conversations, vos fichiers et leur suivi restent accessibles depuis le menu de gauche.',
    note: 'Vous pouvez reprendre votre travail à tout moment.',
    icon: FolderClock,
  },
  {
    key: 'done',
    navLabel: "C'est parti",
    title: 'Vous êtes prêt',
    body: 'Ouvrez un agent et lancez votre première demande dès maintenant.',
    note: 'Yelema vous accompagne dans vos tâches quotidiennes.',
    icon: PartyPopper,
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [step, setStep] = useState(0)
  useEffect(() => { sessionStorage.setItem(ONBOARDING_SEEN_KEY, '1') }, [])
  const current = steps[step]
  const CurrentIcon = current.icon
  const lastStep = steps.length - 1
  const finish = () => navigate(paths.workspace(workspaceId), { replace: true })
  const next = () => step === lastStep ? finish() : setStep((value) => value + 1)
  const nextLabel = step === 0 ? 'Commencer' : step === lastStep ? "Accéder à l'accueil" : 'Continuer'

  return (
    <main className="onboarding-page">
      <aside className="onboarding-sidebar">
        <img className="onboarding-logo" src={logo} alt="Yelema" />
        <Diamond className="onboarding-diamond onboarding-diamond--one" aria-hidden="true" />
        <Diamond className="onboarding-diamond onboarding-diamond--two" aria-hidden="true" />
        <div className="onboarding-intro">
          <h1>Découvrez Yelema</h1>
          <p>Une courte présentation pour prendre en main la plateforme en quelques instants.</p>
        </div>
        <ol className="onboarding-steps">
          {steps.map((item, index) => (
            <li key={item.key} className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}>
              <button type="button" disabled={index > step} onClick={() => setStep(index)}>
                <span>{index + 1}</span>
                {item.navLabel}
              </button>
            </li>
          ))}
        </ol>
        <div className="onboarding-progress" aria-hidden="true"><span style={{ width: `${(step / lastStep) * 100}%` }} /></div>
      </aside>

      <section className="onboarding-content">
        <div className="onboarding-copy">
          <span className="onboarding-icon"><CurrentIcon size={27} /></span>
          <h2>{current.title}</h2>
          <p>{current.body}</p>
          <p>{current.note}</p>
        </div>
        <footer className="onboarding-actions">
          <Button className="onboarding-back" variant="tertiary" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} leadingIcon={<ArrowLeft size={18} />}>Retour</Button>
          <div>
            {step < lastStep && <button className="skip-link" type="button" onClick={finish}>Passer</button>}
            <Button onClick={next} trailingIcon={<ArrowRight size={18} />}>{nextLabel}</Button>
          </div>
        </footer>
      </section>
    </main>
  )
}
