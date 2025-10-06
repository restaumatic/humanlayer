import { Request, Response, NextFunction } from 'express'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/database.js'
import { apiKeys } from '../db/schema.js'
import crypto from 'crypto'

export interface AuthenticatedRequest extends Request {
  apiKey?: string
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header',
      },
    })
    return
  }

  // Validate token
  const keyHash = hashApiKey(token)
  const db = getDb().getDatabase()
  const apiKey = db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .get()

  if (!apiKey) {
    res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
      },
    })
    return
  }

  // Update last_used_at
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .run()

  req.apiKey = token
  next()
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function createApiKey(prefix: string = 'sk-'): {
  key: string
  hash: string
  prefix: string
} {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const key = `${prefix}${randomBytes}`
  const hash = hashApiKey(key)
  const keyPrefix = key.substring(0, 8)

  return { key, hash, prefix: keyPrefix }
}
