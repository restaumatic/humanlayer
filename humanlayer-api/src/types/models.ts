// Based on humanlayer-ts/src/models.ts

export interface FunctionCall {
  run_id: string
  call_id: string
  spec: FunctionCallSpec
  status?: FunctionCallStatus
}

export interface FunctionCallSpec {
  fn: string
  kwargs: Record<string, any>
  channel?: ContactChannel
  reject_options?: ResponseOption[]
  state?: Record<string, any>
}

export interface FunctionCallStatus {
  requested_at: Date
  responded_at?: Date
  approved?: boolean
  comment?: string
  reject_option_name?: string
  slack_message_ts?: string
}

export interface HumanContact {
  run_id: string
  call_id: string
  spec: HumanContactSpec
  status?: HumanContactStatus
}

export interface HumanContactSpec {
  msg: string
  subject?: string
  channel?: ContactChannel
  response_options?: ResponseOption[]
  state?: Record<string, any>
}

export interface HumanContactStatus {
  requested_at?: Date
  responded_at?: Date
  response?: string
  response_option_name?: string
}

export interface ContactChannel {
  slack?: SlackContactChannel
  email?: EmailContactChannel
  sms?: SMSContactChannel
  whatsapp?: WhatsAppContactChannel
}

export interface SlackContactChannel {
  channel_or_user_id: string
  context_about_channel_or_user?: string
  bot_token?: string
  experimental_slack_blocks?: boolean
  thread_ts?: string
}

export interface EmailContactChannel {
  address: string
  context_about_user?: string
  additional_recipients?: EmailRecipient[]
  experimental_subject_line?: string
  experimental_in_reply_to_message_id?: string
  experimental_references_message_id?: string
  template?: string
}

export interface SMSContactChannel {
  phone_number: string
  context_about_user?: string
}

export interface WhatsAppContactChannel {
  phone_number: string
  context_about_user?: string
}

export interface ResponseOption {
  name: string
  title?: string
  description?: string
  prompt_fill?: string
  interactive?: boolean
}

export interface EmailRecipient {
  address: string
  field: 'to' | 'cc' | 'bcc'
  context_about_user?: string
}

export interface Escalation {
  escalation_msg: string
  additional_recipients?: EmailRecipient[]
  channel?: ContactChannel
}
