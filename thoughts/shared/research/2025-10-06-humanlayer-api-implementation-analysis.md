---
date: 2025-10-06T08:56:30Z
researcher: Claude Code
git_commit: 2123ad562ce4e1f45f94cda2f573a77119704c20
branch: main
repository: humanlayer
topic: "HumanLayer API (api.humanlayer.dev/humanlayer/v1) Implementation Analysis"
tags: [research, codebase, humanlayer-api, sdk, python, typescript, go, rest-api]
status: complete
last_updated: 2025-10-06
last_updated_by: Claude Code
---

# Research: HumanLayer API Implementation Analysis

**Date**: 2025-10-06T08:56:30Z
**Researcher**: Claude Code
**Git Commit**: 2123ad562ce4e1f45f94cda2f573a77119704c20
**Branch**: main
**Repository**: humanlayer

## Research Question

How is the https://api.humanlayer.dev/humanlayer/v1 API used in this repository? What are the request and response patterns that we need to understand to create our own implementation?

## Summary

The HumanLayer Cloud API (`https://api.humanlayer.dev/humanlayer/v1`) is a REST API that provides human-in-the-loop capabilities for AI agents. The API is accessed through three SDK implementations (Python, TypeScript, Go) that all follow similar patterns:

- **8 Core Endpoints**: 4 for function call approvals + 4 for human contact requests
- **Authentication**: Bearer token via `Authorization` header
- **Polling Pattern**: 3-second intervals to check approval/response status
- **Data Models**: Pydantic (Python), TypeScript interfaces, Go structs with JSON tags
- **Channels**: Slack, Email, SMS, WhatsApp for human contact
- **Request/Response**: All JSON with consistent structure across SDKs

The API enables two primary workflows:
1. **Function Approvals** - AI agents request permission before executing sensitive operations
2. **Human Contact** - AI agents ask humans questions and receive responses

## API Base URL and Configuration

**Default Endpoint**: `https://api.humanlayer.dev/humanlayer/v1`

**Configuration Locations**:
- Python SDK: `humanlayer/core/cloud.py:33`
- TypeScript SDK: `humanlayer-ts/src/cloud.ts:20`
- Go SDK: `humanlayer-go/client.go:43`
- HLD Daemon: `hld/config/config.go:104`
- hlyr CLI: `hlyr/src/config.ts:91`

**Environment Variables**:
- `HUMANLAYER_API_KEY` - Authentication token (required)
- `HUMANLAYER_API_BASE` or `HUMANLAYER_API_BASE_URL` - Override default endpoint
- `HUMANLAYER_HTTP_TIMEOUT_SECONDS` - HTTP timeout (default: 30s in Python/Go, 10s in TypeScript)

## Detailed Findings

### Authentication

All three SDKs use identical Bearer token authentication:

**Header Format**:
```
Authorization: Bearer {api_key}
```

**API Key Resolution Priority**:
1. Explicit constructor parameter (e.g., `HumanLayer(api_key="...")`)
2. Environment variable `HUMANLAYER_API_KEY`
3. Error if neither is provided

**Implementation References**:
- Python: `humanlayer/core/cloud.py:48` - Sets header in `request()` method
- TypeScript: `humanlayer-ts/src/cloud.ts:36` - Sets in fetch headers
- Go: `humanlayer-go/client.go:109` - Sets via `req.Header.Set()`

### Core API Endpoints

#### 1. Function Calls (Approval Workflows)

