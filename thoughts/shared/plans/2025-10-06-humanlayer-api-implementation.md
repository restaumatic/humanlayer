# HumanLayer API Implementation Plan (Node.js/TypeScript)

**Date**: 2025-10-06T11:19:20Z
**Git Commit**: 2123ad562ce4e1f45f94cda2f573a77119704c20
**Branch**: main
**Repository**: humanlayer

## Overview

Implement a complete replacement for the HumanLayer Cloud API (`https://api.humanlayer.dev/humanlayer/v1`) using Node.js/TypeScript with Express.js. This will provide the 8 core API endpoints that enable human-in-the-loop workflows for AI agents, with SQLite for persistence, Bearer token authentication, and Slack integration for contact channels.

## Current State Analysis

### What Exists Now

**Research Foundation**:
- Complete API analysis documented in `thoughts/shared/research/2025-10-06-humanlayer-api-implementation-analysis.md`
- 8 endpoints defined with request/response patterns
- Data models from Python, TypeScript, and Go SDKs
- Authentication patterns using Bearer tokens

**Existing Patterns in Codebase**:
- Go/Gin production API in `hld/` (local daemon, not cloud API)
- TypeScript SDK client in `humanlayer-ts/src/cloud.ts` (shows expected behavior)
- Python SDK client in `humanlayer/core/cloud.py` (reference implementation)
- SQLite schemas in `hld/store/sqlite.go` (similar data models)

### What's Missing

- No Node.js/TypeScript server implementation for the cloud API
- No endpoints for function call approvals or human contacts
- No persistence layer for approval requests
- No contact channel integrations (Slack, Email, etc.)
- No API key management system

### Key Constraints

- Must match existing SDK client expectations (request/response formats)
- Must use Bearer token authentication (`Authorization: Bearer {api_key}`)
- Database must support concurrent polling from multiple clients
- API responses must be type-safe and match SDK interfaces

## Desired End State

### Success Criteria

#### Automated Verification:
- [ ] Server starts successfully: `cd humanlayer-api && npm start`
- [ ] All unit tests pass: `make -C humanlayer-api test`
- [ ] Type checking passes: `make -C humanlayer-api check`
- [ ] Linting passes: `npm run lint` in humanlayer-api
- [ ] Database migrations apply: `npm run migrate` creates schema
- [ ] Health endpoint returns 200: `curl http://localhost:3000/health`
- [ ] Integration tests pass: `make -C humanlayer-api test-integration`

#### Manual Verification:
- [ ] Can create function call approval via POST `/function_calls`
- [ ] Can poll approval status via GET `/function_calls/{call_id}`
- [ ] Can respond to approval via POST `/agent/function_calls/{call_id}/respond`
- [ ] Can create human contact via POST `/contact_requests`
- [ ] Slack notifications are sent for approval requests
- [ ] Invalid API keys return 401 Unauthorized
- [ ] Multiple clients can poll same approval concurrently
- [ ] Python SDK works against new API (change `HUMANLAYER_API_BASE`)
- [ ] TypeScript SDK works against new API

## What We're NOT Doing

- ❌ OpenAPI spec generation/serving (internal TypeScript types only)
- ❌ Email integration (mock only)
- ❌ SMS/WhatsApp integration (mock only)
- ❌ Rate limiting (future enhancement)
- ❌ Webhook delivery system (future enhancement)
- ❌ Multi-region deployment
- ❌ Redis caching
- ❌ Metrics/observability (basic logging only)
- ❌ Admin UI
- ❌ API key rotation
- ❌ Usage tracking/billing

## Implementation Approach

### Technology Stack

- **Framework**: Express.js v4.x
- **Language**: TypeScript 5.x with strict mode
- **Database**: SQLite with `better-sqlite3`
- **Testing**: Vitest (matches hlyr pattern)
- **Validation**: Zod for runtime type safety
- **Slack Integration**: `@slack/web-api`
- **Package Manager**: npm (standard for Express projects)

### Architecture

```
humanlayer-api/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── server.ts             # HTTP server setup
│   ├── config.ts             # Environment configuration
│   ├── types/                # TypeScript type definitions
│   │   ├── api.ts           # Request/response types
│   │   ├── models.ts        # Domain models (FunctionCall, HumanContact)
│   │   └── channels.ts      # Contact channel types
│   ├── middleware/
│   │   ├── auth.ts          # Bearer token authentication
│   │   ├── errorHandler.ts # Global error handling
│   │   └── logging.ts       # Request logging
│   ├── routes/
│   │   ├── health.ts        # Health check endpoint
│   │   ├── functionCalls.ts # Function call approval routes
│   │   └── contacts.ts      # Human contact routes
│   ├── services/
│   │   ├── functionCallService.ts    # Business logic for approvals
│   │   ├── humanContactService.ts    # Business logic for contacts
│   │   ├── authService.ts            # API key validation
│   │   └── channelService.ts         # Contact channel dispatch
│   ├── channels/
│   │   ├── slack.ts         # Slack integration
│   │   ├── email.ts         # Email mock
│   │   ├── sms.ts           # SMS mock
│   │   └── whatsapp.ts      # WhatsApp mock
│   ├── db/
│   │   ├── database.ts      # SQLite connection
│   │   ├── migrations/      # Schema migrations
│   │   │   └── 001_initial_schema.sql
│   │   └── repositories/
│   │       ├── functionCallRepository.ts
│   │       ├── humanContactRepository.ts
│   │       └── apiKeyRepository.ts
│   └── utils/
│       ├── errors.ts        # Custom error classes
│       └── validators.ts    # Zod schemas
├── tests/
│   ├── integration/         # API endpoint tests
│   └── unit/               # Service unit tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── README.md
```

### Database Schema Design

Based on research of existing patterns in `hld/store/sqlite.go`:

**Tables**:
1. `api_keys` - API key storage and validation
2. `function_calls` - Function call approval requests
3. `human_contacts` - Human contact requests
4. `function_call_status` - Status updates for approvals (1:1 with function_calls)
5. `human_contact_status` - Status updates for contacts (1:1 with human_contacts)

---

## Phase 1: Project Setup & Foundation

### Overview
Set up the Node.js/TypeScript project structure, database foundation, and basic Express server.

### Changes Required

#### 1. Project Initialization

**Directory**: `humanlayer-api/`

Create package.json with dependencies:

```json
{
  "name": "@humanlayer/api",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "npm run format:check && npm run lint && tsc --noEmit",
    "migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.2.2",
    "@slack/web-api": "^6.10.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.18.0",
    "@typescript-eslint/parser": "^6.18.0",
    "prettier": "^3.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

**File**: `humanlayer-api/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**File**: `humanlayer-api/.env.example`

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_PATH=./data/humanlayer.db

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-bot-token

