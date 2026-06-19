import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorScreen } from './EditorScreen'
import { addChoice, addNode, createStory, linkChoice, updateNode } from '../engine/storyOps'
import type { Story } from '../types/story'
import { useLibraryStore } from '../store/useLibraryStore'
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

function setupStory(story: Story) {
  useLibraryStore.setState({ stories: { [story.id]: story } })
  useUIStore.setState({ view: 'editor', currentStoryId: story.id, selectedNodeId: null })
}

function sceneCount() {
  return useLibraryStore.getState().stories[useUIStore.getState().currentStoryId!].nodes
}

describe('EditorScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    useLibraryStore.persist.clearStorage()
    useUIStore.setState({ view: 'library', currentStoryId: null, selectedNodeId: null })
  })

  afterEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('renders the story title and scene/ending stats', () => {
    const story = createStory('Edit Me')
    setupStory(story)
    render(<EditorScreen />)

    expect(screen.getByDisplayValue('Edit Me')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2) // "1 сцен" and "1 концовок" pills
    // A freshly created scene has empty text, so the validator reports one warning.
    expect(screen.getByText('1 замечание')).toBeInTheDocument()
  })

  it('adds a scene and reflects the new count', async () => {
    const story = createStory('Edit Me')
    setupStory(story)
    const user = userEvent.setup()
    render(<EditorScreen />)

    expect(Object.keys(sceneCount())).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: '+ Добавить сцену' }))
    expect(Object.keys(sceneCount())).toHaveLength(2)
  })

  it('undoes and redoes adding a scene via the toolbar buttons', async () => {
    const story = createStory('Edit Me')
    setupStory(story)
    const user = userEvent.setup()
    render(<EditorScreen />)

    const undoButton = screen.getByTitle('Отменить (Ctrl+Z)')
    const redoButton = screen.getByTitle('Повторить (Ctrl+Shift+Z)')
    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '+ Добавить сцену' }))
    expect(Object.keys(sceneCount())).toHaveLength(2)
    expect(undoButton).toBeEnabled()

    await user.click(undoButton)
    expect(Object.keys(sceneCount())).toHaveLength(1)
    expect(redoButton).toBeEnabled()

    await user.click(redoButton)
    expect(Object.keys(sceneCount())).toHaveLength(2)
  })

  it('undoes via the Ctrl+Z keyboard shortcut when focus is not in a text field', async () => {
    const story = createStory('Edit Me')
    setupStory(story)
    const user = userEvent.setup()
    render(<EditorScreen />)

    await user.click(screen.getByRole('button', { name: '+ Добавить сцену' }))
    expect(Object.keys(sceneCount())).toHaveLength(2)

    document.body.focus()
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(Object.keys(sceneCount())).toHaveLength(1)
  })

  it('does not undo on Ctrl+Z while typing in a text field, leaving native undo to the browser', async () => {
    const story = createStory('Edit Me')
    setupStory(story)
    const user = userEvent.setup()
    render(<EditorScreen />)

    await user.click(screen.getByRole('button', { name: '+ Добавить сцену' }))
    expect(Object.keys(sceneCount())).toHaveLength(2)

    const titleInput = screen.getByDisplayValue('Edit Me')
    titleInput.focus()
    fireEvent.keyDown(titleInput, { key: 'z', ctrlKey: true })
    expect(Object.keys(sceneCount())).toHaveLength(2)
  })

  it('groups rapid successive edits into a single undo step', () => {
    vi.useFakeTimers()
    const story = createStory('Original')
    setupStory(story)
    render(<EditorScreen />)

    const titleInput = screen.getByDisplayValue('Original')
    fireEvent.change(titleInput, { target: { value: 'O' } })
    vi.advanceTimersByTime(100)
    fireEvent.change(titleInput, { target: { value: 'Or' } })
    vi.advanceTimersByTime(100)
    fireEvent.change(titleInput, { target: { value: 'Orig' } })

    const undoButton = screen.getByTitle('Отменить (Ctrl+Z)')
    fireEvent.click(undoButton)

    expect(useLibraryStore.getState().stories[story.id].title).toBe('Original')
  })

  it('treats edits more than the grouping window apart as separate undo steps', () => {
    vi.useFakeTimers()
    const story = createStory('Original')
    setupStory(story)
    render(<EditorScreen />)

    const titleInput = screen.getByDisplayValue('Original')
    fireEvent.change(titleInput, { target: { value: 'Or' } })
    vi.advanceTimersByTime(1000)
    fireEvent.change(titleInput, { target: { value: 'Orig' } })

    const undoButton = screen.getByTitle('Отменить (Ctrl+Z)')
    fireEvent.click(undoButton)
    expect(useLibraryStore.getState().stories[story.id].title).toBe('Or')

    fireEvent.click(undoButton)
    expect(useLibraryStore.getState().stories[story.id].title).toBe('Original')
  })

  it('opens the node inspector for the selected node and edits its title', async () => {
    const story = createStory('Edit Me')
    setupStory(story)
    const nodeId = Object.keys(story.nodes)[0]
    const user = userEvent.setup()
    render(<EditorScreen />)

    useUIStore.getState().selectNode(nodeId)

    expect(await screen.findByRole('heading', { name: 'Сцена' })).toBeInTheDocument()
    const nodeTitleInput = screen.getByLabelText('Название')
    await user.clear(nodeTitleInput)
    await user.type(nodeTitleInput, 'Forest')

    expect(useLibraryStore.getState().stories[story.id].nodes[nodeId].title).toBe('Forest')
  })

  it('opens the preview panel from the node inspector, shows scene text, and advances on choice click', async () => {
    let story = createStory('Edit Me')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Старт', text: 'Текст старта' })
    const { story: s2, nodeId: endId } = addNode(story)
    story = s2
    story = updateNode(story, endId, { title: 'Конец', text: 'Текст конца' })
    story = addChoice(story, startId, 'Иди дальше')
    story = linkChoice(story, startId, story.nodes[startId].choices[0].id, endId)
    setupStory(story)

    const user = userEvent.setup()
    render(<EditorScreen />)

    useUIStore.getState().selectNode(startId)
    await screen.findByRole('heading', { name: 'Сцена' })

    await user.click(screen.getByRole('button', { name: /Превью/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Текст старта')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Иди дальше' }))
    expect(within(dialog).getByText('Текст конца')).toBeInTheDocument()
    expect(within(dialog).getByText('Конец ветки')).toBeInTheDocument()
  })

  it('closes the preview panel via its close button without mutating the story', async () => {
    const story = createStory('Edit Me')
    setupStory(story)
    const nodeId = Object.keys(story.nodes)[0]
    const user = userEvent.setup()
    render(<EditorScreen />)

    useUIStore.getState().selectNode(nodeId)
    await screen.findByRole('heading', { name: 'Сцена' })
    await user.click(screen.getByRole('button', { name: /Превью/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Закрыть превью' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useLibraryStore.getState().stories[story.id]).toEqual(story)
  })

  it('opens the variables panel and adds a variable', async () => {
    const story = createStory('Edit Me')
    setupStory(story)
    const user = userEvent.setup()
    render(<EditorScreen />)

    expect(story.variables).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Переменные' }))
    await user.click(screen.getByRole('button', { name: '+ Добавить' }))

    expect(useLibraryStore.getState().stories[story.id].variables).toHaveLength(1)
  })

  it('switches a variable to Да/Нет and simplifies the choice condition built on it', async () => {
    let story = createStory('Edit Me')
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'Открыть дверь')
    setupStory(story)
    const user = userEvent.setup()
    render(<EditorScreen />)

    await user.click(screen.getByRole('button', { name: 'Переменные' }))
    await user.click(screen.getByRole('button', { name: '+ Добавить' }))
    await user.selectOptions(screen.getByLabelText('Тип переменной'), 'boolean')

    expect(screen.getByLabelText('Начальное значение')).toHaveDisplayValue('Нет')

    useUIStore.getState().selectNode(startId)
    await screen.findByRole('heading', { name: 'Сцена' })

    const variableId = useLibraryStore.getState().stories[story.id].variables[0].id
    await user.selectOptions(screen.getByLabelText('Переменная условия'), variableId)

    expect(screen.queryByLabelText('Сравнение')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Значение условия')).toHaveDisplayValue('Да')

    const updatedStory = useLibraryStore.getState().stories[story.id]
    expect(updatedStory.nodes[startId].choices[0].condition).toEqual({
      variableId,
      comparator: 'eq',
      value: 1,
    })
  })

  it('opens the find & replace panel and replaces text across the story in one undo step', async () => {
    let story = createStory('Edit Me')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Лесная тропа', text: 'Герой видит волка.' })
    setupStory(story)
    const user = userEvent.setup()
    render(<EditorScreen />)

    await user.click(screen.getByRole('button', { name: '🔍 Найти и заменить' }))
    await user.type(screen.getByLabelText('Найти'), 'волк')
    await user.type(screen.getByLabelText('Заменить на'), 'медведь')
    await user.click(screen.getByRole('button', { name: /Заменить всё/ }))

    expect(useLibraryStore.getState().stories[story.id].nodes[startId].text).toBe('Герой видит медведьа.')

    const undoButton = screen.getByTitle('Отменить (Ctrl+Z)')
    await user.click(undoButton)
    expect(useLibraryStore.getState().stories[story.id].nodes[startId].text).toBe('Герой видит волка.')
  })
})
