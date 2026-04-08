# Deployment

## Production Setup

### Docker

Build and run with Docker Compose:

```bash
docker-compose up -d
```

This starts the API server, PostgreSQL, and Redis containers.

### Manual Deployment

1. Set up a production PostgreSQL database
2. Configure environment variables (see [../README.md#environment-variables](../README.md#environment-variables))
3. Run migrations: `npm run migrate:prod`
4. Start the server: `npm start`

### CI/CD

We use GitHub Actions for CI. The pipeline is defined in `.github/workflows/ci.yml`.

Deployment to staging happens automatically on merge to `develop`. Production deploys are triggered by tagging a release.

## Monitoring

- **Health check**: `GET /health`
- **Metrics**: Prometheus endpoint at `/metrics` (not yet configured)
- **Logging**: Structured JSON logs via Winston, shipped to CloudWatch

## Scaling

The app is stateless (sessions in Redis), so horizontal scaling works out of the box behind a load balancer. Each instance needs:

- 512MB RAM minimum
- Access to PostgreSQL and Redis
- Environment variables configured
