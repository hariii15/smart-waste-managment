/**
 * Initialize Socket.IO event handlers for real-time communication
 */
export const initializeSocketEvents = (io) => {
  console.log('🔌 Initializing Socket.IO events...');

  io.on('connection', (socket) => {
    console.log(`👤 Client connected: ${socket.id}`);

    // Join admin room for dashboard updates
    socket.on('join-admin', () => {
      socket.join('admin');
      console.log(`🛡️  Admin client joined: ${socket.id}`);
      
      socket.emit('admin-connected', {
        message: 'Successfully connected to admin dashboard',
        timestamp: new Date().toISOString()
      });
    });

    // Join driver room for route updates
    socket.on('join-driver', (driverId) => {
      socket.join(`driver-${driverId}`);
      console.log(`🚛 Driver ${driverId} joined: ${socket.id}`);
      
      socket.emit('driver-connected', {
        message: `Driver ${driverId} connected`,
        timestamp: new Date().toISOString()
      });
    });

    // Handle location updates from drivers
    socket.on('driver-location-update', (data) => {
      const { driverId, location, routeId } = data;
      
      // Broadcast to admin dashboard
      socket.to('admin').emit('driver-location-updated', {
        driverId,
        location,
        routeId,
        timestamp: new Date().toISOString()
      });

      console.log(`📍 Location update from driver ${driverId}:`, location);
    });

    // Handle bin status updates (from IoT sensors)
    socket.on('bin-status-update', (data) => {
      console.log('📊 Bin status update:', data);
      
      // Broadcast to all admin clients
      socket.to('admin').emit('bin-status-updated', {
        ...data,
        timestamp: new Date().toISOString()
      });
    });

    // Handle route status updates
    socket.on('route-status-update', (data) => {
      const { routeId, status, driverId } = data;
      
      console.log(`🚛 Route ${routeId} status updated to: ${status}`);
      
      // Broadcast to admin dashboard
      socket.to('admin').emit('route-status-updated', {
        routeId,
        status,
        driverId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`👋 Client disconnected: ${socket.id}`);
    });

    // Handle error events
    socket.on('error', (error) => {
      console.error(`❌ Socket error for client ${socket.id}:`, error);
    });
  });

  return io;
};

/**
 * Emit bin full alert to admin dashboard
 */
export const emitBinFullAlert = (io, binData) => {
  console.log(`🚨 Emitting bin full alert for ${binData.binID}`);
  
  io.to('admin').emit('bin-full-alert', {
    binID: binData.binID,
    location: binData.location,
    fillLevel: binData.fillLevel,
    zone: binData.zone,
    timestamp: new Date().toISOString(),
    urgency: 'high'
  });
};

/**
 * Emit route assignment to driver
 */
export const emitRouteAssignment = (io, driverId, routeData) => {
  console.log(`📋 Emitting route assignment to driver ${driverId}`);
  
  io.to(`driver-${driverId}`).emit('route-assigned', {
    routeId: routeData.routeId,
    binSequence: routeData.binSequence,
    metrics: routeData.metrics,
    timestamp: new Date().toISOString()
  });
};

/**
 * Emit new user report notification to admin
 */
export const emitNewReportNotification = (io, reportData) => {
  console.log(`📱 Emitting new report notification: ${reportData.reportId}`);
  
  io.to('admin').emit('new-report-submitted', {
    reportId: reportData.reportId,
    reporterName: reportData.reporterName,
    location: reportData.location,
    description: reportData.description,
    timestamp: new Date().toISOString()
  });
};

/**
 * Emit analytics update to admin dashboard
 */
export const emitAnalyticsUpdate = (io, analyticsData) => {
  console.log('📈 Emitting analytics update to admin dashboard');
  
  io.to('admin').emit('analytics-updated', {
    ...analyticsData,
    timestamp: new Date().toISOString()
  });
};

/**
 * Emit system alert
 */
export const emitSystemAlert = (io, alertData) => {
  console.log(`⚠️  Emitting system alert: ${alertData.type}`);
  
  io.to('admin').emit('system-alert', {
    type: alertData.type,
    message: alertData.message,
    severity: alertData.severity || 'medium',
    timestamp: new Date().toISOString()
  });
};
