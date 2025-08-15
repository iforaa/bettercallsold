#!/bin/bash

# BetterCallSold Plugin System Testing Suite
# This script tests the complete plugin system functionality

set -e  # Exit on any error

# Configuration
BASE_URL="http://localhost:5173"
TENANT_ID="11111111-1111-1111-1111-111111111111"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="${3:-200}"
    
    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"
    echo "Command: $curl_command"
    
    # Execute curl command and capture response
    response=$(eval "$curl_command" 2>&1)
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check if status matches expected
    if [[ "$status_code" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $status_code)"
        echo "Response: $response_body"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC} (Expected HTTP $expected_status, got $status_code)"
        echo "Response: $response_body"
    fi
}

echo -e "${YELLOW}🚀 Starting BetterCallSold Plugin System Tests${NC}"
echo "Testing against: $BASE_URL"
echo "Tenant ID: $TENANT_ID"

# Test 1: Health Check
run_test "Health Check" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/health"'

# Test 2: Get all plugins (empty initially)
run_test "Get All Plugins (Empty)" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/plugins"'

# Test 3: Register a test plugin
echo -e "\n${YELLOW}📝 Registering Test Plugin${NC}"
PLUGIN_DATA='{
  "name": "Test Analytics Plugin",
  "slug": "test-analytics",
  "webhook_url": "https://httpbin.org/post",
  "events": ["product.created", "product.updated", "product.deleted"],
  "config": {
    "api_key": "test-key-123",
    "sync_frequency": "realtime"
  },
  "metadata": {
    "description": "A test plugin for analytics",
    "version": "1.0.0",
    "author": "Test Author"
  }
}'

run_test "Register Test Plugin" \
    'curl -s -w "%{http_code}" -X POST "$BASE_URL/api/plugins" \
    -H "Content-Type: application/json" \
    -d '"'"''"$PLUGIN_DATA"''"'"''

# Test 4: Get all plugins (should have one now)
run_test "Get All Plugins (With Test Plugin)" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/plugins"'

# Test 5: Get specific plugin
run_test "Get Specific Plugin" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/plugins/test-analytics"'

# Test 6: Test plugin connectivity
run_test "Test Plugin Connectivity" \
    'curl -s -w "%{http_code}" -X POST "$BASE_URL/api/plugins/test-analytics/test"'

# Test 7: Register a second plugin (email notifications)
echo -e "\n${YELLOW}📧 Registering Email Plugin${NC}"
EMAIL_PLUGIN_DATA='{
  "name": "Email Notifications",
  "slug": "email-notify",
  "webhook_url": "https://httpbin.org/post",
  "events": ["product.created", "order.created"],
  "config": {
    "smtp_server": "smtp.gmail.com",
    "port": 587
  },
  "metadata": {
    "description": "Email notification plugin",
    "version": "1.0.0"
  }
}'

run_test "Register Email Plugin" \
    'curl -s -w "%{http_code}" -X POST "$BASE_URL/api/plugins" \
    -H "Content-Type: application/json" \
    -d '"'"''"$EMAIL_PLUGIN_DATA"''"'"''

# Test 8: Update plugin configuration
echo -e "\n${YELLOW}✏️ Updating Plugin Configuration${NC}"
UPDATE_DATA='{
  "name": "Updated Test Analytics Plugin",
  "webhook_url": "https://httpbin.org/put",
  "events": ["product.created", "product.updated", "product.deleted", "order.created"],
  "config": {
    "api_key": "updated-key-456",
    "sync_frequency": "hourly",
    "debug_mode": true
  },
  "status": "active"
}'

run_test "Update Plugin Configuration" \
    'curl -s -w "%{http_code}" -X PUT "$BASE_URL/api/plugins/test-analytics" \
    -H "Content-Type: application/json" \
    -d '"'"''"$UPDATE_DATA"''"'"''

# Test 9: Create a product to trigger plugin events
echo -e "\n${YELLOW}🛍️ Creating Product to Trigger Events${NC}"
PRODUCT_DATA='{
  "name": "Test Product for Plugin Events",
  "description": "This product will trigger plugin webhooks",
  "price": 29.99,
  "status": "active",
  "tags": ["test", "plugin"],
  "images": ["https://example.com/image1.jpg"]
}'

