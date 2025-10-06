import Database from 'better-sqlite3'
import { FunctionCall, FunctionCallStatus } from '../../types/models.js'

export class FunctionCallRepository {
  constructor(private db: Database.Database) {}

  create(functionCall: FunctionCall): void {
    const stmt = this.db.prepare(`
      INSERT INTO function_calls (call_id, run_id, fn, kwargs, channel, reject_options, state)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      functionCall.call_id,
      functionCall.run_id,
      functionCall.spec.fn,
      JSON.stringify(functionCall.spec.kwargs),
      functionCall.spec.channel ? JSON.stringify(functionCall.spec.channel) : null,
      functionCall.spec.reject_options ? JSON.stringify(functionCall.spec.reject_options) : null,
      functionCall.spec.state ? JSON.stringify(functionCall.spec.state) : null
    )

    // Create status row
    if (functionCall.status) {
      this.updateStatus(functionCall.call_id, functionCall.status)
    } else {
      // Initialize with requested_at only
      const statusStmt = this.db.prepare(`
        INSERT INTO function_call_status (call_id, requested_at)
        VALUES (?, CURRENT_TIMESTAMP)
      `)
      statusStmt.run(functionCall.call_id)
    }
  }

  findById(call_id: string): FunctionCall | null {
    const row = this.db
      .prepare(
        `
      SELECT
        fc.*,
        fcs.requested_at,
        fcs.responded_at,
        fcs.approved,
        fcs.comment,
        fcs.reject_option_name,
        fcs.slack_message_ts
      FROM function_calls fc
      LEFT JOIN function_call_status fcs ON fc.call_id = fcs.call_id
      WHERE fc.call_id = ?
    `
      )
      .get(call_id) as any

    if (!row) return null

    return this.rowToFunctionCall(row)
  }

  updateStatus(call_id: string, status: Partial<FunctionCallStatus>): void {
    // Build dynamic UPDATE query based on provided fields
    const updates: string[] = []
    const params: any[] = []

    if ('requested_at' in status && status.requested_at !== undefined) {
      updates.push('requested_at = ?')
      params.push(
        status.requested_at instanceof Date ? status.requested_at.toISOString() : status.requested_at
      )
    }

    if ('responded_at' in status && status.responded_at !== undefined) {
      updates.push('responded_at = ?')
      params.push(
        status.responded_at instanceof Date ? status.responded_at.toISOString() : status.responded_at
      )
    }

    if ('approved' in status && status.approved !== undefined) {
      updates.push('approved = ?')
      params.push(status.approved ? 1 : 0) // Convert boolean to integer for SQLite
    }

    if ('comment' in status && status.comment !== undefined) {
      updates.push('comment = ?')
      params.push(status.comment)
    }

    if ('reject_option_name' in status && status.reject_option_name !== undefined) {
      updates.push('reject_option_name = ?')
      params.push(status.reject_option_name)
    }

    if ('slack_message_ts' in status && status.slack_message_ts !== undefined) {
      updates.push('slack_message_ts = ?')
      params.push(status.slack_message_ts)
    }

    if (updates.length === 0) {
      return // Nothing to update
    }

    params.push(call_id)

    const stmt = this.db.prepare(`
      UPDATE function_call_status
      SET ${updates.join(', ')}
      WHERE call_id = ?
    `)

    stmt.run(...params)
  }

  private rowToFunctionCall(row: any): FunctionCall {
    return {
      run_id: row.run_id,
      call_id: row.call_id,
      spec: {
        fn: row.fn,
        kwargs: JSON.parse(row.kwargs),
        channel: row.channel ? JSON.parse(row.channel) : undefined,
        reject_options: row.reject_options ? JSON.parse(row.reject_options) : undefined,
        state: row.state ? JSON.parse(row.state) : undefined,
      },
      status: {
        requested_at: row.requested_at ? new Date(row.requested_at) : new Date(),
        responded_at: row.responded_at ? new Date(row.responded_at) : undefined,
        // Convert SQLite integer (0/1) to boolean, handle null/undefined
        approved: row.approved !== null && row.approved !== undefined ? Boolean(row.approved) : undefined,
        comment: row.comment || undefined,
        reject_option_name: row.reject_option_name || undefined,
        slack_message_ts: row.slack_message_ts || undefined,
      },
    }
  }
}
