import { useEffect } from 'react'
import { EditorScreen } from './screens/EditorScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { PlayerScreen } from './screens/PlayerScreen'
import { useSettingsStore } from './store/useSettingsStore'
import { useUIStore } from './store/useUIStore'

function App() {
  const view = useUIStore((s) => s.view)
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {view === 'library' && <LibraryScreen />}
      {view === 'editor' && <EditorScreen />}
      {view === 'player' && <PlayerScreen />}
    </div>
  )
}

export default App
