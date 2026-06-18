import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStory } from '../engine/storyOps'
import { useProgressStore } from '../store/useProgressStore'
import { StoryCard } from './StoryCard'

const initialProgressState = useProgressStore.getState()

beforeEach(() => {
  useProgressStore.setState(initialProgressState, true)
  localStorage.clear()
})

function renderCard(overrides: Partial<Parameters<typeof StoryCard>[0]> = {}) {
  const story = overrides.story ?? createStory('Test Story')
  const handlers = {
    onPlay: vi.fn(),
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onExport: vi.fn(),
    onExportHtml: vi.fn(),
    onDelete: vi.fn(),
  }
  render(
    <StoryCard
      story={story}
      onPlay={overrides.onPlay ?? handlers.onPlay}
      onEdit={overrides.onEdit ?? handlers.onEdit}
      onDuplicate={overrides.onDuplicate ?? handlers.onDuplicate}
      onExport={overrides.onExport ?? handlers.onExport}
      onExportHtml={overrides.onExportHtml ?? handlers.onExportHtml}
      onDelete={overrides.onDelete ?? handlers.onDelete}
    />,
  )
  return { story, ...handlers }
}

describe('StoryCard', () => {
  it('renders the title and "Без описания." fallback when description is empty', () => {
    const story = createStory('Test Story')
    expect(story.description).toBe('')
    renderCard({ story })

    expect(screen.getByText('Test Story')).toBeInTheDocument()
    expect(screen.getByText('Без описания.')).toBeInTheDocument()
  })

  it('renders the actual description when present', () => {
    const story = createStory('Test Story', 'A thrilling tale.')
    renderCard({ story })

    expect(screen.getByText('A thrilling tale.')).toBeInTheDocument()
    expect(screen.queryByText('Без описания.')).not.toBeInTheDocument()
  })

  it('renders scene/ending stat pills for a freshly created single-node story', () => {
    // createStory() produces exactly one node ("Начало") with no choices,
    // so it is simultaneously the only scene and the only ending.
    const story = createStory('Test Story')
    renderCard({ story })

    const scenePill = screen.getByText('сцен', { exact: false }).closest('span')!
    const endingPill = screen.getByText('концовок', { exact: false }).closest('span')!
    expect(scenePill).toHaveTextContent('1сцен')
    expect(endingPill).toHaveTextContent('1концовок')
  })

  it('renders a "~N мин чтения" pill estimating reading time', () => {
    renderCard()
    const readingPill = screen.getByText('мин чтения', { exact: false }).closest('span')!
    expect(readingPill).toHaveTextContent('~1мин чтения')
  })

  it('does not render the "недостижимых" pill when there are no unreachable nodes', () => {
    renderCard()
    expect(screen.queryByText('недостижимых')).not.toBeInTheDocument()
  })

  it('does not render the discovered-endings pill when there is no progress', () => {
    const story = createStory('Test Story')
    renderCard({ story })
    expect(screen.queryByText(/найдено/)).not.toBeInTheDocument()
  })

  it('renders the discovered-endings pill with correct text once progress is recorded', () => {
    const story = createStory('Test Story')
    useProgressStore.getState().recordEnding(story.id, story.startNodeId!)
    renderCard({ story })

    expect(screen.getByText('из 1 найдено')).toBeInTheDocument()
    expect(screen.getByText('из 1 найдено').previousSibling).toHaveTextContent('1')
  })

  it('calls onPlay when "Играть" is clicked', async () => {
    const user = userEvent.setup()
    const { onPlay } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Играть' }))
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit when "Редактировать" is clicked', async () => {
    const user = userEvent.setup()
    const { onEdit } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDuplicate when "Дублировать" is clicked', async () => {
    const user = userEvent.setup()
    const { onDuplicate } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Дублировать' }))
    expect(onDuplicate).toHaveBeenCalledTimes(1)
  })

  it('calls onExport when "JSON" is clicked', async () => {
    const user = userEvent.setup()
    const { onExport } = renderCard()
    await user.click(screen.getByRole('button', { name: 'JSON' }))
    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('calls onExportHtml when "HTML" is clicked', async () => {
    const user = userEvent.setup()
    const { onExportHtml } = renderCard()
    await user.click(screen.getByRole('button', { name: 'HTML' }))
    expect(onExportHtml).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when "Удалить" is clicked', async () => {
    const user = userEvent.setup()
    const { onDelete } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
