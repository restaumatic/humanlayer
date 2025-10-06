import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { config } from '../config.js'
import { FunctionCallService } from '../services/functionCallService.js'
import { HumanContactService } from '../services/humanContactService.js'
import { getDb } from '../db/database.js'
import { FunctionCallRepository } from '../db/repositories/functionCallRepository.js'
import { HumanContactRepository } from '../db/repositories/humanContactRepository.js'
import { ChannelService } from '../services/channelService.js'

const router = Router()

// Initialize services
const db = getDb().getDatabase()
const functionCallRepo = new FunctionCallRepository(db)
const humanContactRepo = new HumanContactRepository(db)
const channelService = new ChannelService()
const functionCallService = new FunctionCallService(functionCallRepo, channelService)
const humanContactService = new HumanContactService(humanContactRepo, channelService)

/**
 * Verify Slack request signature
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackSignature(req: Request, rawBody: string): boolean {
  const signingSecret = config.slack.signingSecret
  if (!signingSecret) {
    console.warn('[Slack] No signing secret configured - skipping signature verification')
    return true // Allow in development
  }

  const slackSignature = req.headers['x-slack-signature'] as string
  const slackTimestamp = req.headers['x-slack-request-timestamp'] as string

  if (!slackSignature || !slackTimestamp) {
    return false
  }

  // Reject old requests (> 5 minutes)
  const timestamp = parseInt(slackTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 300) {
    return false
  }

  // Build signature base string using raw body
  const sigBaseString = `v0:${slackTimestamp}:${rawBody}`
  const hmac = crypto.createHmac('sha256', signingSecret)
  const computedSignature = 'v0=' + hmac.update(sigBaseString).digest('hex')

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(slackSignature)
  )
}

/**
 * POST /slack/interactions
 * Handle Slack interactive component callbacks (button clicks)
 */
router.post('/interactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get raw body for signature verification
    const rawBody = new URLSearchParams(req.body).toString()

    // Verify Slack signature
    if (!verifySlackSignature(req, rawBody)) {
      console.error('[Slack] Invalid signature')
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    // Parse the payload - Slack sends it as form-encoded
    const payload = typeof req.body.payload === 'string'
      ? JSON.parse(req.body.payload)
      : req.body.payload

    if (!payload) {
      res.status(400).json({ error: 'No payload provided' })
      return
    }

    // Acknowledge the request immediately (Slack requires response within 3 seconds)
    res.status(200).json({ ok: true })

    // Process the interaction asynchronously
    await handleInteraction(payload)
  } catch (err) {
    next(err)
  }
})

/**
 * Handle different types of Slack interactions
 */
async function handleInteraction(payload: any): Promise<void> {
  const { type, actions, user } = payload

  if (type !== 'block_actions' || !actions || actions.length === 0) {
    console.warn('[Slack] Unknown interaction type:', type)
    return
  }

  const action = actions[0]
  const actionId = action.action_id
  const value = action.value

  console.log('[Slack] Received action:', { actionId, value, user: user.id })

  // Parse the action value (format: "action:call_id" or "action:call_id:option")
  const parts = value.split(':')
  if (parts.length < 2) {
    console.error('[Slack] Invalid action value format:', value)
    return
  }

  const [actionType, callId, ...rest] = parts
  const optionName = rest.join(':') // Rejoin in case option name contains ':'

  try {
    switch (actionType) {
      case 'approve':
        await handleApprove(callId, user)
        break

      case 'deny':
        await handleDeny(callId, user)
        break

      case 'reject':
        await handleReject(callId, optionName, user)
        break

      case 'respond':
        await handleRespond(callId, optionName, user)
        break

      default:
        console.warn('[Slack] Unknown action type:', actionType)
    }
  } catch (error) {
    console.error('[Slack] Error handling interaction:', error)
  }
}

/**
 * Handle approval action
 */
async function handleApprove(callId: string, user: any): Promise<void> {
  console.log('[Slack] Approving function call:', callId)

  const status = {
    requested_at: new Date(),
    responded_at: new Date(),
    approved: true,
    comment: `Approved by @${user.username} via Slack`,
  }

  await functionCallService.respond(callId, status)
}

/**
 * Handle deny action
 */
async function handleDeny(callId: string, user: any): Promise<void> {
  console.log('[Slack] Denying function call:', callId)

  const status = {
    requested_at: new Date(),
    responded_at: new Date(),
    approved: false,
    comment: `Denied by @${user.username} via Slack`,
  }

  await functionCallService.respond(callId, status)
}

/**
 * Handle reject with custom option
 */
async function handleReject(callId: string, optionName: string, user: any): Promise<void> {
  console.log('[Slack] Rejecting function call with option:', { callId, optionName })

  const status = {
    requested_at: new Date(),
    responded_at: new Date(),
    approved: false,
    reject_option_name: optionName,
    comment: `Rejected (${optionName}) by @${user.username} via Slack`,
  }

  await functionCallService.respond(callId, status)
}

/**
 * Handle human contact response
 */
async function handleRespond(callId: string, optionName: string, user: any): Promise<void> {
  console.log('[Slack] Responding to human contact:', { callId, optionName })

  // Find the response option to get the actual response text
  const contact = humanContactService.get(callId)
  const responseOption = contact.spec.response_options?.find(opt => opt.name === optionName)
  const responseText = responseOption?.title || optionName

  const status = {
    requested_at: new Date(),
    responded_at: new Date(),
    response: `${responseText} (by @${user.username})`,
    response_option_name: optionName,
  }

  await humanContactService.respond(callId, status)
}

export default router