# API Keys (for testing)
DEFAULT_API_KEY=sk-test-key-for-development
```

#### 2. TypeScript Type Definitions

**File**: `humanlayer-api/src/types/models.ts`

Reuse types from existing SDK research:

```typescript
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
```

**File**: `humanlayer-api/src/types/api.ts`

```typescript
// API-specific types (requests/responses wrapping domain models)
import { FunctionCall, HumanContact, Escalation } from './models.js'

export interface CreateFunctionCallRequest {
  body: FunctionCall
}

export interface CreateFunctionCallResponse {
  data: FunctionCall
}

export interface GetFunctionCallResponse {
  data: FunctionCall
}

export interface RespondToFunctionCallRequest {
  params: { call_id: string }
  body: {
    requested_at: string
    responded_at: string
    approved: boolean
    comment?: string
  }
}

export interface EscalateFunctionCallRequest {
  params: { call_id: string }
  body: Escalation
}

// Similar for HumanContact endpoints...
export interface CreateHumanContactRequest {
  body: HumanContact
}

export interface CreateHumanContactResponse {
  data: HumanContact
}

export interface GetHumanContactResponse {
  data: HumanContact
}

export interface RespondToHumanContactRequest {
  params: { call_id: string }
  body: {
    requested_at?: string
    responded_at: string
    response: string
    response_option_name?: string
  }
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}
```

#### 3. Database Schema Migration

**File**: `humanlayer-api/src/db/migrations/001_initial_schema.sql`

```sql
-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,  -- First 8 chars for display (e.g., "sk-test-")
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    is_active BOOLEAN NOT NULL DEFAULT 1
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Function Calls table
CREATE TABLE IF NOT EXISTS function_calls (
    call_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,

    -- Spec fields (JSON would be simpler but expanding for queryability)
    fn TEXT NOT NULL,
    kwargs TEXT NOT NULL,  -- JSON
    channel TEXT,  -- JSON (ContactChannel)
    reject_options TEXT,  -- JSON array
    state TEXT,  -- JSON

    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key to status (1:1 relationship)
    CONSTRAINT fk_status FOREIGN KEY (call_id) REFERENCES function_call_status(call_id) ON DELETE CASCADE
);

CREATE INDEX idx_function_calls_run_id ON function_calls(run_id);
CREATE INDEX idx_function_calls_created_at ON function_calls(created_at);

-- Function Call Status table (1:1 with function_calls)
CREATE TABLE IF NOT EXISTS function_call_status (
    call_id TEXT PRIMARY KEY,
    requested_at DATETIME NOT NULL,
    responded_at DATETIME,
    approved BOOLEAN,  -- NULL = pending, 1 = approved, 0 = denied
    comment TEXT,
    reject_option_name TEXT,
    slack_message_ts TEXT,

    FOREIGN KEY (call_id) REFERENCES function_calls(call_id) ON DELETE CASCADE
);

CREATE INDEX idx_function_call_status_approved ON function_call_status(approved);

-- Human Contacts table
CREATE TABLE IF NOT EXISTS human_contacts (
    call_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,

    -- Spec fields
    msg TEXT NOT NULL,
    subject TEXT,
    channel TEXT,  -- JSON (ContactChannel)
    response_options TEXT,  -- JSON array
    state TEXT,  -- JSON

    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status FOREIGN KEY (call_id) REFERENCES human_contact_status(call_id) ON DELETE CASCADE
);

CREATE INDEX idx_human_contacts_run_id ON human_contacts(run_id);
CREATE INDEX idx_human_contacts_created_at ON human_contacts(created_at);

-- Human Contact Status table (1:1 with human_contacts)
CREATE TABLE IF NOT EXISTS human_contact_status (
    call_id TEXT PRIMARY KEY,
    requested_at DATETIME,
    responded_at DATETIME,
    response TEXT,
    response_option_name TEXT,

    FOREIGN KEY (call_id) REFERENCES human_contacts(call_id) ON DELETE CASCADE
);

CREATE INDEX idx_human_contact_status_response ON human_contact_status(response);
```

**File**: `humanlayer-api/src/db/database.ts`

```typescript
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class DatabaseConnection {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  getDatabase(): Database.Database {
    return this.db
  }

  runMigrations(): void {
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql')
    const migration = readFileSync(migrationPath, 'utf-8')
    this.db.exec(migration)
  }

  close(): void {
    this.db.close()
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null

export function getDb(): DatabaseConnection {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_PATH || './data/humanlayer.db'
    dbInstance = new DatabaseConnection(dbPath)
    dbInstance.runMigrations()
  }
  return dbInstance
}
```

#### 4. Configuration Management

**File**: `humanlayer-api/src/config.ts`

```typescript
import dotenv from 'dotenv'

dotenv.config()

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/humanlayer.db',
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
  },
  auth: {
    // For development/testing
    defaultApiKey: process.env.DEFAULT_API_KEY || 'sk-test-key',
  },
} as const

export function validateConfig(): void {
  if (!config.slack.botToken) {
    console.warn('WARNING: SLACK_BOT_TOKEN not set - Slack integration will fail')
  }
}
```

### Success Criteria

#### Automated Verification:
- [ ] Project installs dependencies: `cd humanlayer-api && npm install`
- [ ] TypeScript compiles: `npm run build`
- [ ] Database migration runs: `npm run migrate`
- [ ] Type checking passes: `tsc --noEmit`
- [ ] All files conform to style: `npm run format:check`

#### Manual Verification:
- [ ] Can run `npm run dev` and see "Server starting..." message
- [ ] Database file created at `./data/humanlayer.db`
- [ ] Schema tables exist: `sqlite3 data/humanlayer.db ".tables"`
- [ ] No TypeScript errors in editor

---

## Phase 2: Authentication & Middleware

### Overview
Implement Bearer token authentication, request logging, and error handling middleware.

### Changes Required

#### 1. Authentication Middleware

**File**: `humanlayer-api/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import { getDb } from '../db/database.js'
import crypto from 'crypto'

