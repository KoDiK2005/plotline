import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStory } from '../engine/storyOps'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { useProgressStore } from '../store/useProgressStore'
import * as fileUtils from '../utils/file'
import { StoryCard } from './StoryCard'

const initialProgressState = useProgressStore.getState()

beforeEach(() => {
  useProgressStore.setState(initialProgressState, true)
  useFavoriteStore.setState({ favorites: {} })
  localStorage.clear()
  vi.restoreAllMocks()
})

function renderCard(overrides: Partial<Parameters<typeof StoryCard>[0]> = {}) {
  const story = overrides.story ?? createStory('Test Story')
  const handlers = {
    onPlay: vi.fn(),
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onResetProgress: vi.fn(),
  }
  render(
    <StoryCard
      story={story}
      onPlay={overrides.onPlay ?? handlers.onPlay}
      onEdit={overrides.onEdit ?? handlers.onEdit}
      onDuplicate={overrides.onDuplicate ?? handlers.onDuplicate}
      onDelete={overrides.onDelete ?? handlers.onDelete}
      onResetProgress={overrides.onResetProgress ?? handlers.onResetProgress}
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

  it('calls onPlay with the story id when "Играть" is clicked', async () => {
    const user = userEvent.setup()
    const { onPlay, story } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Играть' }))
    expect(onPlay).toHaveBeenCalledExactlyOnceWith(story.id)
  })

  it('calls onEdit with the story id when "Редактировать" is clicked', async () => {
    const user = userEvent.setup()
    const { onEdit, story } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    expect(onEdit).toHaveBeenCalledExactlyOnceWith(story.id)
  })

  it('calls onDuplicate with the story id when "Дублировать" is clicked', async () => {
    const user = userEvent.setup()
    const { onDuplicate, story } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Дублировать' }))
    expect(onDuplicate).toHaveBeenCalledExactlyOnceWith(story.id)
  })

  it('downloads a JSON file when "JSON" is clicked', async () => {
    const downloadJson = vi.spyOn(fileUtils, 'downloadJson').mockImplementation(() => {})
    const user = userEvent.setup()
    const { story } = renderCard({ story: createStory('My Story') })
    await user.click(screen.getByRole('button', { name: 'JSON' }))
    expect(downloadJson).toHaveBeenCalledExactlyOnceWith('my-story.json', story)
  })

  it('downloads a standalone HTML file when "HTML" is clicked', async () => {
    const downloadText = vi.spyOn(fileUtils, 'downloadText').mockImplementation(() => {})
    const user = userEvent.setup()
    renderCard({ story: createStory('My Story') })
    await user.click(screen.getByRole('button', { name: 'HTML' }))
    expect(downloadText).toHaveBeenCalledTimes(1)
    expect(downloadText.mock.calls[0][0]).toBe('my-story.html')
    expect(downloadText.mock.calls[0][2]).toBe('text/html')
  })

  it('calls onDelete with the story id when "Удалить" is clicked', async () => {
    const user = userEvent.setup()
    const { onDelete, story } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(story.id)
  })

  it('does not render the "Сбросить прогресс" button when the story has never been played', () => {
    renderCard()
    expect(screen.queryByRole('button', { name: 'Сбросить прогресс' })).not.toBeInTheDocument()
  })

  it('renders the "Сбросить прогресс" button and calls onResetProgress with the story id once played', async () => {
    const story = createStory('Test Story')
    useProgressStore.getState().recordPlayStart(story.id)
    const user = userEvent.setup()
    const { onResetProgress } = renderCard({ story })

    await user.click(screen.getByRole('button', { name: 'Сбросить прогресс' }))
    expect(onResetProgress).toHaveBeenCalledExactlyOnceWith(story.id)
  })

  it('toggles a story into and out of favorites', async () => {
    const user = userEvent.setup()
    const { story } = renderCard()

    const star = screen.getByRole('button', { name: 'Добавить в избранное' })
    await user.click(star)
    expect(useFavoriteStore.getState().isFavorite(story.id)).toBe(true)
    expect(screen.getByRole('button', { name: 'Убрать из избранного' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Убрать из избранного' }))
    expect(useFavoriteStore.getState().isFavorite(story.id)).toBe(false)
  })
})
