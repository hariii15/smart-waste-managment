# Smart Waste Management - Server

A Node.js/Express.js backend server for the Smart Waste Management System with real-time capabilities using Socket.IO and Firebase Firestore.

## 🚀 Features

### 1. IoT & Bin Management
- **POST `/api/bins/update-level`** - Receive data from IoT sensors
- **GET `/api/bins/heatmap`** - Get bin locations and fill levels for heatmap
- **GET `/api/bins/full`** - Get all full bins for route planning
- **GET `/api/bins/statistics`** - Get bin statistics for dashboard
- **PUT `/api/bins/:binId/status`** - Update bin status manually
- **POST `/api/bins/bulk-update`** - Bulk update multiple bins

### 2. Smart Route Optimization
- **POST `/api/routes/generate`** - Generate optimized collection routes
- **GET `/api/routes`** - Get all routes with filtering options
- **GET `/api/routes/:routeId`** - Get specific route details
- **PUT `/api/routes/:routeId/status`** - Update route status
- **POST `/api/routes/:routeId/start`** - Start a route
- **POST `/api/routes/:routeId/complete`** - Complete a route
- **GET `/api/routes/statistics`** - Get route performance statistics

### 3. Citizen Engagement (User Reports)
- **POST `/api/reports/submit`** - Submit citizen reports with images
- **GET `/api/reports`** - Get all reports with pagination and filtering
- **GET `/api/reports/:reportId`** - Get specific report details
- **PUT `/api/reports/:reportId/verify`** - Verify or reject reports
- **POST `/api/reports/bulk-verify`** - Bulk verify multiple reports
- **GET `/api/reports/nearby`** - Get reports near a location
- **GET `/api/reports/statistics`** - Get report statistics

### 4. Admin & Analytics
- **GET `/api/analytics/summary`** - Comprehensive dashboard analytics
- **GET `/api/analytics/realtime`** - Real-time dashboard data
- **GET `/api/analytics/bins`** - Detailed bin analytics
- **GET `/api/analytics/routes`** - Detailed route analytics
- **GET `/api/analytics/reports`** - Detailed report analytics
- **GET `/api/analytics/performance`** - System performance metrics
- **GET `/api/analytics/trends`** - Trend analysis with predictions

### 5. Real-time Features (Socket.IO)
- Bin full alerts to admin dashboard
- Route status updates
- New report notifications
- Driver location tracking
- Live analytics updates

## 🏗️ Architecture

```
server/
├── server.js                 # Main server entry point
├── firebase.config.js        # Firebase configuration and schemas
├── routes/                   # API route handlers
│   ├── binRoutes.js         # Bin management endpoints
│   ├── routeRoutes.js       # Route optimization endpoints
│   ├── reportRoutes.js      # User report endpoints
│   └── analyticsRoutes.js   # Analytics and dashboard endpoints
├── services/                 # Business logic layer
│   ├── binService.js        # Bin-related operations
│   ├── routeService.js      # Route optimization logic
│   ├── reportService.js     # Report handling logic
│   └── analyticsService.js  # Analytics calculations
├── middleware/              # Custom middleware
│   └── validation.js        # Request validation middleware
├── utils/                   # Utility functions
│   └── socketEvents.js      # Socket.IO event handlers
└── seedDatabase.js          # Database seeding script
```

## 📦 Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   copy .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure Firebase**
   - Update `firebase.config.js` with your Firebase project credentials
   - Deploy Firestore security rules (see `firestore.rules`)

5. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```
Server will run on `http://localhost:3000` with auto-restart on file changes.

### Production Mode
```bash
npm start
```

### Scripts
- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-restart
- `npm run seed` - Seed database with sample data
- `npm run seed-old` - Run legacy seed script

## 📊 API Documentation

### Authentication
Currently, the API is open for development. In production, implement proper authentication middleware.

### Request/Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* actual data */ },
  "timestamp": "2026-03-17T18:30:00.000Z"
}
```

Error responses:
```json
{
  "error": "Error description",
  "details": "Detailed error message",
  "timestamp": "2026-03-17T18:30:00.000Z"
}
```

### Example API Calls

#### Update Bin Level (IoT Sensor)
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

#### Generate Optimized Route
```bash
curl -X POST http://localhost:3000/api/routes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "DRIVER_01",
    "truckId": "TRUCK_KAR_01"
  }'
```

#### Submit Citizen Report
```bash
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "reporterName": "John Doe",
    "location": {
      "latitude": 12.9780,
      "longitude": 77.6010
    },
    "imageUrl": "https://example.com/image.jpg",
    "description": "Overflowing bin near park"
  }'
```

#### Get Analytics Summary
```bash
curl http://localhost:3000/api/analytics/summary
```

## 🔌 Socket.IO Events

### Client → Server Events
- `join-admin` - Join admin room for dashboard updates
- `join-driver` - Join driver room (requires driverId)
- `driver-location-update` - Driver location updates
- `bin-status-update` - Bin status updates from IoT
- `route-status-update` - Route status updates

### Server → Client Events
- `bin-full-alert` - Alert when bin becomes full
- `route-assigned` - New route assigned to driver
- `new-report-submitted` - New citizen report notification
- `analytics-updated` - Real-time analytics updates
- `system-alert` - System-wide alerts

## 🛡️ Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Request validation** - Zod schema validation
- **Error handling** - Comprehensive error handling
- **Rate limiting** - (Recommended for production)

## 📈 Monitoring & Logging

- **Morgan** - HTTP request logging
- **Console logging** - Detailed operation logs
- **Health check** - `/health` endpoint for monitoring

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend application URL
- `LOG_LEVEL` - Logging level
- `CORS_ORIGIN` - CORS allowed origins

### Firebase Configuration
Update `firebase.config.js` with your Firebase project settings:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};
```

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Implement authentication middleware
4. Set up proper Firebase security rules
5. Configure reverse proxy (nginx)
6. Set up SSL certificates
7. Implement rate limiting
8. Configure logging aggregation
9. Set up monitoring and alerts

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

### Manual Testing
Use the provided API endpoints to test functionality. Consider using:
- **Postman** - API testing
- **curl** - Command-line testing
- **Browser** - Socket.IO testing with dev tools

### Database Seeding
```bash
npm run seed
```
This will populate your Firestore with sample data including:
- 15 bins across different zones
- 3 sample routes
- 5 user reports

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include console logging for operations
4. Update API documentation
5. Test all endpoints before submitting

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Firebase Permission Denied**
   - Check Firestore security rules
   - Ensure Firebase project is properly configured

2. **CORS Errors**
   - Verify `FRONTEND_URL` in environment variables
   - Check CORS configuration in `server.js`

3. **Socket.IO Connection Issues**
   - Ensure client and server are on same domain/port
   - Check firewall settings

4. **Module Import Errors**
   - Verify `"type": "module"` in package.json
   - Use `.js` extensions in import statements

For more issues, check the server logs and Firebase console.
