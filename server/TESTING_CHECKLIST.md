# Manual Testing Checklist - Smart Waste Management API

## Pre-Testing Setup ✅

- [ ] Server is running on http://localhost:3000
- [ ] Firebase Firestore is configured and accessible
- [ ] Database is seeded with sample data (`npm run seed`)
- [ ] Testing tool is ready (Postman/curl/browser)

---

## 1. Health & System Tests

### Health Check
- [ ] **GET /health**
  - Expected: 200 status
  - Response includes: status, timestamp, uptime, environment

---

## 2. IoT & Bin Management (`/api/bins`)

### Basic Bin Updates
- [ ] **POST /api/bins/update-level** (Valid update)
  ```json
  {
    "binID": "BIN-001",
    "fillLevel": 45,
    "location": {"latitude": 12.9716, "longitude": 77.5946}
  }
  ```
  - Expected: 200 status, success message
  - Check: Bin status calculated correctly (partial for 45%)

- [ ] **POST /api/bins/update-level** (Trigger full alert)
  ```json
  {
    "binID": "BIN-002",
    "fillLevel": 85,
    "location": {"latitude": 12.9720, "longitude": 77.5950}
  }
  ```
  - Expected: 200 status, status = "full"
  - Check: Socket alert triggered (if WebSocket client connected)

- [ ] **POST /api/bins/update-level** (Invalid fill level)
  ```json
  {
    "binID": "BIN-001",
    "fillLevel": 150
  }
  ```
  - Expected: 400 status, validation error

- [ ] **POST /api/bins/update-level** (Missing binID)
  ```json
  {
    "fillLevel": 50
  }
  ```
  - Expected: 400 status, "Missing required fields" error

### Bin Data Retrieval
- [ ] **GET /api/bins/heatmap**
  - Expected: 200 status
  - Response includes: heatmapPoints, binLocations, totalBins
  - Verify: Coordinates are valid lat/lng pairs

- [ ] **GET /api/bins/full**
  - Expected: 200 status
  - Response: Array of bins with status "full"
  - Check: Only bins with fillLevel >= 80 or status "full"

- [ ] **GET /api/bins/statistics**
  - Expected: 200 status
  - Response includes: total, empty, partial, full, averageFillLevel
  - Verify: Numbers add up correctly

### Advanced Bin Operations
- [ ] **PUT /api/bins/BIN-001/status** (Valid status)
  ```json
  {
    "status": "collecting"
  }
  ```
  - Expected: 200 status, status updated

- [ ] **PUT /api/bins/BIN-001/status** (Invalid status)
  ```json
  {
    "status": "invalid_status"
  }
  ```
  - Expected: 400 status, validation error

- [ ] **POST /api/bins/bulk-update**
  ```json
  {
    "updates": [
      {"binID": "BIN-001", "fillLevel": 30, "location": {"latitude": 12.9716, "longitude": 77.5946}},
      {"binID": "BIN-002", "fillLevel": 95, "location": {"latitude": 12.9720, "longitude": 77.5950}}
    ]
  }
  ```
  - Expected: 200 status
  - Response: successful and failed arrays
  - Check: Multiple bin statuses updated

---

## 3. Smart Route Optimization (`/api/routes`)

### Route Generation
- [ ] **POST /api/routes/generate** (With full bins available)
  ```json
  {
    "driverId": "DRIVER_TEST_01",
    "truckId": "TRUCK_TEST_01"
  }
  ```
  - Expected: 200 status
  - Response includes: routeId, binSequence, metrics
  - Verify: Route includes only full bins
  - Check: Bins status changed to "collecting"

- [ ] **POST /api/routes/generate** (No full bins)
  - Prerequisite: Ensure no bins have status "full"
  - Expected: 200 status with "No full bins found" message

- [ ] **POST /api/routes/generate** (Missing driver ID)
  ```json
  {
    "truckId": "TRUCK_TEST_01"
  }
  ```
  - Expected: 400 status, validation error

### Route Management
- [ ] **GET /api/routes**
  - Expected: 200 status
  - Response: Array of routes sorted by createdAt (desc)
  - Verify: Routes include all required fields

- [ ] **GET /api/routes/statistics**
  - Expected: 200 status
  - Response includes: total, active, pending, completed
  - Verify: Statistics are accurate

### Route Status Updates
- [ ] **PUT /api/routes/{routeId}/status** (Activate route)
  ```json
  {
    "status": "active"
  }
  ```
  - Expected: 200 status
  - Note: Replace {routeId} with actual route ID

- [ ] **PUT /api/routes/{routeId}/status** (Complete route)
  ```json
  {
    "status": "completed"
  }
  ```
  - Expected: 200 status
  - Check: Bins in route sequence reset to empty (0% fill)

---

## 4. Citizen Engagement (`/api/reports`)

### Report Submission
- [ ] **POST /api/reports/submit** (Valid report)
  ```json
  {
    "reporterName": "John Doe",
    "location": {"latitude": 12.9780, "longitude": 77.6010},
    "imageUrl": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400",
    "description": "Overflowing bin near the park!"
  }
  ```
  - Expected: 200 status
  - Response includes: reportId, address (geocoded)
  - Check: Default status is "pending", isVerified is false

- [ ] **POST /api/reports/submit** (Anonymous report)
  ```json
  {
    "location": {"latitude": 12.9695, "longitude": 77.5890},
    "imageUrl": "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400",
    "description": "Bad smell from garbage area"
  }
  ```
  - Expected: 200 status
  - Check: reporterName defaults to "Anonymous"

