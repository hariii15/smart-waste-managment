// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { z } from 'zod';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBkw18RZjt_4MSmeAsyKbfrnsbj-wn67KQ",
  authDomain: "smart-waste-managment-253c9.firebaseapp.com",
  projectId: "smart-waste-managment-253c9",
  storageBucket: "smart-waste-managment-253c9.firebasestorage.app",
  messagingSenderId: "818038319021",
  appId: "1:818038319021:web:7436c8f58617a9310b6324",
  measurementId: "G-Y53H9WXP22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Schema Definitions using Zod for validation
const BinSchema = z.object({
  binID: z.string().regex(/^BIN-[0-9]+$/, "BinID must follow pattern BIN-[0-9]+"),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  geohash: z.string().optional(),
  fillLevel: z.number().int().min(0).max(100),
  status: z.enum(["empty", "partial", "full", "collecting"]),
  lastUpdated: z.string().datetime().optional(),
  zone: z.string().optional()
});

const RouteSchema = z.object({
  driverId: z.string(),
  truckId: z.string().optional(),
  status: z.enum(["pending", "active", "completed"]),
  binSequence: z.array(z.string()).describe("Ordered list of Bin IDs for the optimized path"),
  pathPolyline: z.string().optional().describe("Encoded string for Google Maps/Leaflet drawing"),
  metrics: z.object({
    totalDistance: z.number().optional(),
    estimatedTime: z.number().optional()
  }).optional()
});

const UserReportSchema = z.object({
  reporterName: z.string().default("Anonymous"),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  imageUrl: z.string().url(),
  description: z.string().max(500).optional(),
  isVerified: z.boolean().default(false),
  createdAt: z.string().datetime().optional()
});

// Validation and Database Operations
export const validateAndUploadBin = async (data) => {
  try {
    // Add timestamp if not provided
    if (!data.lastUpdated) {
      data.lastUpdated = new Date().toISOString();
    }
    
    const validatedData = BinSchema.parse(data);
    const docRef = await addDoc(collection(db, 'bins'), validatedData);
    console.log("Bin document written with ID: ", docRef.id);
    return { success: true, docId: docRef.id, data: validatedData };
  } catch (error) {
    console.error("Invalid Bin Data:", error);
    return { success: false, error: error.message };
  }
};

export const validateAndUploadRoute = async (data) => {
  try {
    const validatedData = RouteSchema.parse(data);
    const docRef = await addDoc(collection(db, 'routes'), validatedData);
    console.log("Route document written with ID: ", docRef.id);
    return { success: true, docId: docRef.id, data: validatedData };
  } catch (error) {
    console.error("Invalid Route Data:", error);
    return { success: false, error: error.message };
  }
};

export const validateAndUploadUserReport = async (data) => {
  try {
    // Add timestamp if not provided
    if (!data.createdAt) {
      data.createdAt = new Date().toISOString();
    }
    
    const validatedData = UserReportSchema.parse(data);
    const docRef = await addDoc(collection(db, 'userReports'), validatedData);
    console.log("UserReport document written with ID: ", docRef.id);
    return { success: true, docId: docRef.id, data: validatedData };
  } catch (error) {
    console.error("Invalid UserReport Data:", error);
    return { success: false, error: error.message };
  }
};

// Update functions with validation
export const updateBinWithValidation = async (docId, updateData) => {
  try {
    // Partial validation for updates
    const partialBinSchema = BinSchema.partial();
    
    // Add timestamp for updates
    updateData.lastUpdated = new Date().toISOString();
    
    const validatedData = partialBinSchema.parse(updateData);
    await updateDoc(doc(db, 'bins', docId), validatedData);
    console.log("Bin document updated with ID: ", docId);
    return { success: true, data: validatedData };
  } catch (error) {
    console.error("Invalid Bin Update Data:", error);
    return { success: false, error: error.message };
  }
};

export const updateRouteWithValidation = async (docId, updateData) => {
  try {
    const partialRouteSchema = RouteSchema.partial();
    const validatedData = partialRouteSchema.parse(updateData);
    await updateDoc(doc(db, 'routes', docId), validatedData);
    console.log("Route document updated with ID: ", docId);
    return { success: true, data: validatedData };
  } catch (error) {
    console.error("Invalid Route Update Data:", error);
    return { success: false, error: error.message };
  }
};

// Utility functions for data validation
export const validateBinData = (data) => {
  const result = BinSchema.safeParse(data);
  return { isValid: result.success, errors: result.error?.errors || null, data: result.data };
};

export const validateRouteData = (data) => {
  const result = RouteSchema.safeParse(data);
  return { isValid: result.success, errors: result.error?.errors || null, data: result.data };
};

export const validateUserReportData = (data) => {
  const result = UserReportSchema.safeParse(data);
  return { isValid: result.success, errors: result.error?.errors || null, data: result.data };
};

// Export Firebase services and schemas
export { app, db, BinSchema, RouteSchema, UserReportSchema };