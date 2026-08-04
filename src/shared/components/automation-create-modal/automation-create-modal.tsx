import { Plus, X } from 'lucide-react'
import { useState } from 'react'

import type { AgentSummary } from '../../../features/agents/api/contracts'
import { createAutomation } from '../../../features/automations/api/api'
import { EVENT_LABELS, FREQUENCY_LABELS } from '../../../features/automations/api/contracts'
import type { Automation, AutomationEvent, AutomationFrequency } from '../../../features/automations/api/contracts'
import { Button } from '../button/button'
import { Filter } from '../filter/filter'
import { Input } from '../input/input'

/**
 * Modale de création d'automatisation — flux UNIQUE, réutilisé par la page
 * Automatisations (choix de l'expert) et par la fiche d'un expert
 * (`lockedAgentId` : l'expert est imposé, pas de sélecteur).
 */
interface AutomationCreateModalProps {
  /** Experts sélectionnables (ignoré si `lockedAgentId` est fourni). */
  agents?: AgentSummary[]
  /** Fiche expert : l'automatisation est rattachée à cet expert. */
  lockedAgentId?: string
  lockedAgentName?: string
  onCreated: (automation: Automation) => void
  onClose: () => void
}

export function AutomationCreateModal({ agents = [], lockedAgentId, lockedAgentName, onCreated, onClose }: AutomationCreateModalProps) {
  const [name, setName] = useState('')
  const [agentId, setAgentId] = useState(lockedAgentId ?? agents[0]?.id ?? '')
  const [instruction, setInstruction] = useState('')
  const [triggerKind, setTriggerKind] = useState<'cron' | 'event'>('cron')
  const [frequency, setFrequency] = useState<AutomationFrequency>('weekly')
  const [time, setTime] = useState('08:00')
  const [event, setEvent] = useState<AutomationEvent>('fichier-importe')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault()
    setCreating(true)
    setError('')
    try {
      const trigger = triggerKind === 'cron' ? { kind: 'cron' as const, frequency, time } : { kind: 'event' as const, event }
      const created = await createAutomation({ name, agentId: lockedAgentId ?? agentId, instruction, trigger })
      onCreated(created)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Création impossible.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card modal-card--lg" onClick={(clickEvent) => clickEvent.stopPropagation()} onSubmit={submit}>
        <div className="modal-head"><h2>Nouvelle automatisation</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
        <p className="modal-intro">L'employé IA sera déclenché automatiquement selon le planning ou l'événement choisi, et déposera son artefact dans l'onglet Artefacts.</p>

        <Input label="Nom" value={name} onChange={(changeEvent) => setName(changeEvent.target.value)} placeholder="Ex. Analyse hebdo des états financiers" required autoFocus />

        {lockedAgentId ? (
          <div className="modal-field">
            <div className="modal-field-head"><span>Employé IA</span></div>
            <p className="modal-locked-agent">{lockedAgentName ?? 'Cet expert IA'}</p>
          </div>
        ) : (
          <div className="modal-field">
            <div className="modal-field-head"><span>Employé IA</span></div>
            <Filter label="Choisir un expert IA" value={agentId} onChange={setAgentId} options={agents.map((agent) => ({ value: agent.id, label: agent.name }))} />
          </div>
        )}

        <label className="field"><span className="field-label">Consigne</span><span className="input-shell"><textarea rows={3} value={instruction} onChange={(changeEvent) => setInstruction(changeEvent.target.value)} placeholder="Que doit faire l'employé IA à chaque déclenchement ?" required /></span></label>

        <div className="modal-field">
          <div className="modal-field-head"><span>Déclencheur</span></div>
          <div className="modal-agent-bulk">
            <button type="button" className={triggerKind === 'cron' ? 'bulk-chip is-on' : 'bulk-chip'} onClick={() => setTriggerKind('cron')}>Planifié</button>
            <button type="button" className={triggerKind === 'event' ? 'bulk-chip is-on' : 'bulk-chip'} onClick={() => setTriggerKind('event')}>Sur événement</button>
          </div>
          {triggerKind === 'cron' ? (
            <div className="settings-grid">
              <label className="field"><span className="field-label">Fréquence</span><span className="input-shell"><select value={frequency} onChange={(changeEvent) => setFrequency(changeEvent.target.value as AutomationFrequency)}>{(Object.keys(FREQUENCY_LABELS) as AutomationFrequency[]).map((key) => <option key={key} value={key}>{FREQUENCY_LABELS[key]}</option>)}</select></span></label>
              <label className="field"><span className="field-label">Heure</span><span className="input-shell"><input type="time" value={time} onChange={(changeEvent) => setTime(changeEvent.target.value)} required /></span></label>
            </div>
          ) : (
            <label className="field"><span className="field-label">Événement</span><span className="input-shell"><select value={event} onChange={(changeEvent) => setEvent(changeEvent.target.value as AutomationEvent)}>{(Object.keys(EVENT_LABELS) as AutomationEvent[]).map((key) => <option key={key} value={key}>{EVENT_LABELS[key]}</option>)}</select></span></label>
          )}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="tertiary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={creating || (!lockedAgentId && !agentId)} leadingIcon={<Plus size={17} />}>{creating ? 'Création…' : 'Créer l’automatisation'}</Button>
        </div>
      </form>
    </div>
  )
}
