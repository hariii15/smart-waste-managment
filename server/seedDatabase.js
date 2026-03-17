import { 
  validateAndUploadBin, 
  validateAndUploadRoute, 
  validateAndUploadUserReport 
} from './firebase.config.js';

// Sample data for seeding
const SAMPLE_DATA = {
  bins: [
    // North Zone - Cluster 1
    { binID: "BIN-001", location: { latitude: 12.9716, longitude: 77.5946 }, fillLevel: 95, status: "full", zone: "North" },
    { binID: "BIN-002", location: { latitude: 12.9720, longitude: 77.5950 }, fillLevel: 45, status: "partial", zone: "North" },
    { binID: "BIN-003", location: { latitude: 12.9735, longitude: 77.5960 }, fillLevel: 10, status: "empty", zone: "North" },
    { binID: "BIN-004", location: { latitude: 12.9725, longitude: 77.5955 }, fillLevel: 88, status: "full", zone: "North" },
    
    // East Zone - Cluster 2
    { binID: "BIN-005", location: { latitude: 12.9750, longitude: 77.5980 }, fillLevel: 75, status: "partial", zone: "East" },
    { binID: "BIN-006", location: { latitude: 12.9765, longitude: 77.5995 }, fillLevel: 92, status: "full", zone: "East" },
    { binID: "BIN-007", location: { latitude: 12.9770, longitude: 77.6000 }, fillLevel: 20, status: "empty", zone: "East" },
    { binID: "BIN-008", location: { latitude: 12.9755, longitude: 77.5985 }, fillLevel: 68, status: "partial", zone: "East" },
    
    // South Zone - Cluster 3
    { binID: "BIN-009", location: { latitude: 12.9680, longitude: 77.5920 }, fillLevel: 85, status: "full", zone: "South" },
    { binID: "BIN-010", location: { latitude: 12.9675, longitude: 77.5915 }, fillLevel: 30, status: "partial", zone: "South" },
    { binID: "BIN-011", location: { latitude: 12.9685, longitude: 77.5925 }, fillLevel: 5, status: "empty", zone: "South" },
    { binID: "BIN-012", location: { latitude: 12.9690, longitude: 77.5930 }, fillLevel: 78, status: "partial", zone: "South" },
    
    // West Zone - Cluster 4
    { binID: "BIN-013", location: { latitude: 12.9700, longitude: 77.5900 }, fillLevel: 95, status: "full", zone: "West" },
    { binID: "BIN-014", location: { latitude: 12.9705, longitude: 77.5905 }, fillLevel: 55, status: "partial", zone: "West" },
    { binID: "BIN-015", location: { latitude: 12.9710, longitude: 77.5910 }, fillLevel: 15, status: "empty", zone: "West" }
  ],
  
  routes: [
    {
      driverId: "DRIVER_01",
      truckId: "TRUCK_KAR_01",
      status: "active",
      binSequence: ["BIN-001", "BIN-004", "BIN-006", "BIN-009"],
      metrics: { totalDistance: 8.5, estimatedTime: 25 }
    },
    {
      driverId: "DRIVER_02",
      truckId: "TRUCK_KAR_02",
      status: "pending",
      binSequence: ["BIN-013", "BIN-005", "BIN-002"],
      metrics: { totalDistance: 6.2, estimatedTime: 20 }
    },
    {
      driverId: "DRIVER_03",
      truckId: "TRUCK_KAR_03",
      status: "completed",
      binSequence: ["BIN-007", "BIN-010", "BIN-014"],
      metrics: { totalDistance: 7.8, estimatedTime: 22 }
    }
  ],
  
  userReports: [
    {
      reporterName: "Rajesh Kumar",
      location: { latitude: 12.9780, longitude: 77.6010 },
      imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400",
      description: "The bin near the park is overflowing and attracting stray animals. Urgent attention needed!",
      isVerified: false
    },
    {
      reporterName: "Priya Sharma",
      location: { latitude: 12.9695, longitude: 77.5890 },
      imageUrl: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400",
      description: "Garbage scattered around the bin area. Need immediate cleaning.",
      isVerified: true
    },
    {
      reporterName: "Anonymous",
      location: { latitude: 12.9730, longitude: 77.5965 },
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      description: "Bad smell coming from overflowing waste bin. Health hazard for nearby residents.",
      isVerified: false
    },
    {
      reporterName: "Mohammed Ali",
      location: { latitude: 12.9665, longitude: 77.5940 },
      imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400",
      description: "Bin is damaged and waste is spilling onto the road.",
      isVerified: true
    },
    {
      reporterName: "Lakshmi Devi",
      location: { latitude: 12.9745, longitude: 77.5975 },
      imageUrl: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400",
      description: "Request for additional bin in this high-traffic area.",
      isVerified: false
    }
  ]
};

