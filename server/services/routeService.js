import { db } from '../firebase.config.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  doc,
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

/**
 * Simple TSP solver using nearest neighbor heuristic
 * In production, you'd use a more sophisticated algorithm or external service
 */
const solveTSP = (bins, startLocation = { latitude: 12.9716, longitude: 77.5946 }) => {
  if (bins.length === 0) return [];
  if (bins.length === 1) return bins;

  // Calculate distance between two points using Haversine formula
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

  // Nearest neighbor algorithm
  const unvisited = [...bins];
  const route = [];
  let currentLocation = startLocation;
  let totalDistance = 0;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(currentLocation, unvisited[0].location);

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentLocation, unvisited[i].location);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearestBin = unvisited.splice(nearestIndex, 1)[0];
    route.push(nearestBin);
    currentLocation = nearestBin.location;
    totalDistance += nearestDistance;
  }

  return { route, totalDistance };
};

/**
 * Generate optimized route for full bins
 */
export const generateOptimizedRoute = async (driverId, truckId = null) => {
  try {
    // Get all full bins
    const fullBinsQuery = query(
      collection(db, 'bins'),
      where('status', '==', 'full')
    );
    
    const snapshot = await getDocs(fullBinsQuery);
    const fullBins = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (fullBins.length === 0) {
      return {
        success: false,
        message: 'No full bins found for route generation'
      };
    }

    // Solve TSP to get optimized route
    const { route, totalDistance } = solveTSP(fullBins);
    
    // Estimate time (assuming 2 minutes per bin + travel time at 30 km/h)
    const estimatedTime = Math.round((totalDistance / 30) * 60 + (route.length * 2));
    
    // Create route data
    const routeData = {
      driverId,
      truckId,
      status: 'pending',
      binSequence: route.map(bin => bin.binID),
      pathPolyline: generatePolyline(route), // Simple polyline generation
      metrics: {
        totalDistance: Math.round(totalDistance * 100) / 100,
        estimatedTime
      },
      createdAt: new Date().toISOString()
    };

    // Save route to database
    const docRef = await addDoc(collection(db, 'routes'), routeData);

    // Update bin status to 'collecting' for bins in the route
    const updatePromises = route.map(bin => 
      updateBinStatus(bin.binID, 'collecting')
    );
    await Promise.all(updatePromises);

    return {
      success: true,
      routeId: docRef.id,
      data: routeData,
      binsCount: route.length
    };
  } catch (error) {
    console.error('Error generating optimized route:', error);
    throw error;
  }
};

/**
 * Simple polyline generation (in production, use Google Maps Directions API)
 */
const generatePolyline = (bins) => {
  // This is a simplified polyline - in production, use proper routing service
  const coordinates = bins.map(bin => `${bin.location.latitude},${bin.location.longitude}`);
  return coordinates.join('|');
};

/**
 * Update bin status helper
 */
const updateBinStatus = async (binID, status) => {
  try {
    const binsQuery = query(
      collection(db, 'bins'),
      where('binID', '==', binID)
    );
    
    const snapshot = await getDocs(binsQuery);
    if (!snapshot.empty) {
      const binDoc = snapshot.docs[0];
      await updateDoc(binDoc.ref, {
        status,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`Error updating bin ${binID} status:`, error);
  }
};

/**
 * Get all routes
 */
export const getAllRoutes = async () => {
  try {
    const routesQuery = query(
      collection(db, 'routes'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(routesQuery);
    const routes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return routes;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

/**
 * Update route status
 */
export const updateRouteStatus = async (routeId, status) => {
  try {
    const routeRef = doc(db, 'routes', routeId);
    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    };

    // If route is completed, update bin statuses back to empty
    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString();
      
      // Get the route to access bin sequence
      const routeDoc = await getDocs(query(collection(db, 'routes'), where('__name__', '==', routeId)));
      if (!routeDoc.empty) {
        const routeData = routeDoc.docs[0].data();
        
        // Update all bins in the sequence to empty status and 0% fill level
        const updatePromises = routeData.binSequence.map(async (binID) => {
          const binsQuery = query(collection(db, 'bins'), where('binID', '==', binID));
          const binSnapshot = await getDocs(binsQuery);
          
          if (!binSnapshot.empty) {
            const binDoc = binSnapshot.docs[0];
            await updateDoc(binDoc.ref, {
              status: 'empty',
              fillLevel: 0,
              lastUpdated: new Date().toISOString()
            });
          }
        });
        
        await Promise.all(updatePromises);
      }
    }

    await updateDoc(routeRef, updateData);

    return {
      success: true,
      routeId,
      newStatus: status
    };
  } catch (error) {
    console.error('Error updating route status:', error);
    throw error;
  }
};

/**
 * Get route statistics
 */
export const getRouteStatistics = async () => {
  try {
    const routesSnapshot = await getDocs(collection(db, 'routes'));
    const routes = routesSnapshot.docs.map(doc => doc.data());

    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();

    const todayRoutes = routes.filter(route => 
      route.createdAt && route.createdAt >= todayStart
    );

    const stats = {
      total: routes.length,
      active: routes.filter(route => route.status === 'active').length,
      pending: routes.filter(route => route.status === 'pending').length,
      completed: routes.filter(route => route.status === 'completed').length,
      todayCompleted: todayRoutes.filter(route => route.status === 'completed').length,
      totalDistanceToday: todayRoutes
        .filter(route => route.status === 'completed')
        .reduce((sum, route) => sum + (route.metrics?.totalDistance || 0), 0),
      averageTimePerRoute: routes
        .filter(route => route.metrics?.estimatedTime)
        .reduce((sum, route) => sum + route.metrics.estimatedTime, 0) / 
        routes.filter(route => route.metrics?.estimatedTime).length || 0
    };

    return stats;
  } catch (error) {
    console.error('Error getting route statistics:', error);
    throw error;
  }
};
