import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { openDatabase } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'plotline.db')
const port = Number(process.env.PORT ?? 8787)

const db = openDatabase(dbPath)
const app = createApp(db)

app.listen(port, () => {
  console.log(`Plotline ratings server listening on http://localhost:${port}`)
})
