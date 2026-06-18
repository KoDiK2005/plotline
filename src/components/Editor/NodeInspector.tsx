import type { Comparator, Story } from '../../types/story'
import {
  addChoice,
  deleteChoice,
  linkChoice,
  setChoiceCondition,
  setChoiceEffects,
  setStartNode,
  updateChoiceText,
  updateNode,
} from '../../engine/storyOps'
import { Button } from '../Button'

const COMPARATOR_LABELS: Record<Comparator, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
}

interface NodeInspectorProps {
  story: Story
  nodeId: string
  onUpdate: (updater: (story: Story) => Story) => void
  onClose: () => void
  onRequestDelete: () => void
  onPreview: () => void
}

const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ' +
  'focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

export function NodeInspector({ story, nodeId, onUpdate, onClose, onRequestDelete, onPreview }: NodeInspectorProps) {
  const node = story.nodes[nodeId]
  if (!node) return null

  const isStart = story.startNodeId === nodeId
  const otherNodes = Object.values(story.nodes).filter((n) => n.id !== nodeId)

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Сцена</h2>
        <button
          onClick={onClose}
          aria-label="Закрыть панель сцены"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
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

      <div className="flex gap-2">
        <Button
          variant={isStart ? 'secondary' : 'primary'}
          disabled={isStart}
          className="flex-1"
          onClick={() => onUpdate((s) => setStartNode(s, nodeId))}
        >
          {isStart ? 'Это стартовая сцена' : 'Сделать стартовой'}
        </Button>
        <Button variant="ghost" onClick={onPreview} title="Проверить эту сцену в плеере">
          ▶ Превью
        </Button>
      </div>

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
                aria-label="Текст варианта"
                className={`${fieldClass} mb-1.5 w-full py-1 text-xs`}
              />
              <div className="flex gap-1.5">
                <select
                  value={choice.targetNodeId ?? ''}
                  onChange={(e) => onUpdate((s) => linkChoice(s, nodeId, choice.id, e.target.value || null))}
                  aria-label="Связанная сцена"
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
                  aria-label="Удалить вариант"
                >
                  ✕
                </Button>
              </div>

              {story.variables.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-14 shrink-0 text-[10px] uppercase text-slate-400">Условие</span>
                    <select
                      value={choice.condition?.variableId ?? ''}
                      onChange={(e) =>
                        onUpdate((s) =>
                          setChoiceCondition(
                            s,
                            nodeId,
                            choice.id,
                            e.target.value ? { variableId: e.target.value, comparator: 'gte', value: 1 } : null,
                          ),
                        )
                      }
                      aria-label="Переменная условия"
                      className={`${fieldClass} flex-1 py-1 text-xs`}
                    >
                      <option value="">— нет —</option>
                      {story.variables.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    {choice.condition && (
                      <>
                        <select
                          value={choice.condition.comparator}
                          onChange={(e) =>
                            onUpdate((s) =>
                              setChoiceCondition(s, nodeId, choice.id, {
                                ...choice.condition!,
                                comparator: e.target.value as Comparator,
                              }),
                            )
                          }
                          aria-label="Сравнение"
                          className={`${fieldClass} py-1 text-xs`}
                        >
                          {Object.entries(COMPARATOR_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={choice.condition.value}
                          onChange={(e) =>
                            onUpdate((s) =>
                              setChoiceCondition(s, nodeId, choice.id, {
                                ...choice.condition!,
                                value: Number(e.target.value) || 0,
                              }),
                            )
                          }
                          aria-label="Значение условия"
                          className={`${fieldClass} w-14 py-1 text-xs`}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase text-slate-400">Эффекты</span>
                      <button
                        onClick={() =>
                          onUpdate((s) =>
                            setChoiceEffects(s, nodeId, choice.id, [
                              ...choice.effects,
                              { variableId: story.variables[0].id, op: 'set', value: 1 },
                            ]),
                          )
                        }
                        className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                      >
                        + эффект
                      </button>
                    </div>
                    {choice.effects.map((effect, index) => (
                      <div key={index} className="flex items-center gap-1 text-xs">
                        <select
                          value={effect.variableId}
                          onChange={(e) =>
                            onUpdate((s) =>
                              setChoiceEffects(
                                s,
                                nodeId,
                                choice.id,
                                choice.effects.map((eff, i) =>
                                  i === index ? { ...eff, variableId: e.target.value } : eff,
                                ),
                              ),
                            )
                          }
                          aria-label="Переменная эффекта"
                          className={`${fieldClass} flex-1 py-1 text-xs`}
                        >
                          {story.variables.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={effect.op}
                          onChange={(e) =>
                            onUpdate((s) =>
                              setChoiceEffects(
                                s,
                                nodeId,
                                choice.id,
                                choice.effects.map((eff, i) =>
                                  i === index ? { ...eff, op: e.target.value as 'set' | 'add' } : eff,
                                ),
                              ),
                            )
                          }
                          aria-label="Операция эффекта"
                          className={`${fieldClass} py-1 text-xs`}
                        >
                          <option value="set">=</option>
                          <option value="add">+=</option>
                        </select>
                        <input
                          type="number"
                          value={effect.value}
                          onChange={(e) =>
                            onUpdate((s) =>
                              setChoiceEffects(
                                s,
                                nodeId,
                                choice.id,
                                choice.effects.map((eff, i) =>
                                  i === index ? { ...eff, value: Number(e.target.value) || 0 } : eff,
                                ),
                              ),
                            )
                          }
                          aria-label="Значение эффекта"
                          className={`${fieldClass} w-14 py-1 text-xs`}
                        />
                        <button
                          onClick={() =>
                            onUpdate((s) =>
                              setChoiceEffects(s, nodeId, choice.id, choice.effects.filter((_, i) => i !== index)),
                            )
                          }
                          aria-label="Удалить эффект"
                          className="px-1 text-red-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
