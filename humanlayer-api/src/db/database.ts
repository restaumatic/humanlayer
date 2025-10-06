import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class DatabaseConnection {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  getDatabase(): Database.Database {
    return this.db
  }

  runMigrations(): void {
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql')
    const migration = readFileSync(migrationPath, 'utf-8')
    this.db.exec(migration)
  }

  close(): void {
    this.db.close()
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
