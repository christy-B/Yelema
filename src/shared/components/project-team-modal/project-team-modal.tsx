import { Bot, Plus, X } from 'lucide-react'
import { useState } from 'react'

import type { AgentSummary } from '../../../features/agents/api/contracts'
import { assignProjectExperts } from '../../../features/projects/api/api'
import type { Project } from '../../../features/projects/api/contracts'
import { AgentAvatar } from '../agent-avatar/agent-avatar'
import { Button } from '../button/button'

interface ProjectTeamModalProps {
  projectId: string
  workspaceId: string
  agents: AgentSummary[]
  mode: 'initial' | 'reinforcement'
  onSaved: (project: Project) => void
  onClose: () => void
}

export function ProjectTeamModal({ projectId, workspaceId, agents, mode, onSaved, onClose }: ProjectTeamModalProps) {
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (agent: AgentSummary) => {
    setSelected((current) => {
      if (agent.id in current) {
        const next = { ...current }
        delete next[agent.id]
        return next
      }
      return { ...current, [agent.id]: agent.tags[0] ?? '' }
    })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const assignments = Object.entries(selected).map(([agentId, responsibility]) => ({ agentId, responsibility: responsibility.trim() })).filter((assignment) => assignment.responsibility)
    if (assignments.length !== Object.keys(selected).length || assignments.length === 0) {
      setError('Sélectionnez au moins un expert et précisez sa responsabilité.')
      return
    }
    setSaving(true)
    setError('')
    try {
      onSaved(await assignProjectExperts(projectId, workspaceId, { assignments }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ajout impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card modal-card--project-team" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>{mode === 'initial' ? 'Constituer l’équipe' : 'Demander un renfort'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <p className="modal-intro">{mode === 'initial'
          ? 'Choisissez les experts recrutés qui travailleront sur ce projet et précisez leur responsabilité.'
          : 'Choisissez un expert recruté qui ne participe pas encore au projet et précisez l’aide attendue.'}</p>
        <div className="project-team-decision"><Bot size={17} /><p>Le Chef de projet IA peut recommander une composition ou un renfort. <strong>Vous confirmez toujours l’ajout.</strong></p></div>

        <div className="project-agent-picker">
          {agents.map((agent) => {
            const isSelected = agent.id in selected
            return (
              <div key={agent.id} className={`project-agent-choice${isSelected ? ' is-selected' : ''}`}>
                <button type="button" className="project-agent-toggle" onClick={() => toggle(agent)} aria-pressed={isSelected}>
                  <span className="project-agent-check" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                  <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} size={38} variant="square" mono />
                  <span><strong>{agent.name}</strong><small>{agent.tags[0]}</small></span>
                </button>
                {isSelected && (
                  <label className="field project-agent-role">
                    <span className="sr-only">Responsabilité de {agent.name}</span>
                    <span className="input-shell"><input value={selected[agent.id]} onChange={(event) => setSelected((current) => ({ ...current, [agent.id]: event.target.value }))} placeholder="Responsabilité sur le projet" /></span>
                  </label>
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="tertiary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={saving || agents.length === 0} leadingIcon={<Plus size={17} />}>{saving ? 'Enregistrement…' : mode === 'initial' ? 'Confirmer l’équipe' : 'Confirmer le renfort'}</Button>
        </div>
      </form>
    </div>
  )
}
