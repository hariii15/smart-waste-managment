# 🚀 Smart Waste Management System - Complete Testing Guide

## 📋 What We've Built

### 🏗️ Architecture Overview
- **Modular Express.js Server** with proper separation of concerns
- **Real-time Communication** using Socket.IO
- **Firebase Firestore** integration for data persistence
- **Comprehensive API** with 4 main modules:
  - IoT & Bin Management
  - Smart Route Optimization  
  - Citizen Engagement (Reports)
  - Admin Analytics & Dashboard

### 📁 Project Structure
```
server/
├── server.js                 # Main entry point
├── firebase.config.js        # Firebase setup & Zod schemas
├── package.json              # Dependencies & scripts
├── middleware/
│   └── validation.js         # Request validation middleware
├── routes/
│   ├── binRoutes.js          # Bin management endpoints
│   ├── routeRoutes.js        # Route optimization endpoints
│   ├── reportRoutes.js       # User reports endpoints
│   └── analyticsRoutes.js    # Analytics & dashboard endpoints
├── services/
│   ├── binService.js         # Bin business logic
│   ├── routeService.js       # Route optimization logic
│   ├── reportService.js      # Report processing logic
│   └── analyticsService.js   # Analytics calculations
└── utils/
    └── socketEvents.js       # Real-time event handlers
```

---

## 🧪 Complete Endpoint Testing List

### ✅ 1. System Health
| Method | Endpoint | Purpose | Test Status |
|--------|----------|---------|-------------|
| GET | `/health` | Server health check | ✅ Working |

### 🗑️ 2. IoT & Bin Management (`/api/bins`)
| Method | Endpoint | Purpose | Test Data Required |
|--------|----------|---------|-------------------|
| POST | `/api/bins/update-level` | Update bin fill level from IoT sensors | `{"binID":"BIN-001","fillLevel":75,"location":{"latitude":12.9716,"longitude":77.5946}}` |
| GET | `/api/bins/heatmap` | Get data for heatmap visualization | None |
| GET | `/api/bins/full` | Get all full bins for collection | None |
| GET | `/api/bins/statistics` | Get bin statistics for dashboard | None |
| PUT | `/api/bins/:binId/status` | Manually update bin status | `{"status":"collecting"}` |
| POST | `/api/bins/bulk-update` | Update multiple bins at once | `{"updates":[...]}` |

### 🚛 3. Smart Route Optimization (`/api/routes`)
| Method | Endpoint | Purpose | Test Data Required |
|--------|----------|---------|-------------------|
| POST | `/api/routes/generate` | Generate optimized collection route | `{"driverId":"DRIVER_01","truckId":"TRUCK_01"}` |
| GET | `/api/routes` | Get all routes | None |
| PUT | `/api/routes/:routeId/status` | Update route status | `{"status":"active"}` or `{"status":"completed"}` |
| GET | `/api/routes/statistics` | Get route performance stats | None |

### 📱 4. Citizen Engagement (`/api/reports`)
| Method | Endpoint | Purpose | Test Data Required |
|--------|----------|---------|-------------------|
| POST | `/api/reports/submit` | Submit citizen waste report | `{"reporterName":"John","location":{"latitude":12.9780,"longitude":77.6010},"imageUrl":"https://..","description":"Issue description"}` |
| GET | `/api/reports` | Get all reports (with filtering) | Optional: `?status=pending&limit=10` |
| PUT | `/api/reports/:reportId/verify` | Admin verify/reject report | `{"isVerified":true,"adminNotes":"Verified"}` |
| GET | `/api/reports/statistics` | Get report statistics | None |
| GET | `/api/reports/nearby` | Get reports near location | `?lat=12.9716&lng=77.5946&radius=2` |

### 📊 5. Admin & Analytics (`/api/analytics`)
| Method | Endpoint | Purpose | Test Data Required |
|--------|----------|---------|-------------------|
| GET | `/api/analytics/summary` | Comprehensive dashboard stats | None |
| GET | `/api/analytics/realtime` | Real-time dashboard data | None |

---

## 🔧 Testing Methods Available

### 1. Automated Test Script
```powershell
cd "e:\coe\smart-waste-managment\server"
npm test
```

