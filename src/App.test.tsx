import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useLibraryStore } from './store/useLibraryStore'
import { useProgressStore } from './store/useProgressStore'
import { useUIStore } from './store/useUIStore'

const initialLibraryState = useLibraryStore.getState()
const initialUIState = useUIStore.getState()
const initialProgressState = useProgressStore.getState()

beforeEach(() => {
  useLibraryStore.setState(initialLibraryState, true)
  useUIStore.setState(initialUIState, true)
  useProgressStore.setState(initialProgressState, true)
  localStorage.clear()
  useLibraryStore.getState().resetToSamples()
})

describe('App', () => {
  it('opens the keyboard shortcuts overlay when "?" is pressed', () => {
    render(<App />)

    expect(screen.queryByText('Горячие клавиши')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Горячие клавиши')).toBeInTheDocument()
  })

  it('does not open the overlay on "?" while typing in a text input', () => {
    render(<App />)

    const input = screen.getByPlaceholderText('Поиск историй...')
    input.focus()
    fireEvent.keyDown(input, { key: '?' })

    expect(screen.queryByText('Горячие клавиши')).not.toBeInTheDocument()
  })

  it('opens and closes the overlay via the header button and Escape', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Горячие клавиши' }))
    expect(screen.getByText('Горячие клавиши')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Горячие клавиши')).not.toBeInTheDocument()
  })
})
