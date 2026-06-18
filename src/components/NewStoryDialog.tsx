import { useId, useState } from 'react'
import { TEMPLATES, type TemplateId } from '../engine/templates'
import { useDialogA11y } from '../hooks/useDialogA11y'
import { Button } from './Button'

interface NewStoryDialogProps {
  onCreate: (title: string, templateId: TemplateId) => void
  onCancel: () => void
}

export function NewStoryDialog({ onCreate, onCancel }: NewStoryDialogProps) {
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState<TemplateId>('blank')
  const titleId = useId()
  const dialogRef = useDialogA11y(onCancel)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onCreate(title.trim() || 'Новая история', templateId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <form
        ref={dialogRef as React.RefObject<HTMLFormElement>}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-5 shadow-xl outline-none dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Новая история
        </h2>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Название
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Новая история"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Шаблон</span>
          {TEMPLATES.map((template) => (
            <label
              key={template.id}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition-colors ${
                templateId === template.id
                  ? 'border-violet-500 bg-violet-500/5'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="template"
                value={template.id}
                checked={templateId === template.id}
                onChange={() => setTemplateId(template.id)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-slate-900 dark:text-slate-100">{template.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{template.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            Создать
          </Button>
        </div>
      </form>
    </div>
  )
}
