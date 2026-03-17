# API Testing Guide - Smart Waste Management System

## Overview
This document provides comprehensive testing instructions for all API endpoints in the Smart Waste Management System.

## Prerequisites
1. Server should be running on `http://localhost:3000`
2. Firebase Firestore should be properly configured
3. Database should be seeded with sample data (run `npm run seed`)

## Testing Tools
- **Postman** (Recommended)
- **curl** commands
- **VS Code REST Client** extension
- **Browser** (for GET requests)

---

## 1. IoT & Bin Management Endpoints (`/api/bins`)

### 1.1 POST /api/bins/update-level
**Purpose**: Simulates IoT sensor data updates

**Test Cases**:

#### Valid Update
```bash
curl -X POST http://localhost:3000/api/bins/update-level \
  -H "Content-Type: application/json" \
  -d '{
    "binID": "BIN-001",
    "fillLevel": 85,
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946
    }
  }'
```

#### Trigger Full Status Alert
```bash
curl -X POST http://localhost:3000/api/bins/update-level \
  -H "Content-Type: application/json" \
  -d '{
    "binID": "BIN-002",
    "fillLevel": 95,
    "location": {
      "latitude": 12.9720,
      "longitude": 77.5950
    }
  }'
```

#### Invalid Fill Level (should fail)
```bash
curl -X POST http://localhost:3000/api/bins/update-level \
  -H "Content-Type: application/json" \
  -d '{
    "binID": "BIN-001",
    "fillLevel": 150,
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946
    }
  }'
```

#### Missing Required Fields (should fail)
```bash
curl -X POST http://localhost:3000/api/bins/update-level \
  -H "Content-Type: application/json" \
  -d '{
    "fillLevel": 50
  }'
```

### 1.2 GET /api/bins/heatmap
**Purpose**: Get data for heatmap visualization

```bash
curl -X GET http://localhost:3000/api/bins/heatmap
```

**Expected Response**: Array of coordinates with intensity values

### 1.3 GET /api/bins/full
**Purpose**: Get all bins that need collection

```bash
curl -X GET http://localhost:3000/api/bins/full
```

### 1.4 GET /api/bins/statistics
**Purpose**: Get bin statistics for dashboard

```bash
curl -X GET http://localhost:3000/api/bins/statistics
```

### 1.5 PUT /api/bins/:binId/status
**Purpose**: Manually update bin status

#### Valid Status Update
```bash
curl -X PUT http://localhost:3000/api/bins/BIN-001/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "collecting"
  }'
```

#### Invalid Status (should fail)
```bash
curl -X PUT http://localhost:3000/api/bins/BIN-001/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "invalid_status"
  }'
```

### 1.6 POST /api/bins/bulk-update
**Purpose**: Update multiple bins at once

```bash
curl -X POST http://localhost:3000/api/bins/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "binID": "BIN-001",
        "fillLevel": 45,
        "location": {"latitude": 12.9716, "longitude": 77.5946}
      },
      {
        "binID": "BIN-002", 
        "fillLevel": 90,
        "location": {"latitude": 12.9720, "longitude": 77.5950}
      }
    ]
  }'
```

---

## 2. Smart Route Optimization (`/api/routes`)

### 2.1 POST /api/routes/generate
**Purpose**: Generate optimized collection route

#### Basic Route Generation
```bash
curl -X POST http://localhost:3000/api/routes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "DRIVER_01",
    "truckId": "TRUCK_KAR_01"
  }'
```

#### Missing Driver ID (should fail)
```bash
curl -X POST http://localhost:3000/api/routes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "truckId": "TRUCK_KAR_01"
  }'
```

### 2.2 GET /api/routes
**Purpose**: Get all routes

```bash
curl -X GET http://localhost:3000/api/routes
```

### 2.3 PUT /api/routes/:routeId/status
**Purpose**: Update route status

#### Mark Route as Active
```bash
curl -X PUT http://localhost:3000/api/routes/{ROUTE_ID}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

#### Complete Route
```bash
curl -X PUT http://localhost:3000/api/routes/{ROUTE_ID}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

### 2.4 GET /api/routes/statistics
**Purpose**: Get route performance statistics

```bash
curl -X GET http://localhost:3000/api/routes/statistics
```

---

## 3. Citizen Engagement (`/api/reports`)

### 3.1 POST /api/reports/submit
**Purpose**: Citizens submit waste reports

#### Valid Report Submission
```bash
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "reporterName": "John Doe",
    "location": {
      "latitude": 12.9780,
      "longitude": 77.6010
    },
    "imageUrl": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400",
    "description": "Overflowing bin near the park needs immediate attention!"
  }'
```

#### Anonymous Report
```bash
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": 12.9695,
      "longitude": 77.5890
    },
    "imageUrl": "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400",
    "description": "Bad smell from garbage area"
  }'
```

