#!/bin/bash
set -e

API_BASE="http://localhost:8082/humanlayer/v1"
API_KEY="sk-test-key"

echo "🚀 HumanLayer API Demo Workflow"
echo "================================"
echo ""

# Step 1: Create an approval request
echo "1️⃣  Creating approval request for deployment..."
APPROVAL=$(curl -s -X POST "$API_BASE/function_calls" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "deploy-prod-v2",
    "run_id": "automation-run-456",
    "spec": {
      "fn": "deploy_to_production",
      "kwargs": {
        "environment": "production",
        "version": "v2.0.1",
        "service": "api-backend"
      }
    }
  }')

echo "✅ Created:"
echo "$APPROVAL" | jq .
echo ""

# Step 2: Check status
echo "2️⃣  Checking approval status..."
STATUS=$(curl -s "$API_BASE/function_calls/deploy-prod-v2" \
  -H "Authorization: Bearer $API_KEY")

echo "📊 Current status:"
echo "$STATUS" | jq .status
echo ""

# Step 3: Approve it
echo "3️⃣  Approving deployment..."
APPROVED=$(curl -s -X POST "$API_BASE/function_calls/deploy-prod-v2/respond" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "responded_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "comment": "Deployment approved by SRE team"
  }')

echo "✅ Approved!"
echo "$APPROVED" | jq .status
echo ""

# Step 4: Create a human contact request
echo "4️⃣  Creating human contact request..."
CONTACT=$(curl -s -X POST "$API_BASE/contact_requests" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "question-001",
    "run_id": "automation-run-456",
    "spec": {
      "msg": "Database migration requires manual review. Should we proceed?",
      "subject": "Production Database Migration",
      "response_options": [
        {"name": "proceed", "title": "✅ Proceed"},
        {"name": "wait", "title": "⏸️  Wait for off-hours"},
        {"name": "cancel", "title": "❌ Cancel migration"}
      ]
    }
  }')

echo "📬 Contact request created:"
echo "$CONTACT" | jq .spec
echo ""

# Step 5: Respond to contact
echo "5️⃣  Responding to contact request..."
RESPONSE=$(curl -s -X POST "$API_BASE/contact_requests/question-001/respond" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "Wait for off-hours - safer",
    "response_option_name": "wait",
    "responded_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }')

echo "💬 Response recorded:"
echo "$RESPONSE" | jq .status
echo ""

echo "🎉 Demo complete! All workflows tested successfully."
