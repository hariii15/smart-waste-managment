# Smart Waste Management API - PowerShell Test Script (Simple Version)
# This script tests all major endpoints using PowerShell

$baseUrl = "http://localhost:3000"
$testCount = 0
$passedCount = 0
$failedCount = 0

function Write-TestResult {
    param($testName, $success, $details = "")
    
    $script:testCount++
    if ($success) {
        Write-Host "PASSED: $testName" -ForegroundColor Green
        $script:passedCount++
    } else {
        Write-Host "FAILED: $testName" -ForegroundColor Red
        if ($details) { Write-Host "   Details: $details" -ForegroundColor Yellow }
        $script:failedCount++
    }
}

function Test-Endpoint {
    param($method, $endpoint, $body = $null, $expectedStatus = 200, $testName)
    
    try {
        $uri = "$baseUrl$endpoint"
        
        if ($body) {
            $response = Invoke-RestMethod -Uri $uri -Method $method -Body $body -ContentType "application/json" -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $method -ErrorAction Stop
        }
        
        Write-TestResult $testName $true
        return $response
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $expectedStatus) {
            Write-TestResult $testName $true
        } else {
            Write-TestResult $testName $false "Expected $expectedStatus, got $statusCode"
        }
        return $null
    }
}

Write-Host "Starting Smart Waste Management API Tests" -ForegroundColor Cyan
Write-Host "=========================================="

# 1. Health Check
Write-Host "`nHealth Check Tests" -ForegroundColor Yellow
Write-Host "------------------"
Test-Endpoint "GET" "/health" $null 200 "Server Health Check"

# 2. Bin Management Tests  
Write-Host "`nBin Management Tests" -ForegroundColor Yellow
Write-Host "--------------------"

$binUpdate = @{
    binID = "BIN-TEST-001"
    fillLevel = 75
    location = @{
        latitude = 12.9716
        longitude = 77.5946
    }
} | ConvertTo-Json

Test-Endpoint "POST" "/api/bins/update-level" $binUpdate 200 "Update Bin Level (Valid)"
Test-Endpoint "GET" "/api/bins/heatmap" $null 200 "Get Heatmap Data"
Test-Endpoint "GET" "/api/bins/full" $null 200 "Get Full Bins"
Test-Endpoint "GET" "/api/bins/statistics" $null 200 "Get Bin Statistics"

# 3. Route Management Tests
Write-Host "`nRoute Management Tests" -ForegroundColor Yellow
Write-Host "----------------------"

$routeRequest = @{
    driverId = "DRIVER_TEST_01"
    truckId = "TRUCK_TEST_01"
} | ConvertTo-Json

Test-Endpoint "POST" "/api/routes/generate" $routeRequest 200 "Generate Optimized Route"
Test-Endpoint "GET" "/api/routes" $null 200 "Get All Routes"
Test-Endpoint "GET" "/api/routes/statistics" $null 200 "Get Route Statistics"

# 4. Report Management Tests
Write-Host "`nReport Management Tests" -ForegroundColor Yellow
Write-Host "-----------------------"

$report = @{
    reporterName = "Test User"
    location = @{
        latitude = 12.9780
        longitude = 77.6010
    }
    imageUrl = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400"
    description = "Test report for automated testing"
} | ConvertTo-Json

Test-Endpoint "POST" "/api/reports/submit" $report 200 "Submit User Report"
Test-Endpoint "GET" "/api/reports" $null 200 "Get All Reports"
Test-Endpoint "GET" "/api/reports/statistics" $null 200 "Get Report Statistics"

# 5. Analytics Tests
Write-Host "`nAnalytics Tests" -ForegroundColor Yellow
Write-Host "---------------"

Test-Endpoint "GET" "/api/analytics/summary" $null 200 "Get Analytics Summary"
Test-Endpoint "GET" "/api/analytics/realtime" $null 200 "Get Real-time Dashboard"

# 6. Error Handling Tests
Write-Host "`nError Handling Tests" -ForegroundColor Yellow
Write-Host "--------------------"

# Test 404 error
try {
    Invoke-RestMethod -Uri "$baseUrl/api/nonexistent" -Method GET -ErrorAction Stop
    Write-TestResult "404 Error Test" $false "Should have returned 404"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-TestResult "404 Error Test" $true
    } else {
        Write-TestResult "404 Error Test" $false "Expected 404, got $statusCode"
    }
}

# Results Summary
Write-Host "`n=========================================="
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host "Total Tests: $testCount"
Write-Host "Passed: $passedCount" -ForegroundColor Green
Write-Host "Failed: $failedCount" -ForegroundColor Red

if ($testCount -gt 0) {
    $successRate = [math]::Round(($passedCount / $testCount) * 100, 1)
    Write-Host "Success Rate: $successRate%"
}

Write-Host ""
if ($failedCount -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Check output above." -ForegroundColor Yellow
    exit 1
}
