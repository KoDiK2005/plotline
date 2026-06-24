import type Database from 'better-sqlite3'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { openDatabase } from './db.js'

let db: Database.Database
let app: ReturnType<typeof createApp>

const validBody = { title: 'My Story', authorName: 'Ada', writerId: 'writer_1' }

beforeEach(() => {
  db = openDatabase(':memory:')
  app = createApp(db)
})

describe('GET /health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('POST /api/stories/:storyId/view', () => {
  it('records a view and returns stats', async () => {
    const res = await request(app).post('/api/stories/story_1/view').send(validBody)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ likes: 0, views: 1, likedByMe: false })
  })

  it('rejects a request missing required metadata', async () => {
    const res = await request(app).post('/api/stories/story_1/view').send({ title: 'Only title' })
    expect(res.status).toBe(400)
  })
})

describe('PUT and DELETE /api/stories/:storyId/like', () => {
  it('likes a story and reports likedByMe', async () => {
    const res = await request(app)
      .put('/api/stories/story_1/like')
      .send({ ...validBody, likerId: 'liker_a' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ likes: 1, views: 0, likedByMe: true })
  })

  it('rejects a like missing likerId', async () => {
    const res = await request(app).put('/api/stories/story_1/like').send(validBody)
    expect(res.status).toBe(400)
  })

  it('unlikes a story', async () => {
    await request(app).put('/api/stories/story_1/like').send({ ...validBody, likerId: 'liker_a' })
    const res = await request(app)
      .delete('/api/stories/story_1/like')
      .send({ likerId: 'liker_a' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ likes: 0, views: 0, likedByMe: false })
  })

  it('rejects an unlike missing likerId', async () => {
    const res = await request(app).delete('/api/stories/story_1/like').send({})
    expect(res.status).toBe(400)
  })
})

describe('GET /api/stories/stats', () => {
  it('returns batch stats for the requested ids', async () => {
    await request(app).post('/api/stories/a/view').send(validBody)
    const res = await request(app).get('/api/stories/stats').query({ ids: 'a,b' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      a: { likes: 0, views: 1, likedByMe: false },
      b: { likes: 0, views: 0, likedByMe: false },
    })
  })

  it('rejects a request missing the ids parameter', async () => {
    const res = await request(app).get('/api/stories/stats')
    expect(res.status).toBe(400)
  })
})

describe('GET /api/writers/top', () => {
  it('returns the top writers list', async () => {
    await request(app)
      .put('/api/stories/story_1/like')
      .send({ ...validBody, likerId: 'liker_a' })
    const res = await request(app).get('/api/writers/top')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { writerId: 'writer_1', authorName: 'Ada', storyCount: 1, totalLikes: 1, totalViews: 0, rating: 5 },
    ])
  })

  it('clamps an out-of-range limit', async () => {
    const res = await request(app).get('/api/writers/top').query({ limit: '999' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