**Create Function Call**
- **Endpoint**: `POST /function_calls`
- **Purpose**: Request human approval before executing a function
- **Request Body**:
```json
{
  "run_id": "agent-abc123",
  "call_id": "call-xyz789",
  "spec": {
    "fn": "delete_database",
    "kwargs": {"database": "production"},
    "channel": {
      "slack": {
        "channel_or_user_id": "C123456",
        "context_about_channel_or_user": "engineering channel"
      }
    },
    "reject_options": [
      {
        "name": "too_risky",
        "title": "Too Risky",
        "description": "This operation is too risky"
      }
    ]
  }
}
```
- **Response**: Same structure with `status` field added
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:58-70`
  - TypeScript: `humanlayer-ts/src/cloud.ts:57-65`
  - Go: Not directly exposed (uses pending endpoint)

**Get Function Call Status**
- **Endpoint**: `GET /function_calls/{call_id}`
- **Purpose**: Check if approval has been granted/denied
- **Response**:
```json
{
  "run_id": "agent-abc123",
  "call_id": "call-xyz789",
  "spec": { ... },
  "status": {
    "requested_at": "2025-10-06T10:30:00Z",
    "responded_at": "2025-10-06T10:35:00Z",
    "approved": true,
    "comment": "Looks good",
    "slack_message_ts": "1696587300.123456"
  }
}
```
- **Polling Usage**: Called every 3 seconds until `status.approved` is not null
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:72-85` (called from `approval.py:391-398`)
  - TypeScript: `humanlayer-ts/src/cloud.ts:67-74` (called from `approval.ts:188-206`)
  - Go: `humanlayer-go/client.go:131-153` (uses `/agent/function_calls/pending` instead)

**Respond to Function Call**
- **Endpoint**: `POST /agent/function_calls/{call_id}/respond`
- **Purpose**: Submit approval decision (typically called by approval UI or agent)
- **Request Body**:
```json
{
  "requested_at": "2025-10-06T10:30:00Z",
  "responded_at": "2025-10-06T10:35:00Z",
  "approved": true,
  "comment": "Looks good"
}
```
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:87-96`
  - TypeScript: `humanlayer-ts/src/cloud.ts:76-84`
  - Go: `humanlayer-go/client.go:181-189`

**Escalate via Email**
- **Endpoint**: `POST /agent/function_calls/{call_id}/escalate_email`
- **Purpose**: Escalate pending approval to additional recipients
- **Request Body**:
```json
{
  "escalation_msg": "URGENT: Still awaiting approval",
  "channel": {
    "email": {
      "address": "ceo@company.com"
    }
  },
  "additional_recipients": [
    {
      "address": "vp@company.com",
      "field": "cc",
      "context_about_user": "VP of Operations"
    }
  ]
}
```
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:98-106`
  - TypeScript: `humanlayer-ts/src/cloud.ts:86-94`
  - Go: Not implemented

#### 2. Human Contacts (Question/Response)

**Create Contact Request**
- **Endpoint**: `POST /contact_requests`
- **Purpose**: Ask a human a question
- **Request Body**:
```json
{
  "run_id": "agent-abc123",
  "call_id": "human_call-xyz789",
  "spec": {
    "msg": "What is the customer's preferred color?",
    "subject": "Question about customer preferences",
    "channel": {
      "slack": {
        "channel_or_user_id": "U8675309"
      }
    },
    "response_options": [
      {
        "name": "blue",
        "title": "Blue",
        "description": "Customer prefers blue"
      },
      {
        "name": "red",
        "title": "Red"
      }
    ]
  }
}
```
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:113-125`
  - TypeScript: `humanlayer-ts/src/cloud.ts:104-112`
  - Go: Not directly exposed

**Get Contact Response**
- **Endpoint**: `GET /contact_requests/{call_id}`
- **Purpose**: Check if human has responded
- **Response**:
```json
{
  "run_id": "agent-abc123",
  "call_id": "human_call-xyz789",
  "spec": { ... },
  "status": {
    "requested_at": "2025-10-06T10:30:00Z",
    "responded_at": "2025-10-06T10:32:00Z",
    "response": "The customer prefers blue",
    "response_option_name": "blue"
  }
}
```
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:127-141`
  - TypeScript: `humanlayer-ts/src/cloud.ts:114-121`
  - Go: `humanlayer-go/client.go:156-178` (uses `/agent/human_contacts/pending`)

