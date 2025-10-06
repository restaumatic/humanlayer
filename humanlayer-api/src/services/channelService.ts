import { FunctionCall, HumanContact } from '../types/models.js'

// Simplified channel service - logs to console for now
export class ChannelService {
  async sendApprovalRequest(functionCall: FunctionCall): Promise<void> {
    console.log('[ChannelService] Approval request:', functionCall.call_id)
    if (functionCall.spec.channel?.slack) {
      console.log(
        '[ChannelService] Would send to Slack:',
        functionCall.spec.channel.slack.channel_or_user_id
      )
    }
  }

  async sendHumanContactRequest(contact: HumanContact): Promise<void> {
    console.log('[ChannelService] Human contact request:', contact.call_id)
    if (contact.spec.channel?.slack) {
      console.log(
        '[ChannelService] Would send to Slack:',
        contact.spec.channel.slack.channel_or_user_id
      )
    }
  }

  async sendEscalation(item: FunctionCall | HumanContact, _escalation: any): Promise<void> {
    console.log('[ChannelService] Escalation for:', item.call_id)
  }
}
