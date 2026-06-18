import { useMemo, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StoryCard } from '../components/StoryCard'
import { ThemeToggle } from '../components/ThemeToggle'
import { buildStandaloneHtml } from '../engine/exportHtml'
import { parseLibraryBackup, parseStoryJson } from '../engine/storySchema'
import { useLibraryStore } from '../store/useLibraryStore'
import { useUIStore } from '../store/useUIStore'
import { downloadJson, downloadText, readJsonFile, slugifyFilename } from '../utils/file'

export function LibraryScreen() {
  const stories = useLibraryStore((s) => s.stories)
  const createStory = useLibraryStore((s) => s.createStory)
  const deleteStory = useLibraryStore((s) => s.deleteStory)
  const duplicateStory = useLibraryStore((s) => s.duplicateStory)
  const importStory = useLibraryStore((s) => s.importStory)
  const openEditor = useUIStore((s) => s.openEditor)
  const openPlayer = useUIStore((s) => s.openPlayer)

  const [query, setQuery] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const storyList = useMemo(
    () =>
      Object.values(stories)
        .filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [stories, query],
  )

  async function handleImportFile(file: File) {
    setError(null)
    try {
      const data = await readJsonFile(file)
      const single = parseStoryJson(data)
      if (single) {
        importStory(single)
        return
      }
      const backup = parseLibraryBackup(data)
      if (backup) {
        backup.forEach((story) => importStory(story))
        return
      }
      setError('Файл не похож на историю Plotline: проверьте, что это экспортированный JSON.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось импортировать файл.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Plotline</h1>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Сочиняйте ветвящиеся истории и проходите их сами.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Поиск историй..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ''
            }}
          />
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
            Импортировать
          </Button>
          <Button
            variant="ghost"
            onClick={() => downloadJson('plotline-library.json', { stories: Object.values(stories) })}
          >
            Экспортировать всё
          </Button>
          <Button variant="primary" onClick={() => openEditor(createStory())}>
            + Новая история
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-medium">
            ✕
          </button>
        </div>
      )}

      {storyList.length === 0 ? (
        <p className="mt-16 text-center text-sm text-slate-500 dark:text-slate-500">
          {query ? 'Ничего не найдено.' : 'Историй пока нет — создайте первую!'}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {storyList.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onPlay={() => openPlayer(story.id)}
              onEdit={() => openEditor(story.id)}
              onDuplicate={() => duplicateStory(story.id)}
              onExport={() => downloadJson(`${slugifyFilename(story.title)}.json`, story)}
              onExportHtml={() => downloadText(`${slugifyFilename(story.title)}.html`, buildStandaloneHtml(story), 'text/html')}
              onDelete={() => setPendingDeleteId(story.id)}
            />
          ))}
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Удалить историю?"
          message={`«${stories[pendingDeleteId]?.title}» будет удалена без возможности восстановления.`}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            deleteStory(pendingDeleteId)
            setPendingDeleteId(null)
          }}
        />
      )}
    </div>
  )
}
