import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders the title and message, and uses "Удалить" as the default confirm label', () => {
    render(<ConfirmDialog title="Удалить историю?" message="Это нельзя отменить." onConfirm={() => {}} onCancel={() => {}} />)

    expect(screen.getByText('Удалить историю?')).toBeInTheDocument()
    expect(screen.getByText('Это нельзя отменить.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
  })

  it('supports a custom confirm label', () => {
    render(
      <ConfirmDialog
        title="T"
        message="M"
        confirmLabel="Перезаписать"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Перезаписать' })).toBeInTheDocument()
  })

  it('calls onConfirm/onCancel/backdrop-click correctly, but not on clicks inside the dialog body', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { container } = render(
      <ConfirmDialog title="T" message="M" onConfirm={onConfirm} onCancel={onCancel} />,
    )

    await user.click(screen.getByText('M'))
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(container.firstChild as Element)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('exposes dialog semantics, moves focus into the dialog, and cancels on Escape', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the previously focused element on unmount', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(<ConfirmDialog title="T" message="M" onConfirm={() => {}} onCancel={() => {}} />)
    expect(trigger).not.toHaveFocus()

    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
