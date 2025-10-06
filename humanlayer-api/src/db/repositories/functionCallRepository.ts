import { eq } from 'drizzle-orm'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { FunctionCall, FunctionCallStatus } from '../../types/models.js'
import * as schema from '../schema.js'

export class FunctionCallRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  create(functionCall: FunctionCall): void {
    // Insert function call
    this.db.insert(schema.functionCalls).values({
      callId: functionCall.call_id,
      runId: functionCall.run_id,
      fn: functionCall.spec.fn,
      kwargs: JSON.stringify(functionCall.spec.kwargs),
      channel: functionCall.spec.channel ? JSON.stringify(functionCall.spec.channel) : null,
      rejectOptions: functionCall.spec.reject_options
        ? JSON.stringify(functionCall.spec.reject_options)
        : null,
      state: functionCall.spec.state ? JSON.stringify(functionCall.spec.state) : null,
    }).run()

    // Insert status
    if (functionCall.status) {
      this.updateStatus(functionCall.call_id, functionCall.status)
    } else {
      this.db.insert(schema.functionCallStatus).values({
        callId: functionCall.call_id,
        requestedAt: new Date(),
      }).run()
    }
  }

  findById(call_id: string): FunctionCall | null {
    const result = this.db
      .select()
      .from(schema.functionCalls)
      .leftJoin(
        schema.functionCallStatus,
        eq(schema.functionCalls.callId, schema.functionCallStatus.callId)
      )
      .where(eq(schema.functionCalls.callId, call_id))
      .get()

    if (!result) return null

    return this.rowToFunctionCall(result)
  }

  updateStatus(call_id: string, status: Partial<FunctionCallStatus>): void {
    const updates: Partial<typeof schema.functionCallStatus.$inferInsert> = {}

    if ('requested_at' in status && status.requested_at !== undefined) {
      updates.requestedAt = status.requested_at
    }
    if ('responded_at' in status && status.responded_at !== undefined) {
      updates.respondedAt = status.responded_at
    }
    if ('approved' in status && status.approved !== undefined) {
      updates.approved = status.approved
    }
    if ('comment' in status && status.comment !== undefined) {
      updates.comment = status.comment
    }
    if ('reject_option_name' in status && status.reject_option_name !== undefined) {
      updates.rejectOptionName = status.reject_option_name
    }
    if ('slack_message_ts' in status && status.slack_message_ts !== undefined) {
      updates.slackMessageTs = status.slack_message_ts
    }

    if (Object.keys(updates).length === 0) {
      return // Nothing to update
    }

    // Try to update first
    const result = this.db
      .update(schema.functionCallStatus)
      .set(updates)
      .where(eq(schema.functionCallStatus.callId, call_id))
      .run()

    // If no rows updated, insert a new status row
    if (result.changes === 0) {
      this.db.insert(schema.functionCallStatus).values({
        callId: call_id,
        ...updates,
      }).run()
    }
  }

  private rowToFunctionCall(result: any): FunctionCall {
    const fc = result.function_calls
    const status = result.function_call_status

    return {
      run_id: fc.runId,
      call_id: fc.callId,
      spec: {
        fn: fc.fn,
        kwargs: JSON.parse(fc.kwargs),
        channel: fc.channel ? JSON.parse(fc.channel) : undefined,
        reject_options: fc.rejectOptions ? JSON.parse(fc.rejectOptions) : undefined,
        state: fc.state ? JSON.parse(fc.state) : undefined,
      },
      status: {
        requested_at: status?.requestedAt ? new Date(status.requestedAt) : new Date(),
        responded_at: status?.respondedAt ? new Date(status.respondedAt) : undefined,
        approved: status?.approved ?? undefined,
        comment: status?.comment ?? undefined,
        reject_option_name: status?.rejectOptionName ?? undefined,
        slack_message_ts: status?.slackMessageTs ?? undefined,
      },
    }
  }
}
