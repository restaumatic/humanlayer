import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

// API Keys table
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix'),
    name: text('name'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    hashIdx: index('idx_api_keys_hash').on(table.keyHash),
  })
)

// Function Calls table
export const functionCalls = sqliteTable(
  'function_calls',
  {
    callId: text('call_id').primaryKey(),
    runId: text('run_id').notNull(),
    fn: text('fn').notNull(),
    kwargs: text('kwargs').notNull(), // JSON string
    channel: text('channel'), // JSON string
    rejectOptions: text('reject_options'), // JSON string
    state: text('state'), // JSON string
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    runIdIdx: index('idx_function_calls_run_id').on(table.runId),
    createdAtIdx: index('idx_function_calls_created_at').on(table.createdAt),
  })
)

// Function Call Status table
export const functionCallStatus = sqliteTable(
  'function_call_status',
  {
    callId: text('call_id')
      .primaryKey()
      .references(() => functionCalls.callId, { onDelete: 'cascade' }),
    requestedAt: integer('requested_at', { mode: 'timestamp' }),
    respondedAt: integer('responded_at', { mode: 'timestamp' }),
    approved: integer('approved', { mode: 'boolean' }),
    comment: text('comment'),
    rejectOptionName: text('reject_option_name'),
    slackMessageTs: text('slack_message_ts'),
  },
  (table) => ({
    approvedIdx: index('idx_function_call_status_approved').on(table.approved),
  })
)

// Human Contacts table
export const humanContacts = sqliteTable(
  'human_contacts',
  {
    callId: text('call_id').primaryKey(),
    runId: text('run_id').notNull(),
    msg: text('msg').notNull(),
    subject: text('subject'),
    channel: text('channel'), // JSON string
    responseOptions: text('response_options'), // JSON string
    state: text('state'), // JSON string
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    runIdIdx: index('idx_human_contacts_run_id').on(table.runId),
    createdAtIdx: index('idx_human_contacts_created_at').on(table.createdAt),
  })
)

// Human Contact Status table
export const humanContactStatus = sqliteTable(
  'human_contact_status',
  {
    callId: text('call_id')
      .primaryKey()
      .references(() => humanContacts.callId, { onDelete: 'cascade' }),
    requestedAt: integer('requested_at', { mode: 'timestamp' }),
    respondedAt: integer('responded_at', { mode: 'timestamp' }),
    response: text('response'),
    responseOptionName: text('response_option_name'),
  },
  (table) => ({
    responseIdx: index('idx_human_contact_status_response').on(table.response),
  })
)
