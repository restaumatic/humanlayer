import { WebClient } from '@slack/web-api'
import { config } from '../config.js'
import { FunctionCall, HumanContact } from '../types/models.js'

export class ChannelService {
  private slackClient: WebClient | null = null

  constructor() {
    if (config.slack.botToken) {
      this.slackClient = new WebClient(config.slack.botToken)
    }
  }

  async sendApprovalRequest(functionCall: FunctionCall): Promise<void> {
    const channel = functionCall.spec.channel?.slack
    if (!channel) {
      console.log('[ChannelService] No Slack channel configured for:', functionCall.call_id)
      return
    }

    const slackClient = this.getSlackClient(channel.bot_token)
    if (!slackClient) {
      console.warn('[ChannelService] Slack not configured, skipping notification')
      return
    }

    try {
      const blocks = this.buildApprovalBlocks(functionCall)
      const text = this.buildApprovalText(functionCall)

      const result = await slackClient.chat.postMessage({
        channel: channel.channel_or_user_id,
        text,
        blocks,
        thread_ts: channel.thread_ts,
      })

      // Store the message timestamp for future updates
      if (result.ts && functionCall.status) {
        functionCall.status.slack_message_ts = result.ts
      }

      console.log('[ChannelService] Sent approval request to Slack:', functionCall.call_id)
    } catch (error) {
      console.error('[ChannelService] Failed to send Slack message:', error)
      throw error
    }
  }

  async sendHumanContactRequest(contact: HumanContact): Promise<void> {
    const channel = contact.spec.channel?.slack
    if (!channel) {
      console.log('[ChannelService] No Slack channel configured for:', contact.call_id)
      return
    }

    const slackClient = this.getSlackClient(channel.bot_token)
    if (!slackClient) {
      console.warn('[ChannelService] Slack not configured, skipping notification')
      return
    }

    try {
      const blocks = this.buildContactBlocks(contact)
      const text = this.buildContactText(contact)

      await slackClient.chat.postMessage({
        channel: channel.channel_or_user_id,
        text,
        blocks,
        thread_ts: channel.thread_ts,
      })

      console.log('[ChannelService] Sent human contact request to Slack:', contact.call_id)
    } catch (error) {
      console.error('[ChannelService] Failed to send Slack message:', error)
      throw error
    }
  }

  async updateApprovalMessage(
    functionCall: FunctionCall,
    approved: boolean,
    comment?: string
  ): Promise<void> {
    const channel = functionCall.spec.channel?.slack
    const messageTs = functionCall.status?.slack_message_ts

    if (!channel || !messageTs) {
      return
    }

    const slackClient = this.getSlackClient(channel.bot_token)
    if (!slackClient) {
      return
    }

    try {
      const blocks = this.buildApprovalResultBlocks(functionCall, approved, comment)
      const text = this.buildApprovalResultText(functionCall, approved)

      await slackClient.chat.update({
        channel: channel.channel_or_user_id,
        ts: messageTs,
        text,
        blocks,
      })

      console.log('[ChannelService] Updated approval message in Slack:', functionCall.call_id)
    } catch (error) {
      console.error('[ChannelService] Failed to update Slack message:', error)
    }
  }

  async sendEscalation(item: FunctionCall | HumanContact, _escalation: any): Promise<void> {
    console.log('[ChannelService] Escalation for:', item.call_id)
    // TODO: Implement escalation logic
  }

  private getSlackClient(botToken?: string): WebClient | null {
    if (botToken) {
      return new WebClient(botToken)
    }
    return this.slackClient
  }

  private buildApprovalBlocks(functionCall: FunctionCall): any[] {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔔 Approval Required',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Function:* \`${functionCall.spec.fn}\`\n*Call ID:* ${functionCall.call_id}`,
        },
      },
    ]

    // Add function arguments
    if (functionCall.spec.kwargs && Object.keys(functionCall.spec.kwargs).length > 0) {
      const argsText = Object.entries(functionCall.spec.kwargs)
        .map(([key, value]) => `• *${key}:* ${JSON.stringify(value)}`)
        .join('\n')

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Arguments:*\n${argsText}`,
        },
      })
    }

    blocks.push({
      type: 'divider',
    })

    // Add action buttons
    const buttons: any[] = [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '✅ Approve',
          emoji: true,
        },
        style: 'primary',
        value: `approve:${functionCall.call_id}`,
        action_id: 'approve_function_call',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '❌ Deny',
          emoji: true,
        },
        style: 'danger',
        value: `deny:${functionCall.call_id}`,
        action_id: 'deny_function_call',
      },
    ]

    // Add reject options if provided
    if (functionCall.spec.reject_options && functionCall.spec.reject_options.length > 0) {
      functionCall.spec.reject_options.forEach((option) => {
        buttons.push({
          type: 'button',
          text: {
            type: 'plain_text',
            text: option.title || option.name,
            emoji: true,
          },
          value: `reject:${functionCall.call_id}:${option.name}`,
          action_id: `reject_${option.name}`,
        })
      })
    }

    blocks.push({
      type: 'actions',
      elements: buttons,
    })

    return blocks
  }

  private buildContactBlocks(contact: HumanContact): any[] {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: contact.spec.subject || '💬 Human Input Needed',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: contact.spec.msg,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Call ID: ${contact.call_id}`,
          },
        ],
      },
    ]

    // Add response options if provided
    if (contact.spec.response_options && contact.spec.response_options.length > 0) {
      blocks.push({
        type: 'divider',
      })

      const buttons = contact.spec.response_options.map((option) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: option.title || option.name,
          emoji: true,
        },
        value: `respond:${contact.call_id}:${option.name}`,
        action_id: `respond_${option.name}`,
      }))

      blocks.push({
        type: 'actions',
        elements: buttons,
      })
    }

    return blocks
  }

  private buildApprovalResultBlocks(
    functionCall: FunctionCall,
    approved: boolean,
    comment?: string
  ): any[] {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: approved ? '✅ Approved' : '❌ Denied',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Function:* \`${functionCall.spec.fn}\`\n*Call ID:* ${functionCall.call_id}`,
        },
      },
    ]

    if (comment) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Comment:* ${comment}`,
        },
      })
    }

    blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Decision made at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>`,
          },
        ],
      })

    return blocks
  }

  private buildApprovalText(functionCall: FunctionCall): string {
    return `Approval Required: ${functionCall.spec.fn} (${functionCall.call_id})`
  }

  private buildContactText(contact: HumanContact): string {
    return `${contact.spec.subject || 'Human Input Needed'}: ${contact.spec.msg}`
  }

  private buildApprovalResultText(functionCall: FunctionCall, approved: boolean): string {
    return `${approved ? 'Approved' : 'Denied'}: ${functionCall.spec.fn} (${functionCall.call_id})`
  }
}
