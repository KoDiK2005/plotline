import { describe, expect, it } from 'vitest'
import { storyToFlowNodes } from './flowAdapters'
import { addNode, createStory } from './storyOps'

describe('storyToFlowNodes', () => {
  it('marks the start node and nodes reachable from it as not unreachable', () => {
    const story = createStory('Test')
    const nodes = storyToFlowNodes(story)

    expect(nodes).toHaveLength(1)
    expect(nodes[0].data.isStart).toBe(true)
    expect(nodes[0].data.isUnreachable).toBe(false)
  })

  it('marks a node with no incoming links from the start as unreachable', () => {
    let story = createStory('Test')
    const { story: next, nodeId: orphanId } = addNode(story)
    story = next

    const nodes = storyToFlowNodes(story)
    const orphanNode = nodes.find((n) => n.id === orphanId)!
    const startNode = nodes.find((n) => n.id === story.startNodeId)!

    expect(orphanNode.data.isUnreachable).toBe(true)
    expect(startNode.data.isUnreachable).toBe(false)
  })
})
