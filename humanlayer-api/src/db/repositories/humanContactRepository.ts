import { eq } from 'drizzle-orm'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { HumanContact, HumanContactStatus } from '../../types/models.js'
import * as schema from '../schema.js'

export class HumanContactRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  create(contact: HumanContact): void {
    // Insert human contact
    this.db.insert(schema.humanContacts).values({
      callId: contact.call_id,
      runId: contact.run_id,
      msg: contact.spec.msg,
      subject: contact.spec.subject ?? null,
      channel: contact.spec.channel ? JSON.stringify(contact.spec.channel) : null,
      responseOptions: contact.spec.response_options
        ? JSON.stringify(contact.spec.response_options)
        : null,
      state: contact.spec.state ? JSON.stringify(contact.spec.state) : null,
    }).run()

    // Insert status
    if (contact.status) {
      this.updateStatus(contact.call_id, contact.status)
    } else {
      this.db.insert(schema.humanContactStatus).values({
        callId: contact.call_id,
        requestedAt: new Date(),
      }).run()
    }
  }

  findById(call_id: string): HumanContact | null {
    const result = this.db
      .select()
      .from(schema.humanContacts)
      .leftJoin(
        schema.humanContactStatus,
        eq(schema.humanContacts.callId, schema.humanContactStatus.callId)
      )
      .where(eq(schema.humanContacts.callId, call_id))
      .get()

    if (!result) return null

    return this.rowToHumanContact(result)
  }

  updateStatus(call_id: string, status: Partial<HumanContactStatus>): void {
    const updates: Partial<typeof schema.humanContactStatus.$inferInsert> = {}

    if ('requested_at' in status && status.requested_at !== undefined) {
      updates.requestedAt = status.requested_at
    }
    if ('responded_at' in status && status.responded_at !== undefined) {
      updates.respondedAt = status.responded_at
    }
    if ('response' in status && status.response !== undefined) {
      updates.response = status.response
    }
    if ('response_option_name' in status && status.response_option_name !== undefined) {
      updates.responseOptionName = status.response_option_name
    }

    if (Object.keys(updates).length === 0) {
      return // Nothing to update
    }

    // Try to update first
    const result = this.db
      .update(schema.humanContactStatus)
      .set(updates)
      .where(eq(schema.humanContactStatus.callId, call_id))
      .run()

    // If no rows updated, insert a new status row
    if (result.changes === 0) {
      this.db.insert(schema.humanContactStatus).values({
        callId: call_id,
        ...updates,
      }).run()
    }
  }

  private rowToHumanContact(result: any): HumanContact {
    const hc = result.human_contacts
    const status = result.human_contact_status

    return {
      run_id: hc.runId,
      call_id: hc.callId,
      spec: {
        msg: hc.msg,
        subject: hc.subject ?? undefined,
        channel: hc.channel ? JSON.parse(hc.channel) : undefined,
        response_options: hc.responseOptions ? JSON.parse(hc.responseOptions) : undefined,
        state: hc.state ? JSON.parse(hc.state) : undefined,
      },
      status: {
        requested_at: status?.requestedAt ? new Date(status.requestedAt) : new Date(),
        responded_at: status?.respondedAt ? new Date(status.respondedAt) : undefined,
        response: status?.response ?? undefined,
        response_option_name: status?.responseOptionName ?? undefined,
      },
    }
  }
}
