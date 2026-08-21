import { AlertTriangle, ArrowRight, CalendarDays, Clock3, FolderKanban, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents } from '../../../features/agents/api/api'
import type { AgentSummary } from '../../../features/agents/api/contracts'
import { listProjects } from '../../../features/projects/api/api'
import { PROJECT_STATUS_LABELS, PROJECT_TASK_STATUS_LABELS, type Project } from '../../../features/projects/api/contracts'
import { currentProjectTask, projectProgress, sortProjectActivities } from '../../../features/projects/project-model'
import { AgentAvatar } from '../../../shared/components/agent-avatar/agent-avatar'
import { Button } from '../../../shared/components/button/button'
import { Card } from '../../../shared/components/card/card'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { ProjectCreateModal } from '../../../shared/components/project-create-modal/project-create-modal'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const activityDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function ProjectsPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void Promise.all([listProjects(workspaceId), listAgents()])
      .then(([items, recruitedAgents]) => { setProjects(items); setAgents(recruitedAgents); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [workspaceId, retryKey])

  const openProject = (projectId: string) => navigate(paths.project(projectId, workspaceId))
  const agentById = new Map(agents.map((agent) => [agent.id, agent]))

  return (
    <div className="projects-page">
      <header className="page-header">
        <div><h1>Projets</h1><p>Coordonnez plusieurs experts autour d’un objectif et de livrables communs.</p></div>
        <Button onClick={() => setCreating(true)} leadingIcon={<Plus size={18} />}>Créer un projet</Button>
      </header>

      <div className="page-body projects-body">
        {status === 'error' ? (
          <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />
        ) : status === 'ready' && projects.length === 0 ? (
          <div className="projects-empty">
            <FolderKanban size={28} />
            <strong>Aucun projet pour le moment</strong>
            <Button onClick={() => setCreating(true)} leadingIcon={<Plus size={17} />}>Créer le premier projet</Button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => {
              const progress = projectProgress(project.tasks)
              const recentActivities = sortProjectActivities(project.activities).slice(0, 3)
              // Ce qui est a l'arret faute d'une reponse. Un plan entierement
              // valide mais jamais lance compte aussi : tout est pret et
              // personne ne travaille.
              const planReady = project.planState !== 'running'
                && project.tasks.length > 0
                && project.assignments.length > 0
                && project.tasks.every((task) => task.approved && !!task.agentId)
              const waiting = project.decisions.length > 0
                ? `${project.decisions.length} ${project.decisions.length > 1 ? 'décisions attendent' : 'décision attend'} votre réponse`
                : planReady ? 'Le plan est validé — le projet attend son lancement'
                : project.planState !== 'running' ? 'Le plan attend votre validation'
                : null
              return (
                <Card key={project.id} interactive className="project-card" onClick={() => openProject(project.id)}>
                  <div className="project-card-layout">
                    <div className="project-card-summary">
                      <div className="project-card-head">
                        <span className={`project-status project-status--${project.status}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
                        <span className="project-card-due"><CalendarDays size={14} />{project.dueDate ? dateFormatter.format(new Date(`${project.dueDate}T12:00:00`)) : 'Sans échéance'}</span>
                      </div>
                      <h2>{project.name}</h2>
                      <p>{project.objective}</p>
                      {/* Avant meme d'ouvrir : ce projet attend-il quelque
                          chose de moi ? */}
                      {waiting && (
                        <span className={project.decisions.length > 0 ? 'project-card-wait is-urgent' : 'project-card-wait'}>
                          <AlertTriangle size={13} />{waiting}
                        </span>
                      )}
                      <div className="project-progress-row"><span>Progression</span><strong>{progress} %</strong></div>
                      <div className="project-progress"><span style={{ width: `${progress}%` }} /></div>
                    </div>

                    <div className="project-card-section project-card-team">
                      <div className="project-card-label"><Users size={14} /><span>Qui fait quoi</span></div>
                      {project.assignments.length > 0 ? project.assignments.slice(0, 3).map((assignment) => {
                        const agent = agentById.get(assignment.agentId)
                        const currentTask = currentProjectTask(project.tasks, assignment.agentId)
                        if (!agent) return null
                        return (
                          <div key={assignment.agentId} className="project-card-agent">
                            <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} size={32} variant="square" mono />
                            <div className="project-card-agent-main"><strong>{agent.name}</strong><span>{assignment.responsibility}</span>{currentTask && <small>{currentTask.title}</small>}</div>
                            {currentTask && <span className={`project-task-status project-task-status--${currentTask.status}`}>{PROJECT_TASK_STATUS_LABELS[currentTask.status]}</span>}
                          </div>
                        )
                      }) : <p className="project-card-empty-line">Équipe à constituer</p>}
                      {project.assignments.length > 3 && <small className="project-card-more">+ {project.assignments.length - 3} autre{project.assignments.length - 3 > 1 ? 's' : ''}</small>}
                    </div>

                    <div className="project-card-section project-card-activity">
                      <div className="project-card-label"><Clock3 size={14} /><span>Activité récente</span></div>
                      {recentActivities.map((activity) => (
                        <div key={activity.id} className="project-card-event"><span className="project-card-event-dot" /><div><strong>{activity.summary}</strong><small>{activityDateFormatter.format(new Date(activity.createdAt))}</small></div></div>
                      ))}
                    </div>
                  </div>
                  <div className="project-card-meta">
                    <span><Users size={15} />{project.assignments.length} expert{project.assignments.length > 1 ? 's' : ''}</span>
                    <span className="project-card-open">Voir le projet et toute l’activité <ArrowRight size={16} /></span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {creating && <ProjectCreateModal workspaceId={workspaceId} onClose={() => setCreating(false)} onCreated={(project) => openProject(project.id)} />}
    </div>
  )
}
