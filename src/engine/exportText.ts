import type { Comparator, Story } from '../types/story'
import { reachableDepths } from './traverse'

const COMPARATOR_LABELS: Record<Comparator, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
}

// Reading order follows the BFS distance from the start scene, so the
// output reads roughly like a playthrough; scenes unreachable from the
// start are appended afterwards, sorted by title for a stable order.
function orderedNodeIds(story: Story): string[] {
  const depths = reachableDepths(story)
  const ids = Object.keys(story.nodes)
  const reachable = ids
    .filter((id) => depths.has(id))
    .sort((a, b) => depths.get(a)! - depths.get(b)!)
  const unreachable = ids
    .filter((id) => !depths.has(id))
    .sort((a, b) => story.nodes[a].title.localeCompare(story.nodes[b].title))
  return [...reachable, ...unreachable]
}

/** Produces a readable plain-text outline of every scene and choice, for sharing or printing. Excludes private author notes. */
export function buildPlainTextScript(story: Story): string {
  const variableNames = new Map(story.variables.map((v) => [v.id, v.name]))
  const lines: string[] = [story.title]
  if (story.description) lines.push(story.description)
  lines.push('')

  for (const nodeId of orderedNodeIds(story)) {
    const node = story.nodes[nodeId]
    const heading = nodeId === story.startNodeId ? `=== ${node.title} (старт) ===` : `=== ${node.title} ===`
    lines.push(heading)
    if (node.text) lines.push(node.text)

    if (node.choices.length === 0) {
      lines.push('(конец истории)')
    } else {
      node.choices.forEach((choice, index) => {
        const target = choice.targetNodeId ? story.nodes[choice.targetNodeId].title : '(без цели)'
        lines.push(`  ${index + 1}. ${choice.text || '...'} → ${target}`)
        if (choice.condition) {
          const name = variableNames.get(choice.condition.variableId) ?? '?'
          lines.push(`     Условие: ${name} ${COMPARATOR_LABELS[choice.condition.comparator]} ${choice.condition.value}`)
        }
        for (const effect of choice.effects) {
          const name = variableNames.get(effect.variableId) ?? '?'
          lines.push(`     Эффект: ${name} ${effect.op === 'set' ? '=' : '+='} ${effect.value}`)
        }
      })
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}
