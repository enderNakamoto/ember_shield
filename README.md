# Ember Shield API

A simple API that checks for fire detection at specified locations using NASA FIRMS data.

## Environment Variables

Create a `.env` file with:
```
NASA_FIRMS_API_KEY=your_api_key_here
PORT=3000 # Optional, defaults to 3000
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
npm run dev
```

## API Endpoints

The API is deployed and available at: `https://flarefire-production.up.railway.app`

### GET /health
Health check endpoint to verify the API is running.

Response:
```json
{
  "status": "ok"
}
```

### GET /check-fire
Check for fires at a location using real NASA FIRMS data.

Query Parameters:
- `address` (optional): The address to check. Defaults to Golden Gate Park if not provided.

Example:
```
GET /check-fire?address=123 Main St, San Francisco, CA
```

Response:
```json
{
  "latitude": 37769420,    // Latitude * 1,000,000
  "longitude": -122453902, // Longitude * 1,000,000
  "fire_detected": 0       // 0 = no fire, 1 = fire detected
}
```

### GET /check-fire-mock
Mock endpoint that always returns the same coordinates with fire detected. Useful for testing and development.

Response:
```json
{
  "latitude": 37772760,    // Fixed latitude for testing
  "longitude": -122454362, // Fixed longitude for testing
  "fire_detected": 1       // Always returns fire detected
}
```

## Railway Deployment

The API is currently deployed on Railway at:
```
https://flarefire-production.up.railway.app
```

To deploy your own instance:
1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add the required environment variables in Railway dashboard
4. Deploy using Railway CLI:
```bash
cd oracle_api
railway up
```

The API will be automatically deployed when you push changes to your repository.
