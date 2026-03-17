#!/bin/bash

# Smart Waste Management API Test Script
# This script tests all the API endpoints using curl commands

BASE_URL="http://localhost:3000"
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run a test
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local data="$5"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (Status: $http_code)"
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        echo -e "${RED}❌ FAILED${NC} (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
    echo ""
}

echo "🚀 Starting API Tests for Smart Waste Management System"
echo "============================================================"

# Health Check
echo -e "\n${YELLOW}📋 Health Check Tests${NC}"
echo "------------------------------"
run_test "Server Health Check" "GET" "/health" 200

# Bin Management Tests
echo -e "\n${YELLOW}🗑️  Bin Management Tests${NC}"
echo "------------------------------"

run_test "Update Bin Level (Valid)" "POST" "/api/bins/update-level" 200 \
    '{"binID":"BIN-001","fillLevel":75,"location":{"latitude":12.9716,"longitude":77.5946}}'

run_test "Update Bin Level (Invalid)" "POST" "/api/bins/update-level" 400 \
    '{"binID":"BIN-001","fillLevel":150,"location":{"latitude":12.9716,"longitude":77.5946}}'

run_test "Update Bin Level (Missing Fields)" "POST" "/api/bins/update-level" 400 \
    '{"fillLevel":50}'

run_test "Get Heatmap Data" "GET" "/api/bins/heatmap" 200

run_test "Get Full Bins" "GET" "/api/bins/full" 200

run_test "Get Bin Statistics" "GET" "/api/bins/statistics" 200

run_test "Bulk Update Bins" "POST" "/api/bins/bulk-update" 200 \
    '{"updates":[{"binID":"BIN-001","fillLevel":45,"location":{"latitude":12.9716,"longitude":77.5946}},{"binID":"BIN-002","fillLevel":90,"location":{"latitude":12.9720,"longitude":77.5950}}]}'

# Route Management Tests
echo -e "\n${YELLOW}🚛 Route Management Tests${NC}"
echo "------------------------------"

run_test "Generate Optimized Route" "POST" "/api/routes/generate" 200 \
    '{"driverId":"DRIVER_TEST_01","truckId":"TRUCK_TEST_01"}'

run_test "Get All Routes" "GET" "/api/routes" 200

run_test "Get Route Statistics" "GET" "/api/routes/statistics" 200

run_test "Generate Route (Missing Driver)" "POST" "/api/routes/generate" 400 \
    '{"truckId":"TRUCK_TEST_01"}'

# Report Management Tests
echo -e "\n${YELLOW}📱 Report Management Tests${NC}"
echo "------------------------------"

run_test "Submit User Report (Valid)" "POST" "/api/reports/submit" 200 \
    '{"reporterName":"Test User","location":{"latitude":12.9780,"longitude":77.6010},"imageUrl":"https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400","description":"Test report for automated testing"}'

run_test "Submit Anonymous Report" "POST" "/api/reports/submit" 200 \
    '{"location":{"latitude":12.9695,"longitude":77.5890},"imageUrl":"https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400","description":"Anonymous test report"}'

run_test "Submit Report (Invalid URL)" "POST" "/api/reports/submit" 400 \
    '{"location":{"latitude":12.9695,"longitude":77.5890},"imageUrl":"not-a-valid-url","description":"Test report with invalid URL"}'

run_test "Get All Reports" "GET" "/api/reports" 200

run_test "Get Report Statistics" "GET" "/api/reports/statistics" 200

run_test "Get Nearby Reports" "GET" "/api/reports/nearby?lat=12.9716&lng=77.5946&radius=2" 200

# Analytics Tests
echo -e "\n${YELLOW}📊 Analytics Tests${NC}"
echo "------------------------------"

run_test "Get Analytics Summary" "GET" "/api/analytics/summary" 200

run_test "Get Real-time Dashboard" "GET" "/api/analytics/realtime" 200

# Error Handling Tests
echo -e "\n${YELLOW}❌ Error Handling Tests${NC}"
echo "------------------------------"

run_test "404 Error Test" "GET" "/api/nonexistent" 404

# Results Summary
echo "============================================================"
echo -e "${BLUE}🏁 TEST RESULTS SUMMARY${NC}"
echo "============================================================"
echo "Total Tests: $TEST_COUNT"
echo -e "Passed: ${GREEN}$PASSED_COUNT ✅${NC}"
echo -e "Failed: ${RED}$FAILED_COUNT ❌${NC}"

if [ $TEST_COUNT -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $PASSED_COUNT * 100 / $TEST_COUNT" | bc)
    echo "Success Rate: $SUCCESS_RATE%"
fi

echo ""
if [ $FAILED_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
