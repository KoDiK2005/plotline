import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStory } from '../engine/storyOps'
import { useLibraryStore } from '../store/useLibraryStore'
import { useProgressStore } from '../store/useProgressStore'
import { useUIStore } from '../store/useUIStore'
import { LibraryScreen } from './LibraryScreen'

const initialLibraryState = useLibraryStore.getState()
const initialUIState = useUIStore.getState()
const initialProgressState = useProgressStore.getState()

beforeEach(() => {
  useLibraryStore.setState(initialLibraryState, true)
  useUIStore.setState(initialUIState, true)
  useProgressStore.setState(initialProgressState, true)
  localStorage.clear()
  // Ensure the library reflects the known-good sample set regardless of any
  // mutation that may have happened to the captured initial state object.
  useLibraryStore.getState().resetToSamples()
})

function makeJsonFile(name: string, content: unknown): File {
  return new File([JSON.stringify(content)], name, { type: 'application/json' })
}

describe('LibraryScreen', () => {
  it('renders the header and the three bundled sample stories', () => {
    render(<LibraryScreen />)

    expect(screen.getByText('Plotline')).toBeInTheDocument()
    expect(screen.getByText('Сигнал из глубины')).toBeInTheDocument()
    expect(screen.getByText('Кофейня на перекрёстке')).toBeInTheDocument()
    expect(screen.getByText('Ключ от чердака')).toBeInTheDocument()
  })

  it('filters story cards by title via the search input (case-insensitive substring match)', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    const input = screen.getByPlaceholderText('Поиск историй...')
    await user.type(input, 'кофейня')

    expect(screen.getByText('Кофейня на перекрёстке')).toBeInTheDocument()
    expect(screen.queryByText('Сигнал из глубины')).not.toBeInTheDocument()
    expect(screen.queryByText('Ключ от чердака')).not.toBeInTheDocument()
  })

  it('shows the "Ничего не найдено." message when the search matches nothing', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    const input = screen.getByPlaceholderText('Поиск историй...')
    await user.type(input, 'zzz-no-match')

    expect(screen.getByText('Ничего не найдено.')).toBeInTheDocument()
  })

  it('matches titles case-insensitively', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    const input = screen.getByPlaceholderText('Поиск историй...')
    await user.type(input, 'КЛЮЧ')

    expect(screen.getByText('Ключ от чердака')).toBeInTheDocument()
    expect(screen.queryByText('Сигнал из глубины')).not.toBeInTheDocument()
  })

  it('opens the new-story dialog, then creates a blank story and opens the editor on confirm', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    const storyCountBefore = Object.keys(useLibraryStore.getState().stories).length

    await user.click(screen.getByRole('button', { name: '+ Новая история' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Название'), 'Моя история')
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }))

    const stories = useLibraryStore.getState().stories
    expect(Object.keys(stories).length).toBe(storyCountBefore + 1)

    const uiState = useUIStore.getState()
    expect(uiState.view).toBe('editor')
    expect(uiState.currentStoryId).not.toBeNull()
    const created = stories[uiState.currentStoryId!]
    expect(created).toBeDefined()
    expect(created.title).toBe('Моя история')
    expect(Object.keys(created.nodes)).toHaveLength(1)
  })

  it('creates a story from the "Детектив" template with its pre-built scenes', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    await user.click(screen.getByRole('button', { name: '+ Новая история' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByText('Детектив'))
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }))

    const uiState = useUIStore.getState()
    const created = useLibraryStore.getState().stories[uiState.currentStoryId!]
    expect(Object.keys(created.nodes)).toHaveLength(4)
  })

  it('closes the new-story dialog via cancel without creating a story', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    const storyCountBefore = Object.keys(useLibraryStore.getState().stories).length

    await user.click(screen.getByRole('button', { name: '+ Новая история' }))
    await user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(Object.keys(useLibraryStore.getState().stories).length).toBe(storyCountBefore)
    expect(useUIStore.getState().view).toBe('library')
  })

  it('opens a ConfirmDialog when a story\'s "Удалить" button is clicked, and removes the story on confirm', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    const storyCountBefore = Object.keys(useLibraryStore.getState().stories).length

    const card = screen.getByText('Ключ от чердака').closest('div')!
    const deleteButton = within(card).getByRole('button', { name: 'Удалить' })
    await user.click(deleteButton)

    expect(screen.getByText('Удалить историю?')).toBeInTheDocument()
    expect(screen.getByText(/«Ключ от чердака» будет удалена без возможности восстановления\./)).toBeInTheDocument()

    // The dialog renders its own "Удалить" confirm button; grab all matches and use the last (dialog) one.
    const allDeleteButtons = screen.getAllByRole('button', { name: 'Удалить' })
    await user.click(allDeleteButtons[allDeleteButtons.length - 1])

    const storiesAfter = useLibraryStore.getState().stories
    expect(Object.keys(storiesAfter).length).toBe(storyCountBefore - 1)
    expect(Object.values(storiesAfter).some((s) => s.title === 'Ключ от чердака')).toBe(false)
  })

  it('cancels deletion without removing the story when "Отмена" is clicked', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    const storyCountBefore = Object.keys(useLibraryStore.getState().stories).length

    const card = screen.getByText('Ключ от чердака').closest('div')!
    const deleteButton = within(card).getByRole('button', { name: 'Удалить' })
    await user.click(deleteButton)

    await user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(screen.queryByText('Удалить историю?')).not.toBeInTheDocument()
    expect(Object.keys(useLibraryStore.getState().stories).length).toBe(storyCountBefore)
  })

  it('imports a valid story file and increases the story count', async () => {
    render(<LibraryScreen />)

    const storyCountBefore = Object.keys(useLibraryStore.getState().stories).length
    const importedStory = createStory('Imported Story')
    const file = makeJsonFile('story.json', importedStory)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    await screen.findByText('Imported Story')

    const storiesAfter = useLibraryStore.getState().stories
    expect(Object.keys(storiesAfter).length).toBe(storyCountBefore + 1)
  })

  it('shows an inline error message when importing malformed JSON', async () => {
    render(<LibraryScreen />)

    const file = new File(['not valid json{{{'], 'broken.json', { type: 'application/json' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(await screen.findByText('Файл повреждён или не является корректным JSON.')).toBeInTheDocument()
  })

  it('shows an inline error message when importing well-formed JSON that is not a Plotline story', async () => {
    render(<LibraryScreen />)

    const file = makeJsonFile('not-a-story.json', { foo: 'bar' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(
      await screen.findByText('Файл не похож на историю Plotline: проверьте, что это экспортированный JSON.'),
    ).toBeInTheDocument()
  })

  it('reorders the story cards alphabetically when "По названию" is selected', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    await user.selectOptions(screen.getByLabelText('Сортировка'), 'По названию')

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Ключ от чердака', 'Кофейня на перекрёстке', 'Сигнал из глубины'])
  })

  it('opens and closes the achievements panel from the header button', async () => {
    const user = userEvent.setup()
    render(<LibraryScreen />)

    await user.click(screen.getByRole('button', { name: /Достижения/ }))

    expect(screen.getByRole('heading', { name: /Достижения · \d+\/\d+/ })).toBeInTheDocument()
    expect(screen.getByText('Создайте свою собственную историю.')).toBeInTheDocument()

    // The panel renders both an icon "✕" button (aria-label "Закрыть") and a text "Закрыть" button.
    const closeButtons = screen.getAllByRole('button', { name: 'Закрыть' })
    await user.click(closeButtons[closeButtons.length - 1])

    expect(screen.queryByRole('heading', { name: /Достижения · \d+\/\d+/ })).not.toBeInTheDocument()
  })
})
