import { Router } from 'express'
import { FunctionCallService } from '../services/functionCallService.js'
import { functionCallSchema } from '../utils/validators.js'
import { getDb } from '../db/database.js'
import { FunctionCallRepository } from '../db/repositories/functionCallRepository.js'
import { ChannelService } from '../services/channelService.js'

const router = Router()

// Initialize dependencies
const db = getDb().getDatabase()
const repository = new FunctionCallRepository(db)
const channelService = new ChannelService()
const service = new FunctionCallService(repository, channelService)

// POST /function_calls
router.post('/', async (req, res, next) => {
  try {
    const validated = functionCallSchema.parse(req.body)
    // Convert string dates to Date objects if provided
    const functionCall = {
      ...validated,
      status: validated.status
        ? {
            ...validated.status,
            requested_at: validated.status.requested_at
              ? new Date(validated.status.requested_at)
              : new Date(),
            responded_at: validated.status.responded_at
              ? new Date(validated.status.responded_at)
              : undefined,
          }
        : undefined,
    }
    const result = await service.create(functionCall)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

// GET /function_calls/:call_id
router.get('/:call_id', (req, res, next) => {
  try {
    const result = service.get(req.params.call_id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/function_calls/:call_id/respond
router.post('/:call_id/respond', async (req, res, next) => {
  try {
    const status = {
      requested_at: new Date(req.body.requested_at),
      responded_at: new Date(req.body.responded_at),
      approved: req.body.approved,
      comment: req.body.comment,
    }
    const result = await service.respond(req.params.call_id, status)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/function_calls/:call_id/escalate_email
router.post('/:call_id/escalate_email', async (req, res, next) => {
  try {
    const result = await service.escalateEmail(req.params.call_id, req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
