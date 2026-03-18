// API Service for Smart Waste Management System
// Using Firebase Firestore as the backend

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBkw18RZjt_4MSmeAsyKbfrnsbj-wn67KQ",
  authDomain: "smart-waste-managment-253c9.firebaseapp.com",
  projectId: "smart-waste-managment-253c9",
  storageBucket: "smart-waste-managment-253c9.firebasestorage.app",
  messagingSenderId: "818038319021",
  appId: "1:818038319021:web:7436c8f58617a9310b6324",
  measurementId: "G-Y53H9WXP22"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// API Endpoints (Firebase Firestore operations)

// Get all bins
export const getBins = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'bins'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching bins:', error);
    throw error;
  }
};

// Update bin fill level
export const updateBin = async (binId, fillLevel) => {
  try {
    const binRef = doc(db, 'bins', binId);
    await updateDoc(binRef, {
      fillLevel: parseInt(fillLevel),
      lastUpdated: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating bin:', error);
    throw error;
  }
};

// Get all routes
export const getRoutes = async () => {
  try {
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