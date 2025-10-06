import { Request, Response, NextFunction } from 'express'
import { getDb } from '../db/database.js'
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
    .prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1')
    .get(keyHash) as { id: number; key_hash: string } | undefined

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
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(apiKey.id)

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
