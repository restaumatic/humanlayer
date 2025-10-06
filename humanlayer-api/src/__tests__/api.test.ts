import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'
import { getDb } from '../db/database.js'
import {
  functionCallStatus,
  functionCalls,
  humanContactStatus,
  humanContacts,
} from '../db/schema.js'

const app = createApp()

describe('HumanLayer API Integration Tests', () => {
  beforeEach(() => {
    // Clean database before each test
    const db = getDb().getDatabase()
    db.delete(functionCallStatus).run()
    db.delete(functionCalls).run()
    db.delete(humanContactStatus).run()
    db.delete(humanContacts).run()
  })

  describe('Health & Auth Tests', () => {
    it('should return 200 for health check without auth', async () => {
      const response = await request(app).get('/health')
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status', 'ok')
    })

    it('should return 401 when missing auth header', async () => {
      const response = await request(app).get('/humanlayer/v1/function_calls')
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 with invalid API key', async () => {
      const response = await request(app)
        .get('/humanlayer/v1/function_calls')
        .set('Authorization', 'Bearer invalid-key')
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('INVALID_API_KEY')
    })
  })

  describe('Function Call Approval Tests', () => {
    it('should create function call approval', async () => {
      const response = await request(app)
        .post('/humanlayer/v1/function_calls')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-approval-1',
          spec: {
            fn: 'send_email',
            kwargs: { to: 'user@example.com', subject: 'Test', body: 'Hello' },
          },
        })
      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('call_id', 'test-approval-1')
    })

    it('should get function call status (pending)', async () => {
      // Create first
      await request(app)
        .post('/humanlayer/v1/function_calls')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-approval-1',
          spec: {
            fn: 'send_email',
            kwargs: { to: 'user@example.com', subject: 'Test', body: 'Hello' },
          },
        })

      // Get status
      const response = await request(app)
        .get('/humanlayer/v1/function_calls/test-approval-1')
        .set('Authorization', 'Bearer sk-test-key')
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('call_id', 'test-approval-1')
      expect(response.body.status).toHaveProperty('requested_at')
      expect(response.body.status.approved).toBeUndefined()
    })

    it('should respond to function call (approve)', async () => {
      // Create first
      await request(app)
        .post('/humanlayer/v1/function_calls')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-approval-1',
          spec: {
            fn: 'send_email',
            kwargs: { to: 'user@example.com', subject: 'Test', body: 'Hello' },
          },
        })

      // Respond
      const response = await request(app)
        .post('/humanlayer/v1/agent/function_calls/test-approval-1/respond')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          responded_at: '2025-10-06T13:05:00Z',
          approved: true,
          comment: 'Looks good!',
        })
      expect(response.status).toBe(200)
      expect(response.body.status.approved).toBe(true)
      expect(response.body.status.comment).toBe('Looks good!')
    })

    it('should get function call status (approved)', async () => {
      // Create
      await request(app)
        .post('/humanlayer/v1/function_calls')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-approval-1',
          spec: {
            fn: 'send_email',
            kwargs: { to: 'user@example.com', subject: 'Test', body: 'Hello' },
          },
        })

      // Respond
      await request(app)
        .post('/humanlayer/v1/agent/function_calls/test-approval-1/respond')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          responded_at: '2025-10-06T13:05:00Z',
          approved: true,
          comment: 'Looks good!',
        })

      // Get updated status
      const response = await request(app)
        .get('/humanlayer/v1/function_calls/test-approval-1')
        .set('Authorization', 'Bearer sk-test-key')
      expect(response.status).toBe(200)
      expect(response.body.status.approved).toBe(true)
    })

    it('should prevent double response (409)', async () => {
      // Create
      await request(app)
        .post('/humanlayer/v1/function_calls')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-approval-1',
          spec: {
            fn: 'send_email',
            kwargs: { to: 'user@example.com', subject: 'Test', body: 'Hello' },
          },
        })

      // First response
      await request(app)
        .post('/humanlayer/v1/agent/function_calls/test-approval-1/respond')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          responded_at: '2025-10-06T13:05:00Z',
          approved: true,
          comment: 'Looks good!',
        })

      // Second response should fail
      const response = await request(app)
        .post('/humanlayer/v1/agent/function_calls/test-approval-1/respond')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          responded_at: '2025-10-06T13:06:00Z',
          approved: false,
        })
      expect(response.status).toBe(409)
    })
  })

  describe('Human Contact Tests', () => {
    it('should create human contact request', async () => {
      const response = await request(app)
        .post('/humanlayer/v1/contact_requests')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-contact-1',
          spec: {
            msg: 'Should I proceed with the deployment?',
            subject: 'Deployment Confirmation',
          },
        })
      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('call_id', 'test-contact-1')
    })

    it('should get human contact (pending)', async () => {
      // Create first
      await request(app)
        .post('/humanlayer/v1/contact_requests')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-contact-1',
          spec: {
            msg: 'Should I proceed with the deployment?',
            subject: 'Deployment Confirmation',
          },
        })

      // Get status
      const response = await request(app)
        .get('/humanlayer/v1/contact_requests/test-contact-1')
        .set('Authorization', 'Bearer sk-test-key')
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('call_id', 'test-contact-1')
      expect(response.body.status.response).toBeUndefined()
    })

    it('should respond to human contact', async () => {
      // Create first
      await request(app)
        .post('/humanlayer/v1/contact_requests')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-contact-1',
          spec: {
            msg: 'Should I proceed with the deployment?',
            subject: 'Deployment Confirmation',
          },
        })

      // Respond
      const response = await request(app)
        .post('/humanlayer/v1/agent/human_contacts/test-contact-1/respond')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          responded_at: '2025-10-06T13:10:00Z',
          response: 'Yes, go ahead with the deployment',
        })
      expect(response.status).toBe(200)
      expect(response.body.status.response).toBe('Yes, go ahead with the deployment')
    })

    it('should get human contact (with response)', async () => {
      // Create
      await request(app)
        .post('/humanlayer/v1/contact_requests')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          run_id: 'test-run-1',
          call_id: 'test-contact-1',
          spec: {
            msg: 'Should I proceed with the deployment?',
            subject: 'Deployment Confirmation',
          },
        })

      // Respond
      await request(app)
        .post('/humanlayer/v1/agent/human_contacts/test-contact-1/respond')
        .set('Authorization', 'Bearer sk-test-key')
        .send({
          responded_at: '2025-10-06T13:10:00Z',
          response: 'Yes, go ahead with the deployment',
        })

      // Get updated status
      const response = await request(app)
        .get('/humanlayer/v1/contact_requests/test-contact-1')
        .set('Authorization', 'Bearer sk-test-key')
      expect(response.status).toBe(200)
      expect(response.body.status.response).toBe('Yes, go ahead with the deployment')
    })
  })
})
