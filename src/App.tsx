import { useEffect } from 'react'
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp'
import { EditorScreen } from './screens/EditorScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { PlayerScreen } from './screens/PlayerScreen'
import { useSettingsStore } from './store/useSettingsStore'
import { useUIStore } from './store/useUIStore'

function App() {
  const view = useUIStore((s) => s.view)
  const showShortcuts = useUIStore((s) => s.showShortcuts)
  const openShortcuts = useUIStore((s) => s.openShortcuts)
  const closeShortcuts = useUIStore((s) => s.closeShortcuts)
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.key === '?') openShortcuts()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openShortcuts])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {view === 'library' && <LibraryScreen />}
      {view === 'editor' && <EditorScreen />}
      {view === 'player' && <PlayerScreen />}
      {showShortcuts && <KeyboardShortcutsHelp onClose={closeShortcuts} />}
    </div>
  )
}

export default App