run_test "Create Product (Triggers Plugin Events)" \
    'curl -s -w "%{http_code}" -X POST "$BASE_URL/api/products" \
    -H "Content-Type: application/json" \
    -d '"'"''"$PRODUCT_DATA"''"'"''\
    | jq -r '.data.id' > /tmp/test_product_id 2>/dev/null || echo "Error saving product ID"'

# Wait for webhooks to process
echo -e "\n${BLUE}⏳ Waiting 2 seconds for webhooks to process...${NC}"
sleep 2

# Test 10: View plugin events
run_test "Get Plugin Events" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/plugins/events?limit=10"'

# Test 11: Manually trigger webhook processing
run_test "Manually Process Webhooks" \
    'curl -s -w "%{http_code}" -X POST "$BASE_URL/api/plugins/events"'

# Test 12: Update the product (triggers plugin events)
if [ -f /tmp/test_product_id ]; then
    PRODUCT_ID=$(cat /tmp/test_product_id 2>/dev/null | tr -d '"\n' || echo "")
    if [ ! -z "$PRODUCT_ID" ]; then
        echo -e "\n${YELLOW}🔄 Updating Product to Trigger Events${NC}"
        UPDATE_PRODUCT_DATA='{
          "name": "Updated Test Product for Plugin Events",
          "description": "This updated product will trigger plugin webhooks",
          "price": 39.99,
          "status": "active",
          "tags": ["test", "plugin", "updated"]
        }'

        run_test "Update Product (Triggers Plugin Events)" \
            'curl -s -w "%{http_code}" -X PATCH "$BASE_URL/api/products/'"$PRODUCT_ID"'" \
            -H "Content-Type: application/json" \
            -d '"'"''"$UPDATE_PRODUCT_DATA"''"'"''
    else
        echo -e "${YELLOW}⚠️ Skipping product update test - no product ID found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Skipping product update test - no product ID file found${NC}"
fi

# Test 13: Test error scenarios
echo -e "\n${YELLOW}🚨 Testing Error Scenarios${NC}"

# Try to register plugin with duplicate slug
run_test "Register Duplicate Plugin (Should Fail)" \
    'curl -s -w "%{http_code}" -X POST "$BASE_URL/api/plugins" \
    -H "Content-Type: application/json" \
    -d '"'"'{"name": "Duplicate", "slug": "test-analytics", "webhook_url": "https://test.com"}'"'"'' \
    400

# Try to get non-existent plugin
run_test "Get Non-existent Plugin (Should Fail)" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/plugins/non-existent"' \
    404

# Try to register plugin with invalid webhook URL
run_test "Register Plugin with Invalid URL (Should Fail)" \
    'curl -s -w "%{http_code}" -X POST "$BASE_URL/api/plugins" \
    -H "Content-Type: application/json" \
    -d '"'"'{"name": "Invalid URL", "slug": "invalid-url", "webhook_url": "not-a-url"}'"'"'' \
    400

# Test 14: Delete plugin
run_test "Delete Email Plugin" \
    'curl -s -w "%{http_code}" -X DELETE "$BASE_URL/api/plugins/email-notify"'

# Test 15: Verify plugin was deleted
run_test "Get Deleted Plugin (Should Fail)" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/plugins/email-notify"' \
    404

# Test 16: Clean up - delete test product
if [ -f /tmp/test_product_id ]; then
    PRODUCT_ID=$(cat /tmp/test_product_id 2>/dev/null | tr -d '"\n' || echo "")
    if [ ! -z "$PRODUCT_ID" ]; then
        echo -e "\n${YELLOW}🗑️ Cleaning Up Test Product${NC}"
        run_test "Delete Test Product (Triggers Plugin Events)" \
            'curl -s -w "%{http_code}" -X DELETE "$BASE_URL/api/products/'"$PRODUCT_ID"'"'
        rm -f /tmp/test_product_id
    fi
fi

# Test 17: Final cleanup - delete test plugin
run_test "Delete Test Analytics Plugin" \
    'curl -s -w "%{http_code}" -X DELETE "$BASE_URL/api/plugins/test-analytics"'

# Test 18: Final plugin events check
run_test "Final Plugin Events Check" \
    'curl -s -w "%{http_code}" "$BASE_URL/api/plugins/events?limit=20"'

# Summary
echo -e "\n${YELLOW}📊 Test Results Summary${NC}"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$((TESTS_TOTAL - TESTS_PASSED))${NC}"
echo -e "Total tests: ${BLUE}$TESTS_TOTAL${NC}"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Plugin system is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
    exit 1
fi