import type { Story } from '../types/story'
import { reachableNodeIds } from './traverse'

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  id: string
  severity: IssueSeverity
  message: string
  nodeId?: string
}

export function validateStory(story: Story): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodes = Object.values(story.nodes)

  if (nodes.length === 0) {
    issues.push({ id: 'no-nodes', severity: 'error', message: 'В истории нет ни одной сцены.' })
    return issues
  }

  if (!story.startNodeId || !story.nodes[story.startNodeId]) {
    issues.push({ id: 'no-start', severity: 'error', message: 'Не выбрана стартовая сцена.' })
  }

  const reachable = reachableNodeIds(story)
  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      issues.push({
        id: `unreachable-${node.id}`,
        severity: 'warning',
        nodeId: node.id,
        message: `Сцена «${node.title || 'Без названия'}» недостижима из начала истории.`,
      })
    }
    if (!node.text.trim()) {
      issues.push({
        id: `empty-text-${node.id}`,
        severity: 'warning',
        nodeId: node.id,
        message: `Сцена «${node.title || 'Без названия'}» не содержит текста.`,
      })
    }
    const danglingChoices = node.choices.filter((c) => c.targetNodeId === null)
    for (const choice of danglingChoices) {
      issues.push({
        id: `dangling-${choice.id}`,
        severity: 'warning',
        nodeId: node.id,
        message: `Вариант «${choice.text || 'Без текста'}» в сцене «${node.title || 'Без названия'}» ни к чему не ведёт.`,
      })
    }
  }

  return issues
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}
