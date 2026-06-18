interface StatPillProps {
  label: string
  value: number | string
  tone?: 'neutral' | 'warning'
}

export function StatPill({ label, value, tone = 'neutral' }: StatPillProps) {
  const toneClass =
    tone === 'warning'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${toneClass}`}>
      <span className="font-semibold">{value}</span>
      {label}
    </span>
  )
}
