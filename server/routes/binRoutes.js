import express from 'express';
import { validateBin } from '../middleware/validation.js';
import { 
  updateBinLevel, 
  getBinsForHeatmap, 
  getFullBins,
  getBinStatistics,
  updateBinStatus
} from '../services/binService.js';
import { emitBinFullAlert } from '../utils/socketEvents.js';

const router = express.Router();

/**
 * POST /bins/update-level
 * Updates bin fill level from IoT sensors
 */
router.post('/update-level', async (req, res) => {
  try {
    const { binID, fillLevel, location } = req.body;

    // Basic validation
    if (!binID || fillLevel === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'binID and fillLevel are required',
        timestamp: new Date().toISOString()
      });
    }

    if (fillLevel < 0 || fillLevel > 100) {
      return res.status(400).json({
        error: 'Invalid fill level',
        details: 'Fill level must be between 0 and 100',
        timestamp: new Date().toISOString()
      });
    }

    // Update bin data
    const result = await updateBinLevel({
      binID,
      fillLevel,
      location
    });

    // If bin became full, emit socket alert
    if (result.statusChanged && result.data.status === 'full') {
      emitBinFullAlert(req.io, result.data);
    }

    res.status(200).json({
      success: true,
      message: `Bin ${binID} updated successfully`,
      data: {
        binID: result.data.binID,
        fillLevel: result.data.fillLevel,
        status: result.data.status,
        lastUpdated: result.data.lastUpdated,
        statusChanged: result.statusChanged
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📊 Bin ${binID} updated: ${fillLevel}% (${result.data.status})`);

  } catch (error) {
    console.error('Error updating bin level:', error);
    res.status(500).json({
      error: 'Failed to update bin level',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /bins/heatmap
 * Get all bin locations and fill levels for heatmap visualization
 */
router.get('/heatmap', async (req, res) => {
  try {
    const heatmapData = await getBinsForHeatmap();

    res.status(200).json({
      success: true,
      message: 'Heatmap data retrieved successfully',
      data: {
        heatmapPoints: heatmapData.heatmapData,
        binLocations: heatmapData.binLocations,
        totalBins: heatmapData.totalBins
      },
      timestamp: new Date().toISOString()
    });

    console.log(`🗺️  Heatmap data sent: ${heatmapData.totalBins} bins`);

  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      error: 'Failed to fetch heatmap data',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /bins/full
 * Get all full bins for route planning
 */
router.get('/full', async (req, res) => {
  try {
    const fullBins = await getFullBins();

    res.status(200).json({
      success: true,
      message: 'Full bins retrieved successfully',
      data: {
        bins: fullBins,
        count: fullBins.length
      },
      timestamp: new Date().toISOString()
    });

    console.log(`🗑️  Full bins data sent: ${fullBins.length} bins`);

  } catch (error) {
    console.error('Error fetching full bins:', error);
    res.status(500).json({
      error: 'Failed to fetch full bins',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /bins/statistics
 * Get bin statistics for dashboard
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getBinStatistics();

    res.status(200).json({
      success: true,
      message: 'Bin statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });

    console.log('📈 Bin statistics sent to dashboard');

  } catch (error) {
    console.error('Error fetching bin statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch bin statistics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /bins/:binId/status
 * Update bin status manually (for admin operations)
 */
router.put('/:binId/status', async (req, res) => {
  try {
    const { binId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['empty', 'partial', 'full', 'collecting'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        details: `Status must be one of: ${validStatuses.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const result = await updateBinStatus(binId, status);

    res.status(200).json({
      success: true,
      message: `Bin status updated to ${status}`,
      data: result,
      timestamp: new Date().toISOString()
    });

    console.log(`🔄 Bin ${binId} status manually updated to: ${status}`);

  } catch (error) {
    console.error('Error updating bin status:', error);
    res.status(500).json({
      error: 'Failed to update bin status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /bins/bulk-update
 * Bulk update multiple bins (for testing/simulation)
 */
router.post('/bulk-update', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        error: 'Invalid bulk update data',
        details: 'updates must be a non-empty array',
        timestamp: new Date().toISOString()
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const result = await updateBinLevel(update);
        results.push({
          binID: update.binID,
          success: true,
          status: result.data.status,
          fillLevel: result.data.fillLevel
        });

        // Emit alerts for newly full bins
        if (result.statusChanged && result.data.status === 'full') {
          emitBinFullAlert(req.io, result.data);
        }
      } catch (error) {
        errors.push({
          binID: update.binID,
          success: false,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
      data: {
        successful: results,
        failed: errors,
        totalProcessed: updates.length
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📊 Bulk update: ${results.length}/${updates.length} bins updated`);

  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      error: 'Failed to process bulk update',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