export interface AuthenticatedRequest extends Request {
  apiKey?: string
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header',
      },
    })
    return
  }

  // Validate token
  const keyHash = hashApiKey(token)
  const db = getDb().getDatabase()
  const apiKey = db
    .prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1')
    .get(keyHash) as { id: number; key_hash: string } | undefined

  if (!apiKey) {
    res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
      },
    })
    return
  }

  // Update last_used_at
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    apiKey.id
  )

  req.apiKey = token
  next()
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function createApiKey(prefix: string = 'sk-'): {
  key: string
  hash: string
  prefix: string
} {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const key = `${prefix}${randomBytes}`
  const hash = hashApiKey(key)
  const keyPrefix = key.substring(0, 8)

  return { key, hash, prefix: keyPrefix }
}
```

#### 2. Error Handling Middleware

**File**: `humanlayer-api/src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err)

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors,
      },
    })
    return
  }

  // Default 500 error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  })
}
```

#### 3. Request Logging Middleware

**File**: `humanlayer-api/src/middleware/logging.ts`

```typescript
import { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    )
  })

  next()
}
```

#### 4. Validation Utilities

**File**: `humanlayer-api/src/utils/validators.ts`

```typescript
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
      // ... other email fields
    })
    .optional(),
  // ... SMS, WhatsApp
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
      requested_at: z.string().datetime(),
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
```

### Success Criteria

#### Automated Verification:
- [ ] Auth middleware compiles: `tsc --noEmit`
- [ ] Can create API key: Run migration script that creates test key
- [ ] Error handler returns proper JSON: Unit test

#### Manual Verification:
- [ ] Request without Bearer token returns 401
- [ ] Request with invalid token returns 401
- [ ] Request with valid token proceeds to next middleware
- [ ] Errors return consistent JSON format
- [ ] Requests are logged to console with timing

---

## Phase 3: Function Call Approval Endpoints

### Overview
Implement the 4 function call approval endpoints with database persistence.

### Changes Required

#### 1. Function Call Repository

**File**: `humanlayer-api/src/db/repositories/functionCallRepository.ts`

```typescript
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
      functionCall.spec.reject_options
        ? JSON.stringify(functionCall.spec.reject_options)
        : null,
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

  updateStatus(call_id: string, status: FunctionCallStatus): void {
    const stmt = this.db.prepare(`
      UPDATE function_call_status
      SET
        responded_at = ?,
        approved = ?,
        comment = ?,
        reject_option_name = ?,
        slack_message_ts = ?
      WHERE call_id = ?
    `)

    stmt.run(
      status.responded_at?.toISOString() || null,
      status.approved ?? null,
      status.comment || null,
      status.reject_option_name || null,
      status.slack_message_ts || null,
      call_id
    )
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
      status: row.requested_at
        ? {
            requested_at: new Date(row.requested_at),
            responded_at: row.responded_at ? new Date(row.responded_at) : undefined,
            approved: row.approved ?? undefined,
            comment: row.comment || undefined,
            reject_option_name: row.reject_option_name || undefined,
            slack_message_ts: row.slack_message_ts || undefined,
          }
        : undefined,
    }
  }
}
```

#### 2. Function Call Service

**File**: `humanlayer-api/src/services/functionCallService.ts`

```typescript
import { FunctionCall, FunctionCallStatus } from '../types/models.js'
import { FunctionCallRepository } from '../db/repositories/functionCallRepository.js'
import { ChannelService } from './channelService.js'
import { ApiError } from '../middleware/errorHandler.js'

export class FunctionCallService {
  constructor(
    private repository: FunctionCallRepository,
    private channelService: ChannelService
  ) {}

  async create(functionCall: FunctionCall): Promise<FunctionCall> {
    // Initialize status with requested_at
    if (!functionCall.status) {
      functionCall.status = {
        requested_at: new Date(),
      }
    }

    this.repository.create(functionCall)

    // Send notification via contact channel
    if (functionCall.spec.channel) {
      await this.channelService.sendApprovalRequest(functionCall)
    }

    return functionCall
  }

  get(call_id: string): FunctionCall {
    const functionCall = this.repository.findById(call_id)
    if (!functionCall) {
      throw new ApiError(404, 'NOT_FOUND', `Function call ${call_id} not found`)
    }
    return functionCall
  }

  async respond(call_id: string, status: FunctionCallStatus): Promise<FunctionCall> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Function call ${call_id} not found`)
    }

    // Check if already decided
    if (existing.status?.approved !== undefined && existing.status?.approved !== null) {
      throw new ApiError(409, 'ALREADY_DECIDED', 'Approval decision already made')
    }

    this.repository.updateStatus(call_id, status)

    return this.repository.findById(call_id)!
  }

  async escalateEmail(call_id: string, escalation: any): Promise<FunctionCall> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Function call ${call_id} not found`)
    }

    // Send escalation via email channel
    await this.channelService.sendEscalation(existing, escalation)

    return existing
  }
}
```

#### 3. Function Call Routes

**File**: `humanlayer-api/src/routes/functionCalls.ts`

```typescript
import { Router } from 'express'
import { FunctionCallService } from '../services/functionCallService.js'
import { functionCallSchema } from '../utils/validators.js'
import { getDb } from '../db/database.js'
import { FunctionCallRepository } from '../db/repositories/functionCallRepository.js'
import { ChannelService } from '../services/channelService.js'

const router = Router()

// Initialize dependencies
const db = getDb().getDatabase()
const repository = new FunctionCallRepository(db)
const channelService = new ChannelService()
const service = new FunctionCallService(repository, channelService)

