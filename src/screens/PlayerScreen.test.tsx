import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlayerScreen } from './PlayerScreen'
import {
  addChoice,
  addNode,
  addVariable,
  createStory,
  linkChoice,
  setChoiceCondition,
  setChoiceEffects,
} from '../engine/storyOps'
import type { Story } from '../types/story'
import { useLibraryStore } from '../store/useLibraryStore'
import { useProgressStore } from '../store/useProgressStore'
import { useUIStore } from '../store/useUIStore'

// jsdom has no ResizeObserver, which @reactflow/core relies on for its
// internal viewport measurements. Without a stub, mounting ReactFlow throws.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error -- test-only global stub, jsdom doesn't provide this.
global.ResizeObserver = global.ResizeObserver ?? ResizeObserverStub

function branchingStory() {
  let story = createStory('Test Story')
  const startId = story.startNodeId!

  const { story: s2, nodeId: goodEndId } = addNode(story)
  story = s2
  const { story: s3, nodeId: badEndId } = addNode(story)
  story = s3

  story = addChoice(story, startId, 'Be brave')
  story = linkChoice(story, startId, story.nodes[startId].choices[0].id, goodEndId)
  story = addChoice(story, startId, 'Run away')
  story = linkChoice(story, startId, story.nodes[startId].choices[1].id, badEndId)

  return { story, startId, goodEndId, badEndId }
}

function conditionalStory() {
  let story = createStory('Gated Story')
  const startId = story.startNodeId!

  const { story: s2, nodeId: lockedTargetId } = addNode(story)
  story = s2
  const { story: s3, nodeId: keyTargetId } = addNode(story)
  story = s3

  const { story: withVar, variableId } = addVariable(story, 'Key', 0)
  story = withVar

  // Gated choice: only visible once Key >= 1.
  story = addChoice(story, startId, 'Open the locked door')
  const lockedChoiceId = story.nodes[startId].choices[0].id
  story = linkChoice(story, startId, lockedChoiceId, lockedTargetId)
  story = setChoiceCondition(story, startId, lockedChoiceId, { variableId, comparator: 'gte', value: 1 })

  // Ungated choice that grants the key.
  story = addChoice(story, startId, 'Pick up the key')
  const keyChoiceId = story.nodes[startId].choices[1].id
  story = linkChoice(story, startId, keyChoiceId, keyTargetId)
  story = setChoiceEffects(story, startId, keyChoiceId, [{ variableId, op: 'add', value: 1 }])

  // From the "got key" node, loop back to start so the gated choice becomes visible.
  story = addChoice(story, keyTargetId, 'Go back to the door')
  const backChoiceId = story.nodes[keyTargetId].choices[0].id
  story = linkChoice(story, keyTargetId, backChoiceId, startId)

  return { story, startId, lockedTargetId, keyTargetId, lockedChoiceId, keyChoiceId, variableId }
}

function setupStory(story: Story) {
  useLibraryStore.setState({ stories: { [story.id]: story } })
  useUIStore.setState({ view: 'player', currentStoryId: story.id, selectedNodeId: null })
}

