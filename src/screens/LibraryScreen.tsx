import { useEffect, useMemo, useRef, useState } from 'react'
import { AchievementsPanel } from '../components/AchievementsPanel'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NewStoryDialog } from '../components/NewStoryDialog'
import { StoryCard } from '../components/StoryCard'
import { ThemeToggle } from '../components/ThemeToggle'
import { TopWritersPanel } from '../components/TopWritersPanel'
import { WriterNameEditor } from '../components/WriterNameEditor'
import { computeAchievements } from '../engine/achievements'
import { FILTER_LABELS, filterStories, type FilterOption } from '../engine/libraryFilter'
import { SORT_LABELS, sortStories, type SortOption } from '../engine/librarySort'
import { parseLibraryBackup, parseStoryJson } from '../engine/storySchema'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useProgressStore, type StoryProgress } from '../store/useProgressStore'
import { useRatingStore } from '../store/useRatingStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useUIStore } from '../store/useUIStore'
import { downloadJson, readJsonFile } from '../utils/file'

export function LibraryScreen() {
  const stories = useLibraryStore((s) => s.stories)
  const createStory = useLibraryStore((s) => s.createStory)
  const deleteStory = useLibraryStore((s) => s.deleteStory)
  const duplicateStory = useLibraryStore((s) => s.duplicateStory)
  const importStory = useLibraryStore((s) => s.importStory)
  const progress = useProgressStore((s) => s.progress)
  const clearProgress = useProgressStore((s) => s.clearProgress)
  const mergeProgress = useProgressStore((s) => s.mergeProgress)
  const favorites = useFavoriteStore((s) => s.favorites)
  const ratingStats = useRatingStore((s) => s.stats)
  const loadRatingStats = useRatingStore((s) => s.loadStats)
  const sort = useSettingsStore((s) => s.librarySort)
  const filter = useSettingsStore((s) => s.libraryFilter)
  const favoritesOnly = useSettingsStore((s) => s.libraryFavoritesOnly)
  const setSort = useSettingsStore((s) => s.setLibrarySort)
  const setFilter = useSettingsStore((s) => s.setLibraryFilter)
  const setFavoritesOnly = useSettingsStore((s) => s.setLibraryFavoritesOnly)
  const openEditor = useUIStore((s) => s.openEditor)
  const openPlayer = useUIStore((s) => s.openPlayer)
  const openShortcuts = useUIStore((s) => s.openShortcuts)

  const [query, setQuery] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingResetProgressId, setPendingResetProgressId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showTopWriters, setShowTopWriters] = useState(false)
  const [showNewStory, setShowNewStory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressImportRef = useRef<HTMLInputElement>(null)

  const storyIds = useMemo(() => Object.keys(stories), [stories])
  useEffect(() => {
    if (storyIds.length > 0) void loadRatingStats(storyIds)
  }, [storyIds, loadRatingStats])

  const achievements = useMemo(
    () => computeAchievements(Object.values(stories), progress),
    [stories, progress],
  )
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const ratingByStoryId = useMemo(() => {
    const result: Record<string, number> = {}
    for (const [id, s] of Object.entries(ratingStats)) {
      result[id] = s.likes * 5 + s.views
    }
    return result
  }, [ratingStats])

  const storyList = useMemo(() => {
    const q = query.toLowerCase()
    const matching = Object.values(stories).filter(
      (s) =>
        (s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.author && s.author.toLowerCase().includes(q))) &&
        (!favoritesOnly || favorites[s.id]),
    )
    const sorted = sortStories(filterStories(matching, progress, filter), sort, ratingByStoryId)
    return sorted.sort((a, b) => Number(Boolean(favorites[b.id])) - Number(Boolean(favorites[a.id])))
  }, [stories, query, sort, filter, progress, favorites, favoritesOnly, ratingByStoryId])

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

  async function handleImportProgress(file: File) {
    setError(null)
    try {
      const data = await readJsonFile(file)
      if (
        typeof data !== 'object' ||
        data === null ||
        typeof (data as Record<string, unknown>).progress !== 'object'
      ) {
        setError('Файл не является резервной копией прогресса Plotline.')
        return
      }
      mergeProgress((data as { progress: Record<string, StoryProgress> }).progress)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось импортировать прогресс.')
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
        <div className="flex items-center gap-2">
          <WriterNameEditor />
          <Button variant="ghost" onClick={() => setShowTopWriters(true)}>
            🏅 Топ авторов
          </Button>
          <Button variant="ghost" onClick={() => setShowAchievements(true)}>
            🏆 Достижения · {unlockedCount}/{achievements.length}
          </Button>
          <Button variant="ghost" onClick={openShortcuts} title="Горячие клавиши (?)" aria-label="Горячие клавиши">
            ⌨
          </Button>
          <ThemeToggle />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Поиск по названию и описанию..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            aria-label="Сортировка"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterOption)}
            aria-label="Фильтр"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {Object.entries(FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            variant={favoritesOnly ? 'secondary' : 'ghost'}
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            ★ Избранное
          </Button>
        </div>
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
          <input
            ref={progressImportRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportProgress(file)
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
          <Button
            variant="ghost"
            onClick={() => downloadJson('plotline-progress.json', { progress })}
            title="Сохранить прогресс прохождения в файл"
          >
            Сохранить прогресс
          </Button>
          <Button
            variant="ghost"
            onClick={() => progressImportRef.current?.click()}
            title="Загрузить прогресс прохождения из файла"
          >
            Загрузить прогресс
          </Button>
          <Button variant="primary" onClick={() => setShowNewStory(true)}>
            + Новая история
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          <span>
            <span aria-hidden="true">⚠ </span>
            <span>{error}</span>
          </span>
          <button onClick={() => setError(null)} aria-label="Закрыть" className="font-medium">
            ✕
          </button>
        </div>
      )}

      {storyList.length === 0 ? (
        <p className="mt-16 text-center text-sm text-slate-500 dark:text-slate-500">
          {query || filter !== 'all' || favoritesOnly ? 'Ничего не найдено.' : 'Историй пока нет — создайте первую!'}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {storyList.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onPlay={openPlayer}
              onEdit={openEditor}
              onDuplicate={duplicateStory}
              onDelete={setPendingDeleteId}
              onResetProgress={setPendingResetProgressId}
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

      {pendingResetProgressId && (
        <ConfirmDialog
          title="Сбросить прогресс?"
          message={`Посещённые сцены, найденные концовки и число прохождений «${stories[pendingResetProgressId]?.title}» будут забыты.`}
          confirmLabel="Сбросить"
          onCancel={() => setPendingResetProgressId(null)}
          onConfirm={() => {
            clearProgress(pendingResetProgressId)
            setPendingResetProgressId(null)
          }}
        />
      )}

      {showAchievements && (
        <AchievementsPanel achievements={achievements} onClose={() => setShowAchievements(false)} />
      )}

      {showTopWriters && <TopWritersPanel onClose={() => setShowTopWriters(false)} />}

      {showNewStory && (
        <NewStoryDialog
          onCancel={() => setShowNewStory(false)}
          onCreate={(title, templateId) => {
            setShowNewStory(false)
            openEditor(createStory(title, templateId))
          }}
        />
      )}
    </div>
  )
}
