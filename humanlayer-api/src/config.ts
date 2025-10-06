import dotenv from 'dotenv'

dotenv.config()

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/humanlayer.db',
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
  },
  auth: {
    // For development/testing
    defaultApiKey: process.env.DEFAULT_API_KEY || 'sk-test-key',
  },
} as const

export function validateConfig(): void {
  if (!config.slack.botToken) {
    console.warn('WARNING: SLACK_BOT_TOKEN not set - Slack integration will fail')
  }
}
