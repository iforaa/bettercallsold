#!/bin/bash

# Quick Plugin System Test
# Simple tests for plugin functionality

BASE_URL="http://localhost:5173"

echo "🚀 Quick Plugin System Test"
echo "=========================="

echo -e "\n1. Testing server health..."
curl -s "$BASE_URL/api/health" | head -1

echo -e "\n2. Getting current plugins..."
curl -s "$BASE_URL/api/plugins" | jq '.plugins | length' 2>/dev/null || echo "Response received"

echo -e "\n3. Registering test plugin..."
curl -s -X POST "$BASE_URL/api/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quick Test Plugin",
    "slug": "quick-test",
    "webhook_url": "https://httpbin.org/post",
    "events": ["product.created"],
    "config": {"test": true}
  }' | jq '.message' 2>/dev/null || echo "Response received"

echo -e "\n4. Testing plugin connectivity..."
curl -s -X POST "$BASE_URL/api/plugins/quick-test/test" | jq '.test_result.success' 2>/dev/null || echo "Response received"

echo -e "\n5. Creating test product (triggers webhook)..."
curl -s -X POST "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plugin Test Product",
    "description": "Test product for plugin webhooks",
    "price": 19.99
  }' | jq '.message' 2>/dev/null || echo "Response received"

sleep 2

echo -e "\n6. Checking plugin events..."
curl -s "$BASE_URL/api/plugins/events?limit=5" | jq '.events | length' 2>/dev/null || echo "Response received"

echo -e "\n7. Cleaning up test plugin..."
curl -s -X DELETE "$BASE_URL/api/plugins/quick-test" | jq '.message' 2>/dev/null || echo "Response received"

echo -e "\n✅ Quick test completed!"
echo "Run 'npm run dev' in your project if the server isn't running."
echo "Check the full test-plugins.sh for comprehensive testing."