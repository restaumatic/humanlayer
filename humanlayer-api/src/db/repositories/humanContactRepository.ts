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

  updateStatus(call_id: string, status: HumanContactStatus): void {
    const stmt = this.db.prepare(`
      UPDATE human_contact_status
      SET
        responded_at = ?,
        response = ?,
        response_option_name = ?
      WHERE call_id = ?
    `)

    stmt.run(
      status.responded_at?.toISOString() || null,
      status.response || null,
      status.response_option_name || null,
      call_id
    )
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
      status: row.requested_at
        ? {
            requested_at: row.requested_at ? new Date(row.requested_at) : undefined,
            responded_at: row.responded_at ? new Date(row.responded_at) : undefined,
            response: row.response || undefined,
            response_option_name: row.response_option_name || undefined,
          }
        : undefined,
    }
  }
}
