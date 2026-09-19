const { validationResult } = require('express-validator');
const pool = require('../db/client');
const { buildLinks } = require('../middleware/pagination');

function stationLinks(req, station) {
  return {
    self: `${req.protocol}://${req.get('host')}/stations/${station.id}`,
  };
}

async function listStations(req, res, next) {
  try {
    const { search, country, coordinates } = req.query;
    const { limit, offset } = req.pagination;

    const clauses = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(name ILIKE $${params.length} OR address ILIKE $${params.length})`);
    }
    if (country) {
      params.push(country.toUpperCase());
      clauses.push(`country_code = $${params.length}`);
    }
    // `coordinates` (lat,lng) is accepted for spec compatibility. This mock does not
    // store station geo-coordinates, so it is not used to filter results.
    void coordinates;

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM stations ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const rows = await pool.query(
      `SELECT * FROM stations ${where} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: rows.rows.map((s) => ({ ...s, links: stationLinks(req, s) })),
      links: buildLinks(req, total),
    });
  } catch (err) {
    next(err);
  }
}

async function getStation(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM stations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No station found with id ${req.params.id}.`,
      });
    }
    res.json({ data: { ...result.rows[0], links: stationLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function createStation(req, res, next) {
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
    const { name, address, country_code, timezone } = req.body;
    const result = await pool.query(
      `INSERT INTO stations (name, address, country_code, timezone)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, address, country_code, timezone || null]
    );
    res.status(201).json({ data: { ...result.rows[0], links: stationLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function updateStation(req, res, next) {
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
    const existing = await pool.query('SELECT * FROM stations WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No station found with id ${req.params.id}.`,
      });
    }
    const current = existing.rows[0];
    const { name, address, country_code, timezone } = req.body;
    const result = await pool.query(
      `UPDATE stations SET name = $1, address = $2, country_code = $3, timezone = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [
        name ?? current.name,
        address ?? current.address,
        country_code ?? current.country_code,
        timezone ?? current.timezone,
        req.params.id,
      ]
    );
    res.json({ data: { ...result.rows[0], links: stationLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function deleteStation(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM stations WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No station found with id ${req.params.id}.`,
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listStations, getStation, createStation, updateStation, deleteStation };
