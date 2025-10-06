import { HumanContact, HumanContactStatus } from '../types/models.js'
import { HumanContactRepository } from '../db/repositories/humanContactRepository.js'
import { ChannelService } from './channelService.js'
import { ApiError } from '../middleware/errorHandler.js'

export class HumanContactService {
  constructor(
    private repository: HumanContactRepository,
    private channelService: ChannelService
  ) {}

  async create(contact: HumanContact): Promise<HumanContact> {
    if (!contact.status) {
      contact.status = {
        requested_at: new Date(),
      }
    }

    this.repository.create(contact)

    // Send question to human via contact channel
    if (contact.spec.channel) {
      await this.channelService.sendHumanContactRequest(contact)
    }

    return contact
  }

  get(call_id: string): HumanContact {
    const contact = this.repository.findById(call_id)
    if (!contact) {
      throw new ApiError(404, 'NOT_FOUND', `Human contact ${call_id} not found`)
    }
    return contact
  }

  async respond(
    call_id: string,
    status: Partial<HumanContactStatus> & { responded_at: Date }
  ): Promise<HumanContact> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Human contact ${call_id} not found`)
    }

    // Check if already responded
    if (existing.status?.responded_at) {
      throw new ApiError(409, 'ALREADY_RESPONDED', 'Contact already has a response')
    }

    this.repository.updateStatus(call_id, status)

    return this.repository.findById(call_id)!
  }

  async escalateEmail(call_id: string, escalation: any): Promise<HumanContact> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Human contact ${call_id} not found`)
    }

    await this.channelService.sendEscalation(existing, escalation)

    return existing
  }
}
