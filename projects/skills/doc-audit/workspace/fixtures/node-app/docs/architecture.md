# Architecture

## Overview

TaskFlow uses a layered architecture with clear separation of concerns.

```
src/
├── controllers/    # Route handlers
├── models/         # Sequelize models
├── middleware/      # Auth, validation, rate limiting
├── services/       # Business logic
├── utils/          # Shared helpers
└── config/         # Environment and app config
```

## Tech Stack

- **Runtime**: Node.js 16.x (LTS)
- **Framework**: Express 4.x
- **ORM**: Sequelize 6
- **Database**: PostgreSQL 14
- **Cache**: Redis 7
- **Auth**: Passport.js + JWT
- **Testing**: Jest + Supertest
- **Validation**: Joi

## Request Flow

1. Request hits Express router
2. Middleware chain: rate limiter -> auth -> validation
3. Controller delegates to service layer
4. Service interacts with models
5. Response formatted and sent

## Database Schema

See [schema.md](schema.md) for the full database schema.

The primary tables are:

- `users` - User accounts and profiles
- `tasks` - Task items with status, priority, due dates
- `teams` - Team groupings
- `task_assignments` - Many-to-many between tasks and users

## WebSocket Integration

Real-time updates use Socket.io. When a task is created or updated, the service layer emits an event that the WebSocket handler broadcasts to relevant clients.

See [websocket.md](websocket.md) for protocol details.

## Error Handling

All errors flow through a centralized error handler in `src/middleware/errorHandler.js`. Custom error classes extend `AppError` with HTTP status codes and error codes for the client.
