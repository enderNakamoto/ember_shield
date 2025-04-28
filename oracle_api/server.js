import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { geocodeAddress, checkForWildfires } from './helper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Fire detection endpoint
app.get('/check-fire', async (req, res) => {
  try {
    const address = req.query.address || "501 Stanyan Street, San Francisco, CA 94117"; // Default to Golden Gate Park
    
    // Suppress console logs
    const originalConsoleLog = console.log;
    console.log = () => {};

    const coordinates = await geocodeAddress(address);
    const wildfireData = await checkForWildfires(coordinates.lat, coordinates.lon);
    
    // Restore console log
    console.log = originalConsoleLog;

    res.json({
      latitude: Math.round(coordinates.lat * 1000000),
      longitude: Math.round(coordinates.lon * 1000000),
      fire_detected: wildfireData.hasWildfire ? 1 : 0
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Mock fire detection endpoint that always returns specific coordinates and fire_detected as 1
app.get('/check-fire-mock', (req, res) => {
  res.json({
    latitude: 37772760,
    longitude: -122454362,
    fire_detected: 1
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 