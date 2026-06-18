import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NewStoryDialog } from './NewStoryDialog'

describe('NewStoryDialog', () => {
  it('renders a title input and all templates, with "Пустая история" selected by default', () => {
    render(<NewStoryDialog onCreate={() => {}} onCancel={() => {}} />)

    expect(screen.getByLabelText('Название')).toHaveValue('')
    expect(screen.getByText('Пустая история')).toBeInTheDocument()
    expect(screen.getByText('Детектив')).toBeInTheDocument()
    expect(screen.getByText('Квест')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Пустая история/ })).toBeChecked()
  })

  it('submits the typed title and selected template on "Создать"', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<NewStoryDialog onCreate={onCreate} onCancel={() => {}} />)

    await user.type(screen.getByLabelText('Название'), 'Космическая сага')
    await user.click(screen.getByText('Квест'))
    await user.click(screen.getByRole('button', { name: 'Создать' }))

    expect(onCreate).toHaveBeenCalledWith('Космическая сага', 'quest')
  })

  it('falls back to "Новая история" when the title is left blank', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<NewStoryDialog onCreate={onCreate} onCancel={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Создать' }))

    expect(onCreate).toHaveBeenCalledWith('Новая история', 'blank')
  })

  it('calls onCancel when the "Отмена" button or the backdrop is clicked, but not on inside clicks', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { container } = render(<NewStoryDialog onCreate={() => {}} onCancel={onCancel} />)

    await user.click(screen.getByText('Детектив'))
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.click(container.firstChild as Element)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('exposes dialog semantics, moves focus into the dialog, and closes on Escape', () => {
    const onCancel = vi.fn()
    render(<NewStoryDialog onCreate={() => {}} onCancel={onCancel} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the previously focused element on unmount', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(trigger).toHaveFocus()

    const { unmount } = render(<NewStoryDialog onCreate={() => {}} onCancel={() => {}} />)
    expect(trigger).not.toHaveFocus()

    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