### 2. Manual PowerShell Testing
```powershell
# Health Check
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get

# Update Bin Level
$body = @{
    binID='BIN-001'
    fillLevel=85
    location=@{latitude=12.9716; longitude=77.5946}
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/bins/update-level' -Method Post -Body $body -ContentType 'application/json'

# Get Analytics Summary
Invoke-RestMethod -Uri "http://localhost:3000/api/analytics/summary" -Method Get
```

### 3. Postman Collection
- Import: `Smart_Waste_Management_API.postman_collection.json`
- Set base URL: `http://localhost:3000`

### 4. Manual Testing Checklist
- Use: `TESTING_CHECKLIST.md` for comprehensive manual testing

---

## 🧪 Quick Test Commands

### Test All Basic Endpoints
```powershell
# 1. Health Check
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get

# 2. Get Bin Statistics  
Invoke-RestMethod -Uri "http://localhost:3000/api/bins/statistics" -Method Get

# 3. Get Heatmap Data
Invoke-RestMethod -Uri "http://localhost:3000/api/bins/heatmap" -Method Get

# 4. Get All Routes
Invoke-RestMethod -Uri "http://localhost:3000/api/routes" -Method Get

# 5. Get All Reports
Invoke-RestMethod -Uri "http://localhost:3000/api/reports" -Method Get

# 6. Get Analytics Summary
Invoke-RestMethod -Uri "http://localhost:3000/api/analytics/summary" -Method Get
```

### Test POST Endpoints
```powershell
# Update Bin (Trigger Full Alert)
$binUpdate = @{
    binID='BIN-002'
    fillLevel=95
    location=@{latitude=12.9720; longitude=77.5950}
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/bins/update-level' -Method Post -Body $binUpdate -ContentType 'application/json'

# Generate Route
$routeData = @{
    driverId='DRIVER_TEST'
    truckId='TRUCK_TEST'
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/routes/generate' -Method Post -Body $routeData -ContentType 'application/json'

# Submit Report
$report = @{
    reporterName='Test User'
    location=@{latitude=12.9780; longitude=77.6010}
    imageUrl='https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400'
    description='Test report for verification'
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/reports/submit' -Method Post -Body $report -ContentType 'application/json'
```

### Test Error Handling
```powershell
# Test 404 Error
try { Invoke-RestMethod -Uri "http://localhost:3000/api/nonexistent" -Method Get } catch { $_.Exception }

# Test Invalid Data
$invalidBin = @{
    binID='BIN-001'
    fillLevel=150  # Invalid (> 100)
} | ConvertTo-Json
try { Invoke-RestMethod -Uri 'http://localhost:3000/api/bins/update-level' -Method Post -Body $invalidBin -ContentType 'application/json' } catch { $_.Exception }
```

---

## 🚀 Real-World Testing Scenarios

### Scenario 1: Complete Waste Collection Workflow
```powershell
# 1. Update multiple bins to trigger collections
$bulkUpdate = @{
    updates=@(
        @{binID='BIN-001'; fillLevel=90; location=@{latitude=12.9716; longitude=77.5946}},
        @{binID='BIN-002'; fillLevel=95; location=@{latitude=12.9720; longitude=77.5950}},
        @{binID='BIN-003'; fillLevel=88; location=@{latitude=12.9735; longitude=77.5960}}
    )
} | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri 'http://localhost:3000/api/bins/bulk-update' -Method Post -Body $bulkUpdate -ContentType 'application/json'

# 2. Generate optimized route for full bins
$routeRequest = @{driverId='DRIVER_01'; truckId='TRUCK_01'} | ConvertTo-Json
$route = Invoke-RestMethod -Uri 'http://localhost:3000/api/routes/generate' -Method Post -Body $routeRequest -ContentType 'application/json'
Write-Host "Generated Route ID: $($route.data.routeId)"

# 3. Activate the route
$routeStatus = @{status='active'} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/routes/$($route.routeId)/status" -Method Put -Body $routeStatus -ContentType 'application/json'

# 4. Complete the route (this will reset bin levels to 0)
$completeStatus = @{status='completed'} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/routes/$($route.routeId)/status" -Method Put -Body $completeStatus -ContentType 'application/json'

# 5. Verify analytics updated
Invoke-RestMethod -Uri "http://localhost:3000/api/analytics/summary" -Method Get
```

