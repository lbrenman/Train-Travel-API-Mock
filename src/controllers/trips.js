const { validationResult } = require('express-validator');
const pool = require('../db/client');
const { buildLinks } = require('../middleware/pagination');

function tripLinks(req, trip) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    self: `${base}/trips/${trip.id}`,
    origin: `${base}/stations/${trip.origin}`,
    destination: `${base}/stations/${trip.destination}`,
  };
}

async function listTrips(req, res, next) {
  try {
    const { origin, destination, date, bicycles, dogs } = req.query;
    const { limit, offset } = req.pagination;

    const clauses = [];
    const params = [];

    if (origin) {
      params.push(origin);
      clauses.push(`origin = $${params.length}`);
    }
    if (destination) {
      params.push(destination);
      clauses.push(`destination = $${params.length}`);
    }
    if (date) {
      // Match trips departing on the same calendar day as the supplied ISO 8601 date-time.
      params.push(date);
      clauses.push(`departure_time::date = $${params.length}::date`);
    }
    if (bicycles === 'true') {
      clauses.push('bicycles_allowed = true');
    }
    if (dogs === 'true') {
      clauses.push('dogs_allowed = true');
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM trips ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const rows = await pool.query(
      `SELECT * FROM trips ${where} ORDER BY departure_time ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: rows.rows.map((t) => ({ ...t, links: tripLinks(req, t) })),
      links: buildLinks(req, total),
    });
  } catch (err) {
    next(err);
  }
}

async function getTrip(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No trip found with id ${req.params.id}.`,
      });
    }
    res.json({ data: { ...result.rows[0], links: tripLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function assertStationsExist(origin, destination) {
  const result = await pool.query('SELECT id FROM stations WHERE id = ANY($1::uuid[])', [
    [origin, destination],
  ]);
  return result.rows.length === 2;
}

async function createTrip(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      type: 'https://example.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: errors.array().map((e) => e.msg).join(', '),
    });
  }
  try {
    const {
      origin, destination, departure_time, arrival_time,
      operator, price, bicycles_allowed, dogs_allowed,
    } = req.body;

    if (!(await assertStationsExist(origin, destination))) {
      return res.status(400).json({
        type: 'https://example.com/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'origin and destination must both reference existing station ids.',
      });
    }

    const result = await pool.query(
      `INSERT INTO trips (origin, destination, departure_time, arrival_time, operator, price, bicycles_allowed, dogs_allowed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        origin, destination, departure_time, arrival_time, operator, price,
        !!bicycles_allowed, !!dogs_allowed,
      ]
    );
    res.status(201).json({ data: { ...result.rows[0], links: tripLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function updateTrip(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      type: 'https://example.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: errors.array().map((e) => e.msg).join(', '),
    });
  }
  try {
    const existing = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No trip found with id ${req.params.id}.`,
      });
    }
    const current = existing.rows[0];
    const {
      origin, destination, departure_time, arrival_time,
      operator, price, bicycles_allowed, dogs_allowed,
    } = req.body;

    const result = await pool.query(
      `UPDATE trips SET origin = $1, destination = $2, departure_time = $3, arrival_time = $4,
         operator = $5, price = $6, bicycles_allowed = $7, dogs_allowed = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        origin ?? current.origin,
        destination ?? current.destination,
        departure_time ?? current.departure_time,
        arrival_time ?? current.arrival_time,
        operator ?? current.operator,
        price ?? current.price,
        bicycles_allowed ?? current.bicycles_allowed,
        dogs_allowed ?? current.dogs_allowed,
        req.params.id,
      ]
    );
    res.json({ data: { ...result.rows[0], links: tripLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function deleteTrip(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM trips WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No trip found with id ${req.params.id}.`,
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listTrips, getTrip, createTrip, updateTrip, deleteTrip };
