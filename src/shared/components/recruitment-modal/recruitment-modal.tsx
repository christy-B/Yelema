import { AlertTriangle, Check, Globe, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { AgentDetail } from '../../../features/agents/api/contracts'
import { CHANNEL_META, orderChannels } from '../../../features/agents/channels'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { AgentAvatar } from '../agent-avatar/agent-avatar'
import { Button } from '../button/button'

/** Durée d'affichage d'une étape. Le back met plus longtemps ; voir la note ci-dessous. */
const STEP_MS = 900

/**
 * Une étape de la mise en place. `opens` marque l'étape qui rend les canaux
 * joignables : c'est le seul état réellement en attente côté back.
 */
interface Step {
  label: string
  opens?: boolean
}

/**
 * Étapes réellement pertinentes pour cet expert : un expert sans outil connecté
 * n'a pas d'étape « Intégrations ».
 */
function stepsFor(agent: AgentDetail): Step[] {
  const steps: Step[] = [{ label: 'Création du poste' }]
  if (agent.skills.length > 0) steps.push({ label: 'Compétences' })
  if (agent.daily.length > 0) steps.push({ label: 'Tâches' })
  if (agent.connectors.length > 0) steps.push({ label: 'Intégrations' })
  steps.push({ label: 'Canaux', opens: true })
  return steps
}

interface RecruitmentModalProps {
  agent: AgentDetail
  /** Canaux choisis dans la fiche. */
  channels: string[]
  /** Le back a refusé le recrutement : on gèle la progression et on l'annonce. */
  failed: boolean
  /** Appelé une fois la dernière étape franchie. */
  onFinished: () => void
  onRetry: () => void
  onCancel: () => void
}

/**
 * Mise en place d'un expert qui vient d'être recruté.
 *
 * Le recrutement déclenche côté back un enchaînement (création du poste,
 * activation des compétences, ouverture des canaux) qui prend du temps : cet
 * écran occupe l'attente en montrant ce qui se met en place, plutôt que de
 * laisser l'utilisateur devant un bouton figé.
 *
 * ATTENTION — la progression affichée est cadencée par `STEP_MS`, elle ne suit
 * pas l'avancement réel du back. Quand celui-ci publiera l'état du
 * provisionnement, il faudra piloter `step` sur cet état et non sur un minuteur.
 */
export function RecruitmentModal({ agent, channels, failed, onFinished, onRetry, onCancel }: RecruitmentModalProps) {
  const steps = useMemo(() => stepsFor(agent), [agent])
  const [step, setStep] = useState(0)
  const finished = step >= steps.length

  useEffect(() => {
    if (finished || failed) return
    const timer = window.setTimeout(() => setStep((current) => current + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [step, finished, failed])

  useEffect(() => {
    if (finished && !failed) onFinished()
  }, [finished, failed, onFinished])

  // Les canaux sont ouverts quand la progression a dépassé l'étape qui les ouvre.
  const opened = steps.findIndex((item) => item.opens) < step
  const label = failed ? 'Interrompu' : finished ? 'Poste prêt' : steps[step].label
  const percent = failed ? Math.round((step / steps.length) * 100) : Math.round(((finished ? steps.length : step) / steps.length) * 100)

  return (
    /* Pas de fermeture au clic sur le fond : une mise en place est en cours. */
    <div className="modal-overlay">
      <div className="rec-card" role="dialog" aria-modal="true" aria-label={`Mise en place de ${agent.name}`} aria-busy={!finished && !failed}>
        {/* Portrait à gauche, identité à droite : les portraits sont très
            allongés (400×717), les empiler ferait une carte trop haute. */}
        <div className="rec-head">
          <div className="rec-portrait">
            <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} className="rec-photo" />
          </div>

          <div className="rec-ident">
            {/* L'état ne peut pas surcharger le portrait : 150 px ne suffisent
                pas à « Activation des compétences ». Il coiffe donc la colonne. */}
            <span className={failed ? 'rec-pill rec-pill--ko' : 'rec-pill'} aria-live="polite">
              {failed ? <AlertTriangle size={13} /> : finished ? <Check size={13} /> : <Loader2 size={13} className="rec-spin" />}
              {label}
            </span>

            <h2 className="rec-name">{agent.name}</h2>
            {agent.tags[0] && <p className="rec-metier">{agent.tags[0]}</p>}
            <p className="rec-desc">{agent.description}</p>

            <div className="rec-tiles">
              {orderChannels(channels).map((channel) => {
                const meta = CHANNEL_META[channel]
                const logo = meta ? CONNECTOR_LOGOS[meta.logo] : undefined
                const ready = opened
                return (
                  <div key={channel} className={ready ? 'rec-tile is-ready' : 'rec-tile'}>
                    <span className="rec-tile-head">
                      {logo ? <img src={logo} alt="" /> : <Globe size={13} />}
                      {meta?.label ?? channel}
                    </span>
                    <span className="rec-tile-state">
                      {ready ? <><Check size={12} />Ouvert</> : <><Loader2 size={12} className="rec-spin" />Configuration…</>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Valeurs réelles dès l'ouverture : la fiche vient de les énumérer,
            repartir de zéro ici contredirait ce que l'utilisateur a lu. */}
        <div className="rec-stats">
          <div><b>{agent.skills.length}</b><span>Compétences</span></div>
          <div><b>{agent.daily.length}</b><span>Tâches</span></div>
          <div><b>{agent.connectors.length}</b><span>Intégrations</span></div>
        </div>

        {failed ? (
          <>
            <p className="rec-error">La mise en place n{'’'}a pas abouti. Aucun poste n{'’'}a été créé et rien ne vous a été facturé.</p>
            <div className="rec-actions">
              <Button variant="tertiary" onClick={onCancel}>Annuler</Button>
              <Button onClick={onRetry}>Réessayer</Button>
            </div>
          </>
        ) : (
          <div className="rec-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement de la mise en place">
            <span style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
