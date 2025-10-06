import { getDb } from './database.js'
import { hashApiKey } from '../middleware/auth.js'
import { config } from '../config.js'

console.log('Running database migrations...')

const db = getDb()

// Migrations are automatically run in database.ts
console.log('✅ Schema migrations complete')

// Seed default API key for development
const defaultKey = config.auth.defaultApiKey
const { hash, prefix } = {
  hash: hashApiKey(defaultKey),
  prefix: defaultKey.substring(0, 8),
}

const existing = db.getDatabase().prepare('SELECT id FROM api_keys WHERE key_hash = ?').get(hash)

if (!existing) {
  db.getDatabase()
    .prepare('INSERT INTO api_keys (key_hash, key_prefix) VALUES (?, ?)')
    .run(hash, prefix)
  console.log('✅ Default API key created:', prefix + '...')
} else {
  console.log('✅ Default API key already exists')
}

db.close()
console.log('✅ Migration complete')
