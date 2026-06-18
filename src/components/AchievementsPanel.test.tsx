import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AchievementsPanel } from './AchievementsPanel'
import type { AchievementStatus } from '../engine/achievements'

const achievements: AchievementStatus[] = [
  { id: 'a', title: 'Unlocked One', description: 'desc one', unlocked: true },
  { id: 'b', title: 'Locked One', description: 'desc two', unlocked: false },
]

describe('AchievementsPanel', () => {
  it('renders the unlocked count, every achievement title/description, and lock state icons', () => {
    render(<AchievementsPanel achievements={achievements} onClose={() => {}} />)

    expect(screen.getByText('Достижения · 1/2')).toBeInTheDocument()
    expect(screen.getByText('Unlocked One')).toBeInTheDocument()
    expect(screen.getByText('desc one')).toBeInTheDocument()
    expect(screen.getByText('Locked One')).toBeInTheDocument()
    expect(screen.getByText('desc two')).toBeInTheDocument()
    expect(screen.getByText('🏆')).toBeInTheDocument()
    expect(screen.getByText('🔒')).toBeInTheDocument()
  })

  it('calls onClose when the icon button, the text button, or the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<AchievementsPanel achievements={achievements} onClose={onClose} />)

    // The icon "✕" button and the bottom text button both have accessible name "Закрыть".
    const closeButtons = screen.getAllByRole('button', { name: 'Закрыть' })
    expect(closeButtons).toHaveLength(2)

    await user.click(closeButtons[0])
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(closeButtons[1])
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close when clicking inside the panel content', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AchievementsPanel achievements={achievements} onClose={onClose} />)

    await user.click(screen.getByText('Unlocked One'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('exposes dialog semantics, moves focus into the panel, and closes on Escape', () => {
    const onClose = vi.fn()
    render(<AchievementsPanel achievements={achievements} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the previously focused element on unmount', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(trigger).toHaveFocus()

    const { unmount } = render(<AchievementsPanel achievements={achievements} onClose={() => {}} />)
    expect(trigger).not.toHaveFocus()

    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
