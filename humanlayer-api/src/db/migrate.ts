import { eq } from 'drizzle-orm'
import { getDb } from './database.js'
import { apiKeys } from './schema.js'
import { hashApiKey } from '../middleware/auth.js'
import { config } from '../config.js'

console.log('Running database migrations...')

const db = getDb()

// Migrations are automatically run in database.ts
console.log('✅ Schema migrations complete')

// Seed default API key for development
const defaultKey = config.auth.defaultApiKey
const hash = hashApiKey(defaultKey)
const prefix = defaultKey.substring(0, 8)

const existing = db.getDatabase().select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).get()

if (!existing) {
  db.getDatabase()
    .insert(apiKeys)
    .values({
      keyHash: hash,
      keyPrefix: prefix,
    })
    .run()
  console.log('✅ Default API key created:', prefix + '...')
} else {
  console.log('✅ Default API key already exists')
}

db.close()
console.log('✅ Migration complete')
