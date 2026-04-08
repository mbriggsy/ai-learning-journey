# Development Setup

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14+
- Redis (for session caching)

## Installation

```bash
git clone https://github.com/example/taskflow.git
cd taskflow
npm install
cp .env.example .env
npm run migrate
npm run dev
```

## Database Configuration

1. Create a PostgreSQL database:
   ```bash
   createdb taskflow_dev
   ```

2. Run migrations:
   ```bash
   npm run migrate
   ```

3. Seed development data:
   ```bash
   npm run seed
   ```

## Redis Configuration

Ensure Redis is running on the default port (6379). On macOS:

```bash
brew install redis
brew services start redis
```

## IDE Setup

We recommend VS Code with these extensions:
- ESLint
- Prettier
- PostgreSQL (by Chris Kolkman)

Workspace settings are in `.vscode/settings.json`.

## Troubleshooting

### Port conflicts

If port 3000 is in use, set `PORT` in `.env`:
```
PORT=3001
```

### Database connection errors

Ensure PostgreSQL is running and your `.env` credentials are correct. Test with:
```bash
psql -U postgres -d taskflow_dev -c "SELECT 1"
```