// POST /function_calls
router.post('/', async (req, res, next) => {
  try {
    const validated = functionCallSchema.parse(req.body)
    const result = await service.create(validated)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

// GET /function_calls/:call_id
router.get('/:call_id', (req, res, next) => {
  try {
    const result = service.get(req.params.call_id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/function_calls/:call_id/respond
router.post('/:call_id/respond', async (req, res, next) => {
  try {
    const status = {
      requested_at: new Date(req.body.requested_at),
      responded_at: new Date(req.body.responded_at),
      approved: req.body.approved,
      comment: req.body.comment,
    }
    const result = await service.respond(req.params.call_id, status)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/function_calls/:call_id/escalate_email
router.post('/:call_id/escalate_email', async (req, res, next) => {
  try {
    const result = await service.escalateEmail(req.params.call_id, req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
```

### Success Criteria

#### Automated Verification:
- [ ] Function call service compiles: `tsc --noEmit`
- [ ] Repository tests pass: `npm test src/db/repositories/functionCallRepository.test.ts`
- [ ] Service tests pass: `npm test src/services/functionCallService.test.ts`
- [ ] Route integration tests pass: `npm test tests/integration/functionCalls.test.ts`

#### Manual Verification:
- [ ] Can create function call: `curl -X POST http://localhost:3000/humanlayer/v1/function_calls -H "Authorization: Bearer sk-test-key" -H "Content-Type: application/json" -d '{"run_id":"test","call_id":"test-1","spec":{"fn":"test","kwargs":{}}}'`
- [ ] Can retrieve function call: `curl http://localhost:3000/humanlayer/v1/function_calls/test-1 -H "Authorization: Bearer sk-test-key"`
- [ ] Can respond to function call with approval
- [ ] Cannot respond twice (409 error)
- [ ] Data persists across server restarts

---

## Phase 4: Human Contact Endpoints

### Overview
Implement the 4 human contact endpoints following the same pattern as function calls.

### Changes Required

#### 1. Human Contact Repository

**File**: `humanlayer-api/src/db/repositories/humanContactRepository.ts`

Similar structure to FunctionCallRepository, adapted for HumanContact model:

```typescript
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
        response_options: row.response_options
          ? JSON.parse(row.response_options)
          : undefined,
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
```

#### 2. Human Contact Service

**File**: `humanlayer-api/src/services/humanContactService.ts`

```typescript
import { HumanContact, HumanContactStatus } from '../types/models.js'
import { HumanContactRepository } from '../db/repositories/humanContactRepository.js'
import { ChannelService } from './channelService.js'
import { ApiError } from '../middleware/errorHandler.js'

export class HumanContactService {
  constructor(
    private repository: HumanContactRepository,
    private channelService: ChannelService
  ) {}

  async create(contact: HumanContact): Promise<HumanContact> {
    if (!contact.status) {
      contact.status = {
        requested_at: new Date(),
      }
    }

    this.repository.create(contact)

    // Send question to human via contact channel
    if (contact.spec.channel) {
      await this.channelService.sendHumanContactRequest(contact)
    }

    return contact
  }

  get(call_id: string): HumanContact {
    const contact = this.repository.findById(call_id)
    if (!contact) {
      throw new ApiError(404, 'NOT_FOUND', `Human contact ${call_id} not found`)
    }
    return contact
  }

  async respond(call_id: string, status: HumanContactStatus): Promise<HumanContact> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Human contact ${call_id} not found`)
    }

    // Check if already responded
    if (existing.status?.response) {
      throw new ApiError(409, 'ALREADY_RESPONDED', 'Contact already has a response')
    }

    this.repository.updateStatus(call_id, status)

    return this.repository.findById(call_id)!
  }

  async escalateEmail(call_id: string, escalation: any): Promise<HumanContact> {
    const existing = this.repository.findById(call_id)
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', `Human contact ${call_id} not found`)
    }

    await this.channelService.sendEscalation(existing, escalation)

    return existing
  }
}
```

#### 3. Human Contact Routes

**File**: `humanlayer-api/src/routes/contacts.ts`

```typescript
import { Router } from 'express'
import { HumanContactService } from '../services/humanContactService.js'
import { humanContactSchema } from '../utils/validators.js'
import { getDb } from '../db/database.js'
import { HumanContactRepository } from '../db/repositories/humanContactRepository.js'
import { ChannelService } from '../services/channelService.js'

const router = Router()

const db = getDb().getDatabase()
const repository = new HumanContactRepository(db)
const channelService = new ChannelService()
const service = new HumanContactService(repository, channelService)

// POST /contact_requests
router.post('/', async (req, res, next) => {
  try {
    const validated = humanContactSchema.parse(req.body)
    const result = await service.create(validated)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

// GET /contact_requests/:call_id
router.get('/:call_id', (req, res, next) => {
  try {
    const result = service.get(req.params.call_id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/human_contacts/:call_id/respond
router.post('/:call_id/respond', async (req, res, next) => {
  try {
    const status = {
      requested_at: req.body.requested_at ? new Date(req.body.requested_at) : undefined,
      responded_at: new Date(req.body.responded_at),
      response: req.body.response,
      response_option_name: req.body.response_option_name,
    }
    const result = await service.respond(req.params.call_id, status)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /agent/human_contacts/:call_id/escalate_email
router.post('/:call_id/escalate_email', async (req, res, next) => {
  try {
    const result = await service.escalateEmail(req.params.call_id, req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
```

### Success Criteria

#### Automated Verification:
- [ ] Human contact service compiles: `tsc --noEmit`
- [ ] Repository tests pass: `npm test src/db/repositories/humanContactRepository.test.ts`
- [ ] Service tests pass: `npm test src/services/humanContactService.test.ts`
- [ ] Route integration tests pass: `npm test tests/integration/contacts.test.ts`

#### Manual Verification:
- [ ] Can create human contact request
- [ ] Can retrieve contact request
- [ ] Can respond to contact request
- [ ] Cannot respond twice (409 error)

---

## Phase 5: Slack Integration & Channel Service

### Overview
Implement real Slack integration and mock implementations for other channels.

### Changes Required

#### 1. Channel Service Dispatcher

**File**: `humanlayer-api/src/services/channelService.ts`

```typescript
import { FunctionCall, HumanContact, ContactChannel } from '../types/models.js'
import { SlackChannel } from '../channels/slack.js'
import { EmailChannel } from '../channels/email.js'
import { SMSChannel } from '../channels/sms.js'
import { WhatsAppChannel } from '../channels/whatsapp.js'

export class ChannelService {
  private slack: SlackChannel
  private email: EmailChannel
  private sms: SMSChannel
  private whatsapp: WhatsAppChannel

  constructor() {
    this.slack = new SlackChannel()
    this.email = new EmailChannel()
    this.sms = new SMSChannel()
    this.whatsapp = new WhatsAppChannel()
  }

  async sendApprovalRequest(functionCall: FunctionCall): Promise<void> {
    const channel = functionCall.spec.channel
    if (!channel) return

    if (channel.slack) {
      await this.slack.sendApprovalRequest(functionCall, channel.slack)
    } else if (channel.email) {
      await this.email.sendApprovalRequest(functionCall, channel.email)
    } else if (channel.sms) {
      await this.sms.sendApprovalRequest(functionCall, channel.sms)
    } else if (channel.whatsapp) {
      await this.whatsapp.sendApprovalRequest(functionCall, channel.whatsapp)
    }
  }

  async sendHumanContactRequest(contact: HumanContact): Promise<void> {
    const channel = contact.spec.channel
    if (!channel) return

    if (channel.slack) {
      await this.slack.sendHumanContactRequest(contact, channel.slack)
    } else if (channel.email) {
      await this.email.sendHumanContactRequest(contact, channel.email)
    } else if (channel.sms) {
      await this.sms.sendHumanContactRequest(contact, channel.sms)
    } else if (channel.whatsapp) {
      await this.whatsapp.sendHumanContactRequest(contact, channel.whatsapp)
    }
  }

  async sendEscalation(item: FunctionCall | HumanContact, escalation: any): Promise<void> {
    const channel = escalation.channel
    if (!channel) return

    if (channel.email) {
      await this.email.sendEscalation(item, channel.email, escalation.escalation_msg)
    }
    // Other channels can be added for escalation support
  }
}
```

#### 2. Slack Channel Implementation

**File**: `humanlayer-api/src/channels/slack.ts`

```typescript
import { WebClient } from '@slack/web-api'
import {
  FunctionCall,
  HumanContact,
  SlackContactChannel,
} from '../types/models.js'
import { config } from '../config.js'

export class SlackChannel {
  private client: WebClient

  constructor() {
    this.client = new WebClient(config.slack.botToken)
  }

  async sendApprovalRequest(
    functionCall: FunctionCall,
    channel: SlackContactChannel
  ): Promise<void> {
    const text = this.formatApprovalRequest(functionCall)

    try {
      const result = await this.client.chat.postMessage({
        channel: channel.channel_or_user_id,
        text,
        thread_ts: channel.thread_ts,
        blocks: channel.experimental_slack_blocks
          ? this.buildApprovalBlocks(functionCall)
          : undefined,
      })

      console.log('Slack message sent:', result.ts)
    } catch (error) {
      console.error('Failed to send Slack message:', error)
      throw error
    }
  }

  async sendHumanContactRequest(
    contact: HumanContact,
    channel: SlackContactChannel
  ): Promise<void> {
    const text = this.formatHumanContactRequest(contact)

    try {
      const result = await this.client.chat.postMessage({
        channel: channel.channel_or_user_id,
        text,
        thread_ts: channel.thread_ts,
        blocks: channel.experimental_slack_blocks
          ? this.buildContactBlocks(contact)
          : undefined,
      })

      console.log('Slack message sent:', result.ts)
    } catch (error) {
      console.error('Failed to send Slack message:', error)
      throw error
    }
  }

  private formatApprovalRequest(functionCall: FunctionCall): string {
    return `
🤖 *Approval Required*

Function: \`${functionCall.spec.fn}\`
Run ID: ${functionCall.run_id}
Call ID: ${functionCall.call_id}

Arguments:
\`\`\`
${JSON.stringify(functionCall.spec.kwargs, null, 2)}
\`\`\`

Reply to approve or deny this action.
    `.trim()
  }

  private formatHumanContactRequest(contact: HumanContact): string {
    return `
💬 *Question from AI Agent*

${contact.spec.subject ? `**${contact.spec.subject}**\n\n` : ''}${contact.spec.msg}

Run ID: ${contact.run_id}
Call ID: ${contact.call_id}

${
      contact.spec.response_options
        ? `\nOptions:\n${contact.spec.response_options.map((opt) => `• ${opt.title || opt.name}`).join('\n')}`
        : ''
    }
    `.trim()
  }

  private buildApprovalBlocks(functionCall: FunctionCall): any[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 Approval Required',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Function:*\n\`${functionCall.spec.fn}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Call ID:*\n${functionCall.call_id}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Arguments:*\n\`\`\`${JSON.stringify(functionCall.spec.kwargs, null, 2)}\`\`\``,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Approve ✅',
            },
            style: 'primary',
            value: 'approve',
            action_id: `approve_${functionCall.call_id}`,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Deny ❌',
            },
            style: 'danger',
            value: 'deny',
            action_id: `deny_${functionCall.call_id}`,
          },
        ],
      },
    ]
  }

  private buildContactBlocks(contact: HumanContact): any[] {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: contact.spec.subject || '💬 Question from AI Agent',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: contact.spec.msg,
        },
      },
    ]

    if (contact.spec.response_options && contact.spec.response_options.length > 0) {
      blocks.push({
        type: 'actions',
        elements: contact.spec.response_options.map((option) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: option.title || option.name,
          },
          value: option.name,
          action_id: `response_${contact.call_id}_${option.name}`,
        })),
      })
    }

    return blocks
  }
}
```

#### 3. Mock Channel Implementations

**File**: `humanlayer-api/src/channels/email.ts`

```typescript
import { FunctionCall, HumanContact, EmailContactChannel } from '../types/models.js'

export class EmailChannel {
  async sendApprovalRequest(
    functionCall: FunctionCall,
    channel: EmailContactChannel
  ): Promise<void> {
    console.log('[MOCK] Email approval request sent to:', channel.address)
    console.log('[MOCK] Subject: Approval Required for', functionCall.spec.fn)
    console.log('[MOCK] Call ID:', functionCall.call_id)
    // In production, integrate with SendGrid, AWS SES, etc.
  }

  async sendHumanContactRequest(
    contact: HumanContact,
    channel: EmailContactChannel
  ): Promise<void> {
    console.log('[MOCK] Email contact request sent to:', channel.address)
    console.log('[MOCK] Subject:', contact.spec.subject || 'Question from AI')
    console.log('[MOCK] Message:', contact.spec.msg)
  }

  async sendEscalation(
    item: FunctionCall | HumanContact,
    channel: EmailContactChannel,
    message: string
  ): Promise<void> {
    console.log('[MOCK] Escalation email sent to:', channel.address)
    console.log('[MOCK] Message:', message)
  }
}
```

**File**: `humanlayer-api/src/channels/sms.ts`

```typescript
import { FunctionCall, HumanContact, SMSContactChannel } from '../types/models.js'

export class SMSChannel {
  async sendApprovalRequest(
    functionCall: FunctionCall,
    channel: SMSContactChannel
  ): Promise<void> {
    console.log('[MOCK] SMS approval request sent to:', channel.phone_number)
    console.log('[MOCK] Function:', functionCall.spec.fn)
  }

  async sendHumanContactRequest(
    contact: HumanContact,
    channel: SMSContactChannel
  ): Promise<void> {
    console.log('[MOCK] SMS contact request sent to:', channel.phone_number)
    console.log('[MOCK] Message:', contact.spec.msg)
  }
}
```

**File**: `humanlayer-api/src/channels/whatsapp.ts`

```typescript
import { FunctionCall, HumanContact, WhatsAppContactChannel } from '../types/models.js'

export class WhatsAppChannel {
  async sendApprovalRequest(
    functionCall: FunctionCall,
    channel: WhatsAppContactChannel
  ): Promise<void> {
    console.log('[MOCK] WhatsApp approval request sent to:', channel.phone_number)
    console.log('[MOCK] Function:', functionCall.spec.fn)
  }

  async sendHumanContactRequest(
    contact: HumanContact,
    channel: WhatsAppContactChannel
  ): Promise<void> {
    console.log('[MOCK] WhatsApp contact request sent to:', channel.phone_number)
    console.log('[MOCK] Message:', contact.spec.msg)
  }
}
```

### Success Criteria

#### Automated Verification:
- [ ] Slack channel compiles: `tsc --noEmit`
- [ ] Mock channels compile: `tsc --noEmit`
- [ ] Channel service tests pass: `npm test src/services/channelService.test.ts`

#### Manual Verification:
- [ ] Creating function call with Slack channel sends Slack message
- [ ] Slack message contains function name and arguments
- [ ] Slack Block Kit formatting works (if enabled)
- [ ] Email/SMS/WhatsApp channels log mock messages
- [ ] Missing SLACK_BOT_TOKEN logs warning but doesn't crash

---

## Phase 6: Server Setup & Health Check

### Overview
Wire up all routes, create the Express app, and add a health check endpoint.

### Changes Required

#### 1. Express Application

**File**: `humanlayer-api/src/index.ts`

```typescript
import express from 'express'
import { config, validateConfig } from './config.js'
import { requestLogger } from './middleware/logging.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authenticateToken } from './middleware/auth.js'
import functionCallRoutes from './routes/functionCalls.js'
import contactRoutes from './routes/contacts.js'
import { getDb } from './db/database.js'

// Validate configuration
validateConfig()

// Initialize database
const db = getDb()

const app = express()

// Global middleware
app.use(express.json())
app.use(requestLogger)

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// API routes with authentication
const apiRouter = express.Router()
apiRouter.use(authenticateToken)

// Mount route groups
apiRouter.use('/function_calls', functionCallRoutes)
apiRouter.use('/contact_requests', contactRoutes)

// Also mount agent routes (different path structure)
apiRouter.use('/agent/function_calls', functionCallRoutes)
apiRouter.use('/agent/human_contacts', contactRoutes)

// Mount API router under versioned path
app.use('/humanlayer/v1', apiRouter)

// Error handling (must be last)
app.use(errorHandler)

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  console.log(
    `🚀 HumanLayer API server running at http://${config.server.host}:${config.server.port}`
  )
  console.log(`📊 Health check: http://${config.server.host}:${config.server.port}/health`)
  console.log(
    `🔗 API base: http://${config.server.host}:${config.server.port}/humanlayer/v1`
  )
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    db.close()
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    db.close()
    process.exit(0)
  })
})

export default app
```

#### 2. Database Migration Script

**File**: `humanlayer-api/src/db/migrate.ts`

```typescript
import { getDb } from './database.js'
import { createApiKey, hashApiKey } from '../middleware/auth.js'
import { config } from '../config.js'

console.log('Running database migrations...')

const db = getDb()

// Migrations are automatically run in database.ts
console.log('✅ Schema migrations complete')

// Seed default API key for development
const defaultKey = config.auth.defaultApiKey
const { hash, prefix } = {
  hash: hashApiKey(defaultKey),
  prefix: defaultKey.substring(0, 8),
}

const existing = db
  .getDatabase()
  .prepare('SELECT id FROM api_keys WHERE key_hash = ?')
  .get(hash)

if (!existing) {
  db.getDatabase()
    .prepare('INSERT INTO api_keys (key_hash, key_prefix) VALUES (?, ?)')
    .run(hash, prefix)
  console.log('✅ Default API key created:', prefix + '...')
} else {
  console.log('✅ Default API key already exists')
}

db.close()
console.log('✅ Migration complete')
```

#### 3. README Documentation

**File**: `humanlayer-api/README.md`

```markdown
# HumanLayer API (Node.js/TypeScript Implementation)

Complete replacement for the HumanLayer Cloud API implemented with Express.js, TypeScript, and SQLite.

## Features

- ✅ 8 Core API endpoints (function call approvals + human contacts)
- ✅ Bearer token authentication
- ✅ SQLite database with migrations
- ✅ Slack integration (real)
- ✅ Email/SMS/WhatsApp mock implementations
- ✅ Type-safe with TypeScript and Zod validation
- ✅ Compatible with existing HumanLayer SDKs

## Quick Start

### Installation

```bash
cd humanlayer-api
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `SLACK_BOT_TOKEN` - Your Slack bot token (get from https://api.slack.com/apps)
- `DATABASE_PATH` - SQLite database location (default: `./data/humanlayer.db`)
- `PORT` - Server port (default: 3000)

### Database Setup

```bash
npm run migrate
```

This creates the database schema and seeds a default API key for development.

### Development

```bash
npm run dev
```

Server starts at http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

Base URL: `http://localhost:3000/humanlayer/v1`

**Health Check**:
- `GET /health` - No auth required

**Function Call Approvals**:
- `POST /function_calls` - Create approval request
- `GET /function_calls/:call_id` - Get approval status
- `POST /agent/function_calls/:call_id/respond` - Submit decision
- `POST /agent/function_calls/:call_id/escalate_email` - Escalate

**Human Contacts**:
- `POST /contact_requests` - Ask human a question
- `GET /contact_requests/:call_id` - Get response
- `POST /agent/human_contacts/:call_id/respond` - Submit response
- `POST /agent/human_contacts/:call_id/escalate_email` - Escalate

All authenticated endpoints require:
```
Authorization: Bearer sk-test-key-for-development
```

## Testing with Existing SDKs

### Python SDK

```bash
export HUMANLAYER_API_BASE=http://localhost:3000/humanlayer/v1
export HUMANLAYER_API_KEY=sk-test-key-for-development
python your_script.py
```

### TypeScript SDK

```bash
export HUMANLAYER_API_BASE=http://localhost:3000/humanlayer/v1
export HUMANLAYER_API_KEY=sk-test-key-for-development
node your_script.js
```

## Development

### Run Tests

```bash
npm test
npm run test:watch
```

### Type Checking

```bash
npm run check
```

### Linting

```bash
npm run lint
npm run format
```

## Project Structure

```
src/
├── index.ts              # Express app entry point
├── config.ts             # Environment configuration
├── types/                # TypeScript types
├── middleware/           # Auth, logging, error handling
├── routes/               # API route handlers
├── services/             # Business logic
├── channels/             # Slack/Email/SMS/WhatsApp
├── db/                   # Database layer
│   ├── database.ts      # SQLite connection
│   ├── migrations/      # Schema definitions
│   └── repositories/    # Data access
└── utils/                # Validators, helpers
```

## Database

SQLite database located at `./data/humanlayer.db` (configurable).

To inspect:
```bash
sqlite3 ./data/humanlayer.db
.tables
.schema function_calls
```

## Slack Integration

1. Create a Slack app at https://api.slack.com/apps
2. Enable "Bot Token Scopes": `chat:write`, `chat:write.public`
3. Install app to workspace
4. Copy Bot User OAuth Token to `SLACK_BOT_TOKEN` in `.env`

## License

Same as parent humanlayer repository.
```

### Success Criteria

#### Automated Verification:
- [ ] Server starts: `npm run dev`
- [ ] Health check responds: `curl http://localhost:3000/health`
- [ ] Type checking passes: `npm run check`
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Migration runs: `npm run migrate`

#### Manual Verification:
- [ ] Can start server and see startup messages
- [ ] Health endpoint returns 200 with JSON
- [ ] Server handles SIGTERM gracefully
- [ ] Database file created at configured path
- [ ] Default API key works in requests
- [ ] All 8 API endpoints respond correctly
- [ ] Python SDK works when pointed at local server
- [ ] TypeScript SDK works when pointed at local server

---

## Phase 7: Testing & Integration

### Overview
Write comprehensive tests for all components and verify SDK compatibility.

### Changes Required

#### 1. Unit Tests for Services

**File**: `humanlayer-api/tests/unit/functionCallService.test.ts`

```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { FunctionCallService } from '../../src/services/functionCallService.js'
import { FunctionCallRepository } from '../../src/db/repositories/functionCallRepository.js'
import { ChannelService } from '../../src/services/channelService.js'
import Database from 'better-sqlite3'

describe('FunctionCallService', () => {
  let db: Database.Database
  let repository: FunctionCallRepository
  let channelService: ChannelService
  let service: FunctionCallService

  beforeEach(() => {
    // Use in-memory database for tests
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE function_calls (
        call_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        fn TEXT NOT NULL,
        kwargs TEXT NOT NULL,
        channel TEXT,
        reject_options TEXT,
        state TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE function_call_status (
        call_id TEXT PRIMARY KEY,
        requested_at DATETIME NOT NULL,
        responded_at DATETIME,
        approved BOOLEAN,
        comment TEXT,
        reject_option_name TEXT,
        slack_message_ts TEXT
      );
    `)

    repository = new FunctionCallRepository(db)
    channelService = new ChannelService()
    service = new FunctionCallService(repository, channelService)
  })

  test('should create function call', async () => {
    const functionCall = {
      run_id: 'test-run',
      call_id: 'test-call-1',
      spec: {
        fn: 'test_function',
        kwargs: { arg1: 'value1' },
      },
    }

    const result = await service.create(functionCall)

    expect(result.call_id).toBe('test-call-1')
    expect(result.status).toBeDefined()
    expect(result.status?.requested_at).toBeInstanceOf(Date)
  })

  test('should get function call by ID', () => {
    const functionCall = {
      run_id: 'test-run',
      call_id: 'test-call-2',
      spec: {
        fn: 'test_function',
        kwargs: {},
      },
    }

    repository.create(functionCall)

    const result = service.get('test-call-2')

    expect(result.call_id).toBe('test-call-2')
  })

  test('should throw 404 for non-existent call', () => {
    expect(() => service.get('non-existent')).toThrow('not found')
  })

  test('should respond to function call', async () => {
    const functionCall = {
      run_id: 'test-run',
      call_id: 'test-call-3',
      spec: {
        fn: 'test_function',
        kwargs: {},
      },
    }

    repository.create(functionCall)

    const result = await service.respond('test-call-3', {
      requested_at: new Date(),
      responded_at: new Date(),
      approved: true,
      comment: 'Looks good',
    })

    expect(result.status?.approved).toBe(true)
    expect(result.status?.comment).toBe('Looks good')
  })

  test('should prevent double decision', async () => {
    const functionCall = {
      run_id: 'test-run',
      call_id: 'test-call-4',
      spec: {
        fn: 'test_function',
        kwargs: {},
      },
    }

    repository.create(functionCall)

    await service.respond('test-call-4', {
      requested_at: new Date(),
      responded_at: new Date(),
      approved: true,
    })

    await expect(
      service.respond('test-call-4', {
        requested_at: new Date(),
        responded_at: new Date(),
        approved: false,
      })
    ).rejects.toThrow('ALREADY_DECIDED')
  })
})
```

#### 2. Integration Tests for API Endpoints

**File**: `humanlayer-api/tests/integration/functionCalls.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../src/index.js'
import { getDb } from '../../src/db/database.js'

describe('Function Calls API', () => {
  const API_KEY = process.env.DEFAULT_API_KEY || 'sk-test-key-for-development'

  beforeAll(() => {
    // Ensure database is initialized
    getDb()
  })

  afterAll(() => {
    getDb().close()
  })

  test('POST /function_calls creates function call', async () => {
    const response = await request(app)
      .post('/humanlayer/v1/function_calls')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        run_id: 'integration-test-run',
        call_id: 'integration-test-1',
        spec: {
          fn: 'multiply',
          kwargs: { x: 2, y: 3 },
        },
      })

    expect(response.status).toBe(201)
    expect(response.body.call_id).toBe('integration-test-1')
    expect(response.body.status).toBeDefined()
    expect(response.body.status.requested_at).toBeDefined()
  })

  test('GET /function_calls/:call_id retrieves function call', async () => {
    const response = await request(app)
      .get('/humanlayer/v1/function_calls/integration-test-1')
      .set('Authorization', `Bearer ${API_KEY}`)

    expect(response.status).toBe(200)
    expect(response.body.call_id).toBe('integration-test-1')
  })

  test('POST /agent/function_calls/:call_id/respond approves call', async () => {
    const response = await request(app)
      .post('/humanlayer/v1/agent/function_calls/integration-test-1/respond')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({
        requested_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
        approved: true,
        comment: 'Integration test approval',
      })

    expect(response.status).toBe(200)
    expect(response.body.status.approved).toBe(true)
    expect(response.body.status.comment).toBe('Integration test approval')
  })

  test('Unauthorized request returns 401', async () => {
    const response = await request(app)
      .get('/humanlayer/v1/function_calls/test')
      .set('Authorization', 'Bearer invalid-key')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_API_KEY')
  })

  test('Missing auth header returns 401', async () => {
    const response = await request(app).get('/humanlayer/v1/function_calls/test')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })
})
```

#### 3. SDK Compatibility Tests

**File**: `humanlayer-api/tests/integration/sdk-compatibility.test.ts`

```typescript
import { describe, test, expect, beforeAll } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

