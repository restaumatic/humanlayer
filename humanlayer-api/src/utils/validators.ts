import { z } from 'zod'

// Shared schemas
const contactChannelSchema = z.object({
  slack: z
    .object({
      channel_or_user_id: z.string(),
      context_about_channel_or_user: z.string().optional(),
      bot_token: z.string().optional(),
      experimental_slack_blocks: z.boolean().optional(),
      thread_ts: z.string().optional(),
    })
    .optional(),
  email: z
    .object({
      address: z.string().email(),
      context_about_user: z.string().optional(),
    })
    .optional(),
  sms: z
    .object({
      phone_number: z.string(),
      context_about_user: z.string().optional(),
    })
    .optional(),
  whatsapp: z
    .object({
      phone_number: z.string(),
      context_about_user: z.string().optional(),
    })
    .optional(),
})

const responseOptionSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  prompt_fill: z.string().optional(),
  interactive: z.boolean().optional(),
})

export const functionCallSchema = z.object({
  run_id: z.string(),
  call_id: z.string(),
  spec: z.object({
    fn: z.string(),
    kwargs: z.record(z.any()),
    channel: contactChannelSchema.optional(),
    reject_options: z.array(responseOptionSchema).optional(),
    state: z.record(z.any()).optional(),
  }),
  status: z
    .object({
      requested_at: z.string().datetime().optional(),
      responded_at: z.string().datetime().optional(),
      approved: z.boolean().optional(),
      comment: z.string().optional(),
      reject_option_name: z.string().optional(),
      slack_message_ts: z.string().optional(),
    })
    .optional(),
})

export const humanContactSchema = z.object({
  run_id: z.string(),
  call_id: z.string(),
  spec: z.object({
    msg: z.string(),
    subject: z.string().optional(),
    channel: contactChannelSchema.optional(),
    response_options: z.array(responseOptionSchema).optional(),
    state: z.record(z.any()).optional(),
  }),
  status: z
    .object({
      requested_at: z.string().datetime().optional(),
      responded_at: z.string().datetime().optional(),
      response: z.string().optional(),
      response_option_name: z.string().optional(),
    })
    .optional(),
})

// Response schemas for the respond endpoints
export const functionCallResponseSchema = z.object({
  requested_at: z.string().datetime().optional(),
  responded_at: z.string().datetime(),
  approved: z.boolean(),
  comment: z.string().optional(),
  reject_option_name: z.string().optional(),
  slack_message_ts: z.string().optional(),
})

export const humanContactResponseSchema = z.object({
  requested_at: z.string().datetime().optional(),
  responded_at: z.string().datetime(),
  response: z.string(),
  response_option_name: z.string().optional(),
})
