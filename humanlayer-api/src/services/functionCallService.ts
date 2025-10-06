import { FunctionCall, FunctionCallStatus } from '../types/models.js'
import { FunctionCallRepository } from '../db/repositories/functionCallRepository.js'
import { ChannelService } from './channelService.js'
import { ApiError } from '../middleware/errorHandler.js'

export class FunctionCallService {
  constructor(
    private repository: FunctionCallRepository,
    private channelService: ChannelService
  ) {}

  async create(functionCall: FunctionCall): Promise<FunctionCall> {
    // Initialize status with requested_at
    if (!functionCall.status) {
      functionCall.status = {
        requested_at: new Date(),
      }
    }

    this.repository.create(functionCall)

    // Send notification via contact channel
    if (functionCall.spec.channel) {
      await this.channelService.sendApprovalRequest(functionCall)
    }

    return functionCall
  }

  get(call_id: string): FunctionCall {
    const functionCall = this.repository.findById(call_id)
    if (!functionCall) {
      throw new ApiError(404, 'NOT_FOUND', `Function call ${call_id} not found`)
    }
    return functionCall
  }

  async respond(
    call_id: string,
    status: Partial<FunctionCallStatus> & { responded_at: Date }
  ): Promise<FunctionCall> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Function call ${call_id} not found`)
    }

    // Check if already decided
    if (existing.status?.responded_at) {
      throw new ApiError(409, 'ALREADY_DECIDED', 'Approval decision already made')
    }

    this.repository.updateStatus(call_id, status)

    return this.repository.findById(call_id)!
  }

  async escalateEmail(call_id: string, escalation: any): Promise<FunctionCall> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Function call ${call_id} not found`)
    }

    // Send escalation via email channel
    await this.channelService.sendEscalation(existing, escalation)

    return existing
  }
}