- [ ] **POST /api/reports/submit** (Invalid image URL)
  ```json
  {
    "location": {"latitude": 12.9695, "longitude": 77.5890},
    "imageUrl": "not-a-valid-url",
    "description": "Test report"
  }
  ```
  - Expected: 400 status, validation error

- [ ] **POST /api/reports/submit** (Missing location)
  ```json
  {
    "imageUrl": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400",
    "description": "Test report"
  }
  ```
  - Expected: 400 status, validation error

### Report Retrieval
- [ ] **GET /api/reports**
  - Expected: 200 status
  - Response: Array of reports with metadata

- [ ] **GET /api/reports?status=pending**
  - Expected: 200 status
  - Response: Only reports with status "pending"

- [ ] **GET /api/reports?limit=5**
  - Expected: 200 status
  - Response: Maximum 5 reports

- [ ] **GET /api/reports/statistics**
  - Expected: 200 status
  - Response includes: total, pending, verified, rejected, today, thisWeek

### Report Verification
- [ ] **PUT /api/reports/{reportId}/verify** (Verify report)
  ```json
  {
    "isVerified": true,
    "adminNotes": "Report verified and action taken"
  }
  ```
  - Expected: 200 status
  - Check: Report status changed to "verified"

- [ ] **PUT /api/reports/{reportId}/verify** (Reject report)
  ```json
  {
    "isVerified": false,
    "adminNotes": "Unable to verify - insufficient information"
  }
  ```
  - Expected: 200 status
  - Check: Report status changed to "rejected"

### Geographic Queries
- [ ] **GET /api/reports/nearby?lat=12.9716&lng=77.5946&radius=2**
  - Expected: 200 status
  - Response: Reports within 2km radius
  - Verify: Distance calculation is reasonable

---

## 5. Admin & Analytics (`/api/analytics`)

### Dashboard Analytics
- [ ] **GET /api/analytics/summary**
  - Expected: 200 status
  - Response includes: summary, bins, routes, reports, performance, trends
  - Verify: All calculations are logical and accurate
  - Check: Numbers match individual endpoint statistics

- [ ] **GET /api/analytics/realtime**
  - Expected: 200 status
  - Response includes: recentBinUpdates, activeRoutes, systemStatus
  - Verify: Data is current and relevant

---

## 6. Error Handling & Edge Cases

### Invalid Endpoints
- [ ] **GET /api/nonexistent**
  - Expected: 404 status
  - Response: Proper error message with timestamp

- [ ] **POST /api/invalid/endpoint**
  - Expected: 404 status

### Invalid HTTP Methods
- [ ] **DELETE /api/bins/heatmap** (Wrong method)
  - Expected: 404 or 405 status

### Malformed JSON
- [ ] **POST /api/bins/update-level** (Invalid JSON)
  ```
  {"invalid": json}
  ```
  - Expected: 400 status, JSON parse error

### Large Payloads
- [ ] **POST /api/bins/bulk-update** (100+ bins)
  - Expected: Should handle gracefully or return appropriate error

---

## 7. Performance Testing

### Response Times
- [ ] All GET endpoints respond within 1 second
- [ ] POST operations complete within 3 seconds
- [ ] Route generation completes within 5 seconds
- [ ] Analytics summary loads within 2 seconds

### Concurrent Requests
- [ ] Multiple bin updates can be processed simultaneously
- [ ] Server handles 10+ concurrent requests without errors

---

## 8. Socket.IO Real-time Testing

### Admin Dashboard Events
If you have a Socket.IO client connected:

- [ ] Connect to admin room: `socket.emit('join-admin')`
- [ ] Update bin to full status and verify `bin-full-alert` event
- [ ] Submit new report and verify `new-report-submitted` event
- [ ] Update route status and verify `route-status-updated` event

### Driver Events
- [ ] Connect as driver: `socket.emit('join-driver', 'DRIVER_01')`
- [ ] Generate route for driver and verify `route-assigned` event
- [ ] Send location update and verify admin receives `driver-location-updated`

---

## 9. Data Validation

### Database State Verification
After running tests, manually verify in Firebase Console:

- [ ] Bin documents have correct structure and values
- [ ] Route documents are properly formatted
- [ ] User reports contain all required fields
- [ ] Timestamps are properly set

### Data Consistency
- [ ] Bin statistics match actual bin states
- [ ] Route sequences only contain existing bin IDs
- [ ] Analytics calculations are mathematically correct

---

## 10. Security Testing

### Input Sanitization
- [ ] SQL injection attempts fail gracefully
- [ ] XSS attempts are properly handled
- [ ] Large strings don't crash the server
- [ ] Special characters in descriptions are handled properly

### CORS Testing
- [ ] Cross-origin requests from allowed origins work
- [ ] Requests from unauthorized origins are blocked

---

## Completion Checklist

- [ ] All endpoints return expected status codes
- [ ] All success responses follow consistent format
- [ ] All error responses include helpful error messages
- [ ] Socket.IO events work correctly
- [ ] Database operations complete successfully
- [ ] Performance meets acceptable thresholds
- [ ] Security validations pass

---

## Notes Section

Use this space to record any issues found during testing:

**Issues Found:**
- Issue 1: [Description and resolution]
- Issue 2: [Description and resolution]

**Performance Notes:**
- Endpoint X takes Y milliseconds on average
- Database query Z could be optimized

**Suggestions:**
- Feature improvements
- API enhancements
- Documentation updates

---

**Testing completed by:** _______________  
**Date:** _______________  
**Server version:** _______________  
**Database status:** _______________