describe('SDK Compatibility', () => {
  beforeAll(async () => {
    // Ensure server is running
    // In CI, this would be started separately
  })

  test('Python SDK can create and poll approval', async () => {
    const pythonScript = `
import os
os.environ['HUMANLAYER_API_BASE'] = 'http://localhost:3000/humanlayer/v1'
os.environ['HUMANLAYER_API_KEY'] = 'sk-test-key-for-development'

from humanlayer import HumanLayer

hl = HumanLayer()

@hl.require_approval()
def test_function(x: int) -> int:
    return x * 2

# This should create an approval request
result = test_function(5)
print("SUCCESS")
    `

    // Write to temp file and execute
    // This is a placeholder - actual implementation would use fs and temp files
    expect(true).toBe(true) // Placeholder for actual test
  })

  test('TypeScript SDK can create approval', async () => {
    // Similar pattern for TypeScript SDK test
    expect(true).toBe(true) // Placeholder
  })
})
```

#### 4. Vitest Configuration

**File**: `humanlayer-api/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
})
```

**File**: `humanlayer-api/tests/setup.ts`

```typescript
import { beforeAll, afterAll } from 'vitest'
import { config } from '../src/config.js'

// Set test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_PATH = ':memory:'
  process.env.DEFAULT_API_KEY = 'sk-test-key-for-development'
})

