import express from 'express';
import { 
  getAnalyticsSummary, 
  getRealTimeDashboard 
} from '../services/analyticsService.js';
import { emitAnalyticsUpdate } from '../utils/socketEvents.js';

const router = express.Router();

/**
 * GET /analytics/summary
 * Get comprehensive analytics summary for admin dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('📊 Fetching analytics summary...');
    
    const analytics = await getAnalyticsSummary();

    res.status(200).json({
      success: true,
      message: 'Analytics summary retrieved successfully',
      data: analytics,
      timestamp: new Date().toISOString()
    });

    // Emit analytics update to connected admin clients
    emitAnalyticsUpdate(req.io, {
      summary: analytics.summary,
      systemEfficiency: analytics.summary.systemEfficiency
    });

    console.log('✅ Analytics summary sent to dashboard');
    console.log(`   📊 Total Bins: ${analytics.summary.totalBins}`);
    console.log(`   🗑️ Full Bins: ${analytics.summary.fullBins}`);
    console.log(`   🚛 Active Trucks: ${analytics.summary.activeTrucks}`);
    console.log(`   📈 System Efficiency: ${analytics.summary.systemEfficiency}%`);

  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics summary',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /analytics/realtime
 * Get real-time dashboard data
 */
router.get('/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeDashboard();

    res.status(200).json({
      success: true,
      message: 'Real-time data retrieved successfully',
      data: realTimeData,
      timestamp: new Date().toISOString()
    });

    console.log(`⚡ Real-time data sent: ${realTimeData.recentBinUpdates.length} bin updates, ${realTimeData.activeRoutes.length} active routes`);

  } catch (error) {
    console.error('Error fetching real-time data:', error);
    res.status(500).json({
      error: 'Failed to fetch real-time data',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /analytics/bins
 * Get detailed bin analytics
 */
router.get('/bins', async (req, res) => {
  try {
    const analytics = await getAnalyticsSummary();

    res.status(200).json({
      success: true,
      message: 'Bin analytics retrieved successfully',
      data: {
        binAnalytics: analytics.bins,
        zoneDistribution: analytics.bins.zoneDistribution,
        fillLevelDistribution: {
          empty: analytics.bins.empty,
          partial: analytics.bins.partial,
          full: analytics.bins.full,
          collecting: analytics.bins.collecting
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log('📊 Bin analytics sent to dashboard');

  } catch (error) {
    console.error('Error fetching bin analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch bin analytics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /analytics/routes
 * Get detailed route analytics
 */
router.get('/routes', async (req, res) => {
  try {
    const analytics = await getAnalyticsSummary();

    res.status(200).json({
      success: true,
      message: 'Route analytics retrieved successfully',
      data: {
        routeAnalytics: analytics.routes,
        performance: {
          efficiency: analytics.routes.efficiency,
          averageTime: analytics.routes.averageTimePerRoute,
          completionRate: analytics.routes.completed / analytics.routes.total * 100,
          todayPerformance: {
            completed: analytics.routes.todayCompleted,
            wasteCollected: analytics.routes.wasteCollectedToday,
            totalDistance: analytics.routes.totalDistanceToday
          }
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log('🚛 Route analytics sent to dashboard');

  } catch (error) {
    console.error('Error fetching route analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch route analytics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /analytics/reports
 * Get detailed report analytics
 */
router.get('/reports', async (req, res) => {
  try {
    const analytics = await getAnalyticsSummary();

    res.status(200).json({
      success: true,
      message: 'Report analytics retrieved successfully',
      data: {
        reportAnalytics: analytics.reports,
        engagement: {
          totalReports: analytics.reports.total,
          todayReports: analytics.reports.today,
          weekReports: analytics.reports.thisWeek,
          verificationRate: analytics.reports.total > 0 ? 
            Math.round((analytics.reports.verified / analytics.reports.total) * 100) : 0,
          averageResponseTime: analytics.reports.averageResponseTime,
          topIssues: analytics.reports.topIssues
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log('📱 Report analytics sent to dashboard');

  } catch (error) {
    console.error('Error fetching report analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch report analytics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /analytics/performance
 * Get system performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const analytics = await getAnalyticsSummary();

    // Calculate additional performance metrics
    const performanceMetrics = {
      ...analytics.performance,
      trends: analytics.trends,
      kpis: {
        binCapacityUtilization: analytics.bins.averageFillLevel,
        wasteCollectionEfficiency: analytics.routes.efficiency,
        citizenEngagementScore: analytics.reports.total > 0 ? 
          Math.min(100, analytics.reports.thisWeek * 10) : 0,
        systemUptime: 99.5, // Mock uptime - in production, track actual uptime
        energyEfficiency: Math.round(85 + Math.random() * 10), // Mock metric
        costPerTon: Math.round(50 + Math.random() * 20) // Mock metric
      },
      alerts: generateSystemAlerts(analytics)
    };

    res.status(200).json({
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: performanceMetrics,
      timestamp: new Date().toISOString()
    });

    console.log('⚡ Performance metrics sent to dashboard');

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch performance metrics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /analytics/trends
 * Get trend analysis data
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Validate period
    const validPeriods = ['24h', '7d', '30d', '90d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period',
        details: `Period must be one of: ${validPeriods.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const analytics = await getAnalyticsSummary();

    // Generate trend data (simplified - in production, use historical data)
    const trendData = {
      period,
      wasteCollection: generateTrendData(period, analytics.routes.wasteCollectedToday),
      binFillLevels: generateTrendData(period, analytics.bins.averageFillLevel),
      citizenReports: generateTrendData(period, analytics.reports.today),
      routeEfficiency: generateTrendData(period, analytics.routes.efficiency),
      predictions: {
        nextWeekWasteVolume: Math.round(analytics.routes.wasteCollectedToday * 7 * 1.1),
        binFullnessPrediction: Math.min(100, analytics.bins.averageFillLevel + 15),
        recommendedTrucks: Math.ceil(analytics.bins.full / 5)
      }
    };

    res.status(200).json({
      success: true,
      message: `Trend analysis for ${period} retrieved successfully`,
      data: trendData,
      timestamp: new Date().toISOString()
    });

    console.log(`📈 Trend analysis (${period}) sent to dashboard`);

  } catch (error) {
    console.error('Error fetching trend analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch trend analysis',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to generate system alerts
 */
const generateSystemAlerts = (analytics) => {
  const alerts = [];

  // High number of full bins
  if (analytics.bins.full > 10) {
    alerts.push({
      type: 'warning',
      message: `${analytics.bins.full} bins are full and need immediate attention`,
      severity: 'high'
    });
  }

  // Low route efficiency
  if (analytics.routes.efficiency < 70) {
    alerts.push({
      type: 'performance',
      message: `Route efficiency is ${analytics.routes.efficiency}% - below optimal threshold`,
      severity: 'medium'
    });
  }

  // High number of pending reports
  if (analytics.reports.pending > 20) {
    alerts.push({
      type: 'reports',
      message: `${analytics.reports.pending} citizen reports are pending verification`,
      severity: 'medium'
    });
  }

  return alerts;
};

/**
 * Helper function to generate trend data (mock implementation)
 */
const generateTrendData = (period, currentValue) => {
  const points = {
    '24h': 24,
    '7d': 7,
    '30d': 30,
    '90d': 90
  }[period];

  const data = [];
  for (let i = points - 1; i >= 0; i--) {
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    const value = Math.max(0, Math.round(currentValue * (1 + variation)));
    data.push({
      date: new Date(Date.now() - i * (period === '24h' ? 3600000 : 86400000)).toISOString(),
      value
    });
  }

  return data;
};

export default router;
