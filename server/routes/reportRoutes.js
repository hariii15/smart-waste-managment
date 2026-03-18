import express from 'express';
import { validateUserReport } from '../middleware/validation.js';
import { 
  submitUserReport, 
  getUserReports, 
  verifyReport,
  getReportStatistics,
  getNearbyReports
} from '../services/reportService.js';
import { emitNewReportNotification } from '../utils/socketEvents.js';

const router = express.Router();

/**
 * POST /reports/submit
 * Submit a new citizen report
 */
router.post('/submit', async (req, res) => {
  try {
    const { reporterName, location, imageUrl, description } = req.body;

    // Basic validation
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        error: 'Invalid location data',
        details: 'Location with latitude and longitude is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Missing image URL',
        details: 'Image URL is required for report submission',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📱 New report submitted by: ${reporterName || 'Anonymous'}`);

    // Submit the report
    const result = await submitUserReport({
      reporterName,
      location,
      imageUrl,
      description
    });

    // Emit real-time notification to admin dashboard
    emitNewReportNotification(req.io, {
      reportId: result.reportId,
      reporterName: result.data.reporterName,
      location: result.data.location,
      description: result.data.description
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        reportId: result.reportId,
        reporterName: result.data.reporterName,
        location: result.data.location,
        address: result.data.address,
        status: result.data.status,
        createdAt: result.data.createdAt
      },
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Report ${result.reportId} submitted successfully`);

  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      error: 'Failed to submit report',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /reports
 * Get all reports with optional filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const limitCount = parseInt(limit, 10);

    if (limitCount < 1 || limitCount > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        details: 'Limit must be between 1 and 100',
        timestamp: new Date().toISOString()
      });
    }

    const result = await getUserReports(limitCount, status);

    res.status(200).json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        reports: result.reports,
        total: result.total,
        filters: { status, limit: limitCount }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📋 Reports data sent: ${result.total} reports`);

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /reports/:reportId/verify
 * Verify or reject a user report (admin only)
 */
router.put('/:reportId/verify', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { isVerified, adminNotes } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid verification status',
        details: 'isVerified must be a boolean value',
        timestamp: new Date().toISOString()
      });
    }

    const result = await verifyReport(reportId, isVerified, adminNotes);

    // Emit update to admin dashboard
    req.io.to('admin').emit('report-verified', {
      reportId,
      isVerified,
      adminNotes,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: `Report ${isVerified ? 'verified' : 'rejected'} successfully`,
      data: result,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Report ${reportId} ${isVerified ? 'verified' : 'rejected'}`);

  } catch (error) {
    console.error('Error verifying report:', error);
    res.status(500).json({
      error: 'Failed to verify report',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /reports/statistics
 * Get report statistics for dashboard
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getReportStatistics();

    res.status(200).json({
      success: true,
      message: 'Report statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });

    console.log('📊 Report statistics sent to dashboard');

  } catch (error) {
    console.error('Error fetching report statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch report statistics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /reports/nearby
 * Get reports near a specific location
 */
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 1 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing location parameters',
        details: 'latitude and longitude are required',
        timestamp: new Date().toISOString()
      });
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const radiusKm = parseFloat(radius);

    if (isNaN(location.latitude) || isNaN(location.longitude) || isNaN(radiusKm)) {
      return res.status(400).json({
        error: 'Invalid numeric parameters',
        details: 'latitude, longitude, and radius must be valid numbers',
        timestamp: new Date().toISOString()
      });
    }

    const result = await getNearbyReports(location, radiusKm);

    res.status(200).json({
      success: true,
      message: `Found ${result.count} reports within ${radiusKm}km`,
      data: {
        reports: result.reports,
        count: result.count,
        searchLocation: location,
        radius: radiusKm
      },
      timestamp: new Date().toISOString()
    });

    console.log(`🗺️ Nearby reports search: ${result.count} reports found`);

  } catch (error) {
    console.error('Error fetching nearby reports:', error);
    res.status(500).json({
      error: 'Failed to fetch nearby reports',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /reports/:reportId
 * Get specific report details
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Get all reports and find the specific one
    const result = await getUserReports(1000); // Get all reports
    const report = result.reports.find(r => r.id === reportId);
    
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        details: `No report found with ID: ${reportId}`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report details retrieved successfully',
      data: report,
      timestamp: new Date().toISOString()
    });

    console.log(`📋 Report ${reportId} details sent`);

  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({
      error: 'Failed to fetch report details',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /reports/bulk-verify
 * Bulk verify multiple reports (admin only)
 */
router.post('/bulk-verify', async (req, res) => {
  try {
    const { reportIds, isVerified, adminNotes } = req.body;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid bulk verify data',
        details: 'reportIds must be a non-empty array',
        timestamp: new Date().toISOString()
      });
    }

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid verification status',
        details: 'isVerified must be a boolean value',
        timestamp: new Date().toISOString()
      });
    }

    const results = [];
    const errors = [];

    for (const reportId of reportIds) {
      try {
        const result = await verifyReport(reportId, isVerified, adminNotes);
        results.push({
          reportId,
          success: true,
          isVerified: result.isVerified
        });
      } catch (error) {
        errors.push({
          reportId,
          success: false,
          error: error.message
        });
      }
    }

    // Emit bulk update to admin dashboard
    req.io.to('admin').emit('reports-bulk-verified', {
      successful: results.length,
      failed: errors.length,
      isVerified,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: `Bulk verification completed: ${results.length} successful, ${errors.length} failed`,
      data: {
        successful: results,
        failed: errors,
        totalProcessed: reportIds.length
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📊 Bulk verify: ${results.length}/${reportIds.length} reports processed`);

  } catch (error) {
    console.error('Error in bulk verification:', error);
    res.status(500).json({
      error: 'Failed to process bulk verification',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
