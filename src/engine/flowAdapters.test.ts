import { describe, expect, it } from 'vitest'
import { storyToFlowEdges, storyToFlowNodes } from './flowAdapters'
import { addChoice, addNode, createStory, linkChoice, updateNode } from './storyOps'

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

  it('includes the word count of the node text', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'four little words here' })

    const nodes = storyToFlowNodes(story)
    expect(nodes.find((n) => n.id === startId)!.data.wordCount).toBe(4)
  })

  it('counts zero words for a node with empty text', () => {
    const story = createStory('Test')
    const nodes = storyToFlowNodes(story)
    expect(nodes[0].data.wordCount).toBe(0)
  })

  it('reuses the same node object for nodes untouched by an edit, so unaffected scene cards skip re-rendering', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond

    const before = storyToFlowNodes(story)
    const beforeSecond = before.find((n) => n.id === secondId)!

    story = updateNode(story, startId, { text: 'edited' })
    const after = storyToFlowNodes(story)
    const afterSecond = after.find((n) => n.id === secondId)!
    const afterStart = after.find((n) => n.id === startId)!

    expect(afterSecond).toBe(beforeSecond)
    expect(afterStart.data.text).toBe('edited')
  })

  it('rebuilds a node whose reachability changes even though the node itself was not edited', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    const { story: withOrphan, nodeId: orphanId } = addNode(story)
    story = withOrphan

    const before = storyToFlowNodes(story)
    expect(before.find((n) => n.id === orphanId)!.data.isUnreachable).toBe(true)

    story = addChoice(story, startId, 'Go')
    story = linkChoice(story, startId, story.nodes[startId].choices[0].id, orphanId)

    const after = storyToFlowNodes(story)
    expect(after.find((n) => n.id === orphanId)!.data.isUnreachable).toBe(false)
  })
})

describe('storyToFlowEdges', () => {
  it('reuses the same edge object for choices untouched by an edit', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    const { story: withTarget, nodeId: targetId } = addNode(story)
    story = withTarget
    story = addChoice(story, startId, 'Go')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, targetId)

    const before = storyToFlowEdges(story)
    story = updateNode(story, targetId, { text: 'edited' })
    const after = storyToFlowEdges(story)

    expect(after).toHaveLength(1)
    expect(after[0]).toBe(before[0])
  })

  it('builds a fresh edge once a choice is relinked to a different target', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    const { story: s2, nodeId: targetA } = addNode(story)
    story = s2
    const { story: s3, nodeId: targetB } = addNode(story)
    story = s3
    story = addChoice(story, startId, 'Go')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, targetA)

    const before = storyToFlowEdges(story)
    story = linkChoice(story, startId, choiceId, targetB)
    const after = storyToFlowEdges(story)

    expect(before[0].target).toBe(targetA)
    expect(after[0].target).toBe(targetB)
    expect(after[0]).not.toBe(before[0])
  })
})
