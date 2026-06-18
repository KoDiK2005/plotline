import { useSettingsStore } from '../store/useSettingsStore'

export function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  )
}
