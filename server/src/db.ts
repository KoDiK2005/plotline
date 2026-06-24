import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

export function openDatabase(path: string): Database.Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      story_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author_name TEXT NOT NULL,
      writer_id TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS likes (
      story_id TEXT NOT NULL,
      liker_id TEXT NOT NULL,
      PRIMARY KEY (story_id, liker_id)
    );
    CREATE INDEX IF NOT EXISTS idx_stories_writer ON stories(writer_id);
    CREATE INDEX IF NOT EXISTS idx_likes_story ON likes(story_id);
  `)
  return db
}
