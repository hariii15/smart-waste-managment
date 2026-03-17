console.log('Starting import...');
import { 
  validateAndUploadBin, 
  validateAndUploadRoute, 
  validateAndUploadUserReport 
} from './firebase.config.js';
console.log('Import successful!')
export const seedDatabase = async () => {
  console.log("🚀 Starting Seeding Process...");

  try {
    // 1. Create Dummy Bins (A cluster in a specific area)
    console.log("📊 Adding Bin data...");
    const dummyBins = [
      { binID: "BIN-001", location: { latitude: 12.9716, longitude: 77.5946 }, fillLevel: 95, status: "full", zone: "North" },
      { binID: "BIN-002", location: { latitude: 12.9720, longitude: 77.5950 }, fillLevel: 45, status: "partial", zone: "North" },
      { binID: "BIN-003", location: { latitude: 12.9735, longitude: 77.5960 }, fillLevel: 10, status: "empty", zone: "North" },
      { binID: "BIN-004", location: { latitude: 12.9750, longitude: 77.5980 }, fillLevel: 88, status: "full", zone: "East" },
      { binID: "BIN-005", location: { latitude: 12.9765, longitude: 77.5995 }, fillLevel: 75, status: "partial", zone: "East" },
    ];

    for (const bin of dummyBins) {
      console.log(`Adding bin: ${bin.binID}...`);
      const result = await validateAndUploadBin(bin);
      if (result.success) {
        console.log(`✅ Successfully added bin ${bin.binID} with ID: ${result.docId}`);
      } else {
        console.error(`❌ Failed to add bin ${bin.binID}:`, result.error);
      }
    }
  // 2. Create Dummy Route
  console.log("🚛 Adding Route data...");
  const dummyRoute = {
    driverId: "DRIVER_01",
    truckId: "TRUCK_KAR_01",
    status: "active",
    binSequence: ["BIN-001", "BIN-004"],
    metrics: { totalDistance: 4.5, estimatedTime: 15 }
  };
  
  const routeResult = await validateAndUploadRoute(dummyRoute);
  if (routeResult.success) {
    console.log(`✅ Successfully added route with ID: ${routeResult.docId}`);
  } else {
    console.error(`❌ Failed to add route:`, routeResult.error);
  }

  // 3. Create Dummy User Report
  console.log("📱 Adding User Report data...");
  const dummyReport = {
    reporterName: "Concerned Citizen",
    location: { latitude: 12.9780, longitude: 77.6010 },
    imageUrl: "https://via.placeholder.com/150",
    description: "The bin near the park is overflowing and smells bad!",
    isVerified: false
  };
  
  const reportResult = await validateAndUploadUserReport(dummyReport);
  if (reportResult.success) {
    console.log(`✅ Successfully added user report with ID: ${reportResult.docId}`);
  } else {
    console.error(`❌ Failed to add user report:`, reportResult.error);
  }

  console.log("🎉 Database Seeding Completed Successfully!");
  
  } catch (error) {
    console.error("💥 Seeding process failed:", error);
  }
};

// Run the seeding function when this file is executed directly
console.log('Checking if script should run...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);
console.log('file URL:', `file://${process.argv[1]}`);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Script starting...");
  seedDatabase().then(() => {
    console.log("Seeding completed!");
    process.exit(0);
  }).catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
} else {
  console.log("Script not executed directly, skipping seeding...");
}