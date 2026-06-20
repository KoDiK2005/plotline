import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IssuesPanel } from './IssuesPanel'
import { addChoice, createStory, updateNode } from '../../engine/storyOps'
import { validateStory } from '../../engine/validate'

describe('IssuesPanel', () => {
  it('shows a success message when there are no issues', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'Something happens.' })
    render(<IssuesPanel issues={validateStory(story)} onUpdate={() => {}} onJumpToNode={() => {}} />)

    expect(screen.getByText('Всё в порядке: история готова к игре.')).toBeInTheDocument()
  })

  it('lists each issue with its message and severity icon', () => {
    const story = createStory()
    render(<IssuesPanel issues={validateStory(story)} onUpdate={() => {}} onJumpToNode={() => {}} />)

    expect(screen.getByText(/Сцена «Начало» не содержит текста\./)).toBeInTheDocument()
  })

  it('calls onJumpToNode when "Перейти" is clicked for an issue with a nodeId', async () => {
    const story = createStory()
    const startId = story.startNodeId!
    const onJumpToNode = vi.fn()
    const user = userEvent.setup()
    render(<IssuesPanel issues={validateStory(story)} onUpdate={() => {}} onJumpToNode={onJumpToNode} />)

    await user.click(screen.getByRole('button', { name: 'Перейти' }))
    expect(onJumpToNode).toHaveBeenCalledWith(startId)
  })

  it('shows a bulk-delete button counting dangling choices and calls onUpdate to remove them', async () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'Leads nowhere')
    story = addChoice(story, startId, 'Also leads nowhere')
    const onUpdate = vi.fn()
    const user = userEvent.setup()
    render(<IssuesPanel issues={validateStory(story)} onUpdate={onUpdate} onJumpToNode={() => {}} />)

    const button = screen.getByRole('button', { name: 'Удалить все варианты без цели (2)' })
    await user.click(button)

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const updater = onUpdate.mock.calls[0][0]
    const result = updater(story)
    expect(result.nodes[startId].choices).toHaveLength(0)
  })

  it('does not show the bulk-delete button when there are no dangling choices', () => {
    const story = createStory()
    render(<IssuesPanel issues={validateStory(story)} onUpdate={() => {}} onJumpToNode={() => {}} />)

    expect(screen.queryByText(/Удалить все варианты без цели/)).not.toBeInTheDocument()
  })
})
