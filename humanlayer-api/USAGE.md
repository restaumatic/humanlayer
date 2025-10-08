# HumanLayer API Usage Guide

## Quick Start

### 1. Start the Services

```bash
# Terminal 1: Start the API server
cd humanlayer-api
npm start

# Terminal 2: Start the hld daemon
cd hld
./hld

# Terminal 3: Use the CLI
cd hlyr
export HUMANLAYER_API_KEY="sk-test-key"
node dist/index.js ping
```

## Using the CLI (hlyr)

### Check Connection
```bash
export HUMANLAYER_API_KEY="sk-test-key"
node dist/index.js ping
```

### Contact a Human
```bash
echo "Should we deploy to production?" | node dist/index.js contact_human -m -
```

### Show Configuration
```bash
node dist/index.js config show
```

## Using the API Directly

### Create an Approval Request
```bash
curl -X POST http://localhost:8082/humanlayer/v1/function_calls \
  -H "Authorization: Bearer sk-test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "deploy-prod-001",
    "run_id": "session-123",
    "spec": {
      "fn": "deploy_to_production",
      "kwargs": {"environment": "prod", "version": "v2.0"}
    }
  }'
```

### Check Status
```bash
curl http://localhost:8082/humanlayer/v1/function_calls/deploy-prod-001 \
  -H "Authorization: Bearer sk-test-key"
```

### Approve the Request
```bash
curl -X POST http://localhost:8082/humanlayer/v1/function_calls/deploy-prod-001/respond \
  -H "Authorization: Bearer sk-test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "responded_at": "2025-10-06T17:00:00Z",
    "comment": "Approved for deployment"
  }'
```

### Create a Human Contact Request
```bash
curl -X POST http://localhost:8082/humanlayer/v1/contact_requests \
  -H "Authorization: Bearer sk-test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "question-001",
    "run_id": "session-123",
    "spec": {
      "msg": "Database migration ready. Proceed?",
      "subject": "Database Migration",
      "response_options": [
        {"name": "yes", "title": "Yes, proceed"},
        {"name": "no", "title": "No, cancel"}
      ]
    }
  }'
```

### Respond to Contact Request
```bash
curl -X POST http://localhost:8082/humanlayer/v1/contact_requests/question-001/respond \
  -H "Authorization: Bearer sk-test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "Yes, proceed",
    "response_option_name": "yes",
    "responded_at": "2025-10-06T17:05:00Z"
  }'
```

## Using with Python SDK

```python
from humanlayer import HumanLayer

hl = HumanLayer(
    api_key="sk-test-key",
    api_base_url="http://localhost:8082/humanlayer/v1"
)

@hl.require_approval()
def delete_user(user_id: int):
    """This will require human approval before executing"""
    print(f"Deleting user {user_id}")
    return f"User {user_id} deleted"

# This will create an approval request and wait for response
result = delete_user(user_id=42)
```

## Using with TypeScript SDK

```typescript
import { HumanLayer } from '@humanlayer/sdk';

const hl = new HumanLayer({
  apiKey: 'sk-test-key',
  apiBaseUrl: 'http://localhost:8082/humanlayer/v1'
});

const result = await hl.contactHuman({
  msg: 'Should we proceed with the deployment?',
  responseOptions: [
    { name: 'yes', title: 'Yes, deploy' },
    { name: 'no', title: 'No, hold off' }
  ]
});

console.log('Human response:', result.response);
```

## Slack Integration

To enable Slack notifications, set environment variables:

```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_SIGNING_SECRET="your-signing-secret"
```

Then configure your Slack app to send interactive events to:
```
http://your-domain/slack/interactions
```

## Demo Script

Run the complete demo workflow:

```bash
cd humanlayer-api
chmod +x demo-workflow.sh
./demo-workflow.sh
```

This demonstrates:
1. Creating approval requests
2. Checking status
3. Approving requests
4. Creating human contact requests
5. Responding to contacts

## API Endpoints

- `GET /health` - Health check
- `GET /humanlayer/v1/project` - Get project info
- `POST /humanlayer/v1/function_calls` - Create approval request
- `GET /humanlayer/v1/function_calls/:call_id` - Get approval status
- `POST /humanlayer/v1/function_calls/:call_id/respond` - Respond to approval
- `POST /humanlayer/v1/contact_requests` - Create human contact
- `GET /humanlayer/v1/contact_requests/:call_id` - Get contact status
- `POST /humanlayer/v1/contact_requests/:call_id/respond` - Respond to contact
- `POST /slack/interactions` - Slack webhook (no auth, uses signature verification)

## Default API Key

For local development, the default API key is: `sk-test-key`

This is pre-configured in the database and should only be used for testing.
