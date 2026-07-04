import type { Comparator, Story } from '../types/story'
import { reachableDepths } from './traverse'

const SUGAR_COMPARATORS: Record<Comparator, string> = {
  eq: 'is',
  neq: 'isnot',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
}

function toSugarVar(name: string): string {
  return '$' + name.replace(/\s+/g, '_').replace(/[^\w$Ѐ-ӿ]/g, '_')
}

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

function passageName(nodeId: string, story: Story): string {
  return story.nodes[nodeId]?.title?.trim() || nodeId
}

/**
 * Exports the story as Twee 3 / SugarCube format compatible with Twine 2.
 *
 * Variable conditions become <<if …>> blocks; choice effects are emitted as
 * auto-generated intermediate "_eff_" passages that set variables and then
 * <<goto>> the real target, so effects only fire on the chosen branch.
 */
export function buildTweeScript(story: Story): string {
  const varMap = new Map(story.variables.map((v) => [v.id, v]))
  const startNode = story.startNodeId ? story.nodes[story.startNodeId] : null
  const sections: string[] = []

  // :: StoryTitle
  sections.push(`:: StoryTitle\n${story.title}`)

  // :: StoryData (IFID derived from story.id for stable re-exports)
  const raw = story.id.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(32, '0').slice(0, 32)
  const ifid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20, 32)}`
  sections.push(
    `:: StoryData\n${JSON.stringify(
      { ifid, format: 'SugarCube', 'format-version': '2.36.1', start: startNode?.title ?? '', zoom: 1 },
      null,
      2,
    )}`,
  )

  // :: StoryInit — set initial variable values
  if (story.variables.length > 0) {
    const init = story.variables
      .map((v) => `<<set ${toSugarVar(v.name)} to ${v.initialValue}>>`)
      .join('\n')
    sections.push(`:: StoryInit\n${init}`)
  }

  // Scene passages + auto-generated effect passages
  const effectPassages: string[] = []

  for (const nodeId of orderedNodeIds(story)) {
    const node = story.nodes[nodeId]
    const lines: string[] = []
    if (node.text) lines.push(node.text)

    const linkedChoices = node.choices.filter(
      (c) => c.targetNodeId !== null && story.nodes[c.targetNodeId!],
    )

    if (linkedChoices.length === 0) {
      if (lines.length > 0) lines.push('')
      lines.push('/% Конец истории %/')
    } else {
      if (lines.length > 0) lines.push('')
      for (const choice of linkedChoices) {
        const target = story.nodes[choice.targetNodeId!]
        const choiceText = choice.text || '…'

        let destination = passageName(target.id, story)

        // Choices with effects go through an intermediate passage
        if (choice.effects.length > 0) {
          const effId = `_eff_${choice.id.replace(/[^a-z0-9]/gi, '').slice(0, 16)}`
          const effLines = choice.effects.map((effect) => {
            const v = varMap.get(effect.variableId)
            if (!v) return ''
            const sv = toSugarVar(v.name)
            return effect.op === 'set'
              ? `<<set ${sv} to ${effect.value}>>`
              : `<<set ${sv} to ${sv} + ${effect.value}>>`
          }).filter(Boolean)
          effLines.push(`<<goto "${passageName(target.id, story)}">>`)
          effectPassages.push(`:: ${effId}\n${effLines.join('\n')}`)
          destination = effId
        }

        const link = `[[${choiceText}|${destination}]]`
        if (choice.condition) {
          const v = varMap.get(choice.condition.variableId)
          if (v) {
            const sv = toSugarVar(v.name)
            const op = SUGAR_COMPARATORS[choice.condition.comparator]
            lines.push(`<<if ${sv} ${op} ${choice.condition.value}>>${link}<</if>>`)
          } else {
            lines.push(link)
          }
        } else {
          lines.push(link)
        }
      }
    }

    sections.push(`:: ${passageName(nodeId, story)}\n${lines.join('\n')}`)
  }

  sections.push(...effectPassages)

  return sections.join('\n\n') + '\n'
}
