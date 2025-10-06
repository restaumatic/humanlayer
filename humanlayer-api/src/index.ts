import express from 'express'
import { validateConfig } from './config.js'
import { requestLogger } from './middleware/logging.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authenticateToken } from './middleware/auth.js'
import functionCallRoutes from './routes/functionCalls.js'
import contactRoutes from './routes/contacts.js'
import slackRoutes from './routes/slack.js'
import { getDb } from './db/database.js'

// Validate configuration
validateConfig()

// Initialize database
getDb()

export function createApp() {
  const app = express()

  // Global middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true })) // For Slack form-encoded payloads
  app.use(requestLogger)

  // Health check (no auth required)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    })
  })

  // Slack webhook (no auth required - uses signature verification)
  app.use('/slack', slackRoutes)

  // API routes with authentication
  const apiRouter = express.Router()
  apiRouter.use(authenticateToken)

  // Mount route groups
  apiRouter.use('/function_calls', functionCallRoutes)
  apiRouter.use('/contact_requests', contactRoutes)

  // Also mount agent routes (different path structure)
  apiRouter.use('/agent/function_calls', functionCallRoutes)
  apiRouter.use('/agent/human_contacts', contactRoutes)

  // Mount API router under versioned path
  app.use('/humanlayer/v1', apiRouter)

  // Error handling (must be last)
  app.use(errorHandler)

  return app
}

export default createApp()