### Scenario 2: Citizen Engagement Flow
```powershell
# 1. Citizen submits report
$citizenReport = @{
    reporterName='Concerned Citizen'
    location=@{latitude=12.9775; longitude=77.6005}
    imageUrl='https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400'
    description='Overflowing bin causing health hazard near school'
} | ConvertTo-Json
$report = Invoke-RestMethod -Uri 'http://localhost:3000/api/reports/submit' -Method Post -Body $citizenReport -ContentType 'application/json'
Write-Host "Submitted Report ID: $($report.reportId)"

# 2. Admin reviews and verifies report
$verification = @{
    isVerified=$true
    adminNotes='Report verified. Cleanup scheduled.'
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/reports/$($report.reportId)/verify" -Method Put -Body $verification -ContentType 'application/json'

# 3. Check report statistics
Invoke-RestMethod -Uri "http://localhost:3000/api/reports/statistics" -Method Get
```

---

## 📈 Performance Testing

### Load Testing Commands
```powershell
# Test concurrent bin updates (run multiple times)
1..10 | ForEach-Object -Parallel {
    $body = @{
        binID="BIN-$(Get-Random -Minimum 1 -Maximum 15 | ToString -format '000')"
        fillLevel=(Get-Random -Minimum 0 -Maximum 100)
        location=@{
            latitude=(12.97 + (Get-Random -Minimum -5 -Maximum 5) / 1000)
            longitude=(77.59 + (Get-Random -Minimum -5 -Maximum 5) / 1000)
        }
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri 'http://localhost:3000/api/bins/update-level' -Method Post -Body $body -ContentType 'application/json'
        Write-Host "✅ Update $_"
    } catch {
        Write-Host "❌ Failed $_"
    }
} -ThrottleLimit 5
```

---

## 🔌 Socket.IO Real-time Testing

### Test Real-time Events (Browser Console)
```javascript
// Connect to server
const socket = io('http://localhost:3000');

// Join admin room
socket.emit('join-admin');

// Listen for bin alerts
socket.on('bin-full-alert', (data) => {
    console.log('🚨 Bin Alert:', data);
});

// Listen for new reports
socket.on('new-report-submitted', (data) => {
    console.log('📱 New Report:', data);
});

// Listen for route updates
socket.on('route-status-updated', (data) => {
    console.log('🚛 Route Update:', data);
});
```

---

## ✅ Validation Checklist

### Before Testing
- [ ] Server running on http://localhost:3000
- [ ] Database seeded with sample data (`npm run seed`)
- [ ] Firebase Firestore accessible
- [ ] No compilation errors

### During Testing
- [ ] All GET endpoints return 200 status
- [ ] All POST endpoints validate input correctly  
- [ ] Error responses include helpful messages
- [ ] Socket.IO events trigger appropriately
- [ ] Database updates persist correctly

### After Testing
- [ ] No memory leaks or hanging connections
- [ ] Server logs show no errors
- [ ] Database state is consistent
- [ ] Performance is acceptable (<2s for most operations)

---

## 🎯 Expected Test Results

| Endpoint Category | Expected Pass Rate | Typical Response Time |
|-------------------|-------------------|----------------------|
| Health Check | 100% | <50ms |
| Bin Management | 95%+ | <200ms |
| Route Generation | 90%+ | <2000ms |
| Report Submission | 95%+ | <300ms |
| Analytics | 90%+ | <500ms |

---

## 🚨 Common Issues & Solutions

### Issue: "Firebase permission denied"
**Solution**: Update Firestore rules or run `npm run seed` first

### Issue: "Port 3000 already in use"
**Solution**: Change PORT in .env or kill existing process

### Issue: "Route generation returns no bins"
**Solution**: Ensure some bins have status "full" before testing

### Issue: "Socket.IO connection failed"  
**Solution**: Check CORS settings and client connection code

---

## 📝 Next Steps

1. **Run Basic Tests**: Start with health check and statistics endpoints
2. **Test Core Workflow**: Bin updates → Route generation → Completion
3. **Validate Real-time**: Test Socket.IO events with browser client
4. **Performance Testing**: Run concurrent requests and measure response times
5. **Error Handling**: Test edge cases and invalid inputs
6. **Documentation**: Update API docs based on test results

---

**Happy Testing! 🚀**

Your Smart Waste Management API is ready for comprehensive testing. Use the commands above to verify all functionality is working correctly.