**Respond to Contact**
- **Endpoint**: `POST /agent/human_contacts/{call_id}/respond`
- **Purpose**: Submit response to human contact request
- **Request Body**:
```json
{
  "requested_at": "2025-10-06T10:30:00Z",
  "responded_at": "2025-10-06T10:32:00Z",
  "response": "The customer prefers blue",
  "response_option_name": "blue"
}
```
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:143-152`
  - TypeScript: `humanlayer-ts/src/cloud.ts:123-131`
  - Go: `humanlayer-go/client.go:212-223`

**Escalate Contact via Email**
- **Endpoint**: `POST /agent/human_contacts/{call_id}/escalate_email`
- **Purpose**: Escalate unanswered question to additional recipients
- **Request Body**: Same format as function call escalation
- **Implementation**:
  - Python: `humanlayer/core/cloud.py:154-162`
  - TypeScript: `humanlayer-ts/src/cloud.ts:133-141`
  - Go: Not implemented

### Contact Channels

All endpoints that create requests support a `channel` field to specify how to contact humans:

**Slack Channel**:
```json
{
  "slack": {
    "channel_or_user_id": "C123456",
    "context_about_channel_or_user": "engineering channel",
    "bot_token": "xoxb-optional-custom-token",
    "experimental_slack_blocks": true,
    "thread_ts": "1696587300.123456"
  }
}
```
- **Models**: `humanlayer/core/models.py:10-38`, `humanlayer-ts/src/models.ts:10-20`

**Email Channel**:
```json
{
  "email": {
    "address": "user@example.com",
    "context_about_user": "VP of Engineering",
    "additional_recipients": [
      {
        "address": "manager@example.com",
        "field": "cc",
        "context_about_user": "Engineering Manager"
      }
    ],
    "experimental_subject_line": "Approval Required",
    "template": "{{ approval_message }}"
  }
}
```
- **Models**: `humanlayer/core/models.py:74-136`, `humanlayer-ts/src/models.ts:32-44`

**SMS/WhatsApp Channels**:
```json
{
  "sms": {
    "phone_number": "+15555551234",
    "context_about_user": "On-call engineer"
  }
}
```
- **Models**: `humanlayer/core/models.py:41-72`, `humanlayer-ts/src/models.ts:22-30`

### Request/Response Data Models

#### FunctionCall Model

**Python** (`humanlayer/core/models.py:216-231`):
```python
class FunctionCall(BaseModel):
    run_id: str
    call_id: str
    spec: FunctionCallSpec
    status: FunctionCallStatus | None = None
```

**TypeScript** (`humanlayer-ts/src/models.ts:79-85`):
```typescript
type FunctionCall = {
  run_id: string
  call_id: string
  spec: FunctionCallSpec
  status?: FunctionCallStatus
}
```

**Go** (`humanlayer-go/models.go:46-51`):
```go
type FunctionCall struct {
    RunID  string              `json:"run_id"`
    CallID string              `json:"call_id"`
    Spec   FunctionCallSpec    `json:"spec"`
    Status *FunctionCallStatus `json:"status,omitempty"`
}
```

#### FunctionCallSpec Model

**Python** (`humanlayer/core/models.py:173-178`):
```python
class FunctionCallSpec(BaseModel):
    fn: str  # Function name
    kwargs: dict  # Function arguments
    channel: ContactChannel | None = None
    reject_options: list[ResponseOption] | None = None
    state: dict | None = None
```

**TypeScript** (`humanlayer-ts/src/models.ts:67-77`):
```typescript
type FunctionCallSpec = {
  fn: string
  kwargs: Record<string, any>
  channel?: ContactChannel
  reject_options?: ResponseOption[]
  state?: Record<string, any>
}
```

**Go** (`humanlayer-go/models.go:54-60`):
```go
type FunctionCallSpec struct {
    Fn            string                     `json:"fn"`
    Kwargs        map[string]interface{}     `json:"kwargs"`
    Channel       *ContactChannel            `json:"channel,omitempty"`
    RejectOptions []ResponseOption           `json:"reject_options,omitempty"`
    State         map[string]interface{}     `json:"state,omitempty"`
}
```

#### FunctionCallStatus Model

**Python** (`humanlayer/core/models.py:181-213`):
```python
class FunctionCallStatus(BaseModel):
    requested_at: datetime | None = None
    responded_at: datetime | None = None
    approved: bool | None = None
    comment: str | None = None
    reject_option_name: str | None = None
    slack_message_ts: str | None = None
