import { Router } from 'express'
import { HumanContactService } from '../services/humanContactService.js'
import { humanContactSchema } from '../utils/validators.js'
import { getDb } from '../db/database.js'
import { HumanContactRepository } from '../db/repositories/humanContactRepository.js'
import { ChannelService } from '../services/channelService.js'

const router = Router()

const db = getDb().getDatabase()
const repository = new HumanContactRepository(db)
const channelService = new ChannelService()
const service = new HumanContactService(repository, channelService)

// POST /contact_requests
router.post('/', async (req, res, next) => {
  try {
    const validated = humanContactSchema.parse(req.body)
    // Convert string dates to Date objects if provided
    const humanContact = {
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
    const result = await service.create(humanContact)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

// GET /contact_requests/:call_id
router.get('/:call_id', (req, res, next) => {
  try {
    const result = service.get(req.params.call_id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/human_contacts/:call_id/respond
router.post('/:call_id/respond', async (req, res, next) => {
  try {
    const status = {
      requested_at: req.body.requested_at ? new Date(req.body.requested_at) : undefined,
      responded_at: new Date(req.body.responded_at),
      response: req.body.response,
      response_option_name: req.body.response_option_name,
    }
    const result = await service.respond(req.params.call_id, status)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/human_contacts/:call_id/escalate_email
router.post('/:call_id/escalate_email', async (req, res, next) => {
  try {
    const result = await service.escalateEmail(req.params.call_id, req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
