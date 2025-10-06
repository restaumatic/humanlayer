import { config } from './config.js'
import app from './index.js'
import { getDb } from './db/database.js'

const db = getDb()

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
