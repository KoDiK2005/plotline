import { useWriterStore } from '../store/useWriterStore'

export function WriterNameEditor() {
  const displayName = useWriterStore((s) => s.displayName)
  const setDisplayName = useWriterStore((s) => s.setDisplayName)

  return (
    <input
      type="text"
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      aria-label="Имя автора"
      title="Имя, под которым ваши истории видны в общем рейтинге"
      placeholder="Аноним"
      className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    />
  )
}
