import type { Story } from '../types/story'
import { getStoryStats } from './traverse'

export interface ProgressSnapshot {
  visitedNodeIds: string[]
  discoveredEndingIds: string[]
  playCount: number
}

export interface AchievementStatus {
  id: string
  title: string
  description: string
  unlocked: boolean
}

interface AchievementContext {
  stories: Story[]
  progress: Record<string, ProgressSnapshot>
}

interface Achievement {
  id: string
  title: string
  description: string
  isUnlocked: (ctx: AchievementContext) => boolean
}

const emptySnapshot: ProgressSnapshot = { visitedNodeIds: [], discoveredEndingIds: [], playCount: 0 }

function progressFor(ctx: AchievementContext, storyId: string): ProgressSnapshot {
  return ctx.progress[storyId] ?? emptySnapshot
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    title: 'Первые шаги',
    description: 'Дойдите до любой концовки в любой истории.',
    isUnlocked: (ctx) => ctx.stories.some((s) => progressFor(ctx, s.id).discoveredEndingIds.length > 0),
  },
  {
    id: 'collector',
    title: 'Коллекционер',
    description: 'Найдите все концовки одной истории.',
    isUnlocked: (ctx) =>
      ctx.stories.some((s) => {
        const total = getStoryStats(s).endingCount
        return total > 0 && progressFor(ctx, s.id).discoveredEndingIds.length >= total
      }),
  },
  {
    id: 'completionist',
    title: 'Перфекционист',
    description: 'Найдите все концовки во всех историях библиотеки.',
    isUnlocked: (ctx) =>
      ctx.stories.length > 0 &&
      ctx.stories.every((s) => {
        const total = getStoryStats(s).endingCount
        return total === 0 || progressFor(ctx, s.id).discoveredEndingIds.length >= total
      }),
  },
  {
    id: 'author',
    title: 'Автор',
    description: 'Создайте свою собственную историю.',
    isUnlocked: (ctx) => ctx.stories.some((s) => !s.id.startsWith('sample_')),
  },
  {
    id: 'architect',
    title: 'Архитектор',
    description: 'Постройте историю из 10 и более сцен.',
    isUnlocked: (ctx) => ctx.stories.some((s) => getStoryStats(s).nodeCount >= 10),
  },
  {
    id: 'veteran',
    title: 'Ветеран',
    description: 'Запустите истории на прохождение суммарно 10 раз.',
    isUnlocked: (ctx) => Object.values(ctx.progress).reduce((sum, p) => sum + p.playCount, 0) >= 10,
  },
  {
    id: 'explorer',
    title: 'Исследователь',
    description: 'Посетите суммарно 20 сцен (с учётом повторов между историями).',
    isUnlocked: (ctx) => Object.values(ctx.progress).reduce((sum, p) => sum + p.visitedNodeIds.length, 0) >= 20,
  },
]

export function computeAchievements(
  stories: Story[],
  progress: Record<string, ProgressSnapshot>,
): AchievementStatus[] {
  const ctx: AchievementContext = { stories, progress }
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    unlocked: a.isUnlocked(ctx),
  }))
}