/**
 * Seeds the Firebase database with sample data
 */
export const seedDatabase = async () => {
  console.log("🚀 Starting Database Seeding Process...");
  console.log("=" .repeat(50));

  try {
    let successCount = 0;
    let errorCount = 0;

    // 1. Seed Bins Collection
    console.log("\n📊 Seeding Bins Collection...");
    console.log("-".repeat(30));
    
    for (const bin of SAMPLE_DATA.bins) {
      try {
        console.log(`Adding bin: ${bin.binID} (${bin.zone} Zone, ${bin.status})...`);
        const result = await validateAndUploadBin(bin);
        
        if (result.success) {
          console.log(`  ✅ Successfully added bin ${bin.binID} with ID: ${result.docId}`);
          successCount++;
        } else {
          console.error(`  ❌ Failed to add bin ${bin.binID}:`, result.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`  💥 Error processing bin ${bin.binID}:`, error.message);
        errorCount++;
      }
    }

    // 2. Seed Routes Collection
    console.log("\n🚛 Seeding Routes Collection...");
    console.log("-".repeat(30));
    
    for (const [index, route] of SAMPLE_DATA.routes.entries()) {
      try {
        console.log(`Adding route for ${route.driverId} (${route.status})...`);
        const result = await validateAndUploadRoute(route);
        
        if (result.success) {
          console.log(`  ✅ Successfully added route with ID: ${result.docId}`);
          console.log(`     Driver: ${route.driverId}, Truck: ${route.truckId}`);
          console.log(`     Bins: ${route.binSequence.join(' → ')}`);
          successCount++;
        } else {
          console.error(`  ❌ Failed to add route for ${route.driverId}:`, result.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`  💥 Error processing route ${index + 1}:`, error.message);
        errorCount++;
      }
    }

    // 3. Seed User Reports Collection
    console.log("\n📱 Seeding User Reports Collection...");
    console.log("-".repeat(30));
    
    for (const [index, report] of SAMPLE_DATA.userReports.entries()) {
      try {
        console.log(`Adding report from ${report.reporterName}...`);
        const result = await validateAndUploadUserReport(report);
        
        if (result.success) {
          console.log(`  ✅ Successfully added user report with ID: ${result.docId}`);
          console.log(`     Status: ${report.isVerified ? 'Verified' : 'Pending Verification'}`);
          successCount++;
        } else {
          console.error(`  ❌ Failed to add user report from ${report.reporterName}:`, result.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`  💥 Error processing user report ${index + 1}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Database Seeding Completed!");
    console.log(`✅ Successfully added: ${successCount} documents`);
    console.log(`❌ Failed to add: ${errorCount} documents`);
    
    if (errorCount === 0) {
      console.log("🌟 All data seeded successfully!");
    } else {
      console.log(`⚠️  ${errorCount} items failed to seed. Check logs above for details.`);
    }

    console.log("\n📋 Summary:");
    console.log(`   • Bins: ${SAMPLE_DATA.bins.length} documents`);
    console.log(`   • Routes: ${SAMPLE_DATA.routes.length} documents`);
    console.log(`   • User Reports: ${SAMPLE_DATA.userReports.length} documents`);
    console.log("=" .repeat(50));
    
  } catch (error) {
    console.error("💥 Seeding process failed with error:", error);
    throw error;
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await seedDatabase();
    console.log("\n🏁 Seeding process completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n🚨 Seeding process failed:", error);
    process.exit(1);
  }
};

// Execute if this file is run directly
if (import.meta.url.endsWith('seedDatabase.js') && process.argv[1].endsWith('seedDatabase.js')) {
  console.log("🎯 Running seed script...\n");
  main();
} else {
  console.log("📦 Seed module loaded. Call seedDatabase() to execute.");
}
