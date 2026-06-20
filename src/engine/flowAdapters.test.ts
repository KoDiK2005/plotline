import { describe, expect, it } from 'vitest'
import { storyToFlowNodes } from './flowAdapters'
import { addChoice, addNode, createStory, linkChoice } from './storyOps'

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

  it('marks a node with no choices as an ending', () => {
    const story = createStory('Test')
    const nodes = storyToFlowNodes(story)

    expect(nodes[0].data.isEnding).toBe(true)
  })

  it('marks a node with a choice linked to another node as not an ending', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    const { story: next, nodeId: targetId } = addNode(story)
    story = next
    story = addChoice(story, startId, 'Go')
    story = linkChoice(story, startId, story.nodes[startId].choices[0].id, targetId)

    const nodes = storyToFlowNodes(story)
    const startNode = nodes.find((n) => n.id === startId)!
    const targetNode = nodes.find((n) => n.id === targetId)!

    expect(startNode.data.isEnding).toBe(false)
    expect(targetNode.data.isEnding).toBe(true)
  })

  it('marks a node whose only choice is unlinked (dangling) as an ending', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'Nowhere yet')

    const nodes = storyToFlowNodes(story)
    expect(nodes.find((n) => n.id === startId)!.data.isEnding).toBe(true)
  })
})