```

**TypeScript** (`humanlayer-ts/src/models.ts:1-8`):
```typescript
type FunctionCallStatus = {
  requested_at: Date
  responded_at?: Date
  approved?: boolean
  comment?: string
  reject_option_name?: string
  slack_message_ts?: string
}
```

**Go** (`humanlayer-go/models.go:63-70`):
```go
type FunctionCallStatus struct {
    RequestedAt      *CustomTime `json:"requested_at,omitempty"`
    RespondedAt      *CustomTime `json:"responded_at,omitempty"`
    Approved         *bool       `json:"approved,omitempty"`
    Comment          string      `json:"comment,omitempty"`
    UserInfo         *UserInfo   `json:"user_info,omitempty"`
    RejectOptionName string      `json:"reject_option_name,omitempty"`
}
```

### HTTP Client Implementations

#### Python HTTP Client

**Synchronous** (`humanlayer/core/cloud.py:39-51`):
```python
def request(self, method: str, path: str, **kwargs) -> requests.Response:
    return requests.request(
        method,
        f"{self.api_base_url}{path}",
        headers={"Authorization": f"Bearer {self.api_key}"},
        timeout=self.http_timeout_seconds,
        **kwargs,
    )
```

**Asynchronous** (`humanlayer/core/async_cloud.py:41-64`):
```python
async def request(self, method: str, path: str, **kwargs: Any) -> Dict[str, Any]:
    async with (
        aiohttp.ClientSession(headers={"Authorization": f"Bearer {self.api_key}"}) as session,
        session.request(
            method,
            f"{self.api_base_url}{path}",
            **kwargs,
            timeout=aiohttp.ClientTimeout(total=self.http_timeout_seconds),
        ) as response,
    ):
        response_json = await response.json()
        HumanLayerException.raise_for_status(response)
        return dict(response_json)
