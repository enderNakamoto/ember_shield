import { geocodeAddress, checkForWildfires } from './helper.js';

// Default location to check (Golden Gate Park)
const DEFAULT_ADDRESS = "501 Stanyan Street, San Francisco, CA 94117";

async function checkFireSimple() {
  try {
    // Suppress console logs from the main function
    const originalConsoleLog = console.log;
    console.log = () => {};

    const coordinates = await geocodeAddress(DEFAULT_ADDRESS);
    const wildfireData = await checkForWildfires(coordinates.lat, coordinates.lon);
    
    // Restore console.log
    console.log = originalConsoleLog;

    // Output only coordinates and fire status (1 for fire, 0 for no fire)
    console.log(JSON.stringify({
      latitude: coordinates.lat,
      longitude: coordinates.lon,
      fire_detected: wildfireData.hasWildfire ? 1 : 0
    }));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the check
checkFireSimple();