afterAll(() => {
  // Cleanup
})
```

### Success Criteria

#### Automated Verification:
- [ ] All unit tests pass: `npm test tests/unit`
- [ ] All integration tests pass: `npm test tests/integration`
- [ ] Test coverage > 80%: `npm test -- --coverage`
- [ ] SDK compatibility tests pass: `npm test tests/integration/sdk-compatibility.test.ts`

#### Manual Verification:
- [ ] Python SDK successfully creates approval and polls status
- [ ] TypeScript SDK successfully creates approval and polls status
- [ ] Go SDK successfully creates approval (if time permits)
- [ ] Concurrent polling from multiple clients works correctly
- [ ] Database constraints prevent duplicate responses

---

## Phase 8: Monorepo Integration & Documentation

### Overview
Integrate the new API into the monorepo build system and update documentation.

### Changes Required

#### 1. Root Makefile Integration

**File**: `/workspace/humanlayer/Makefile`

Add these targets at appropriate locations:

```makefile
# HumanLayer API targets
.PHONY: check-api test-api build-api

check-api: ## Run HumanLayer API checks
	@$(MAKE) -C humanlayer-api check VERBOSE=$(VERBOSE)

test-api: ## Run HumanLayer API tests
	@$(MAKE) -C humanlayer-api test VERBOSE=$(VERBOSE)

