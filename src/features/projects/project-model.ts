import type { ProjectActivity, ProjectAssignment, ProjectTask } from './api/contracts'

export function projectProgress(tasks: ProjectTask[]): number {
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100)
}

export function sortProjectActivities(activities: ProjectActivity[]): ProjectActivity[] {
  return [...activities].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
}

export function mergeProjectAssignments(
  current: ProjectAssignment[],
  incoming: Array<Pick<ProjectAssignment, 'agentId' | 'responsibility'>>,
  assignedAt: string,
): ProjectAssignment[] {
  const byAgent = new Map(current.map((assignment) => [assignment.agentId, assignment]))
  for (const assignment of incoming) {
    byAgent.set(assignment.agentId, { ...assignment, assignedAt })
  }
  return [...byAgent.values()]
}

const TASK_PRIORITY: Record<ProjectTask['status'], number> = {
  in_progress: 0,
  blocked: 1,
  todo: 2,
  done: 3,
}

/** Tâche la plus utile à afficher pour comprendre le travail actuel d'un expert. */
export function currentProjectTask(tasks: ProjectTask[], agentId: string): ProjectTask | undefined {
  return tasks
    .filter((task) => task.agentId === agentId)
    .sort((left, right) => TASK_PRIORITY[left.status] - TASK_PRIORITY[right.status])[0]
}
