import express from 'express';
import { validateRoute } from '../middleware/validation.js';
import { 
  generateOptimizedRoute, 
  getAllRoutes, 
  updateRouteStatus,
  getRouteStatistics
} from '../services/routeService.js';
import { emitRouteAssignment, emitAnalyticsUpdate } from '../utils/socketEvents.js';

const router = express.Router();

/**
 * POST /routes/generate
 * Generate optimized route for waste collection
 */
router.post('/generate', async (req, res) => {
  try {
    const { driverId, truckId } = req.body;

    // Validate required fields
    if (!driverId) {
      return res.status(400).json({
        error: 'Missing required field',
        details: 'driverId is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🚛 Generating route for driver: ${driverId}, truck: ${truckId || 'N/A'}`);

    // Generate optimized route
    const result = await generateOptimizedRoute(driverId, truckId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }

    // Emit route assignment to driver via Socket.IO
    emitRouteAssignment(req.io, driverId, {
      routeId: result.routeId,
      binSequence: result.data.binSequence,
      metrics: result.data.metrics
    });

    res.status(201).json({
      success: true,
      message: 'Optimized route generated successfully',
      data: {
        routeId: result.routeId,
        driverId: result.data.driverId,
        truckId: result.data.truckId,
        binSequence: result.data.binSequence,
        pathPolyline: result.data.pathPolyline,
        metrics: result.data.metrics,
        binsCount: result.binsCount,
        status: result.data.status
      },
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Route ${result.routeId} generated for ${result.binsCount} bins`);

  } catch (error) {
    console.error('Error generating route:', error);
    res.status(500).json({
      error: 'Failed to generate optimized route',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /routes
 * Get all routes with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, driverId } = req.query;

    const routes = await getAllRoutes();

    // Apply filters if provided
    let filteredRoutes = routes;
    if (status) {
      filteredRoutes = filteredRoutes.filter(route => route.status === status);
    }
    if (driverId) {
      filteredRoutes = filteredRoutes.filter(route => route.driverId === driverId);
    }

    res.status(200).json({
      success: true,
      message: 'Routes retrieved successfully',
      data: {
        routes: filteredRoutes,
        total: filteredRoutes.length,
        filters: { status, driverId }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📋 Routes data sent: ${filteredRoutes.length} routes`);

  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      error: 'Failed to fetch routes',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /routes/:routeId/status
 * Update route status (start, complete, etc.)
 */
router.put('/:routeId/status', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'active', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        details: `Status must be one of: ${validStatuses.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const result = await updateRouteStatus(routeId, status);

    // Broadcast status update via Socket.IO
    req.io.to('admin').emit('route-status-updated', {
      routeId,
      newStatus: status,
      timestamp: new Date().toISOString()
    });

    // If route completed, emit analytics update
    if (status === 'completed') {
      // Note: In a production system, you'd calculate the actual analytics
      req.io.to('admin').emit('route-completed', {
        routeId,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `Route status updated to ${status}`,
      data: result,
      timestamp: new Date().toISOString()
    });

    console.log(`🔄 Route ${routeId} status updated to: ${status}`);

  } catch (error) {
    console.error('Error updating route status:', error);
    res.status(500).json({
      error: 'Failed to update route status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /routes/statistics
 * Get route performance statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getRouteStatistics();

    res.status(200).json({
      success: true,
      message: 'Route statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });

    console.log('📊 Route statistics sent to dashboard');

  } catch (error) {
    console.error('Error fetching route statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch route statistics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /routes/:routeId
 * Get specific route details
 */
router.get('/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const routes = await getAllRoutes();
    
    const route = routes.find(r => r.id === routeId);
    
    if (!route) {
      return res.status(404).json({
        error: 'Route not found',
        details: `No route found with ID: ${routeId}`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Route details retrieved successfully',
      data: route,
      timestamp: new Date().toISOString()
    });

    console.log(`📋 Route ${routeId} details sent`);

  } catch (error) {
    console.error('Error fetching route details:', error);
    res.status(500).json({
      error: 'Failed to fetch route details',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /routes/:routeId/start
 * Start a route (convenience endpoint)
 */
router.post('/:routeId/start', async (req, res) => {
  try {
    const { routeId } = req.params;
    
    const result = await updateRouteStatus(routeId, 'active');

    // Notify admin dashboard
    req.io.to('admin').emit('route-started', {
      routeId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Route started successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

    console.log(`🚀 Route ${routeId} started`);

  } catch (error) {
    console.error('Error starting route:', error);
    res.status(500).json({
      error: 'Failed to start route',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /routes/:routeId/complete
 * Complete a route (convenience endpoint)
 */
router.post('/:routeId/complete', async (req, res) => {
  try {
    const { routeId } = req.params;
    
    const result = await updateRouteStatus(routeId, 'completed');

    // Notify admin dashboard
    req.io.to('admin').emit('route-completed', {
      routeId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Route completed successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Route ${routeId} completed`);

  } catch (error) {
    console.error('Error completing route:', error);
    res.status(500).json({
      error: 'Failed to complete route',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
