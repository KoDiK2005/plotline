import { useMemo, useRef, useState } from 'react'
import type { Comparator, NodeColor, Story, VariableType } from '../../types/story'
import { countWords } from '../../engine/readingTime'
import {
  addChoice,
  deleteChoice,
  linkChoice,
  moveChoice,
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
  onDuplicate: () => void
  onJumpToNode: (nodeId: string) => void
}

const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ' +
  'focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || tags.includes(tag)) { setInput(''); return }
    onChange([...tags, tag])
    setInput('')
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Метки</span>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Удалить метку ${tag}`}
              className="ml-0.5 leading-none hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
            if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1))
          }}
          onBlur={() => { if (input.trim()) addTag(input) }}
          placeholder={tags.length === 0 ? 'Добавить метку…' : ''}
          className="min-w-[6rem] flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  )
}

export function NodeInspector({
  story,
  nodeId,
  onUpdate,
  onClose,
  onRequestDelete,
  onPreview,
  onDuplicate,
  onJumpToNode,
}: NodeInspectorProps) {
  const node = story.nodes[nodeId]
  const otherNodes = useMemo(
    () => Object.values(story.nodes).filter((n) => n.id !== nodeId),
    [story.nodes, nodeId],
  )
  const inboundCount = useMemo(
    () => Object.values(story.nodes).reduce(
      (sum, n) => sum + n.choices.filter((c) => c.targetNodeId === nodeId).length,
      0,
    ),
    [story.nodes, nodeId],
  )
  if (!node) return null

  const isStart = story.startNodeId === nodeId

  function variableType(variableId: string): VariableType {
    return story.variables.find((v) => v.id === variableId)?.type ?? 'number'
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Сцена</h2>
          {inboundCount > 0 && (
            <span
              title={`На эту сцену ведут переходы из ${inboundCount} ${inboundCount === 1 ? 'варианта' : 'вариантов'}`}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              ← {inboundCount}
            </span>
          )}
        </div>
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
        <span className="flex items-center justify-between">
          Текст сцены
          <span className="flex items-center gap-1.5">
            {node.text.trim() && (
              <span className="font-normal text-slate-400 dark:text-slate-500">
                {countWords(node.text)} сл.
              </span>
            )}
            {node.text.trim() && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(node.text)}
                title="Скопировать текст сцены"
                aria-label="Скопировать текст сцены"
                className="font-normal text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
              >
                ⎘
              </button>
            )}
          </span>
        </span>
        <textarea
          value={node.text}
          onChange={(e) => onUpdate((s) => updateNode(s, nodeId, { text: e.target.value }))}
          rows={6}
          className={`${fieldClass} resize-none`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Заметки автора <span className="font-normal italic text-slate-400">(видны только вам, не игроку)</span>
        <textarea
          value={node.notes}
          onChange={(e) => onUpdate((s) => updateNode(s, nodeId, { notes: e.target.value }))}
          rows={3}
          placeholder="Идеи, планы по сюжету, TODO..."
          className={`${fieldClass} resize-none border-dashed`}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Цвет метки</span>
        <div className="flex items-center gap-1.5">
          {([undefined, 'violet', 'blue', 'green', 'amber', 'red'] as (NodeColor | undefined)[]).map((c) => (
            <button
              key={c ?? 'none'}
              onClick={() => onUpdate((s) => updateNode(s, nodeId, { color: c }))}
              title={c ?? 'Нет'}
              aria-label={c ?? 'Нет цвета'}
              aria-pressed={node.color === c}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                node.color === c ? 'border-slate-700 dark:border-slate-200' : 'border-transparent'
              } ${
                c === undefined
                  ? 'bg-slate-200 dark:bg-slate-700'
                  : c === 'violet'
                    ? 'bg-violet-400'
                    : c === 'blue'
                      ? 'bg-blue-400'
                      : c === 'green'
                        ? 'bg-emerald-400'
                        : c === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
              }`}
            />
          ))}
        </div>
      </div>

      <TagEditor
        tags={node.tags ?? []}
        onChange={(tags) => onUpdate((s) => updateNode(s, nodeId, { tags }))}
      />

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
        <Button variant="ghost" onClick={onDuplicate} title="Создать копию этой сцены">
          ⧉ Дублировать
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
          {node.choices.map((choice, index) => (
            <div key={choice.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
              <div className="mb-1.5 flex items-center gap-1">
                <div className="flex shrink-0 flex-col">
                  <button
                    onClick={() => onUpdate((s) => moveChoice(s, nodeId, choice.id, 'up'))}
                    disabled={index === 0}
                    aria-label="Переместить вариант выше"
                    title="Переместить выше"
                    className="leading-none text-slate-400 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-violet-400"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onUpdate((s) => moveChoice(s, nodeId, choice.id, 'down'))}
                    disabled={index === node.choices.length - 1}
                    aria-label="Переместить вариант ниже"
                    title="Переместить ниже"
                    className="leading-none text-slate-400 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-violet-400"
                  >
                    ▼
                  </button>
                </div>
                <input
                  value={choice.text}
                  onChange={(e) => onUpdate((s) => updateChoiceText(s, nodeId, choice.id, e.target.value))}
                  placeholder="Текст варианта"
                  aria-label="Текст варианта"
                  className={`${fieldClass} w-full py-1 text-xs`}
                />
              </div>
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
                {choice.targetNodeId && (
                  <button
                    onClick={() => onJumpToNode(choice.targetNodeId!)}
                    aria-label="Перейти к связанной сцене"
                    title="Перейти к связанной сцене"
                    className="px-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
                  >
                    →
                  </button>
                )}
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
                      onChange={(e) => {
                        const newVariableId = e.target.value
                        if (!newVariableId) {
                          onUpdate((s) => setChoiceCondition(s, nodeId, choice.id, null))
                          return
                        }
                        const isBoolean = variableType(newVariableId) === 'boolean'
                        onUpdate((s) =>
                          setChoiceCondition(s, nodeId, choice.id, {
                            variableId: newVariableId,
                            comparator: isBoolean ? 'eq' : 'gte',
                            value: 1,
                          }),
                        )
                      }}
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
                      variableType(choice.condition.variableId) === 'boolean' ? (
                        <select
                          value={choice.condition.value ? '1' : '0'}
                          onChange={(e) =>
                            onUpdate((s) =>
                              setChoiceCondition(s, nodeId, choice.id, {
                                ...choice.condition!,
                                comparator: 'eq',
                                value: Number(e.target.value),
                              }),
                            )
                          }
                          aria-label="Значение условия"
                          className={`${fieldClass} py-1 text-xs`}
                        >
                          <option value="1">Да</option>
                          <option value="0">Нет</option>
                        </select>
                      ) : (
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
                      )
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
                    {choice.effects.map((effect, index) => {
                      const isBoolean = variableType(effect.variableId) === 'boolean'
                      return (
                        <div key={index} className="flex items-center gap-1 text-xs">
                          <select
                            value={effect.variableId}
                            onChange={(e) => {
                              const newVariableId = e.target.value
                              const becomesBoolean = variableType(newVariableId) === 'boolean'
                              onUpdate((s) =>
                                setChoiceEffects(
                                  s,
                                  nodeId,
                                  choice.id,
                                  choice.effects.map((eff, i) =>
                                    i === index
                                      ? {
                                          ...eff,
                                          variableId: newVariableId,
                                          op: becomesBoolean ? 'set' : eff.op,
                                          value: becomesBoolean ? (eff.value ? 1 : 0) : eff.value,
                                        }
                                      : eff,
                                  ),
                                ),
                              )
                            }}
                            aria-label="Переменная эффекта"
                            className={`${fieldClass} flex-1 py-1 text-xs`}
                          >
                            {story.variables.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                          {isBoolean ? (
                            <select
                              value={effect.value ? '1' : '0'}
                              onChange={(e) =>
                                onUpdate((s) =>
                                  setChoiceEffects(
                                    s,
                                    nodeId,
                                    choice.id,
                                    choice.effects.map((eff, i) =>
                                      i === index ? { ...eff, op: 'set', value: Number(e.target.value) } : eff,
                                    ),
                                  ),
                                )
                              }
                              aria-label="Значение эффекта"
                              className={`${fieldClass} py-1 text-xs`}
                            >
                              <option value="1">Да</option>
                              <option value="0">Нет</option>
                            </select>
                          ) : (
                            <>
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
                            </>
                          )}
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
                      )
                    })}
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
