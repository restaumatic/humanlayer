import Database from 'better-sqlite3'
import { HumanContact, HumanContactStatus } from '../../types/models.js'

export class HumanContactRepository {
  constructor(private db: Database.Database) {}

  create(contact: HumanContact): void {
    const stmt = this.db.prepare(`
      INSERT INTO human_contacts (call_id, run_id, msg, subject, channel, response_options, state)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      contact.call_id,
      contact.run_id,
      contact.spec.msg,
      contact.spec.subject || null,
      contact.spec.channel ? JSON.stringify(contact.spec.channel) : null,
      contact.spec.response_options ? JSON.stringify(contact.spec.response_options) : null,
      contact.spec.state ? JSON.stringify(contact.spec.state) : null
    )

    // Initialize status if provided
    if (contact.status) {
      this.updateStatus(contact.call_id, contact.status)
    } else {
      const statusStmt = this.db.prepare(`
        INSERT INTO human_contact_status (call_id, requested_at)
        VALUES (?, CURRENT_TIMESTAMP)
      `)
      statusStmt.run(contact.call_id)
    }
  }

  findById(call_id: string): HumanContact | null {
    const row = this.db
      .prepare(
        `
      SELECT
        hc.*,
        hcs.requested_at,
        hcs.responded_at,
        hcs.response,
        hcs.response_option_name
      FROM human_contacts hc
      LEFT JOIN human_contact_status hcs ON hc.call_id = hcs.call_id
      WHERE hc.call_id = ?
    `
      )
      .get(call_id) as any

    if (!row) return null

    return this.rowToHumanContact(row)
  }

  updateStatus(call_id: string, status: Partial<HumanContactStatus>): void {
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

    if ('response' in status && status.response !== undefined) {
      updates.push('response = ?')
      params.push(status.response)
    }

    if ('response_option_name' in status && status.response_option_name !== undefined) {
      updates.push('response_option_name = ?')
      params.push(status.response_option_name)
    }

    if (updates.length === 0) {
      return // Nothing to update
    }

    params.push(call_id)

    const stmt = this.db.prepare(`
      UPDATE human_contact_status
      SET ${updates.join(', ')}
      WHERE call_id = ?
    `)

    stmt.run(...params)
  }

  private rowToHumanContact(row: any): HumanContact {
    return {
      run_id: row.run_id,
      call_id: row.call_id,
      spec: {
        msg: row.msg,
        subject: row.subject || undefined,
        channel: row.channel ? JSON.parse(row.channel) : undefined,
        response_options: row.response_options ? JSON.parse(row.response_options) : undefined,
        state: row.state ? JSON.parse(row.state) : undefined,
      },
      status: {
        requested_at: row.requested_at ? new Date(row.requested_at) : new Date(),
        responded_at: row.responded_at ? new Date(row.responded_at) : undefined,
        response: row.response || undefined,
        response_option_name: row.response_option_name || undefined,
      },
    }
  }
}
