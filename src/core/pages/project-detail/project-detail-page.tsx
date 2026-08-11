import { ArrowLeft, Blocks, Bot, CalendarDays, CheckCircle2, ChevronRight, Circle, Clock3, FileText, FolderOpen, ListChecks, Plus, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents } from '../../../features/agents/api/api'
import type { AgentSummary } from '../../../features/agents/api/contracts'
import { getProject } from '../../../features/projects/api/api'
import { PROJECT_STATUS_LABELS, PROJECT_TASK_STATUS_LABELS, type Project, type ProjectActivity } from '../../../features/projects/api/contracts'
import { projectDetailTabs, type ProjectDetailTab } from '../../../features/projects/project-navigation'
import { projectProgress, sortProjectActivities } from '../../../features/projects/project-model'
import { AgentAvatar } from '../../../shared/components/agent-avatar/agent-avatar'
import { Button } from '../../../shared/components/button/button'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { ProjectTeamModal } from '../../../shared/components/project-team-modal/project-team-modal'
import { listConnectors, uploadFiles } from '../../../features/files/api/api'
import type { Connector } from '../../../features/files/api/contracts'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, projectId = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [tab, setTab] = useState<ProjectDetailTab>('overview')
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [editingTeam, setEditingTeam] = useState(false)
  const [savingFiles, setSavingFiles] = useState(false)
  const [loadingConnector, setLoadingConnector] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([getProject(projectId, workspaceId), listAgents(), listConnectors()])
      .then(([loadedProject, loadedAgents, loadedConnectors]) => { setProject(loadedProject); setAgents(loadedAgents); setConnectors(loadedConnectors); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [projectId, workspaceId, retryKey])

  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents])
  const availableAgents = useMemo(() => {
    const assigned = new Set(project?.assignments.map((assignment) => assignment.agentId) ?? [])
    return agents.filter((agent) => !assigned.has(agent.id))
  }, [agents, project])

  if (status === 'error') {
    return <div className="project-detail-page"><LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} /></div>
  }
  if (!project) return <div className="route-loader">Chargement du projet…</div>

  const progress = projectProgress(project.tasks)
  const activities = sortProjectActivities(project.activities)
  const inputs = project.resources.filter((resource) => resource.kind === 'input')
  const artifacts = project.resources.filter((resource) => resource.kind === 'artifact')
  const linkedConnectors = connectors.filter((connector) => connector.status === 'connected')
  const tabs = projectDetailTabs({
    activities: project.activities.length,
    resources: inputs.length,
    artifacts: artifacts.length,
    connectors: linkedConnectors.length,
  })

  const openActivity = (activity: ProjectActivity) => {
    if (!activity.agentId) return
    if (activity.conversationId) navigate(paths.conversation(activity.agentId, activity.conversationId, workspaceId))
    else navigate(paths.agent(activity.agentId, workspaceId))
  }

  const uploadProjectFiles = async (files: File[]) => {
    if (!project || files.length === 0) return
    setSavingFiles(true)
    try {
      const uploaded = await uploadFiles(files)
      const now = new Date().toISOString()
      const nextResources = uploaded.map((file) => ({
        id: file.id,
        kind: 'input' as const,
        name: file.name,
        format: file.kind,
        createdAt: now,
      }))
      setProject({
        ...project,
        updatedAt: now,
        resources: [...nextResources, ...project.resources],
      })
    } finally {
      setSavingFiles(false)
    }
  }

  const linkConnector = (connector: Connector) => {
    setLoadingConnector(connector.id)
    const now = new Date().toISOString()
    setConnectors((current) => current.map((item) => item.id === connector.id ? { ...item, status: 'connected' } : item))
    setProject((current) => current ? { ...current, updatedAt: now } : current)
    window.setTimeout(() => setLoadingConnector((current) => current === connector.id ? null : current), 250)
  }

  return (
    <div className="project-detail-page">
      <header className="project-detail-head">
        <button type="button" className="project-back" onClick={() => navigate(paths.projects(workspaceId))}><ArrowLeft size={17} />Projets</button>
        <div className="project-title-row">
          <div>
            <div className="project-title-meta"><span className={`project-status project-status--${project.status}`}>{PROJECT_STATUS_LABELS[project.status]}</span>{project.dueDate && <span><CalendarDays size={14} />Échéance {dateFormatter.format(new Date(`${project.dueDate}T12:00:00`))}</span>}</div>
            <h1>{project.name}</h1>
          </div>
          <div className="project-head-progress"><strong>{progress} %</strong><span>du plan terminé</span><div className="project-progress"><span style={{ width: `${progress}%` }} /></div></div>
        </div>
      </header>

      <nav className="project-tabs" aria-label="Sections du projet">
        {tabs.map((item) => (
          <button key={item.key} type="button" className={tab === item.key ? 'is-active' : ''} onClick={() => setTab(item.key)}>
            {item.label}{item.count !== undefined && <span>{item.count}</span>}
          </button>
        ))}
      </nav>

      <main className="project-detail-body">
        {tab === 'overview' && (
          <div className="project-overview">
            <section className="project-objective">
              <span className="project-section-kicker">Objectif</span>
              <p>{project.objective}</p>
              {project.constraints && <div className="project-constraint"><ShieldCheck size={17} /><span><strong>Contraintes</strong>{project.constraints}</span></div>}
            </section>

            <div className="project-overview-grid">
              <section className="project-panel">
                <div className="project-panel-head"><div><ListChecks size={18} /><h2>Plan de travail</h2></div><span>{project.tasks.filter((task) => task.status === 'done').length}/{project.tasks.length}</span></div>
                <div className="project-task-list">
                  {project.tasks.map((task) => {
                    const agent = task.agentId ? agentById.get(task.agentId) : undefined
                    return (
                      <div key={task.id} className="project-task-row">
                        {task.status === 'done' ? <CheckCircle2 className="is-done" size={18} /> : <Circle size={18} />}
                        <div><strong>{task.title}</strong><span>{agent ? agent.name : 'À affecter'}</span></div>
                        <span className={`project-task-status project-task-status--${task.status}`}>{PROJECT_TASK_STATUS_LABELS[task.status]}</span>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="project-panel">
                <div className="project-panel-head"><div><Users size={18} /><h2>Équipe du projet</h2></div>{(project.assignments.length === 0 ? agents.length > 0 : availableAgents.length > 0) && <Button size="small" variant="tertiary" leadingIcon={<Plus size={15} />} onClick={() => setEditingTeam(true)}>{project.assignments.length === 0 ? 'Constituer l’équipe' : 'Demander un renfort'}</Button>}</div>
                <div className="project-team-list">
                  <div className="project-team-row project-team-row--lead">
                    <span className="project-orchestrator-avatar"><Bot size={19} /></span>
                    <div><strong>{project.orchestrator.name}</strong><span>{project.orchestrator.responsibility}</span></div>
                  </div>
                  {project.assignments.map((assignment) => {
                    const agent = agentById.get(assignment.agentId)
                    if (!agent) return null
                    return (
                      <button key={assignment.agentId} type="button" className="project-team-row" onClick={() => navigate(paths.agent(agent.id, workspaceId))}>
                        <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} size={40} mono />
                        <div><strong>{agent.name}</strong><span>{assignment.responsibility}</span></div>
                        <ChevronRight size={17} />
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>

            <section className="project-panel project-decisions">
              <div className="project-panel-head"><div><Clock3 size={18} /><h2>Décisions en attente</h2></div><span>{project.decisions.length}</span></div>
              {project.decisions.length > 0 ? project.decisions.map((decision) => (
                <button key={decision.id} type="button" className="project-decision-row" onClick={() => decision.agentId && navigate(paths.agent(decision.agentId, workspaceId))}>
                  <span>{decision.title}</span><small>Demandée le {dateFormatter.format(new Date(decision.requestedAt))}</small><ChevronRight size={17} />
                </button>
              )) : <p className="project-clear-state"><CheckCircle2 size={17} />Aucune décision à valider.</p>}
            </section>
          </div>
        )}

        {tab === 'activity' && (
          <section className="project-activity-panel">
            <div className="project-section-head"><div><h2>Activité du projet</h2><p>Les actions enregistrées sur ce projet, de la plus récente à la plus ancienne.</p></div></div>
            <div className="project-activity-list">
              {activities.map((activity) => {
                const agent = activity.agentId ? agentById.get(activity.agentId) : undefined
                const content = <><span className={`project-activity-icon project-activity-icon--${activity.kind}`}>{activity.kind === 'artifact_added' ? <FileText size={17} /> : activity.kind === 'assignment_added' ? <Users size={17} /> : <Clock3 size={17} />}</span><div><strong>{activity.summary}</strong><span>{dateTimeFormatter.format(new Date(activity.createdAt))}{agent ? ` · ${agent.name}` : ''}</span></div>{activity.agentId && <ChevronRight size={17} />}</>
                return activity.agentId ? <button key={activity.id} type="button" className="project-activity-row" onClick={() => openActivity(activity)}>{content}</button> : <div key={activity.id} className="project-activity-row">{content}</div>
              })}
            </div>
          </section>
        )}

        {tab === 'resources' && (
          <section className="project-resource-section project-resource-tab">
            <div className="project-section-head">
              <div><span className="project-section-kicker">Entrées</span><h2>Ressources du projet</h2><p>Documents fournis pour cadrer et réaliser le travail.</p></div>
              <Button type="button" variant="tertiary" size="small" leadingIcon={<Plus size={14} />} disabled={savingFiles} onClick={() => document.getElementById('project-upload-input')?.click()}>{savingFiles ? 'Import…' : 'Ajouter un document'}</Button>
            </div>
            <input id="project-upload-input" type="file" multiple hidden onChange={(event) => { if (event.target.files) void uploadProjectFiles(Array.from(event.target.files)) }} />
            <div className="project-resource-list">
              {inputs.map((resource) => <div key={resource.id} className="project-resource-row"><span className="project-resource-icon"><FolderOpen size={18} /></span><div><strong>{resource.name}</strong><span>{resource.format} · ajouté le {dateFormatter.format(new Date(resource.createdAt))}</span></div></div>)}
              {inputs.length === 0 && <p className="project-clear-state"><FolderOpen size={17} />Aucune ressource ajoutée au projet.</p>}
            </div>
          </section>
        )}

        {tab === 'artifacts' && (
          <section className="project-resource-section project-resource-tab">
            <div className="project-section-head"><div><span className="project-section-kicker">Productions</span><h2>Artefacts du projet</h2><p>Livrables produits par les experts mobilisés sur ce projet.</p></div><span>{artifacts.length}</span></div>
            <div className="project-resource-list">
              {artifacts.map((resource) => {
                const agent = resource.agentId ? agentById.get(resource.agentId) : undefined
                return <div key={resource.id} className="project-resource-row"><span className="project-resource-icon project-resource-icon--artifact"><FileText size={18} /></span><div><strong>{resource.name}</strong><span>{resource.format}{agent ? ` · produit par ${agent.name}` : ''}</span></div></div>
              })}
              {artifacts.length === 0 && <p className="project-clear-state"><FileText size={17} />Aucun artefact produit pour le moment.</p>}
            </div>
          </section>
        )}

        {tab === 'connectors' && (
          <section className="project-resource-section project-resource-tab">
            <div className="project-section-head"><div><span className="project-section-kicker">Outils et données</span><h2>Connecteurs liés au projet</h2><p>Sources de données et outils que les experts du projet peuvent consulter.</p></div><span>{linkedConnectors.length}</span></div>
            <div className="project-resource-list">
              {linkedConnectors.map((connector) => (
                <div key={connector.id} className="project-resource-row">
                  <span className="project-resource-icon"><Blocks size={18} /></span>
                  <div><strong>{connector.name}</strong><span>{connector.category} · {connector.metier}</span></div>
                </div>
              ))}
              {linkedConnectors.length === 0 && <p className="project-clear-state"><CheckCircle2 size={17} />Aucun connecteur lié pour le moment.</p>}
            </div>
            <div className="project-resource-actions">
              {connectors.filter((connector) => connector.status === 'available').map((connector) => (
                <Button
                  key={connector.id}
                  type="button"
                  variant="tertiary"
                  size="small"
                  disabled={loadingConnector === connector.id}
                  onClick={() => linkConnector(connector)}
                >
                  {loadingConnector === connector.id ? 'Connexion…' : `Lier ${connector.name}`}
                </Button>
              ))}
            </div>
          </section>
        )}
      </main>

      {editingTeam && <ProjectTeamModal projectId={project.id} workspaceId={workspaceId} agents={availableAgents} mode={project.assignments.length === 0 ? 'initial' : 'reinforcement'} onClose={() => setEditingTeam(false)} onSaved={(updated) => { setProject(updated); setEditingTeam(false) }} />}
    </div>
  )
}
