# HumanLayer API (Node.js/TypeScript Implementation)

Complete replacement for the HumanLayer Cloud API implemented with Express.js, TypeScript, and SQLite.

## Features

- ✅ 8 Core API endpoints (function call approvals + human contacts)
- ✅ Bearer token authentication
- ✅ SQLite database with migrations
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

- `DATABASE_PATH` - SQLite database location (default: `./data/humanlayer.db`)
- `PORT` - Server port (default: 3000)
- `DEFAULT_API_KEY` - API key for development (default: `sk-test-key-for-development`)

Optional:

- `SLACK_BOT_TOKEN` - Your Slack bot token for Slack integration

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

### Using Make

```bash
make check    # Run all quality checks
make build    # Build for production
make test     # Run tests
make migrate  # Run database migrations
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
├── channels/             # Channel integrations (planned)
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

Tables:

- `api_keys` - API key storage
- `function_calls` - Function call approval requests
- `function_call_status` - Approval decisions (1:1)
- `human_contacts` - Human contact requests
- `human_contact_status` - Human responses (1:1)

## Architecture

- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x (strict mode)
- **Database**: SQLite with better-sqlite3 (WAL mode)
- **Testing**: Vitest
- **Validation**: Zod for runtime type safety
- **Authentication**: Bearer token with SHA-256 hashing

## License

Same as parent humanlayer repository.
