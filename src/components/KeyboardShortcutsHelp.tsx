import { useId } from 'react'
import { useDialogA11y } from '../hooks/useDialogA11y'
import { Button } from './Button'

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string; description: string }[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Везде',
    shortcuts: [
      { keys: '?', description: 'Открыть эту справку' },
      { keys: 'Esc', description: 'Закрыть диалог или панель' },
    ],
  },
  {
    title: 'Редактор',
    shortcuts: [
      { keys: 'Ctrl/⌘ + Z', description: 'Отменить последнее изменение' },
      { keys: 'Ctrl/⌘ + Shift + Z, Ctrl/⌘ + Y', description: 'Повторить отменённое изменение' },
    ],
  },
  {
    title: 'Плеер',
    shortcuts: [{ keys: '1–9', description: 'Выбрать вариант под этим номером' }],
  },
]

interface KeyboardShortcutsHelpProps {
  onClose: () => void
}

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  const titleId = useId()
  const dialogRef = useDialogA11y(onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl outline-none dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Горячие клавиши
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                {group.title}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {group.shortcuts.map((s) => (
                  <li key={s.keys} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{s.description}</span>
                    <kbd className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {s.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  )
}
