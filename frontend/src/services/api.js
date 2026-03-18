// API Service for Smart Waste Management System
// Using Firebase Firestore as the backend

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from './firebase';

function requireSignedIn() {
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }
}

// Get all bins (dedupe by logical binID)
export const getBins = async () => {
  try {
    requireSignedIn();
    const querySnapshot = await getDocs(collection(db, 'bins'));
    const raw = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Prefer latest updated document for a given binID
    const byBinId = new Map();
    for (const b of raw) {
      const key = b.binID || b.id;
      const existing = byBinId.get(key);

      if (!existing) {
        byBinId.set(key, b);
        continue;
      }

      const t1 = Date.parse(existing.lastUpdated || existing.updatedAt || existing.createdAt || 0) || 0;
      const t2 = Date.parse(b.lastUpdated || b.updatedAt || b.createdAt || 0) || 0;
      if (t2 >= t1) byBinId.set(key, b);
    }

    return Array.from(byBinId.values());
  } catch (error) {
    console.error('Error fetching bins:', error);
    throw error;
  }
};

// Update bin fill level (prefers server API if configured, falls back to direct Firestore)
export const updateBin = async (binDocId, fillLevel) => {
  try {
    requireSignedIn();

    // If a backend is running, use it so auto-route assignment can happen.
    // Set VITE_API_BASE_URL in frontend env to enable.
    const baseUrl = import.meta?.env?.VITE_API_BASE_URL;
    if (baseUrl) {
      // Need the binID for server API
      const snap = await getDoc(doc(db, 'bins', binDocId));
      if (!snap.exists()) throw new Error('Bin not found');
      const bin = snap.data();

      const res = await fetch(`${baseUrl}/api/bins/update-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          binID: bin.binID,
          fillLevel: parseInt(fillLevel, 10),
          location: bin.location,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Server update failed');
      }

      return { success: true };
    }

    // Fallback: direct Firestore update
    const binRef = doc(db, 'bins', binDocId);
    await updateDoc(binRef, {
      fillLevel: parseInt(fillLevel, 10),
      lastUpdated: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating bin:', error);
    throw error;
  }
};

// Mark bin as collected: reset fill level + status
export const markBinCollected = async (binDocId) => {
  try {
    requireSignedIn();
    const binRef = doc(db, 'bins', binDocId);
    await updateDoc(binRef, {
      fillLevel: 0,
      status: 'empty',
      collectedAt: new Date().toISOString(),
      collectedBy: auth.currentUser.uid,
      lastUpdated: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking bin collected:', error);
    throw error;
  }
};

// Get all routes
export const getRoutes = async () => {
  try {
    requireSignedIn();
    const querySnapshot = await getDocs(collection(db, 'routes'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

// Get optimized route (get the active route)
export const getOptimizedRoute = async () => {
  try {
    requireSignedIn();
    const q = query(
      collection(db, 'routes'),
      where('status', '==', 'active'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching optimized route:', error);
    throw error;
  }
};

// Get all user reports
export const getUserReports = async () => {
  try {
    requireSignedIn();
    const q = query(
      collection(db, 'userReports'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user reports:', error);
    throw error;
  }
};

// Create new user report
export const createUserReport = async (reportData) => {
  try {
    requireSignedIn();
    const docRef = await addDoc(collection(db, 'userReports'), {
      ...reportData,
      isVerified: false,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating user report:', error);
    throw error;
  }
};

// Get alerts (bins that are full or have high fill levels)
export const getAlerts = async () => {
  try {
    const bins = await getBins();
    return bins
      .filter(bin => bin.fillLevel >= 90)
      .map(bin => ({
        id: bin.id,
        type: 'bin_full',
        message: `Bin ${bin.binID} is ${bin.fillLevel}% full and needs immediate attention`,
        severity: 'high',
        timestamp: bin.lastUpdated || new Date().toISOString(),
        binId: bin.binID,
        fillLevel: bin.fillLevel
      }));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

// Live driver tracking: update current driver's location for a route
export async function updateRouteDriverLocation(routeId, location) {
  requireSignedIn();
  if (!routeId) throw new Error('routeId is required');
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    throw new Error('location must include latitude/longitude');
  }

  const ref = doc(db, 'routes', routeId);
  await updateDoc(ref, {
    driverLocation: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? null,
      heading: location.heading ?? null,
      speed: location.speed ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

// Subscribe to live updates of a route (driverLocation, status, etc.)
export function subscribeToRoute(routeId, onChange, onError) {
  requireSignedIn();
  const ref = doc(db, 'routes', routeId);
  return onSnapshot(
    ref,
    (snap) => {
      onChange?.(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    (err) => {
      onError?.(err);
    }
  );
}

// Resolve/complete a route and mark bins as collected.
// NOTE: This uses a batched write so route + bins update together.
export async function resolveRouteAndMarkBinsCollected(routeId) {
  requireSignedIn();
  if (!routeId) throw new Error('routeId is required');

  const routeRef = doc(db, 'routes', routeId);
  const routeSnap = await getDoc(routeRef);
  if (!routeSnap.exists()) throw new Error('Route not found');

  const route = routeSnap.data();
  const sequence = Array.isArray(route.binSequence) ? route.binSequence : [];

  const batch = writeBatch(db);

  batch.update(routeRef, {
    status: 'completed',
    resolvedAt: new Date().toISOString(),
    resolvedBy: auth.currentUser.uid,
    updatedAt: new Date().toISOString(),
  });

  // For each binID in the sequence, find a matching doc by binID and set it to empty.
  // (This mirrors server routeService behavior.)
  for (const binID of sequence) {
    const q = query(collection(db, 'bins'), where('binID', '==', binID), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const binDoc = snap.docs[0];
      batch.update(binDoc.ref, {
        status: 'empty',
        fillLevel: 0,
        lastUpdated: new Date().toISOString(),
        collectedAt: new Date().toISOString(),
        collectedBy: auth.currentUser.uid,
      });
    }
  }

  await batch.commit();
}

// Remove a bin from a route's binSequence (driver/admin)
export async function removeBinFromRoute(routeId, binIdToRemove) {
  requireSignedIn();
  if (!routeId) throw new Error('routeId is required');
  if (!binIdToRemove) throw new Error('binId is required');

  const routeRef = doc(db, 'routes', routeId);
  const routeSnap = await getDoc(routeRef);
  if (!routeSnap.exists()) throw new Error('Route not found');

  const route = routeSnap.data();
  const seq = Array.isArray(route.binSequence) ? route.binSequence : [];
  const nextSeq = seq.filter((b) => b !== binIdToRemove);

  await updateDoc(routeRef, {
    binSequence: nextSeq,
    updatedAt: new Date().toISOString(),
    removedBins: [...(route.removedBins || []), { binId: binIdToRemove, at: new Date().toISOString(), by: auth.currentUser.uid }],
  });
}