#### Invalid Image URL (should fail)
```bash
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": 12.9695,
      "longitude": 77.5890
    },
    "imageUrl": "not-a-valid-url",
    "description": "Test report"
  }'
```

### 3.2 GET /api/reports
**Purpose**: Get all reports with optional filtering

#### Get All Reports
```bash
curl -X GET http://localhost:3000/api/reports
```

#### Get Pending Reports Only
```bash
curl -X GET "http://localhost:3000/api/reports?status=pending"
```

#### Get Limited Reports
```bash
curl -X GET "http://localhost:3000/api/reports?limit=10"
```

### 3.3 PUT /api/reports/:reportId/verify
**Purpose**: Admin verifies reports

#### Verify Report
```bash
curl -X PUT http://localhost:3000/api/reports/{REPORT_ID}/verify \
  -H "Content-Type: application/json" \
  -d '{
    "isVerified": true,
    "adminNotes": "Report verified and action taken"
  }'
```

#### Reject Report
```bash
curl -X PUT http://localhost:3000/api/reports/{REPORT_ID}/verify \
  -H "Content-Type: application/json" \
  -d '{
    "isVerified": false,
    "adminNotes": "Unable to verify - insufficient information"
  }'
```

### 3.4 GET /api/reports/statistics
**Purpose**: Get report statistics

```bash
curl -X GET http://localhost:3000/api/reports/statistics
```

### 3.5 GET /api/reports/nearby
**Purpose**: Get reports near a location

```bash
curl -X GET "http://localhost:3000/api/reports/nearby?lat=12.9716&lng=77.5946&radius=2"
```

---

## 4. Admin & Analytics (`/api/analytics`)

### 4.1 GET /api/analytics/summary
**Purpose**: Get comprehensive dashboard statistics

```bash
curl -X GET http://localhost:3000/api/analytics/summary
```

### 4.2 GET /api/analytics/realtime
**Purpose**: Get real-time dashboard data

```bash
curl -X GET http://localhost:3000/api/analytics/realtime
```

---

## 5. Health Check

### 5.1 GET /health
**Purpose**: Check server health

```bash
curl -X GET http://localhost:3000/health
```

---

## 6. Error Testing

### 6.1 Test 404 Error
```bash
curl -X GET http://localhost:3000/api/nonexistent
```

### 6.2 Test Invalid JSON
```bash
curl -X POST http://localhost:3000/api/bins/update-level \
  -H "Content-Type: application/json" \
  -d '{"invalid": json}'
```

---

## Postman Collection Testing

### Import Collection
Create a Postman collection with all the above requests for easier testing.

### Environment Variables
Set up Postman environment with:
- `baseUrl`: `http://localhost:3000`
- `routeId`: (get from route creation response)
- `reportId`: (get from report submission response)

---

## Socket.IO Testing

### Test Real-time Events
Use a Socket.IO client to test real-time features:

```javascript
// Frontend test code
const socket = io('http://localhost:3000');

// Join admin room
socket.emit('join-admin');

// Listen for bin alerts
socket.on('bin-full-alert', (data) => {
  console.log('Bin alert received:', data);
});

// Listen for new reports
socket.on('new-report-submitted', (data) => {
  console.log('New report:', data);
});
```

---

## Test Scenarios

### Complete Workflow Test
1. **Setup**: Seed database with sample data
2. **IoT Simulation**: Update bin levels to trigger "full" status
3. **Route Generation**: Generate optimized collection route
4. **Route Execution**: Update route status to "active" then "completed"
5. **Citizen Report**: Submit user reports
6. **Admin Actions**: Verify reports
7. **Analytics**: Check dashboard statistics

### Load Testing
Use tools like Apache Bench or Artillery.js:

```bash
# Test bin updates endpoint
ab -n 1000 -c 10 -H "Content-Type: application/json" \
  -p bin_update.json \
  http://localhost:3000/api/bins/update-level
```

---

## Expected Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-03-17T18:30:00.000Z"
}
```

### Error Response
```json
{
  "error": "Error description",
  "details": "Specific error details",
  "timestamp": "2026-03-17T18:30:00.000Z"
}
```

---

## Performance Benchmarks

### Expected Response Times
- Bin updates: < 200ms
- Route generation: < 2s
- Analytics summary: < 500ms
- Report submissions: < 300ms

### Database Operations
- Monitor Firestore read/write operations
- Check for proper indexing
- Verify query performance

---

## Troubleshooting

### Common Issues
1. **Firebase connection errors**: Check firebase.config.js
2. **Validation failures**: Verify request body format
3. **404 errors**: Check route paths and HTTP methods
4. **Socket.IO issues**: Verify CORS configuration

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and stack traces.
