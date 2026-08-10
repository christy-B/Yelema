import { FilePlus2, Plus, X } from 'lucide-react'
import { useState } from 'react'

import { createProject } from '../../../features/projects/api/api'
import type { Project } from '../../../features/projects/api/contracts'
import { Button } from '../button/button'
import { Input } from '../input/input'

interface ProjectCreateModalProps {
  workspaceId: string
  onCreated: (project: Project) => void
  onClose: () => void
}

export function ProjectCreateModal({ workspaceId, onCreated, onClose }: ProjectCreateModalProps) {
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [constraints, setConstraints] = useState('')
  const [resourceNames, setResourceNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      const project = await createProject({
        workspaceId,
        name,
        objective,
        expectedDeliverables: deliverables.split('\n').map((item) => item.trim()).filter(Boolean),
        dueDate: dueDate || null,
        constraints: constraints.trim() || null,
        resourceNames,
      })
      onCreated(project)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Création impossible.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card modal-card--project" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>Créer un projet</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <Input id="project-name" label="Nom du projet" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Préparer l’ouverture d’une nouvelle agence" required autoFocus />
        <label className="field">
          <span className="field-label">Objectif</span>
          <span className="input-shell"><textarea rows={3} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Quel résultat concret doit être atteint ?" required /></span>
        </label>
        <label className="field">
          <span className="field-label">Livrables attendus <em className="field-optional">— un par ligne</em></span>
          <span className="input-shell"><textarea rows={3} value={deliverables} onChange={(event) => setDeliverables(event.target.value)} placeholder={'Plan de travail\nNote de synthèse\nTableau de suivi'} /></span>
        </label>

        <div className="project-form-row">
          <Input id="project-due-date" type="date" label="Échéance" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <label className="project-file-field">
            <span className="field-label">Ressources initiales</span>
            <span className="project-file-trigger"><FilePlus2 size={17} />{resourceNames.length ? `${resourceNames.length} fichier${resourceNames.length > 1 ? 's' : ''}` : 'Choisir des fichiers'}</span>
            <input type="file" multiple onChange={(event) => setResourceNames(Array.from(event.target.files ?? []).map((file) => file.name))} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Contraintes</span>
          <span className="input-shell"><textarea rows={2} value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Budget, conformité, validations ou délais à respecter" /></span>
        </label>

        {resourceNames.length > 0 && <p className="project-file-names">{resourceNames.join(' · ')}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="tertiary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={creating} leadingIcon={<Plus size={17} />}>{creating ? 'Création…' : 'Créer le projet'}</Button>
        </div>
      </form>
    </div>
  )
}
