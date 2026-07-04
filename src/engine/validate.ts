import type { Story } from '../types/story'
import { getEndingNodeIds, reachableNodeIds } from './traverse'

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
  const variablesById = new Map(story.variables.map((v) => [v.id, v]))

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
    } else if (node.text.length > 2000) {
      issues.push({
        id: `long-text-${node.id}`,
        severity: 'warning',
        nodeId: node.id,
        message: `Сцена «${node.title || 'Без названия'}» содержит очень длинный текст (${node.text.length} симв.) — возможно, стоит разбить её на несколько сцен.`,
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

    const choiceTextCounts = new Map<string, number>()
    for (const choice of node.choices) {
      const key = choice.text.trim().toLowerCase()
      if (!key) continue
      choiceTextCounts.set(key, (choiceTextCounts.get(key) ?? 0) + 1)
    }
    for (const choice of node.choices) {
      const key = choice.text.trim().toLowerCase()
      if (key && (choiceTextCounts.get(key) ?? 0) > 1) {
        issues.push({
          id: `duplicate-choice-text-${choice.id}`,
          severity: 'warning',
          nodeId: node.id,
          message: `В сцене «${node.title || 'Без названия'}» несколько вариантов называются «${choice.text}» — игрок не сможет их различить.`,
        })
      }
    }

    for (const choice of node.choices) {
      const choiceLabel = `«${choice.text || 'Без текста'}» в сцене «${node.title || 'Без названия'}»`
      if (choice.condition) {
        const variable = variablesById.get(choice.condition.variableId)
        if (!variable) {
          issues.push({
            id: `bad-condition-${choice.id}`,
            severity: 'warning',
            nodeId: node.id,
            message: `Условие у варианта ${choiceLabel} ссылается на несуществующую переменную.`,
          })
        } else if (
          variable.type === 'boolean' &&
          (choice.condition.comparator !== 'eq' || (choice.condition.value !== 0 && choice.condition.value !== 1))
        ) {
          issues.push({
            id: `bad-boolean-condition-${choice.id}`,
            severity: 'warning',
            nodeId: node.id,
            message: `Условие у варианта ${choiceLabel} использует переменную «${variable.name}» (Да/Нет) с недопустимым сравнением или значением — она может быть только 0 или 1.`,
          })
        }
      }
      choice.effects.forEach((effect, index) => {
        const variable = variablesById.get(effect.variableId)
        if (!variable) {
          issues.push({
            id: `bad-effect-${choice.id}-${index}`,
            severity: 'warning',
            nodeId: node.id,
            message: `Эффект у варианта ${choiceLabel} ссылается на несуществующую переменную.`,
          })
        } else if (variable.type === 'boolean' && (effect.op !== 'set' || (effect.value !== 0 && effect.value !== 1))) {
          issues.push({
            id: `bad-boolean-effect-${choice.id}-${index}`,
            severity: 'warning',
            nodeId: node.id,
            message: `Эффект у варианта ${choiceLabel} использует переменную «${variable.name}» (Да/Нет) с недопустимой операцией или значением — она может быть только 0 или 1.`,
          })
        }
      })
    }
  }

  if (story.startNodeId && story.nodes[story.startNodeId]) {
    const endings = new Set(getEndingNodeIds(story))
    const hasReachableEnding = [...reachable].some((id) => endings.has(id))
    if (!hasReachableEnding) {
      issues.push({
        id: 'no-reachable-ending',
        severity: 'warning',
        message: 'Из стартовой сцены нельзя дойти ни до одной концовки — история никогда не закончится.',
      })
    }
  }

  const nodeTitleCounts = new Map<string, number>()
  for (const node of nodes) {
    const key = node.title.trim().toLowerCase()
    if (!key) continue
    nodeTitleCounts.set(key, (nodeTitleCounts.get(key) ?? 0) + 1)
  }
  for (const node of nodes) {
    const key = node.title.trim().toLowerCase()
    if (key && (nodeTitleCounts.get(key) ?? 0) > 1) {
      issues.push({
        id: `duplicate-node-title-${node.id}`,
        severity: 'warning',
        nodeId: node.id,
        message: `Несколько сцен называются «${node.title}» — их легко спутать в списке связанных сцен.`,
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

  const readVariableIds = new Set<string>()
  const writtenVariableIds = new Set<string>()
  for (const node of nodes) {
    for (const choice of node.choices) {
      if (choice.condition) readVariableIds.add(choice.condition.variableId)
      for (const effect of choice.effects) writtenVariableIds.add(effect.variableId)
    }
  }

  for (const variable of story.variables) {
    const isReadInCondition = readVariableIds.has(variable.id)
    const isWrittenByEffect = writtenVariableIds.has(variable.id)
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