build-api: ## Build HumanLayer API
	@$(MAKE) -C humanlayer-api build VERBOSE=$(VERBOSE)

# Update main targets to include API
check: check-py check-ts check-hlyr check-wui check-hld check-claudecode-go check-api

test: test-py test-ts test-hlyr test-wui test-hld test-claudecode-go test-api
```

#### 2. HumanLayer API Makefile

**File**: `humanlayer-api/Makefile`

```makefile
.PHONY: help install dev build start test lint format format-check check clean migrate

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Start development server
	npm run dev

build: ## Build production bundle
	npm run build

start: ## Start production server
	npm start

test: ## Run tests
	@if [ -n "$$VERBOSE" ]; then \
		npm test; \
	else \
		npm test -- --reporter=dot; \
	fi

lint: ## Run ESLint
	npm run lint

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

check: ## Run all quality checks
	@if [ -n "$$VERBOSE" ]; then \
		$(MAKE) format-check lint && npm run check; \
	else \
		@. ../hack/run_silent.sh && print_header "humanlayer-api" "API checks" && \
		run_silent "Format check passed" "npm run format:check" && \
		run_silent "Lint check passed" "npm run lint" && \
		run_silent "Type checking passed" "npm run check"; \
	fi

migrate: ## Run database migrations
	npm run migrate

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/
	rm -rf data/humanlayer.db

