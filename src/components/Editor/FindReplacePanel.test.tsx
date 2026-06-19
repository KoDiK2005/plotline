import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FindReplacePanel } from './FindReplacePanel'
import { addChoice, createStory, updateNode } from '../../engine/storyOps'

function sampleStory() {
  let story = createStory('Test')
  const startId = story.startNodeId!
  story = updateNode(story, startId, { title: 'Лесная тропа', text: 'Герой видит волка.' })
  story = addChoice(story, startId, 'Убежать от волка')
  return { story, startId }
}

describe('FindReplacePanel', () => {
  it('shows nothing extra until a query is typed', () => {
    const { story } = sampleStory()
    render(<FindReplacePanel story={story} onUpdate={() => {}} onJumpToNode={() => {}} />)

    expect(screen.queryByText('Совпадений не найдено.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Заменить всё' })).toBeDisabled()
  })

  it('lists matches across the title, text, and a choice as the user types', async () => {
    const { story } = sampleStory()
    const user = userEvent.setup()
    render(<FindReplacePanel story={story} onUpdate={() => {}} onJumpToNode={() => {}} />)

    await user.type(screen.getByLabelText('Найти'), 'волк')

    expect(screen.getByText(/Заменить всё \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Текст:/)).toBeInTheDocument()
    expect(screen.getByText(/Вариант:/)).toBeInTheDocument()
  })

  it('shows "Совпадений не найдено." for a query with no matches', async () => {
    const { story } = sampleStory()
    const user = userEvent.setup()
    render(<FindReplacePanel story={story} onUpdate={() => {}} onJumpToNode={() => {}} />)

    await user.type(screen.getByLabelText('Найти'), 'жжжабсолютно нет такого')

    expect(screen.getByText('Совпадений не найдено.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Заменить всё/ })).toBeDisabled()
  })

  it('calls onUpdate with a replacer that performs the replacement when "Заменить всё" is clicked', async () => {
    const { story, startId } = sampleStory()
    const onUpdate = vi.fn()
    const user = userEvent.setup()
    render(<FindReplacePanel story={story} onUpdate={onUpdate} onJumpToNode={() => {}} />)

    await user.type(screen.getByLabelText('Найти'), 'волк')
    await user.type(screen.getByLabelText('Заменить на'), 'медведь')
    await user.click(screen.getByRole('button', { name: /Заменить всё/ }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const updater = onUpdate.mock.calls[0][0]
    const result = updater(story)
    expect(result.nodes[startId].text).toContain('медведь')
  })

  it('calls onJumpToNode with the matching node id when "Перейти" is clicked', async () => {
    const { story, startId } = sampleStory()
    const onJumpToNode = vi.fn()
    const user = userEvent.setup()
    render(<FindReplacePanel story={story} onUpdate={() => {}} onJumpToNode={onJumpToNode} />)

    await user.type(screen.getByLabelText('Найти'), 'тропа')
    await user.click(screen.getByRole('button', { name: 'Перейти' }))

    expect(onJumpToNode).toHaveBeenCalledWith(startId)
  })
})
