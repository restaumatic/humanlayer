#!/bin/bash

# Simple integration test script for HumanLayer API
# Tests all 8 endpoints with real HTTP calls

set +e

API_KEY="sk-test-key"
BASE_URL="http://localhost:8082/humanlayer/v1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

success_count=0
fail_count=0

test_endpoint() {
  local name="$1"
  local expected_status="$2"
  shift 2
  local response=$(curl -s -w "\n%{http_code}" "$@")
  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} $name (HTTP $status)"
    ((success_count++))
    return 0
  else
    echo -e "${RED}✗${NC} $name (expected $expected_status, got $status)"
    echo "  Response: $body"
    ((fail_count++))
    return 1
  fi
}

echo "=== HumanLayer API Integration Tests ==="
echo ""

echo "--- Health & Auth Tests ---"
test_endpoint "Health check (no auth)" 200 \
  http://localhost:8082/health

test_endpoint "Missing auth header" 401 \
  $BASE_URL/function_calls

test_endpoint "Invalid API key" 401 \
  -H "Authorization: Bearer invalid-key" \
  $BASE_URL/function_calls

echo ""
echo "--- Function Call Approval Tests ---"

test_endpoint "Create function call approval" 201 \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-run-1",
    "call_id": "test-approval-1",
    "spec": {
      "fn": "send_email",
      "kwargs": {"to": "user@example.com", "subject": "Test", "body": "Hello"}
    }
  }' \
  $BASE_URL/function_calls

test_endpoint "Get function call status (pending)" 200 \
  -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/function_calls/test-approval-1

test_endpoint "Respond to function call (approve)" 200 \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "requested_at": "2025-10-06T13:00:00Z",
    "responded_at": "2025-10-06T13:05:00Z",
    "approved": true,
    "comment": "Looks good!"
  }' \
  $BASE_URL/agent/function_calls/test-approval-1/respond

test_endpoint "Get function call status (approved)" 200 \
  -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/function_calls/test-approval-1

test_endpoint "Double response prevention" 409 \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "requested_at": "2025-10-06T13:00:00Z",
    "responded_at": "2025-10-06T13:06:00Z",
    "approved": false
  }' \
  $BASE_URL/agent/function_calls/test-approval-1/respond

echo ""
echo "--- Human Contact Tests ---"

test_endpoint "Create human contact request" 201 \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-run-1",
    "call_id": "test-contact-1",
    "spec": {
      "msg": "Should I proceed with the deployment?",
      "subject": "Deployment Confirmation"
    }
  }' \
  $BASE_URL/contact_requests

test_endpoint "Get human contact (pending)" 200 \
  -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/contact_requests/test-contact-1

test_endpoint "Respond to human contact" 200 \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "responded_at": "2025-10-06T13:10:00Z",
    "response": "Yes, go ahead with the deployment"
  }' \
  $BASE_URL/agent/human_contacts/test-contact-1/respond

test_endpoint "Get human contact (with response)" 200 \
  -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/contact_requests/test-contact-1

echo ""
echo "=== Test Summary ==="
echo -e "${GREEN}Passed: $success_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"

if [ $fail_count -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed${NC}"
  exit 1
fi
