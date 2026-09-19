const { validationResult } = require('express-validator');
const pool = require('../db/client');
const { buildLinks } = require('../middleware/pagination');

function bookingLinks(req, booking) {
  return { self: `${req.protocol}://${req.get('host')}/bookings/${booking.id}` };
}

function paymentLinks(req, bookingId) {
  return { booking: `${req.protocol}://${req.get('host')}/bookings/${bookingId}` };
}

// Masks sensitive payment fields the same way the upstream API does on read:
// card numbers/bank account numbers show only the last 4 digits, cvc/address
// lines are write-only and stripped entirely.
function maskPaymentSource(sourceType, source) {
  if (sourceType === 'card') {
    return {
      object: 'card',
      name: source.name,
      number: source.number ? `************${source.number.slice(-4)}` : undefined,
      exp_month: source.exp_month,
      exp_year: source.exp_year,
      address_country: source.address_country,
      address_post_code: source.address_post_code,
    };
  }
  return {
    object: 'bank_account',
    name: source.name,
    account_type: source.account_type,
    number: source.number ? `${'*'.repeat(Math.max(source.number.length - 4, 0))}${source.number.slice(-4)}` : undefined,
    sort_code: source.sort_code,
    bank_name: source.bank_name,
    country: source.country,
  };
}

function serializePayment(req, payment) {
  return {
    id: payment.id,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    source: maskPaymentSource(payment.source_type, payment.source),
    status: payment.status,
    links: paymentLinks(req, payment.booking_id),
  };
}

async function listBookings(req, res, next) {
  try {
    const { limit, offset } = req.pagination;
    const countResult = await pool.query('SELECT COUNT(*) FROM bookings');
    const total = parseInt(countResult.rows[0].count, 10);

    const rows = await pool.query(
      'SELECT * FROM bookings ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      data: rows.rows.map((b) => ({ ...b, links: bookingLinks(req, b) })),
      links: buildLinks(req, total),
    });
  } catch (err) {
    next(err);
  }
}

async function getBooking(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No booking found with id ${req.params.id}.`,
      });
    }
    res.json({ data: { ...result.rows[0], links: bookingLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function createBooking(req, res, next) {
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
    const { trip_id, passenger_name, has_bicycle, has_dog } = req.body;

    const trip = await pool.query('SELECT id FROM trips WHERE id = $1', [trip_id]);
    if (trip.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No trip found with id ${trip_id}.`,
      });
    }

    const result = await pool.query(
      `INSERT INTO bookings (trip_id, passenger_name, has_bicycle, has_dog)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [trip_id, passenger_name, !!has_bicycle, !!has_dog]
    );
    res.status(201).json({ data: { ...result.rows[0], links: bookingLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function updateBooking(req, res, next) {
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
    const existing = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No booking found with id ${req.params.id}.`,
      });
    }
    const current = existing.rows[0];
    const { passenger_name, has_bicycle, has_dog, status } = req.body;

    const result = await pool.query(
      `UPDATE bookings SET passenger_name = $1, has_bicycle = $2, has_dog = $3, status = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [
        passenger_name ?? current.passenger_name,
        has_bicycle ?? current.has_bicycle,
        has_dog ?? current.has_dog,
        status ?? current.status,
        req.params.id,
      ]
    );
    res.json({ data: { ...result.rows[0], links: bookingLinks(req, result.rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function deleteBooking(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No booking found with id ${req.params.id}.`,
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function createPayment(req, res, next) {
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
    const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No booking found with id ${req.params.id}.`,
      });
    }
    if (booking.rows[0].status === 'confirmed') {
      return res.status(409).json({
        type: 'https://example.com/errors/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'This booking has already been paid for.',
      });
    }

    const { amount, currency, source } = req.body;
    const sourceType = source && source.object === 'bank_account' ? 'bank_account' : 'card';

    const result = await pool.query(
      `INSERT INTO payments (booking_id, amount, currency, source_type, source, status)
       VALUES ($1, $2, $3, $4, $5, 'succeeded') RETURNING *`,
      [req.params.id, amount, currency, sourceType, JSON.stringify(source)]
    );

    await pool.query(`UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1`, [
      req.params.id,
    ]);

    res.status(200).json({ data: serializePayment(req, result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

async function getPayment(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `No payment found for booking ${req.params.id}.`,
      });
    }
    res.json({ data: serializePayment(req, result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBookings, getBooking, createBooking, updateBooking, deleteBooking,
  createPayment, getPayment,
};