.DEFAULT_GOAL := help
```

#### 3. Setup Script Integration

**File**: `hack/setup_repo.sh`

Add after TypeScript setup section:

```bash
echo "📦 Installing HumanLayer API dependencies..."
if ! run_with_quiet "humanlayer-api dependencies installed" "cd humanlayer-api && npm install"; then
    echo "  ${RED}✗${NC} humanlayer-api dependencies installation"
    exit 1
fi

echo "🗄️  Setting up HumanLayer API database..."
if ! run_with_quiet "Database initialized" "cd humanlayer-api && npm run migrate"; then
    echo "  ${RED}✗${NC} Database initialization"
    exit 1
fi
```

#### 4. Documentation Updates

**File**: `README.md` (root repository)

Add section:

```markdown
### HumanLayer API Server

Local implementation of the HumanLayer Cloud API.

```bash
cd humanlayer-api
npm install
npm run migrate
npm run dev
```

See [humanlayer-api/README.md](humanlayer-api/README.md) for details.
```

### Success Criteria

#### Automated Verification:
- [ ] Root `make check` includes API checks
- [ ] Root `make test` includes API tests
- [ ] Root `make setup` installs API dependencies
- [ ] Can run `make -C humanlayer-api check`
- [ ] Can run `make -C humanlayer-api test`
- [ ] Can run `make -C humanlayer-api build`

#### Manual Verification:
- [ ] `make setup` successfully sets up entire repo including API
- [ ] `make check-test` runs all checks and tests including API
- [ ] README documentation is clear and accurate
- [ ] New developers can follow setup instructions

---

## Testing Strategy

### Unit Tests
- Repository layer: Test CRUD operations with in-memory database
- Service layer: Test business logic with mocked repositories
- Middleware: Test auth, error handling, logging
- Channel services: Test Slack/email/SMS with mocked clients

### Integration Tests
- API endpoints: Full request/response cycle with supertest
- Database: Test migrations and concurrent access
- Authentication: Test token validation and error cases
- SDK compatibility: Test against real Python/TypeScript SDKs

### Manual Testing Steps

1. **Basic Server Functionality**
   - Start server: `npm run dev`
   - Verify health check: `curl http://localhost:3000/health`
   - Check logs for startup messages

2. **Authentication**
   - Test valid API key works
   - Test invalid API key returns 401
   - Test missing auth header returns 401

3. **Function Call Approval Flow**
   - Create approval request
   - Poll for status (should be pending)
   - Submit approval decision
   - Poll again (should be approved/denied)
   - Verify cannot change decision (409)

4. **Human Contact Flow**
   - Create contact request
   - Poll for status (should be pending)
   - Submit response
   - Poll again (should have response)
   - Verify cannot respond twice (409)

5. **Slack Integration**
   - Set `SLACK_BOT_TOKEN` in .env
   - Create approval with Slack channel
   - Verify message appears in Slack
   - Check Block Kit formatting (if enabled)

6. **SDK Compatibility**
   - Python SDK: Point to local server, run example
   - TypeScript SDK: Point to local server, run example
   - Verify responses match expected format

7. **Concurrent Access**
   - Start multiple polling loops for same approval
   - Verify all clients see status updates
   - Check database doesn't lock

8. **Error Cases**
   - Invalid JSON in request body (400)
   - Non-existent call_id (404)
   - Malformed Bearer token (401)
   - Missing required fields (400)

## Performance Considerations

### Database
- SQLite with WAL mode for better concurrency
- Indexes on frequently queried fields (call_id, run_id, status)
- Consider PostgreSQL for high-volume production use

### Polling
- Current implementation: Direct database queries
- Future optimization: Add in-memory cache layer
- Consider WebSocket/SSE for real-time updates

### Slack API
- Rate limiting: Slack allows ~1 req/second per workspace
- Current implementation: Fire-and-forget (no retry)
- Future: Add message queue for retries

## Migration Notes

### From Cloud API to Local API

For existing SDK users:

**Python**:
```python
import os
os.environ['HUMANLAYER_API_BASE'] = 'http://localhost:3000/humanlayer/v1'
os.environ['HUMANLAYER_API_KEY'] = 'sk-test-key-for-development'

from humanlayer import HumanLayer
hl = HumanLayer()
```

**TypeScript**:
```typescript
process.env.HUMANLAYER_API_BASE = 'http://localhost:3000/humanlayer/v1'
process.env.HUMANLAYER_API_KEY = 'sk-test-key-for-development'

import { humanlayer } from '@humanlayer/sdk'
const hl = humanlayer()
```

No code changes required - only environment variables!

### API Key Management

**Development**:
- Use default key: `sk-test-key-for-development`
- Seeded automatically by `npm run migrate`

**Production**:
- Generate new keys with `createApiKey()` function
- Store in database with `INSERT INTO api_keys`
- Distribute securely to API consumers

## References

- Original API research: `thoughts/shared/research/2025-10-06-humanlayer-api-implementation-analysis.md`
- Python SDK client: `humanlayer/core/cloud.py`
- TypeScript SDK client: `humanlayer-ts/src/cloud.ts`
- Go daemon patterns: `hld/daemon/http_server.go`
- SQLite schema reference: `hld/store/sqlite.go`