```

#### TypeScript HTTP Client

**Fetch-based** (`humanlayer-ts/src/cloud.ts:24-47`):
```typescript
async request({
  method,
  path,
  body,
}: {
  method: string
  path: string
  body?: any
}): Promise<Response> {
  const resp = await fetch(`${this.apiBaseURL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${this.apiKey}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (resp.status >= 400) {
    throw new HumanLayerException(await resp.text())
  }

  return resp
}
```

#### Go HTTP Client

**Standard Library** (`humanlayer-go/client.go:92-128`):
```go
func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
    url := c.baseURL + path

    var reqBody io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, fmt.Errorf("failed to marshal request body: %w", err)
        }
        reqBody = bytes.NewBuffer(jsonBody)
    }

    req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }

    req.Header.Set("Authorization", "Bearer "+c.apiKey)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Accept", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("failed to execute request: %w", err)
    }

    if resp.StatusCode >= 400 {
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()
        return nil, &APIError{
            StatusCode: resp.StatusCode,
            Body:       string(body),
        }
    }

    return resp, nil
}
```

### Polling Mechanism

All SDKs use a polling pattern to wait for approval/response decisions:

**Python Polling Loop** (`humanlayer/core/approval.py:391-398`):
```python
while True:
    self.sleep(3)  # 3 seconds
    call = self.get_function_call(call.call_id)
    if call.status is None:
        continue
    if call.status.approved is None:
        continue
    return FunctionCall.Completed(call=call)
```

**TypeScript Polling Loop** (`humanlayer-ts/src/approval.ts:188-206`):
```typescript
while (true) {
  await this.sleep(3000)  // 3 seconds
  const functionCall = await backend.functions().get(callId)
  if (functionCall.status?.approved === null ||
      typeof functionCall.status?.approved === 'undefined') {
    continue
  }
  if (functionCall.status?.approved) {
    return fn(kwargs)
  } else {
    return `User denied function with comment: ${functionCall.status?.comment}`
  }
}
```

**Go Alternative** (uses pending endpoint instead of polling individual calls):
```go
// Go SDK uses GET /agent/function_calls/pending
// Returns all pending approvals instead of polling single call
calls, err := client.GetPendingFunctionCalls(ctx)
```

### Error Handling Patterns

#### Python Error Handling

**Custom Exception** (`humanlayer/core/protocol.py:69-98`):
```python
class HumanLayerException(Exception):
    @staticmethod
    def raise_for_status(resp: requests.Response | aiohttp.ClientResponse) -> None:
        if isinstance(resp, requests.Response):
            try:
                resp.raise_for_status()
            except requests.HTTPError as e:
                raise HumanLayerException(f"{e}: {resp.text}") from e
        elif not resp.ok:
            # aiohttp case
            e = aiohttp.ClientResponseError(...)
            raise HumanLayerException(f"{e}: {e!s}")
```

**Usage** (`humanlayer/core/cloud.py:68`):
```python
HumanLayerException.raise_for_status(resp)
```

#### TypeScript Error Handling

**Exception Class** (`humanlayer-ts/src/protocol.ts:21`):
```typescript
export class HumanLayerException extends Error {}
```

**Usage** (`humanlayer-ts/src/cloud.ts:42-44`):
```typescript
if (resp.status >= 400) {
  throw new HumanLayerException(await resp.text())
}
```

#### Go Error Handling

**Custom Error Type** (`humanlayer-go/client.go:14-28`):
```go
type APIError struct {
    StatusCode int
    Body       string
}

func (e *APIError) Error() string {
    return fmt.Sprintf("API error (status %d): %s", e.StatusCode, e.Body)
}

func (e *APIError) IsConflict() bool {
    return e.StatusCode == http.StatusConflict
}
```

**Usage** (`humanlayer-go/client.go:118-125`):
```go
if resp.StatusCode >= 400 {
    body, _ := io.ReadAll(resp.Body)
    resp.Body.Close()
    return nil, &APIError{
        StatusCode: resp.StatusCode,
        Body:       string(body),
    }
}
```

## Code References

### Python SDK
- `humanlayer/core/cloud.py:24-51` - Synchronous HTTP client connection
- `humanlayer/core/cloud.py:54-106` - Function call store implementation
- `humanlayer/core/cloud.py:109-162` - Human contact store implementation
- `humanlayer/core/async_cloud.py:25-149` - Async versions of all clients
- `humanlayer/core/models.py:1-266` - Pydantic data models
- `humanlayer/core/approval.py:73-398` - High-level approval decorator
- `humanlayer/core/protocol.py:18-98` - Protocol/interface definitions

### TypeScript SDK
- `humanlayer-ts/src/cloud.ts:10-162` - HTTP client and stores
- `humanlayer-ts/src/models.ts:1-120` - TypeScript type definitions
- `humanlayer-ts/src/approval.ts:30-348` - HumanLayer class and decorators
- `humanlayer-ts/src/protocol.ts:9-26` - Protocol interfaces

### Go SDK
- `humanlayer-go/client.go:30-223` - Client implementation with all methods
- `humanlayer-go/models.go:1-120` - Go struct definitions
- `humanlayer-go/README.md` - Usage documentation

### Configuration
- `hld/config/config.go:104` - Daemon API configuration
- `hlyr/src/config.ts:91` - CLI configuration
- `humanlayer-wui/src/lib/daemon/http-config.ts` - WUI configuration (note: WUI connects to local daemon, not cloud API directly)

### Examples
- `examples/langchain/01-math_example.py` - Basic approval decorator
- `examples/langchain/02-customer_email.py` - Slack channel configuration
- `examples/langchain/04-human_as_tool_linkedin.py` - Human-as-tool pattern
- `examples/openai_client/04-agent-side-approvals.py` - Imperative polling
- `examples/flask/app-webhooks.py` - Webhook-based approvals
- `examples/ts_email_escalation/email-escalation.ts` - Email escalation
- `examples/ts_openai_client/02-human-as-tool.ts` - TypeScript human-as-tool

## Architecture Insights

### Protocol Pattern (Abstraction Layer)

All three SDKs follow a similar architectural pattern with protocol/interface abstraction:

**Python** (`humanlayer/core/protocol.py:18-66`):
- Generic `AgentStore[T_Call, T_Status]` interface
- Concrete `CloudFunctionCallStore` and `CloudHumanContactStore` implementations
- `AgentBackend` interface with `functions()` and `contacts()` methods

**TypeScript** (`humanlayer-ts/src/protocol.ts:9-26`):
- `AgentStore<T_Call, T_Status>` type definition
- `AgentBackend` type with `functions()` and `contacts()` methods
- Concrete implementations in cloud.ts

**Go** (no formal protocol):
- Direct method implementation on `Client` struct
- No interface abstraction (minimal design)

### Dual Transport (Python Only)

Python provides both synchronous and asynchronous implementations:
- Sync: Uses `requests` library
- Async: Uses `aiohttp` library
- Identical API surface between sync/async versions

TypeScript and Go are async-only (async/await in TS, context-based in Go).

### Polling vs. Pending Endpoints

**Python/TypeScript Approach**:
- Create request → Get call_id → Poll `GET /function_calls/{call_id}` every 3s
- Simple but potentially higher API call volume

**Go Approach**:
- Uses `GET /agent/function_calls/pending` to fetch all pending approvals
- More efficient for batch processing
- Better for approval management UIs

Both approaches are valid depending on use case.

### State Management

The `state` field in specs allows passing arbitrary JSON through the approval lifecycle:
- Preserved across the entire request/response flow
- Useful for correlation, context, or debugging
- Not interpreted by the API

### ID Generation

**Python** (`humanlayer/core/approval.py:82-85`):
```python
def genid(self, prefix: str) -> str:
    agent_slug = self.agent_name.replace(" ", "-").lower()
    return f"{agent_slug}-{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
```

**TypeScript** (`humanlayer-ts/src/approval.ts:27`):
```typescript
genid = (prefix: string) => crypto.randomUUID()
```

**Go**: Not provided - users supply their own IDs

### Architecture Flow

```
┌─────────────────┐
│  AI Agent       │
│  (LangChain,    │
│   OpenAI, etc.) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────────────┐
│  HumanLayer SDK │────────▶│  api.humanlayer.dev  │
│  (Py/TS/Go)     │  HTTPS  │  /humanlayer/v1      │
└─────────────────┘         └──────────┬───────────┘
         │                              │
         │ Polling                      │ Webhooks
         │ (3s interval)                ▼
         │                   ┌──────────────────────┐
         └───────────────────│  Approval UI         │
                             │  (Slack/Email/etc.)  │
                             └──────────────────────┘
```

**Alternative Flow (WUI)**:
```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│  WUI        │─────▶│  HLD Daemon │─────▶│  api.humanlayer  │
│  (Frontend) │ HTTP │  (localhost) │ HTTPS│  .dev/v1         │
└─────────────┘      └─────────────┘      └──────────────────┘
```

The WUI does not communicate with the cloud API directly - it connects to the local HLD daemon, which in turn may communicate with the cloud API.

## Usage Patterns Summary

1. **Decorator Pattern** - Simplest approach, works with all frameworks
2. **Human-as-Tool** - Enables agents to ask humans questions
3. **Imperative Fetch** - Full control over approval logic and timing
4. **Webhook Pattern** - Async/non-blocking for web applications
5. **Email Escalation** - Multi-tier approval with timeout handling
6. **Direct API Usage** - Low-level control for custom implementations

See example files in `examples/` directory for concrete implementations of each pattern.

## Implementation Recommendations

To create your own implementation of the HumanLayer API:

### 1. Core Endpoints to Implement

**Minimum Viable API**:
- `POST /function_calls` - Create approval request
- `GET /function_calls/{call_id}` - Get approval status
- `POST /agent/function_calls/{call_id}/respond` - Submit approval decision
- `POST /contact_requests` - Create human contact request
- `GET /contact_requests/{call_id}` - Get contact response

**Optional but Recommended**:
- `GET /agent/function_calls/pending` - List all pending approvals (more efficient than polling)
- `POST /agent/function_calls/{call_id}/escalate_email` - Escalation support
- Webhook delivery for async notifications

### 2. Authentication

- Use Bearer token authentication
- Support `Authorization: Bearer {token}` header
- Environment variable: `HUMANLAYER_API_KEY`
- Return 401 for missing/invalid tokens

### 3. Data Models

**Required Fields**:
- `run_id` - Agent/session identifier
- `call_id` - Unique request identifier
- `spec.fn` - Function name
- `spec.kwargs` - Function arguments (arbitrary JSON)
- `status.approved` - Tri-state: null (pending), true (approved), false (denied)

**Optional but Recommended**:
- `spec.channel` - Contact channel configuration
- `spec.reject_options` - Structured rejection reasons
- `spec.state` - Arbitrary metadata passthrough
- `status.comment` - Approval/denial reason
- `status.requested_at` / `status.responded_at` - Timestamps

### 4. Polling vs. Webhooks

**Support Both**:
- Polling: Simple, works everywhere, but higher load
- Webhooks: Efficient, but requires HTTP endpoint from client

**Webhook Events to Support**:
- `function_call.completed` - Approval decision made
- `human_contact.completed` - Human responded
- `agent_slack.received` - Slack message received
- `agent_email.received` - Email received

### 5. Contact Channels

**Minimum**:
- Email channel support
- Slack channel support (requires Slack app integration)

**Optional**:
- SMS via Twilio
- WhatsApp
- Custom webhook channels

### 6. Error Handling

**HTTP Status Codes**:
- 200 - Success
- 201 - Created (for POST requests)
- 400 - Bad request (invalid JSON, missing required fields)
- 401 - Unauthorized (missing/invalid API key)
- 404 - Not found (invalid call_id)
- 409 - Conflict (already responded)
- 500 - Internal server error

**Error Response Format**:
```json
{
  "error": "Description of error",
  "code": "error_code",
  "details": { ... }
}
```

### 7. Rate Limiting

Consider implementing rate limits to prevent abuse:
- Polling endpoints: Lower limits (e.g., 60 req/min per API key)
- Write endpoints: Higher limits (e.g., 600 req/min)
- Return 429 status code when exceeded

### 8. Storage Requirements

**Minimum State to Store**:
- Function calls and contact requests (with full spec)
- Approval/response status
- Timestamps (requested_at, responded_at)
- Association with API keys for multi-tenancy

**Retention**:
- Keep completed approvals for at least 30 days
- Consider archiving old data

### 9. Testing

Use the test patterns from the SDKs:
- Mock backend for unit tests
- Integration tests against real API
- Webhook delivery testing
- Polling timeout scenarios

## Open Questions

1. **Pagination**: The Go SDK shows pagination support in responses (`has_more`, `offset`, `limit`), but Python/TypeScript ignore it. Should pagination be enforced for large result sets?

2. **WebSocket Support**: Go SDK README mentions WebSocket as future work (line 88). Would real-time updates be more efficient than polling?

3. **Bulk Operations**: No batch endpoints exist. Would `POST /function_calls/bulk` be useful for creating multiple approvals at once?

4. **Approval Expiration**: No TTL or expiration mechanism observed. Should approvals auto-expire after a timeout?

5. **Audit Trail**: Status only shows final state. Should intermediate state changes be tracked (e.g., escalation history)?

6. **Authentication Refresh**: All implementations use static Bearer tokens. Should there be token refresh or rotation support?

7. **File Attachments**: Email channel supports templates but no mention of file attachments. Is this supported?

8. **Response Validation**: `response_options` provides structured responses, but are free-text responses also allowed?

## Related Research

This is the first research document on the HumanLayer API implementation. Future research topics could include:

- Webhook implementation patterns and delivery guarantees
- Slack integration architecture and Block Kit usage
- Email template system and customization
- Performance characteristics and scalability of polling vs. webhooks
- Multi-tenant isolation and API key management
