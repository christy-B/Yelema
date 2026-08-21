import { AlertTriangle, ArrowLeft, Check as CheckIcon, CalendarDays, CheckCircle2, Check, ChevronDown, ChevronRight, Circle, Clock3, FileText, FolderOpen, ListChecks, Plug, Plus, ShieldCheck, Square, SquareCheckBig, Upload, UserPlus, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { listAgents, listMarketplaceAgents } from '../../../features/agents/api/api'
import type { AgentSummary } from '../../../features/agents/api/contracts'
import { addProjectResources, addProjectTask, getProject, removeProjectAssignment, removeProjectTask, reviewDeliverableSuggestion, reviewProjectPlan, updateProjectTask, type PlanReviewRequest } from '../../../features/projects/api/api'
import { PROJECT_STATUS_LABELS, PROJECT_TASK_STATUS_LABELS, type Project, type ProjectActivity, type ProjectConnectorSuggestion } from '../../../features/projects/api/contracts'
import { projectDetailTabs, type ProjectDetailTab } from '../../../features/projects/project-navigation'
import { projectProgress, sortProjectActivities } from '../../../features/projects/project-model'
import { AgentAvatar } from '../../../shared/components/agent-avatar/agent-avatar'
import { Button } from '../../../shared/components/button/button'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { ProjectTeamModal } from '../../../shared/components/project-team-modal/project-team-modal'
import { CONNECTOR_LOGOS } from '../../../features/agents/connector-logos'
import { listConnectors, uploadFiles } from '../../../features/files/api/api'
import type { Connector } from '../../../features/files/api/contracts'
import { CONNECTOR_CATEGORIES } from '../../../features/files/connector-categories'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID, projectId = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [catalogue, setCatalogue] = useState<AgentSummary[]>([])
  const [tab, setTab] = useState<ProjectDetailTab>('overview')
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [editingTeam, setEditingTeam] = useState(false)
  const [savingFiles, setSavingFiles] = useState(false)
  const [loadingConnector, setLoadingConnector] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  /** Tache dont le selecteur d'expert est ouvert. */
  const [assigning, setAssigning] = useState<string | null>(null)
  const [newTask, setNewTask] = useState<string | null>(null)
  /** Expert choisi pour la tache en cours de saisie. */
  const [newTaskAgent, setNewTaskAgent] = useState('')
  /** Expert dont le retrait attend confirmation : il emporte ses taches. */
  const [agentToDrop, setAgentToDrop] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([getProject(projectId, workspaceId), listAgents(), listConnectors(), listMarketplaceAgents()])
      .then(([loadedProject, loadedAgents, loadedConnectors, loadedCatalogue]) => {
        setProject(loadedProject)
        setAgents(loadedAgents)
        setConnectors(loadedConnectors)
        setCatalogue(loadedCatalogue)
        setStatus('ready')
      })
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

  const approvedTasks = project.tasks.filter((task) => task.approved).length
  /** Le plan est validable d'un bloc : tout doit l'etre pour lancer. */
  const planComplete = project.tasks.length > 0
    && project.assignments.length > 0
    && approvedTasks === project.tasks.length
    /* Une tache validee mais sans expert n'a personne pour la faire : soit on
       l'affecte, soit on la retire du plan. */
    && project.tasks.every((task) => !!task.agentId)

  /**
   * Le plan n'est pas a prendre ou a laisser : l'utilisateur le corrige. Si le
   * serveur refuse (projet deja lance), l'ecran reste tel quel.
   */
  const editPlan = async (run: () => Promise<Project>) => {
    try {
      setProject(await run())
    } catch {
      // Plan fige cote serveur : rien a defaire ici.
    }
  }

  const assignTask = (taskId: string, agentId: string | null) => {
    setAssigning(null)
    void editPlan(() => updateProjectTask(project.id, taskId, { agentId }))
  }

  /**
   * Rien ne part sans intitule ET sans expert : une tache orpheline n'a
   * personne pour la faire, et le serveur la refuse de toute facon.
   */
  const submitNewTask = () => {
    const title = (newTask ?? '').trim()
    if (!title || !newTaskAgent) return
    setNewTask(null)
    setNewTaskAgent('')
    void editPlan(() => addProjectTask(project.id, { title, agentId: newTaskAgent }))
  }

  /** Les experts que le chef de projet a deja mobilises sur ce projet. */
  const teamAgents = project.assignments
    .map((assignment) => agentById.get(assignment.agentId))
    .filter((agent): agent is AgentSummary => !!agent)
  const teamIds = new Set(teamAgents.map((agent) => agent.id))
  const otherAgents = agents.filter((agent) => !teamIds.has(agent.id))
  /** Experts du catalogue pas encore recrutes : on propose de les recruter. */
  const toRecruit = catalogue.filter((agent) => !agentById.has(agent.id))

  /**
   * Ce que le chef de projet reclame. Purement indicatif : rien n'oblige a le
   * fournir, et rien ne se coche — c'est une information, pas un formulaire.
   */
  const pendingNeeds = project.suggestedInputs
  /**
   * Connecteurs suggeres par le chef de projet, deja lies retires. On associe
   * par nom : c'est ce que porte la suggestion, le catalogue fait foi.
   */
  const suggestedConnectors = project.suggestedConnectors
    .map((suggestion) => ({ suggestion, connector: connectors.find((item) => item.name === suggestion.name) }))
    .filter((entry): entry is { suggestion: ProjectConnectorSuggestion; connector: Connector } =>
      !!entry.connector && entry.connector.status !== 'connected')

  const reviewPlan = async (payload: PlanReviewRequest) => {
    if (payload.launch) setLaunching(true)
    try {
      setProject(await reviewProjectPlan(project.id, payload))
    } catch {
      // Le serveur refuse un lancement premature : on laisse l'ecran en place.
    } finally {
      setLaunching(false)
    }
  }

  const progress = projectProgress(project.tasks)
  const activities = sortProjectActivities(project.activities)
  const inputs = project.resources.filter((resource) => resource.kind === 'input')
  const artifacts = project.resources.filter((resource) => resource.kind === 'artifact')
  const linkedConnectors = connectors.filter((connector) => connector.status === 'connected')
  // Même regroupement que l'onglet Connecteurs d'un expert : par thématique,
  // catalogue complet, l'état porté par la carte. Les deux écrans montrent la
  // même chose, ils doivent donc se lire de la même façon.
  const connectorGroups = CONNECTOR_CATEGORIES
    .map((category) => ({ ...category, items: connectors.filter((connector) => connector.category === category.name) }))
    .filter((group) => group.items.length > 0)
  const tabs = projectDetailTabs()

  const openActivity = (activity: ProjectActivity) => {
    if (!activity.agentId) return
    if (activity.conversationId) navigate(paths.conversation(activity.agentId, activity.conversationId, workspaceId))
    else navigate(paths.agent(activity.agentId, workspaceId))
  }

  /** Verser des documents dans les ressources du projet. */
  const uploadProjectFiles = async (files: File[]) => {
    if (files.length === 0) return
    setSavingFiles(true)
    try {
      const uploaded = await uploadFiles(files)
      const updated = await addProjectResources(
        project.id,
        uploaded.map((file) => ({ id: file.id, name: file.name, format: file.kind })),
      )
      setProject(updated)
    } catch {
      // Le versement a echoue : l'ecran reste tel quel.
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

  const pickDocument = () => document.getElementById('project-upload-input')?.click()

  return (
    <div className="project-detail-page">
      {/* Un seul selecteur de fichiers pour tout l'ecran : la vue d'ensemble
          reclame les documents manquants, l'onglet Ressources les ajoute. */}
      <input
        id="project-upload-input"
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) void uploadProjectFiles(Array.from(event.target.files))
          event.target.value = ''
        }}
      />
      <header className="project-detail-head">
        <button type="button" className="project-back" onClick={() => navigate(paths.projects(workspaceId))}><ArrowLeft size={17} />Projets</button>
        <div className="project-title-row">
          <div>
            <div className="project-title-meta"><span className={`project-status project-status--${project.status}`}>{PROJECT_STATUS_LABELS[project.status]}</span>{project.dueDate && <span><CalendarDays size={14} />Échéance {dateFormatter.format(new Date(`${project.dueDate}T12:00:00`))}</span>}</div>
            <h1>{project.name}</h1>
          </div>
          {/* Une progression a 0 % sur un projet qui n'a pas demarre
              n'informe de rien : elle apparait au lancement. */}
          {project.planState === 'running' && (
            <div className="project-head-progress"><strong>{progress} %</strong><span>du plan terminé</span><div className="project-progress"><span style={{ width: `${progress}%` }} /></div></div>
          )}
        </div>
      </header>

      <nav className="project-tabs" aria-label="Sections du projet">
        {tabs.map((item) => (
          <button key={item.key} type="button" className={tab === item.key ? 'is-active' : ''} onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="project-detail-body">
        {tab === 'overview' && (
          <div className="project-overview">
            {/* Deux colonnes : a gauche ce sur quoi on agit, a droite ce
                qu'on consulte et la decision finale. Le plan est le seul
                bloc ou l'on travaille — il prend la place. */}
            {/* Une decision qui attend bloque un expert : elle ne peut pas se
                lire comme une ligne de plus au fond du rail. Elle passe en
                tete, en alerte. */}
            {project.decisions.length > 0 && (
              <section className="project-alert" role="alert">
                <span className="project-alert-mark"><AlertTriangle size={17} /></span>
                <div>
                  <strong>{project.decisions.length === 1 ? 'Une décision attend votre réponse' : `${project.decisions.length} décisions attendent votre réponse`}</strong>
                  <ul>
                    {project.decisions.map((decision) => (
                      <li key={decision.id}>
                        <button type="button" onClick={() => decision.agentId && navigate(paths.agent(decision.agentId, workspaceId))}>
                          <span>{decision.title}</span>
                          <small>Demandée le {dateFormatter.format(new Date(decision.requestedAt))}</small>
                          <ChevronRight size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
            <div className="project-overview-grid">
              <div className="project-col-main">
                <section className="project-panel">
                  <div className="project-panel-head"><div><ListChecks size={18} /><h2>Plan de travail</h2></div><span>{project.planState === 'running' ? project.tasks.filter((task) => task.status === 'done').length : approvedTasks}/{project.tasks.length}</span></div>
                  <div className="project-task-list">
                    {project.tasks.map((task) => {
                      const agent = task.agentId ? agentById.get(task.agentId) : undefined
                      return (
                        <div key={task.id} className="project-task-row">
                          {/* Avant lancement, la pastille valide ; apres, elle
                              montre l'avancement. Un seul emplacement, deux
                              roles selon l'etat du projet. */}
                          {project.planState === 'running' ? (
                            task.status === 'done' ? <CheckCircle2 className="is-done" size={18} /> : <Circle size={18} />
                          ) : (
                            <button
                              type="button"
                              className="plan-check"
                              role="checkbox"
                              aria-checked={!!task.approved}
                              aria-label={`Valider « ${task.title} »`}
                              onClick={() => void reviewPlan({ taskId: task.id, approved: !task.approved })}
                            >
                              {task.approved ? <SquareCheckBig className="is-done" size={17} /> : <Square size={17} />}
                            </button>
                          )}
                          <div>
                            <strong>{task.title}</strong>
                            {/* Une fois lance, l'affectation est un fait ; avant,
                                c'est une proposition que l'utilisateur change. */}
                            {project.planState === 'running' ? (
                              <span>{agent?.name}{task.brief ? ` · ${task.brief}` : ''}</span>
                            ) : (
                              <span className="task-assign">
                                {/* Sa tete a cote de son nom, comme dans une
                                    conversation : on reconnait un visage plus
                                    vite qu'on ne lit un nom. */}
                                <button type="button" className="task-assign-btn" onClick={() => setAssigning(assigning === task.id ? null : task.id)}>
                                  {agent && <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} variant="square" className="task-assign-face" mono />}
                                  {agent?.name}<ChevronDown size={12} />
                                </button>
                                {task.brief ? ` · ${task.brief}` : ''}
                                {assigning === task.id && (
                                  <>
                                    <span className="task-assign-veil" onClick={() => setAssigning(null)} />
                                    <span className="task-assign-menu">
                                      {teamAgents.length > 0 && <em>Équipe du projet</em>}
                                      {teamAgents.map((candidate) => (
                                        <button key={candidate.id} type="button" onClick={() => assignTask(task.id, candidate.id)}>
                                          <AgentAvatar id={candidate.id} name={candidate.name} avatarUrl={candidate.avatarUrl} size={22} variant="square" mono />
                                          {candidate.name}
                                          {task.agentId === candidate.id && <Check size={14} />}
                                        </button>
                                      ))}
                                      {otherAgents.length > 0 && <em>Vos autres experts</em>}
                                      {otherAgents.map((candidate) => (
                                        <button key={candidate.id} type="button" onClick={() => assignTask(task.id, candidate.id)}>
                                          <AgentAvatar id={candidate.id} name={candidate.name} avatarUrl={candidate.avatarUrl} size={22} variant="square" mono />
                                          {candidate.name}
                                          {task.agentId === candidate.id && <Check size={14} />}
                                        </button>
                                      ))}
                                      {/* Le metier manque a l'equipe mais existe
                                          au catalogue : on ne bloque pas, on
                                          emmene recruter. */}
                                      {toRecruit.length > 0 && <em>À recruter</em>}
                                      {toRecruit.map((candidate) => (
                                        <button key={candidate.id} type="button" className="is-recruit" onClick={() => navigate(paths.marketplaceAgent(candidate.id, workspaceId))}>
                                          <UserPlus size={15} />
                                          {candidate.name}<small>{candidate.tags[0]}</small>
                                        </button>
                                      ))}
                                    </span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          {/* Avant lancement, la pastille de gauche porte deja
                              l'etat : une etiquette de plus le repeterait. */}
                          {project.planState === 'running' && (
                            <span className={`project-task-status project-task-status--${task.status}`}>{PROJECT_TASK_STATUS_LABELS[task.status]}</span>
                          )}
                          {project.planState !== 'running' && (
                            <button
                              type="button"
                              className="task-drop"
                              aria-label={`Retirer « ${task.title} » du plan`}
                              onClick={() => void editPlan(() => removeProjectTask(project.id, task.id))}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {/* Le chef de projet propose ; il n'a pas forcement tout vu. */}
                    {project.planState !== 'running' && (
                      <div className="task-add">
                        {newTask === null ? (
                          <button type="button" className="task-add-open" onClick={() => setNewTask('')}><Plus size={15} />Ajouter une tâche</button>
                        ) : (
                          <>
                            <input
                              autoFocus
                              value={newTask}
                              placeholder="Intitulé de la tâche"
                              onChange={(event) => setNewTask(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') submitNewTask()
                                if (event.key === 'Escape') { setNewTask(null); setNewTaskAgent('') }
                              }}
                            />
                            {/* L'expert se choisit ici, pas apres : une tache
                                creee sans personne resterait a affecter et
                                bloquerait le lancement du projet. */}
                            <select
                              className="task-add-agent"
                              value={newTaskAgent}
                              aria-label="Confier la tâche à"
                              onChange={(event) => setNewTaskAgent(event.target.value)}
                            >
                              <option value="">Confier à…</option>
                              {teamAgents.length > 0 && (
                                <optgroup label="Équipe du projet">
                                  {teamAgents.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                                </optgroup>
                              )}
                              {otherAgents.length > 0 && (
                                <optgroup label="Vos autres experts">
                                  {otherAgents.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                                </optgroup>
                              )}
                            </select>
                            <Button size="small" variant="tertiary" onClick={() => { setNewTask(null); setNewTaskAgent('') }}>Annuler</Button>
                            <Button size="small" disabled={!newTask.trim() || !newTaskAgent} onClick={submitNewTask}>Ajouter</Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </section>
                {/* Le chef de projet ne peut pas fournir la matiere : il dit de
                    quoi les experts ont besoin, et pourquoi. Ce qui est deja
                    fourni ou connecte disparait de la liste. */}
                {(pendingNeeds.length > 0 || suggestedConnectors.length > 0) && (
                  <section className="project-panel project-needs">
                    <div className="project-panel-head"><div><Upload size={18} /><h2>Ressources nécessaires</h2></div><button type="button" className="need-link" onClick={() => setTab('resources')}>Ressources<ChevronRight size={15} /></button></div>
                    {pendingNeeds.map((need) => (
                      <div key={need.id} className="need-row">
                        <span className="need-icon"><FolderOpen size={17} /></span>
                        <div><strong>{need.label}</strong><span>{need.reason}</span></div>
                      </div>
                    ))}
                    {suggestedConnectors.map(({ suggestion, connector }) => (
                      <div key={connector.id} className="need-row">
                        {CONNECTOR_LOGOS[connector.provider]
                          ? <span className="need-icon need-icon--logo"><img src={CONNECTOR_LOGOS[connector.provider]} alt="" /></span>
                          : <span className="need-icon"><Plug size={17} /></span>}
                        <div><strong>{connector.name}</strong><span>{suggestion.reason}</span></div>
                        <button type="button" className="need-act" disabled={loadingConnector === connector.id} onClick={() => linkConnector(connector)}>
                          <Plus size={14} />{loadingConnector === connector.id ? 'Connexion…' : 'Lier'}
                        </button>
                      </div>
                    ))}
                  </section>
                )}
              </div>

              <aside className="project-rail">
                <section className="project-objective">
                  <span className="project-section-kicker">Objectif</span>
                  <p>{project.objective}</p>
                  {/* Un seul bloc : les suggestions sont des suggestions DE
                      livrables, pas un autre sujet. D'ou un titre unique et
                      deux sous-titres. */}
                  {(project.expectedDeliverables.length > 0 || project.suggestedDeliverables.length > 0) && (
                    <div className="project-deliverables">
                      <span className="project-section-kicker">Livrables</span>
                      {project.expectedDeliverables.length > 0 && (
                        <div className="project-expected">
                          <small>Attendus</small>
                          <ul>
                            {project.expectedDeliverables.map((deliverable) => (
                              <li key={deliverable}><FileText size={14} />{deliverable}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Ce que Dany voit manquer aux attendus. Il propose, on
                          accepte ou on ecarte — dans les deux cas la ligne part. */}
                      {project.suggestedDeliverables.length > 0 && (
                        <div className="project-suggested">
                          <small>Suggestions</small>
                          <ul>
                            {project.suggestedDeliverables.map((suggestion) => (
                              <li key={suggestion.id}>
                                <div>
                                  <strong>{suggestion.label}</strong>
                                  <span>{suggestion.reason}</span>
                                </div>
                                <button
                                  type="button"
                                  className="sug-yes"
                                  aria-label={`Ajouter « ${suggestion.label} » aux livrables attendus`}
                                  onClick={() => void editPlan(() => reviewDeliverableSuggestion(project.id, suggestion.id, true))}
                                >
                                  <CheckIcon size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="sug-no"
                                  aria-label={`Écarter « ${suggestion.label} »`}
                                  onClick={() => void editPlan(() => reviewDeliverableSuggestion(project.id, suggestion.id, false))}
                                >
                                  <X size={15} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {project.constraints && <div className="project-constraint"><ShieldCheck size={17} /><span><strong>Contraintes</strong>{project.constraints}</span></div>}
                </section>
                <section className="project-panel">
                  <div className="project-panel-head"><div><Users size={18} /><h2>Équipe du projet</h2></div>{project.assignments.length === 0 && agents.length > 0 && <Button size="small" variant="tertiary" leadingIcon={<Plus size={15} />} onClick={() => setEditingTeam(true)}>Constituer l’équipe</Button>}</div>
                  <div className="project-team-list">
                    {/* Le chef de projet a une fiche comme les autres : sa
                        photo, ses competences, son fil de discussion. Son nom
                        y mene — comme celui des autres experts. */}
                    <div className="project-team-row project-team-row--lead">
                      <AgentAvatar id={project.orchestrator.agentId} name={project.orchestrator.displayName} size={40} variant="square" mono />
                      <div>
                        <button type="button" className="project-team-name" onClick={() => navigate(paths.agent(project.orchestrator.agentId, workspaceId))}>{project.orchestrator.displayName}</button>
                        <span>{project.orchestrator.name} · {project.orchestrator.responsibility}</span>
                      </div>
                    </div>
                  {project.assignments.map((assignment) => {
                      const agent = agentById.get(assignment.agentId)
                      if (!agent) return null
                      return (
                        <div key={assignment.agentId} className="project-team-row">
                          <AgentAvatar id={agent.id} name={agent.name} avatarUrl={agent.avatarUrl} size={40} variant="square" mono />
                          <div>
                            {/* Trois controles cote a cote encombraient la
                                ligne : le nom porte l'ouverture. */}
                            <button type="button" className="project-team-name" onClick={() => navigate(paths.agent(agent.id, workspaceId))}>{agent.name}</button>
                            <span>{assignment.responsibility}</span>
                          </div>
                            {/* Un expert propose se retire, il ne se coche pas :
                              l'accord se donne sur les taches, pas sur les
                              personnes. */}
                          {project.planState !== 'running' && (
                            <button
                              type="button"
                              className="task-drop"
                              aria-label={`Retirer ${agent.name} du projet`}
                              onClick={() => setAgentToDrop(agent.id)}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
                {/* Derniere chose de la page : on lance apres avoir tout lu. Le
                    bouton reste inerte tant que le plan n'est pas entierement
                    valide — et le serveur refuse aussi. */}
                {project.planState !== 'running' && (
                  <div className="plan-launch">
                    <Button disabled={!planComplete || launching} onClick={() => void reviewPlan({ launch: true })}>
                      {launching ? 'Lancement…' : 'Lancer le projet'}
                    </Button>
                  </div>
                )}
              </aside>
            </div>

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
              <Button type="button" variant="tertiary" size="small" leadingIcon={<Plus size={14} />} disabled={savingFiles} onClick={() => pickDocument()}>{savingFiles ? 'Import…' : 'Ajouter un document'}</Button>
            </div>
            <div className="project-resource-list">
              {inputs.map((resource) => <div key={resource.id} className="project-resource-row"><span className="project-resource-icon"><FolderOpen size={18} /></span><div><strong>{resource.name}</strong><span>{resource.format} · ajouté le {dateFormatter.format(new Date(resource.createdAt))}</span></div></div>)}
              {inputs.length === 0 && <p className="project-clear-state"><FolderOpen size={17} />Aucune ressource ajoutée au projet.</p>}
            </div>
          </section>
        )}

        {tab === 'artifacts' && (
          <section className="project-resource-section project-resource-tab">
            <div className="project-section-head"><div><span className="project-section-kicker">Livrables</span><h2>Livrables du projet</h2><p>Ce que les experts mobilisés sur ce projet ont produit.</p></div><span>{artifacts.length}</span></div>
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
            {connectorGroups.length === 0
              ? <p className="act-empty">Aucun connecteur disponible pour l'instant.</p>
              : connectorGroups.map((group) => (
                <section className="connectors-section" key={group.name}>
                  <h3 className="section-title">{group.name}</h3>
                  <div className="connectors-grid">
                    {group.items.map((connector) => {
                      const connected = connector.status === 'connected'
                      const busy = loadingConnector === connector.id
                      return (
                        <div key={connector.id} className={connected ? 'connector-card is-connected' : 'connector-card'}>
                          {CONNECTOR_LOGOS[connector.provider]
                            ? <span className="connector-icon connector-icon--logo"><img src={CONNECTOR_LOGOS[connector.provider]} alt="" /></span>
                            : <span className="connector-icon" style={{ background: group.color }}>{connector.name[0]}</span>}
                          <div className="connector-copy">
                            <strong>{connector.name}</strong>
                            <small>{connected ? 'Connecté' : 'Disponible'}</small>
                          </div>
                          {connected
                            ? <span className="connector-badge"><Check size={13} /> Connecté</span>
                            : <button type="button" className="connector-add" disabled={busy} onClick={() => linkConnector(connector)}>
                                <Plus size={14} /> {busy ? 'Connexion…' : 'Lier'}
                              </button>}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
          </section>
        )}
      </main>

      {/* Retirer un expert emporte ses taches : on le dit avant, en les
          nommant, plutot que de le laisser decouvrir apres. */}
      {agentToDrop && (() => {
        const dropped = agentById.get(agentToDrop)
        const doomed = project.tasks.filter((task) => task.agentId === agentToDrop)
        return (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Retirer un expert du projet">
            <div className="modal-card">
              <h3 className="drop-title">Retirer {dropped?.name ?? 'cet expert'} du projet ?</h3>
              {doomed.length > 0 ? (
                <div className="drop-body">
                  <p>{doomed.length === 1 ? 'Sa tâche sera supprimée du plan :' : `Ses ${doomed.length} tâches seront supprimées du plan :`}</p>
                  {doomed.map((task) => <span key={task.id}>{task.title}</span>)}
                </div>
              ) : (
                <div className="drop-body"><p>Aucune tâche ne lui est confiée.</p></div>
              )}
              <div className="modal-acts">
                <Button size="small" variant="tertiary" onClick={() => setAgentToDrop(null)}>Annuler</Button>
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => {
                    const id = agentToDrop
                    setAgentToDrop(null)
                    void editPlan(() => removeProjectAssignment(project.id, id))
                  }}
                >
                  Retirer
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
      {editingTeam && <ProjectTeamModal projectId={project.id} workspaceId={workspaceId} agents={availableAgents} mode={project.assignments.length === 0 ? 'initial' : 'reinforcement'} onClose={() => setEditingTeam(false)} onSaved={(updated) => { setProject(updated); setEditingTeam(false) }} />}
    </div>
  )
}
