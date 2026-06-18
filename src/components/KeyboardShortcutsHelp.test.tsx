import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'

describe('KeyboardShortcutsHelp', () => {
  it('renders the title and every shortcut group with its key combos', () => {
    render(<KeyboardShortcutsHelp onClose={() => {}} />)

    expect(screen.getByText('Горячие клавиши')).toBeInTheDocument()
    expect(screen.getByText('Везде')).toBeInTheDocument()
    expect(screen.getByText('Редактор')).toBeInTheDocument()
    expect(screen.getByText('Открыть эту справку')).toBeInTheDocument()
    expect(screen.getByText('Ctrl/⌘ + Z')).toBeInTheDocument()
  })

  it('calls onClose when the icon button, the text button, or the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<KeyboardShortcutsHelp onClose={onClose} />)

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
    render(<KeyboardShortcutsHelp onClose={onClose} />)

    await user.click(screen.getByText('Редактор'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('exposes dialog semantics, moves focus into the panel, and closes on Escape', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutsHelp onClose={onClose} />)

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

    const { unmount } = render(<KeyboardShortcutsHelp onClose={() => {}} />)
    expect(trigger).not.toHaveFocus()

    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
