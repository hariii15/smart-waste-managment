import { db } from '../firebase.config.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  doc,
  query, 
  where, 
  orderBy,
  limit 
} from 'firebase/firestore';

/**
 * Submit a new user report
 */
export const submitUserReport = async (reportData) => {
  try {
    // Add timestamp if not provided
    if (!reportData.createdAt) {
      reportData.createdAt = new Date().toISOString();
    }

    // Set default values
    const processedData = {
      reporterName: reportData.reporterName || 'Anonymous',
      location: reportData.location,
      imageUrl: reportData.imageUrl,
      description: reportData.description || '',
      isVerified: false,
      status: 'pending',
      createdAt: reportData.createdAt,
      address: null // Will be populated by geocoding
    };

    // Try to get readable address from coordinates (mock implementation)
    try {
      processedData.address = await reverseGeocode(reportData.location);
    } catch (geocodeError) {
      console.warn('Geocoding failed:', geocodeError.message);
      processedData.address = `Lat: ${reportData.location.latitude}, Lng: ${reportData.location.longitude}`;
    }

    // Save to database
    const docRef = await addDoc(collection(db, 'userReports'), processedData);

    return {
      success: true,
      reportId: docRef.id,
      data: processedData
    };
  } catch (error) {
    console.error('Error submitting user report:', error);
    throw error;
  }
};

/**
 * Mock reverse geocoding function
 * In production, use Google Maps Geocoding API or similar
 */
const reverseGeocode = async (location) => {
  // Mock implementation - replace with actual geocoding service
  const { latitude, longitude } = location;
  
  // This is a simplified mock - in production, make API call to geocoding service
  const mockAddresses = [
    'MG Road, Bangalore, Karnataka',
    'Brigade Road, Bangalore, Karnataka', 
    'Commercial Street, Bangalore, Karnataka',
    'Koramangala, Bangalore, Karnataka',
    'Indiranagar, Bangalore, Karnataka',
    'Jayanagar, Bangalore, Karnataka'
  ];
  
  // Return a random mock address (in production, this would be the actual API response)
  return mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
};

/**
 * Get all user reports with pagination
 */
export const getUserReports = async (limitCount = 50, status = null) => {
  try {
    let reportsQuery = query(
      collection(db, 'userReports'),
      orderBy('createdAt', 'desc')
    );

    // Filter by status if provided
    if (status) {
      reportsQuery = query(
        collection(db, 'userReports'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    // Apply limit
    if (limitCount > 0) {
      reportsQuery = query(reportsQuery, limit(limitCount));
    }

    const snapshot = await getDocs(reportsQuery);
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      reports,
      total: snapshot.size
    };
  } catch (error) {
    console.error('Error fetching user reports:', error);
    throw error;
  }
};

/**
 * Verify a user report
 */
export const verifyReport = async (reportId, isVerified, adminNotes = null) => {
  try {
    const reportRef = doc(db, 'userReports', reportId);
    
    const updateData = {
      isVerified,
      status: isVerified ? 'verified' : 'rejected',
      verifiedAt: new Date().toISOString(),
      adminNotes
    };

    await updateDoc(reportRef, updateData);

    return {
      success: true,
      reportId,
      isVerified,
      adminNotes
    };
  } catch (error) {
    console.error('Error verifying report:', error);
    throw error;
  }
};

/**
 * Get report statistics
 */
export const getReportStatistics = async () => {
  try {
    const reportsSnapshot = await getDocs(collection(db, 'userReports'));
    const reports = reportsSnapshot.docs.map(doc => doc.data());

    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(today.setDate(today.getDate() - 7)).toISOString();

    const todayReports = reports.filter(report => 
      report.createdAt && report.createdAt >= todayStart
    );

    const weekReports = reports.filter(report => 
      report.createdAt && report.createdAt >= weekStart
    );

    const stats = {
      total: reports.length,
      pending: reports.filter(report => report.status === 'pending').length,
      verified: reports.filter(report => report.isVerified === true).length,
      rejected: reports.filter(report => report.status === 'rejected').length,
      today: todayReports.length,
      thisWeek: weekReports.length,
      topReporters: getTopReporters(reports),
      averageResponseTime: calculateAverageResponseTime(reports)
    };

    return stats;
  } catch (error) {
    console.error('Error getting report statistics:', error);
    throw error;
  }
};

/**
 * Get top reporters by report count
 */
const getTopReporters = (reports) => {
  const reporterCounts = {};
  
  reports.forEach(report => {
    const name = report.reporterName || 'Anonymous';
    reporterCounts[name] = (reporterCounts[name] || 0) + 1;
  });

  return Object.entries(reporterCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
};

/**
 * Calculate average response time for verified reports
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
 * Get nearby reports for a given location
 */
export const getNearbyReports = async (location, radiusKm = 1) => {
  try {
    // Get all reports (in production, you'd use geospatial queries)
    const reportsSnapshot = await getDocs(collection(db, 'userReports'));
    const allReports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter reports within radius
    const nearbyReports = allReports.filter(report => {
      const distance = calculateDistance(location, report.location);
      return distance <= radiusKm;
    });

    return {
      reports: nearbyReports,
      count: nearbyReports.length
    };
  } catch (error) {
    console.error('Error getting nearby reports:', error);
    throw error;
  }
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
