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

    for (const choice of node.choices) {
      const choiceLabel = `«${choice.text || 'Без текста'}» в сцене «${node.title || 'Без названия'}»`
      if (choice.condition && !story.variables.some((v) => v.id === choice.condition!.variableId)) {
        issues.push({
          id: `bad-condition-${choice.id}`,
          severity: 'warning',
          nodeId: node.id,
          message: `Условие у варианта ${choiceLabel} ссылается на несуществующую переменную.`,
        })
      }
      choice.effects.forEach((effect, index) => {
        if (!story.variables.some((v) => v.id === effect.variableId)) {
          issues.push({
            id: `bad-effect-${choice.id}-${index}`,
            severity: 'warning',
            nodeId: node.id,
            message: `Эффект у варианта ${choiceLabel} ссылается на несуществующую переменную.`,
          })
        }
      })
    }
  }

  const variableNameCounts = new Map<string, number>()
  for (const variable of story.variables) {
    const key = variable.name.trim().toLowerCase()
    variableNameCounts.set(key, (variableNameCounts.get(key) ?? 0) + 1)
  }
  for (const variable of story.variables) {
    const key = variable.name.trim().toLowerCase()
    if ((variableNameCounts.get(key) ?? 0) > 1) {
      issues.push({
        id: `duplicate-variable-name-${variable.id}`,
        severity: 'warning',
        message: `Несколько переменных называются «${variable.name}» — их легко спутать в списках условий и эффектов.`,
      })
    }
  }

  for (const variable of story.variables) {
    const isReadInCondition = nodes.some((node) =>
      node.choices.some((choice) => choice.condition?.variableId === variable.id),
    )
    const isWrittenByEffect = nodes.some((node) =>
      node.choices.some((choice) => choice.effects.some((effect) => effect.variableId === variable.id)),
    )
    if (!isReadInCondition && !isWrittenByEffect) {
      issues.push({
        id: `unused-variable-${variable.id}`,
        severity: 'warning',
        message: `Переменная «${variable.name}» не используется ни в одном условии или эффекте.`,
      })
    } else if (isReadInCondition && !isWrittenByEffect) {
      issues.push({
        id: `static-variable-${variable.id}`,
        severity: 'warning',
        message: `Переменная «${variable.name}» используется в условиях, но её не меняет ни один эффект — связанные ветки всегда останутся в одном и том же состоянии.`,
      })
    }
  }

  return issues
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}
