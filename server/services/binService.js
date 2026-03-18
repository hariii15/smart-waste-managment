import { db } from '../firebase.config.js';
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { autoAssignBinToRoute } from './routeService.js';

/**
 * Update bin fill level and status
 */
export const updateBinLevel = async (binData) => {
  try {
    // Auto-calculate status based on fill level
    let status = binData.status;
    if (binData.fillLevel >= 80) {
      status = 'full';
    } else if (binData.fillLevel >= 40) {
      status = 'partial';
    } else {
      status = 'empty';
    }

    const updatedData = {
      ...binData,
      status,
      lastUpdated: new Date().toISOString()
    };

    // Find the bin document by binID
    const binsQuery = query(
      collection(db, 'bins'),
      where('binID', '==', binData.binID)
    );
    
    const snapshot = await getDocs(binsQuery);
    
    if (snapshot.empty) {
      throw new Error(`Bin with ID ${binData.binID} not found`);
    }

    const binDoc = snapshot.docs[0];
    const prevStatus = binDoc.data().status;

    await updateDoc(binDoc.ref, updatedData);

    // Auto-assign to routes when bin becomes full/high.
    // Only trigger when crossing into full.
    if (prevStatus !== 'full' && status === 'full') {
      try {
        await autoAssignBinToRoute(binData.binID);
      } catch (e) {
        console.error('Auto-assign route failed:', e?.message || e);
      }
    }

    return {
      success: true,
      data: updatedData,
      docId: binDoc.id,
      statusChanged: prevStatus !== status
    };
  } catch (error) {
    console.error('Error updating bin level:', error);
    throw error;
  }
};

/**
 * Get all bins for heatmap display
 */
export const getBinsForHeatmap = async () => {
  try {
    const binsSnapshot = await getDocs(collection(db, 'bins'));
    
    const heatmapData = binsSnapshot.docs.map(doc => {
      const data = doc.data();
      return [
        data.location.latitude,
        data.location.longitude,
        data.fillLevel / 100 // Normalize to 0-1 for heatmap intensity
      ];
    });

    const binLocations = binsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        binID: data.binID,
        location: data.location,
        fillLevel: data.fillLevel,
        status: data.status,
        zone: data.zone,
        lastUpdated: data.lastUpdated
      };
    });

    return {
      heatmapData,
      binLocations,
      totalBins: binsSnapshot.size
    };
  } catch (error) {
    console.error('Error fetching bins for heatmap:', error);
    throw error;
  }
};

/**
 * Get full bins for route generation
 */
export const getFullBins = async () => {
  try {
    const fullBinsQuery = query(
      collection(db, 'bins'),
      where('status', '==', 'full'),
      orderBy('lastUpdated', 'desc')
    );
    
    const snapshot = await getDocs(fullBinsQuery);
    
    const fullBins = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return fullBins;
  } catch (error) {
    console.error('Error fetching full bins:', error);
    throw error;
  }
};

/**
 * Get bin statistics
 */
export const getBinStatistics = async () => {
  try {
    const binsSnapshot = await getDocs(collection(db, 'bins'));
    const bins = binsSnapshot.docs.map(doc => doc.data());

    const stats = {
      total: bins.length,
      empty: bins.filter(bin => bin.status === 'empty').length,
      partial: bins.filter(bin => bin.status === 'partial').length,
      full: bins.filter(bin => bin.status === 'full').length,
      collecting: bins.filter(bin => bin.status === 'collecting').length,
      averageFillLevel: bins.reduce((sum, bin) => sum + bin.fillLevel, 0) / bins.length,
      zones: {}
    };

    // Zone-wise statistics
    bins.forEach(bin => {
      if (bin.zone) {
        if (!stats.zones[bin.zone]) {
          stats.zones[bin.zone] = { total: 0, full: 0, partial: 0, empty: 0 };
        }
        stats.zones[bin.zone].total++;
        stats.zones[bin.zone][bin.status]++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting bin statistics:', error);
    throw error;
  }
};

/**
 * Update bin status (for route operations)
 */
export const updateBinStatus = async (binID, status) => {
  try {
    const binsQuery = query(
      collection(db, 'bins'),
      where('binID', '==', binID)
    );
    
    const snapshot = await getDocs(binsQuery);
    
    if (snapshot.empty) {
      throw new Error(`Bin with ID ${binID} not found`);
    }

    const binDoc = snapshot.docs[0];
    await updateDoc(binDoc.ref, {
      status,
      lastUpdated: new Date().toISOString()
    });

    return {
      success: true,
      binID,
      newStatus: status
    };
  } catch (error) {
    console.error('Error updating bin status:', error);
    throw error;
  }
};
