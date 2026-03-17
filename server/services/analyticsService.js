import { db } from '../firebase.config.js';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

/**
 * Get comprehensive analytics summary for admin dashboard
 */
export const getAnalyticsSummary = async () => {
  try {
    console.log('Fetching analytics summary...');
    
    // Fetch all data in parallel
    const [binsSnapshot, routesSnapshot, reportsSnapshot] = await Promise.all([
      getDocs(collection(db, 'bins')),
      getDocs(collection(db, 'routes')),
      getDocs(collection(db, 'userReports'))
    ]);

    const bins = binsSnapshot.docs.map(doc => doc.data());
    const routes = routesSnapshot.docs.map(doc => doc.data());
    const reports = reportsSnapshot.docs.map(doc => doc.data());

    // Calculate time periods
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(now.setDate(now.getDate() - 7)).toISOString();
    const monthStart = new Date(now.setDate(now.getDate() - 30)).toISOString();

    // Bin Analytics
    const binAnalytics = {
      total: bins.length,
      empty: bins.filter(bin => bin.status === 'empty').length,
      partial: bins.filter(bin => bin.status === 'partial').length,
      full: bins.filter(bin => bin.status === 'full').length,
      collecting: bins.filter(bin => bin.status === 'collecting').length,
      averageFillLevel: bins.length > 0 ? 
        Math.round(bins.reduce((sum, bin) => sum + bin.fillLevel, 0) / bins.length) : 0,
      criticalBins: bins.filter(bin => bin.fillLevel >= 80).length,
      zoneDistribution: getZoneDistribution(bins)
    };

    // Route Analytics
    const todayRoutes = routes.filter(route => 
      route.createdAt && route.createdAt >= today
    );
    const completedTodayRoutes = todayRoutes.filter(route => route.status === 'completed');

    const routeAnalytics = {
      total: routes.length,
      active: routes.filter(route => route.status === 'active').length,
      pending: routes.filter(route => route.status === 'pending').length,
      completed: routes.filter(route => route.status === 'completed').length,
      todayCompleted: completedTodayRoutes.length,
      wasteCollectedToday: calculateWasteCollected(completedTodayRoutes),
      totalDistanceToday: completedTodayRoutes.reduce(
        (sum, route) => sum + (route.metrics?.totalDistance || 0), 0
      ),
      averageTimePerRoute: calculateAverageRouteTime(routes),
      efficiency: calculateRouteEfficiency(routes)
    };

    // Report Analytics
    const todayReports = reports.filter(report => 
      report.createdAt && report.createdAt >= today
    );
    const weekReports = reports.filter(report => 
      report.createdAt && report.createdAt >= weekStart
    );

    const reportAnalytics = {
      total: reports.length,
      pending: reports.filter(report => report.status === 'pending').length,
      verified: reports.filter(report => report.isVerified === true).length,
      rejected: reports.filter(report => report.status === 'rejected').length,
      today: todayReports.length,
      thisWeek: weekReports.length,
      averageResponseTime: calculateAverageResponseTime(reports),
      topIssues: getTopIssueTypes(reports)
    };

    // System Performance
    const systemPerformance = {
      binUtilization: binAnalytics.total > 0 ? 
        Math.round(((binAnalytics.partial + binAnalytics.full) / binAnalytics.total) * 100) : 0,
      routeCompletion: routes.length > 0 ? 
        Math.round((routeAnalytics.completed / routes.length) * 100) : 0,
      citizenEngagement: reports.length,
      responseRate: reports.length > 0 ? 
        Math.round((reportAnalytics.verified / reports.length) * 100) : 0
    };

    // Trends (simplified - in production, you'd store historical data)
    const trends = {
      wasteCollectionTrend: calculateTrend(completedTodayRoutes.length, routes.length),
      reportTrend: calculateTrend(todayReports.length, reports.length),
      binFillTrend: calculateBinFillTrend(bins)
    };

    return {
      summary: {
        totalBins: binAnalytics.total,
        fullBins: binAnalytics.full,
        activeTrucks: routeAnalytics.active,
        wasteCollectedToday: routeAnalytics.wasteCollectedToday,
        pendingReports: reportAnalytics.pending,
        systemEfficiency: Math.round(
          (systemPerformance.binUtilization + systemPerformance.routeCompletion + systemPerformance.responseRate) / 3
        )
      },
      bins: binAnalytics,
      routes: routeAnalytics,
      reports: reportAnalytics,
      performance: systemPerformance,
      trends,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    throw error;
  }
};

/**
 * Get zone-wise bin distribution
 */
const getZoneDistribution = (bins) => {
  const zones = {};
  
  bins.forEach(bin => {
    if (bin.zone) {
      if (!zones[bin.zone]) {
        zones[bin.zone] = { total: 0, full: 0, partial: 0, empty: 0, collecting: 0 };
      }
      zones[bin.zone].total++;
      zones[bin.zone][bin.status]++;
    }
  });

  return zones;
};

/**
 * Calculate waste collected (estimated)
 * Assumes each full bin contains approximately 100kg of waste
 */
const calculateWasteCollected = (completedRoutes) => {
  const binsCollected = completedRoutes.reduce(
    (sum, route) => sum + (route.binSequence?.length || 0), 0
  );
  
  return Math.round(binsCollected * 100); // 100kg per bin (estimated)
};

/**
 * Calculate average route completion time
 */
const calculateAverageRouteTime = (routes) => {
  const completedRoutes = routes.filter(route => 
    route.status === 'completed' && route.metrics?.estimatedTime
  );

  if (completedRoutes.length === 0) return 0;

  return Math.round(
    completedRoutes.reduce((sum, route) => sum + route.metrics.estimatedTime, 0) / 
    completedRoutes.length
  );
};

/**
 * Calculate route efficiency
 */
const calculateRouteEfficiency = (routes) => {
  const completedRoutes = routes.filter(route => route.status === 'completed');
  
  if (routes.length === 0) return 0;
  
  return Math.round((completedRoutes.length / routes.length) * 100);
};

/**
 * Calculate average response time for reports
 */
const calculateAverageResponseTime = (reports) => {
  const verifiedReports = reports.filter(report => 
    report.verifiedAt && report.createdAt
  );

  if (verifiedReports.length === 0) return 0;

  const totalResponseTime = verifiedReports.reduce((sum, report) => {
    const created = new Date(report.createdAt);
    const verified = new Date(report.verifiedAt);
    return sum + (verified - created);
  }, 0);

  // Return average response time in hours
  return Math.round((totalResponseTime / verifiedReports.length) / (1000 * 60 * 60));
};

/**
 * Get top issue types from reports
 */
const getTopIssueTypes = (reports) => {
  const issueTypes = {};
  
  reports.forEach(report => {
    if (report.description) {
      // Simple keyword extraction (in production, use NLP)
      const description = report.description.toLowerCase();
      
      if (description.includes('overflow')) {
        issueTypes['Overflowing'] = (issueTypes['Overflowing'] || 0) + 1;
      } else if (description.includes('smell') || description.includes('odor')) {
        issueTypes['Bad Smell'] = (issueTypes['Bad Smell'] || 0) + 1;
      } else if (description.includes('damage')) {
        issueTypes['Damaged Bin'] = (issueTypes['Damaged Bin'] || 0) + 1;
      } else if (description.includes('additional') || description.includes('need')) {
        issueTypes['Additional Bin Request'] = (issueTypes['Additional Bin Request'] || 0) + 1;
      } else {
        issueTypes['Other'] = (issueTypes['Other'] || 0) + 1;
      }
    }
  });

  return Object.entries(issueTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));
};

/**
 * Calculate simple trend (percentage change)
 */
const calculateTrend = (current, total) => {
  if (total === 0) return 0;
  
  // Simplified trend calculation
  const average = total / 30; // Assume 30 days of data
  const change = ((current - average) / average) * 100;
  
  return Math.round(change);
};

/**
 * Calculate bin fill trend
 */
const calculateBinFillTrend = (bins) => {
  const averageFill = bins.reduce((sum, bin) => sum + bin.fillLevel, 0) / bins.length;
  
  // Simplified trend (in production, compare with historical data)
  if (averageFill > 60) return 10; // Increasing trend
  if (averageFill < 30) return -10; // Decreasing trend
  return 0; // Stable
};

/**
 * Get real-time dashboard data
 */
export const getRealTimeDashboard = async () => {
  try {
    const [binsSnapshot, routesSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'bins'), orderBy('lastUpdated', 'desc'))),
      getDocs(query(collection(db, 'routes'), where('status', '==', 'active')))
    ]);

    const recentBins = binsSnapshot.docs.slice(0, 10).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const activeRoutes = routesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      recentBinUpdates: recentBins,
      activeRoutes,
      systemStatus: 'operational',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching real-time dashboard data:', error);
    throw error;
  }
};
