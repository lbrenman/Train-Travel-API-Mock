require('dotenv').config();
const pool = require('../db/client');
const stations = require('./stations.json');
const trips = require('./trips.json');
const bookings = require('./bookings.json');
const payments = require('./payments.json');

const shouldClear = process.argv.includes('--clear');

async function clear() {
  console.log('Clearing existing data (bookings, payments, trips, stations)...');
  await pool.query('TRUNCATE payments, bookings, trips, stations CASCADE');
}

async function seedStations() {
  for (const s of stations) {
    await pool.query(
      `INSERT INTO stations (id, name, address, country_code, timezone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.address, s.country_code, s.timezone]
    );
  }
  console.log(`Seeded ${stations.length} stations.`);
}

async function seedTrips() {
  for (const t of trips) {
    await pool.query(
      `INSERT INTO trips (id, origin, destination, departure_time, arrival_time, operator, price, bicycles_allowed, dogs_allowed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [t.id, t.origin, t.destination, t.departure_time, t.arrival_time, t.operator, t.price, t.bicycles_allowed, t.dogs_allowed]
    );
  }
  console.log(`Seeded ${trips.length} trips.`);
}

async function seedBookings() {
  for (const b of bookings) {
    await pool.query(
      `INSERT INTO bookings (id, trip_id, passenger_name, has_bicycle, has_dog, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [b.id, b.trip_id, b.passenger_name, b.has_bicycle, b.has_dog, b.status]
    );
  }
  console.log(`Seeded ${bookings.length} bookings.`);
}

async function seedPayments() {
  for (const p of payments) {
    await pool.query(
      `INSERT INTO payments (id, booking_id, amount, currency, source_type, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.booking_id, p.amount, p.currency, p.source_type, JSON.stringify(p.source), p.status]
    );
  }
  console.log(`Seeded ${payments.length} payments.`);
}

async function main() {
  try {
    if (shouldClear) {
      await clear();
    }
    await seedStations();
    await seedTrips();
    await seedBookings();
    await seedPayments();
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
