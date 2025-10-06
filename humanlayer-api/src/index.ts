import express from 'express'
import { config, validateConfig } from './config.js'
import { requestLogger } from './middleware/logging.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authenticateToken } from './middleware/auth.js'
import functionCallRoutes from './routes/functionCalls.js'
import contactRoutes from './routes/contacts.js'
import { getDb } from './db/database.js'

// Validate configuration
validateConfig()

// Initialize database
const db = getDb()

const app = express()

// Global middleware
app.use(express.json())
app.use(requestLogger)

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

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

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  console.log(
    `🚀 HumanLayer API server running at http://${config.server.host}:${config.server.port}`
  )
  console.log(`📊 Health check: http://${config.server.host}:${config.server.port}/health`)
  console.log(`🔗 API base: http://${config.server.host}:${config.server.port}/humanlayer/v1`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    db.close()
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    db.close()
    process.exit(0)
  })
})

export default app
