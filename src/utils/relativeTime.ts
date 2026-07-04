/** Returns a human-readable Russian relative time string for a past timestamp (ms). */
export function relativeTime(ts: number): string {
  if (!ts) return ''
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'только что'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин. назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч. назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн. назад`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} нед. назад`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} мес. назад`
  return `${Math.floor(months / 12)} г. назад`
}
