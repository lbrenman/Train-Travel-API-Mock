-- Train Travel API mock — PostgreSQL schema
-- Applied automatically by docker-compose / start-postgres.sh on container init.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS stations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  country_code  TEXT NOT NULL,
  timezone      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin            UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  destination       UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  departure_time    TIMESTAMPTZ NOT NULL,
  arrival_time      TIMESTAMPTZ NOT NULL,
  operator          TEXT NOT NULL,
  price             NUMERIC(10, 2) NOT NULL,
  bicycles_allowed  BOOLEAN NOT NULL DEFAULT false,
  dogs_allowed      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_name  TEXT NOT NULL,
  has_bicycle     BOOLEAN NOT NULL DEFAULT false,
  has_dog         BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL,
  source_type  TEXT NOT NULL CHECK (source_type IN ('card', 'bank_account')),
  source       JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_origin ON trips(origin);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips(destination);
CREATE INDEX IF NOT EXISTS idx_trips_departure_time ON trips(departure_time);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
