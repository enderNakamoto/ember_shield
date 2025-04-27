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

### GET /health
Health check endpoint.

Response:
```json
{
  "status": "ok"
}
```

### GET /check-fire
Check for fires at a location.

Query Parameters:
- `address` (optional): The address to check. Defaults to Golden Gate Park if not provided.

Example:
```
GET /check-fire?address=123 Main St, San Francisco, CA
```

Response:
```json
{
  "latitude": 37.7694208,
  "longitude": -122.4539027,
  "fire_detected": 0
}
```

## Railway Deployment

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add the required environment variables in Railway dashboard
4. Deploy!

The API will be automatically deployed when you push changes to your repository.
