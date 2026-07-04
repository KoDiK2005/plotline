import type Database from 'better-sqlite3'

export interface StoryMeta {
  storyId: string
  title: string
  authorName: string
  writerId: string
}

export interface StoryStats {
  likes: number
  views: number
  likedByMe: boolean
}

export interface TopWriter {
  writerId: string
  authorName: string
  storyCount: number
  totalLikes: number
  totalViews: number
  rating: number
}

// Likes count more than a single view: ten reads are worth less than one
// reader caring enough to press the heart.
const LIKE_WEIGHT = 5

function rating(likes: number, views: number): number {
  return likes * LIKE_WEIGHT + views
}

function upsertStoryMeta(db: Database.Database, meta: StoryMeta): void {
  db.prepare(
    `INSERT INTO stories (story_id, title, author_name, writer_id, views, updated_at)
     VALUES (?, ?, ?, ?, 0, ?)
     ON CONFLICT(story_id) DO UPDATE SET
       title = excluded.title,
       author_name = excluded.author_name,
       writer_id = excluded.writer_id,
       updated_at = excluded.updated_at`,
  ).run(meta.storyId, meta.title, meta.authorName, meta.writerId, Date.now())
}

export function getStats(db: Database.Database, storyId: string, likerId?: string): StoryStats {
  const story = db.prepare('SELECT views FROM stories WHERE story_id = ?').get(storyId) as
    | { views: number }
    | undefined
  const { likes } = db.prepare('SELECT COUNT(*) AS likes FROM likes WHERE story_id = ?').get(storyId) as {
    likes: number
  }
  const likedByMe = Boolean(
    likerId &&
      db.prepare('SELECT 1 FROM likes WHERE story_id = ? AND liker_id = ?').get(storyId, likerId),
  )
  return { likes, views: story?.views ?? 0, likedByMe }
}

export function getBatchStats(
  db: Database.Database,
  storyIds: string[],
  likerId?: string,
): Record<string, StoryStats> {
  const result: Record<string, StoryStats> = {}
  for (const storyId of storyIds) {
    result[storyId] = { likes: 0, views: 0, likedByMe: false }
  }
  if (storyIds.length === 0) return result

  const placeholders = storyIds.map(() => '?').join(',')

  const viewRows = db
    .prepare(`SELECT story_id AS storyId, views FROM stories WHERE story_id IN (${placeholders})`)
    .all(...storyIds) as { storyId: string; views: number }[]
  for (const row of viewRows) result[row.storyId].views = row.views

  const likeRows = db
    .prepare(
      `SELECT story_id AS storyId, COUNT(*) AS likes FROM likes WHERE story_id IN (${placeholders}) GROUP BY story_id`,
    )
    .all(...storyIds) as { storyId: string; likes: number }[]
  for (const row of likeRows) result[row.storyId].likes = row.likes

  if (likerId) {
    const likedRows = db
      .prepare(`SELECT story_id AS storyId FROM likes WHERE liker_id = ? AND story_id IN (${placeholders})`)
      .all(likerId, ...storyIds) as { storyId: string }[]
    for (const row of likedRows) result[row.storyId].likedByMe = true
  }

  return result
}

export function recordView(db: Database.Database, meta: StoryMeta): StoryStats {
  const txn = db.transaction((m: StoryMeta) => {
    upsertStoryMeta(db, m)
    db.prepare('UPDATE stories SET views = views + 1 WHERE story_id = ?').run(m.storyId)
  })
  txn(meta)
  return getStats(db, meta.storyId)
}

export function likeStory(db: Database.Database, meta: StoryMeta, likerId: string): StoryStats {
  const txn = db.transaction((m: StoryMeta) => {
    upsertStoryMeta(db, m)
    db.prepare('INSERT OR IGNORE INTO likes (story_id, liker_id) VALUES (?, ?)').run(m.storyId, likerId)
  })
  txn(meta)
  return getStats(db, meta.storyId, likerId)
}

export function unlikeStory(db: Database.Database, storyId: string, likerId: string): StoryStats {
  db.prepare('DELETE FROM likes WHERE story_id = ? AND liker_id = ?').run(storyId, likerId)
  return getStats(db, storyId, likerId)
}

export function getTopWriters(db: Database.Database, limit: number): TopWriter[] {
  const aggregates = db
    .prepare(
      `SELECT s.writer_id AS writerId,
              COUNT(*) AS storyCount,
              SUM(s.views) AS totalViews,
              COALESCE(SUM(lc.cnt), 0) AS totalLikes
       FROM stories s
       LEFT JOIN (SELECT story_id, COUNT(*) AS cnt FROM likes GROUP BY story_id) lc
         ON lc.story_id = s.story_id
       GROUP BY s.writer_id`,
    )
    .all() as { writerId: string; storyCount: number; totalViews: number; totalLikes: number }[]

  const latestNames = db
    .prepare(
      `SELECT writer_id AS writerId, author_name AS authorName
       FROM stories s
       WHERE updated_at = (SELECT MAX(updated_at) FROM stories WHERE writer_id = s.writer_id)`,
    )
    .all() as { writerId: string; authorName: string }[]
  const nameByWriterId = new Map(latestNames.map((row) => [row.writerId, row.authorName]))

  return aggregates
    .map((row) => ({
      writerId: row.writerId,
      authorName: nameByWriterId.get(row.writerId) ?? '',
      storyCount: row.storyCount,
      totalLikes: row.totalLikes,
      totalViews: row.totalViews,
      rating: rating(row.totalLikes, row.totalViews),
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
}
