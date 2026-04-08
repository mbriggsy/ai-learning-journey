# TaskFlow

A lightweight task management API built with Express and PostgreSQL.

## Features

- RESTful API for task CRUD operations
- User authentication with JWT
- Real-time updates via WebSocket
- Rate limiting and request validation

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14+
- Redis (for session caching)

### Installation

```bash
git clone https://github.com/example/taskflow.git
cd taskflow
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run dev
```

### Environment Variables

See [.env.example](.env.example) for all available options.

### Running Tests

```bash
npm run test
npm run test:e2e
```

## Architecture

The app follows a standard MVC pattern. See [docs/architecture.md](docs/architecture.md) for details.

API documentation is available at [docs/api-reference.md](docs/api-reference.md) when running locally.

## Configuration

### Database Setup

Create a PostgreSQL database and run migrations:

```bash
createdb taskflow_dev
npm run migrate
```

### Redis Setup

Install Redis and ensure it's running on port 6379:

```bash
redis-server
```

### Authentication

We use Passport.js with JWT strategy. See [docs/auth.md](docs/auth.md) for configuration details.

## Deployment

See [docs/deployment.md](docs/deployment.md) for production deployment instructions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
