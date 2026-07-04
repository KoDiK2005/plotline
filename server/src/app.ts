import cors from 'cors'
import express, { type Request, type Response, type NextFunction } from 'express'
import type Database from 'better-sqlite3'
import { getBatchStats, getTopWriters, likeStory, recordView, unlikeStory, type StoryMeta } from './ratingsRepository.js'

function parseStoryMeta(storyId: unknown, body: unknown): StoryMeta | null {
  if (typeof storyId !== 'string' || storyId.length === 0) return null
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (typeof b.title !== 'string' || typeof b.authorName !== 'string' || typeof b.writerId !== 'string') {
    return null
  }
  if (b.title.length === 0 || b.authorName.length === 0 || b.writerId.length === 0) return null
  return { storyId, title: b.title, authorName: b.authorName, writerId: b.writerId }
}

interface RateBucket { count: number; resetAt: number }

function makeRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, RateBucket>()

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? 'unknown'
    const key = `${ip}:${req.method}:${req.path}`
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests, please try again later.' })
      return
    }
    bucket.count++
    next()
  }
}

export function createApp(db: Database.Database) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  const viewLimiter = makeRateLimiter(30, 60_000)
  const likeLimiter = makeRateLimiter(60, 60_000)

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true })
  })

  app.post('/api/stories/:storyId/view', viewLimiter, (req: Request, res: Response) => {
    const meta = parseStoryMeta(req.params.storyId, req.body)
    if (!meta) {
      res.status(400).json({ error: 'title, authorName and writerId are required' })
      return
    }
    res.json(recordView(db, meta))
  })

  app.put('/api/stories/:storyId/like', likeLimiter, (req: Request, res: Response) => {
    const meta = parseStoryMeta(req.params.storyId, req.body)
    const likerId = typeof (req.body as Record<string, unknown>)?.likerId === 'string'
      ? (req.body as Record<string, unknown>).likerId as string
      : null
    if (!meta || !likerId) {
      res.status(400).json({ error: 'title, authorName, writerId and likerId are required' })
      return
    }
    res.json(likeStory(db, meta, likerId))
  })

  app.delete('/api/stories/:storyId/like', likeLimiter, (req: Request, res: Response) => {
    const storyId = req.params.storyId
    const likerId = typeof (req.body as Record<string, unknown>)?.likerId === 'string'
      ? (req.body as Record<string, unknown>).likerId as string
      : null
    if (typeof storyId !== 'string' || storyId.length === 0 || !likerId) {
      res.status(400).json({ error: 'likerId is required' })
      return
    }
    res.json(unlikeStory(db, storyId, likerId))
  })

  app.get('/api/stories/stats', (req: Request, res: Response) => {
    const idsParam = req.query.ids
    if (typeof idsParam !== 'string' || idsParam.length === 0) {
      res.status(400).json({ error: 'ids query parameter is required' })
      return
    }
    const storyIds = idsParam.split(',').filter((id) => id.length > 0)
    const likerId = typeof req.query.likerId === 'string' ? req.query.likerId : undefined
    res.json(getBatchStats(db, storyIds, likerId))
  })

  app.get('/api/writers/top', (req: Request, res: Response) => {
    const rawLimit = Number(req.query.limit ?? 20)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.trunc(rawLimit)), 100) : 20
    res.json(getTopWriters(db, limit))
  })

  return app
}
