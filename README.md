# Train Travel API — Mock Server

> A persistent, PostgreSQL-backed mock of the [Train Travel API](https://github.com/bump-sh-examples/train-travel-api), secured with API key auth, runnable in one click via GitHub Codespaces.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/lbrenman/train-travel-api-mock)

## Overview

This project mocks the [Train Travel API](https://github.com/bump-sh-examples/train-travel-api) (finding and booking train trips across Europe): **Stations**, **Trips**, **Bookings**, and **Payments**. It's built for local development, integration testing, and demos against a spec-compatible API, so it makes two deliberate departures from the upstream spec:

- **Auth**: API key (`x-api-key` header) instead of OAuth2 — much easier to use from Postman, curl, or a client under test.
- **Full CRUD**: the upstream spec only defines a subset of methods per resource (e.g. `GET /stations` but no create/update/delete). This mock adds `POST`/`GET /:id`/`PUT`/`DELETE` for **Stations**, **Trips**, and **Bookings**, plus a `GET` on the payment sub-resource, so you can seed and fully exercise the API. Every response shape and field otherwise follows the upstream spec.

Data is real Postgres, persisted across restarts — not an in-memory mock.

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for local Postgres)
- (Optional) External PostgreSQL — Neon, Supabase, Railway, etc.

## Quick Start

### Option A — Codespaces (recommended)

1. Click the **Open in GitHub Codespaces** badge above.
2. Wait for setup to complete — it automatically: installs npm deps, copies `.env.example` to `.env`, runs `scripts/start-postgres.sh`, and seeds the database.
3. Open a terminal and run `npm run seed` manually once — the automatic seed during setup runs before `.env` is fully active, so a manual seed ensures Postgres is populated.
4. Run `npm run dev`.
5. Browse the API docs at `http://localhost:3000/api-docs`.

Note: on every Codespace restart, Postgres and the seed script run automatically — no manual steps needed after first setup. If Postgres is ever unresponsive, run `bash scripts/start-postgres.sh` manually.

### Option B — Local with Docker

```bash
bash scripts/start-postgres.sh
npm install
cp .env.example .env
npm run seed
npm run dev
```

### Option C — Local with an external Postgres provider

```bash
cp .env.example .env   # then set DATABASE_URL to your provider's connection string
npm install
npm run seed
npm run dev
```

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port the API listens on | `3000` |
| `API_VERSION` | Version reported by `/health` | `1.2.1` |
| `NODE_ENV` | Environment name | `development` |
| `AUTH_MODE` | `apikey` or `none` | `apikey` |
| `API_KEY` | Required value of the `x-api-key` header when `AUTH_MODE=apikey` | `your-api-key-here` |
| `DATABASE_URL` | Postgres connection string | see `.env.example` |
| `DEFAULT_PAGE_SIZE` | Default `limit` for list endpoints | `10` |
| `MAX_PAGE_SIZE` | Max allowed `limit` | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `LOG_LEVEL` | Set to `silent` to disable request logging | `info` |

## Authentication

Every route except `/health` and `/api-docs` requires an API key:

```
x-api-key: your-api-key-here
```

Set `API_KEY` in `.env` to whatever value you want to require. Set `AUTH_MODE=none` to disable auth entirely for local, unauthenticated development.

## API Endpoints

### Health
`GET /health` — no auth required.

### Stations
| Method | Path | Notes |
|---|---|---|
| GET | `/stations` | Paginated; filter by `search`, `country`, `coordinates` (accepted, unused) |
| GET | `/stations/:id` | |
| POST | `/stations` | *Extension* — create |
| PUT | `/stations/:id` | *Extension* — update |
| DELETE | `/stations/:id` | *Extension* — delete |

### Trips
| Method | Path | Notes |
|---|---|---|
| GET | `/trips` | Paginated; filter by `origin`, `destination`, `date`, `bicycles`, `dogs` |
| GET | `/trips/:id` | |
| POST | `/trips` | *Extension* — create |
| PUT | `/trips/:id` | *Extension* — update |
| DELETE | `/trips/:id` | *Extension* — delete |

### Bookings
| Method | Path | Notes |
|---|---|---|
| GET | `/bookings` | Paginated |
| GET | `/bookings/:id` | |
| POST | `/bookings` | Creates a `pending` booking against a trip |
| PUT | `/bookings/:id` | *Extension* — update |
| DELETE | `/bookings/:id` | Cancels the hold |

### Payments
| Method | Path | Notes |
|---|---|---|
| POST | `/bookings/:id/payment` | Pays for a booking (card or bank account); marks the booking `confirmed` |
| GET | `/bookings/:id/payment` | *Extension* — fetch the most recent payment for a booking |

Full request/response schemas, including the card vs. bank-account payment payloads, are documented interactively at `/api-docs`.

## Pagination

List endpoints accept `?page` (default `1`) and `?limit` (default `10`, max `100`). Responses use the upstream spec's hypermedia envelope:

```json
{
  "data": [ ... ],
  "links": {
    "self": "http://localhost:3000/stations?page=1&limit=10",
    "next": "http://localhost:3000/stations?page=2&limit=10"
  }
}
```

## Persistence

PostgreSQL is always used — there is no in-memory mode. Seed data ships as JSON fixtures in `src/data/` (61 stations, 792 trips across 6 dates, 150 bookings, and 60 matching payments for the confirmed bookings) and is loaded via `npm run seed`, which is safe to run repeatedly (`ON CONFLICT DO NOTHING`). Use `npm run seed:clear` to truncate all tables and reseed from scratch.

## Running in Codespaces

`.devcontainer/devcontainer.json` starts only the Postgres container (not the API) — after the Codespace starts, open a terminal and run `npm run dev` to start the API.

Since the API runs natively (not inside docker-compose), `DATABASE_URL` always uses `localhost` as the hostname:

```
DATABASE_URL=postgresql://api_user:api_pass@localhost:5432/train_travel_db
```

Postgres data is stored in `.pgdata/` (a bind mount to the Codespace's persistent disk) — records survive Codespace restarts. `.pgdata/` is gitignored. `.env` is auto-created from `.env.example` on first Codespace create — edit it to set `API_KEY` and any other values.

## Docker

```bash
docker compose up -d              # Postgres only (Codespaces-style)
docker compose -f docker-compose.full.yml up -d --build   # Full stack: API + Postgres
```

Then seed with `npm run seed` (or, inside the full-stack container, `docker compose -f docker-compose.full.yml exec api npm run seed`).

## Development

```bash
npm run dev          # start with nodemon (auto-reload)
npm start             # start without reload
npm run seed          # seed the database (idempotent)
npm run seed:clear    # truncate and reseed
```

## Example Requests

```bash
# List stations
curl -H "x-api-key: your-api-key-here" "http://localhost:3000/stations?limit=5"

# Search trips between two stations on a date
curl -H "x-api-key: your-api-key-here" \
  "http://localhost:3000/trips?origin=<station-id>&destination=<station-id>&date=2026-10-05"

# Create a booking
curl -X POST -H "x-api-key: your-api-key-here" -H "Content-Type: application/json" \
  -d '{"trip_id":"<trip-id>","passenger_name":"Jane Smith","has_bicycle":true}' \
  http://localhost:3000/bookings

# Pay for a booking
curl -X POST -H "x-api-key: your-api-key-here" -H "Content-Type: application/json" \
  -d '{"amount":49.99,"currency":"gbp","source":{"object":"card","name":"J. Doe","number":"4242424242424242","cvc":"123","exp_month":12,"exp_year":2027,"address_country":"gb"}}' \
  http://localhost:3000/bookings/<booking-id>/payment
```
