import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as schema from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class DatabaseConnection {
  private sqlite: Database.Database
  private db: BetterSQLite3Database<typeof schema>

  constructor(dbPath: string) {
    this.sqlite = new Database(dbPath)
    this.sqlite.pragma('journal_mode = WAL')
    this.sqlite.pragma('foreign_keys = ON')
    this.db = drizzle(this.sqlite, { schema })
  }

  getDatabase(): BetterSQLite3Database<typeof schema> {
    return this.db
  }

  getSqlite(): Database.Database {
    return this.sqlite
  }

  runMigrations(): void {
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql')
    const migration = readFileSync(migrationPath, 'utf-8')
    this.sqlite.exec(migration)
  }

  close(): void {
    this.sqlite.close()
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null

export function getDb(): DatabaseConnection {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_PATH || './data/humanlayer.db'
    dbInstance = new DatabaseConnection(dbPath)
    dbInstance.runMigrations()
  }
  return dbInstance
}