describe('PlayerScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    useLibraryStore.persist.clearStorage()
    useProgressStore.persist.clearStorage()
    useProgressStore.setState({ progress: {} })
    useUIStore.setState({ view: 'library', currentStoryId: null, selectedNodeId: null })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders the start node title/text and its available choices as buttons', () => {
    const { story } = branchingStory()
    setupStory(story)
    render(<PlayerScreen />)

    expect(screen.getByText('Test Story')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Начало' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Be brave' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run away' })).toBeInTheDocument()
  })

  it('navigates to the target node when a choice is clicked and records history', async () => {
    const { story } = branchingStory()
    setupStory(story)
    const user = userEvent.setup()
    render(<PlayerScreen />)

    await user.click(screen.getByRole('button', { name: 'Be brave' }))

    // The "good end" node uses the default empty-node title.
    expect(await screen.findByRole('heading', { name: 'Новая сцена' })).toBeInTheDocument()

    const historySummary = screen.getByText(/Пройденный путь \(2\)/)
    expect(historySummary).toBeInTheDocument()
    const details = historySummary.closest('details')!
    expect(within(details).getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows the ending badge and resets to the start node via "Сыграть заново"', async () => {
    const { story } = branchingStory()
    setupStory(story)
    const user = userEvent.setup()
    render(<PlayerScreen />)

    await user.click(screen.getByRole('button', { name: 'Be brave' }))
    expect(await screen.findByText('Конец истории')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Сыграть заново' }))

    expect(await screen.findByRole('heading', { name: 'Начало' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Be brave' })).toBeInTheDocument()
    expect(screen.queryByText('Конец истории')).not.toBeInTheDocument()
  })

  it('resets to the start node mid-playthrough via header "Начать заново"', async () => {
    const { story } = branchingStory()
    setupStory(story)
    const user = userEvent.setup()
    render(<PlayerScreen />)

    await user.click(screen.getByRole('button', { name: 'Be brave' }))
    expect(await screen.findByRole('heading', { name: 'Новая сцена' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Начать заново' }))

    expect(await screen.findByRole('heading', { name: 'Начало' })).toBeInTheDocument()
    expect(screen.queryByText(/Пройденный путь/)).not.toBeInTheDocument()
  })

  it('hides a conditional choice until its gating variable threshold is met, then allows taking it', async () => {
    const { story } = conditionalStory()
    setupStory(story)
    const user = userEvent.setup()
    render(<PlayerScreen />)

    // Locked choice not visible yet; only the key-granting choice is.
    expect(screen.queryByRole('button', { name: 'Open the locked door' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pick up the key' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pick up the key' }))
    await user.click(await screen.findByRole('button', { name: 'Go back to the door' }))

    // Back at the start node, the gated choice should now be visible and clickable.
    const lockedButton = await screen.findByRole('button', { name: 'Open the locked door' })
    expect(lockedButton).toBeInTheDocument()
    await user.click(lockedButton)
    expect(await screen.findByRole('heading', { name: 'Новая сцена' })).toBeInTheDocument()
  })

  it('toggles between text and map views without crashing', async () => {
    const { story } = branchingStory()
    setupStory(story)
    const user = userEvent.setup()
    render(<PlayerScreen />)

    expect(screen.getByRole('heading', { name: 'Начало' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Карта' }))
    expect(screen.getByRole('button', { name: 'Текст' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Начало' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Текст' }))
    expect(screen.getByRole('button', { name: 'Карта' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Начало' })).toBeInTheDocument()
  })

  it('updates the discovered-endings counter once an ending is reached', async () => {
    const { story } = branchingStory()
    setupStory(story)
    const user = userEvent.setup()
    render(<PlayerScreen />)

    expect(screen.getByText('Концовок найдено: 0/2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Be brave' }))

    expect(await screen.findByText('Концовок найдено: 1/2')).toBeInTheDocument()
  })

  it('selects a choice by pressing its number key', async () => {
    const { story } = branchingStory()
    setupStory(story)
    render(<PlayerScreen />)

    expect(screen.getByRole('heading', { name: 'Начало' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '2' })

    expect(await screen.findByRole('heading', { name: 'Новая сцена' })).toBeInTheDocument()
    expect(screen.getByText(/Пройденный путь \(2\)/)).toBeInTheDocument()
  })

  it('ignores a number key press once the story has reached an ending', async () => {
    const { story } = branchingStory()
    setupStory(story)
    const user = userEvent.setup()
    render(<PlayerScreen />)

    await user.click(screen.getByRole('button', { name: 'Be brave' }))
    expect(await screen.findByText('Конец истории')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByText('Конец истории')).toBeInTheDocument()
  })

  it('shows a fallback message instead of crashing when there is no valid start node', () => {
    const story = { ...createStory('No Start'), startNodeId: null }
    setupStory(story)
    render(<PlayerScreen />)

    expect(
      screen.getByText(/не выбрана стартовая сцена/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Библиотека' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть в редакторе' })).toBeInTheDocument()
  })
})
