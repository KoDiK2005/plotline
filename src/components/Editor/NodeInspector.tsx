import type { Story } from '../../types/story'
import { addChoice, deleteChoice, linkChoice, setStartNode, updateChoiceText, updateNode } from '../../engine/storyOps'
import { Button } from '../Button'

interface NodeInspectorProps {
  story: Story
  nodeId: string
  onUpdate: (updater: (story: Story) => Story) => void
  onClose: () => void
  onRequestDelete: () => void
}

const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ' +
  'focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

export function NodeInspector({ story, nodeId, onUpdate, onClose, onRequestDelete }: NodeInspectorProps) {
  const node = story.nodes[nodeId]
  if (!node) return null

  const isStart = story.startNodeId === nodeId
  const otherNodes = Object.values(story.nodes).filter((n) => n.id !== nodeId)

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Сцена</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          ✕
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Название
        <input
          value={node.title}
          onChange={(e) => onUpdate((s) => updateNode(s, nodeId, { title: e.target.value }))}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Текст сцены
        <textarea
          value={node.text}
          onChange={(e) => onUpdate((s) => updateNode(s, nodeId, { text: e.target.value }))}
          rows={6}
          className={`${fieldClass} resize-none`}
        />
      </label>

      <Button
        variant={isStart ? 'secondary' : 'primary'}
        disabled={isStart}
        onClick={() => onUpdate((s) => setStartNode(s, nodeId))}
      >
        {isStart ? 'Это стартовая сцена' : 'Сделать стартовой'}
      </Button>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Варианты выбора
          </h3>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() => onUpdate((s) => addChoice(s, nodeId))}
          >
            + Добавить
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {node.choices.map((choice) => (
            <div key={choice.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
              <input
                value={choice.text}
                onChange={(e) => onUpdate((s) => updateChoiceText(s, nodeId, choice.id, e.target.value))}
                placeholder="Текст варианта"
                className={`${fieldClass} mb-1.5 w-full py-1 text-xs`}
              />
              <div className="flex gap-1.5">
                <select
                  value={choice.targetNodeId ?? ''}
                  onChange={(e) => onUpdate((s) => linkChoice(s, nodeId, choice.id, e.target.value || null))}
                  className={`${fieldClass} flex-1 py-1 text-xs`}
                >
                  <option value="">— не связано —</option>
                  {otherNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title || 'Без названия'}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs text-red-500"
                  onClick={() => onUpdate((s) => deleteChoice(s, nodeId, choice.id))}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
          {node.choices.length === 0 && (
            <p className="text-xs italic text-slate-400">Нет вариантов — это концовка истории.</p>
          )}
        </div>
      </div>

      <Button variant="danger" onClick={onRequestDelete}>
        Удалить сцену
      </Button>
    </aside>
  )
}
