# Docker Setup for Stock Price Predictor

This document provides instructions for running the Stock Price Predictor using Docker.

## Prerequisites

- Docker and Docker Compose installed
- API keys for Polygon, Finnhub, and Quiver Quantitative

## Environment Setup

1. Copy the environment example file:
```bash
cp env.example .env
```

2. Edit `.env` and add your API keys:
```bash
POLYGON_API_KEY=your_actual_polygon_api_key
FINNHUB_API_KEY=your_actual_finnhub_api_key
QUIVER_API_KEY=your_actual_quiver_api_key
```

## Development Setup

For development with hot reload:

```bash
# Start development environment
pnpm run docker:dev

# Or manually:
docker-compose -f docker-compose.dev.yml up --build
```

This will start:
- Redis cache service on port 6379
- API server on port 3000 with hot reload
- Volume mounting for live code changes

## Production Setup

For production deployment:

```bash
# Start production environment
pnpm run docker:prod

# Or manually:
docker-compose up --build
```

This will start:
- Redis cache service
- API server
- Nginx reverse proxy on port 80

## Available Scripts

- `pnpm run docker:build` - Build Docker image
- `pnpm run docker:run` - Run single container
- `pnpm run docker:dev` - Start development environment
- `pnpm run docker:prod` - Start production environment
- `pnpm run docker:down` - Stop all services
- `pnpm run docker:clean` - Stop and remove all containers/volumes

## API Endpoints

Once running, the API will be available at:

- **Development**: http://localhost:3000
- **Production**: http://localhost (via Nginx)

### Key Endpoints:

- `GET /health` - Health check
- `POST /api/predict` - Generate stock predictions
- `GET /api/stock/:symbol` - Get stock data
- `POST /api/chart` - Generate chart data
- `GET /api/status` - System status

### Example Prediction Request:

```bash
curl -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "timeframe": "30d"}'
```

## Health Checks

Both the API and Redis services include health checks:

- API health check: `GET /health`
- Redis health check: `redis-cli ping`

## Networking

Services communicate through a dedicated Docker network:
- `stock-predictor-network` (production)
- `stock-predictor-dev-network` (development)

## Volumes

- `redis_data` - Persistent Redis data storage
- Source code volume mounting in development mode

## Security Features

- Non-root user execution
- Security headers via Nginx
- Rate limiting (10 requests/second)
- CORS configuration
- Input validation

## Monitoring

Check service status:

```bash
# View logs
docker-compose logs -f api

# Check health
docker-compose ps

# Monitor Redis
docker exec -it stock-predictor-redis redis-cli monitor
```

## Troubleshooting

### Common Issues:

1. **API keys not working**: Ensure `.env` file is properly configured
2. **Redis connection failed**: Check if Redis container is running
3. **Port conflicts**: Ensure ports 3000, 6379, and 80 are available
4. **Build failures**: Clear Docker cache: `docker system prune -a`

### Debug Mode:

```bash
# Run with debug logging
docker-compose -f docker-compose.dev.yml up --build
```

### Clean Restart:

```bash
# Stop and remove everything
pnpm run docker:clean

# Rebuild and start
pnpm run docker:prod
```

## Scaling

To scale the API service:

```bash
docker-compose up --scale api=3
```

Note: You may need to configure a load balancer for multiple API instances.

## SSL/HTTPS

To enable HTTPS:

1. Place SSL certificates in `./ssl/` directory
2. Update `nginx.conf` to include SSL configuration
3. Uncomment SSL-related lines in docker-compose.yml

## Backup

To backup Redis data:

```bash
docker exec stock-predictor-redis redis-cli BGSAVE
docker cp stock-predictor-redis:/data/dump.rdb ./backup/
```
