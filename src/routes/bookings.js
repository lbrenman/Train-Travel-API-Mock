const express = require('express');
const { body } = require('express-validator');
const { pagination } = require('../middleware/pagination');
const ctrl = require('../controllers/bookings');

const router = express.Router();

const createRules = [
  body('trip_id').isUUID().withMessage('trip_id must be a valid trip id'),
  body('passenger_name').isString().trim().notEmpty().withMessage('passenger_name is required'),
  body('has_bicycle').optional().isBoolean(),
  body('has_dog').optional().isBoolean(),
];

const updateRules = [
  body('passenger_name').optional().isString().trim().notEmpty(),
  body('has_bicycle').optional().isBoolean(),
  body('has_dog').optional().isBoolean(),
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled']),
];

const paymentRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter ISO code'),
  body('source').isObject().withMessage('source is required'),
  body('source.object').isIn(['card', 'bank_account']).withMessage('source.object must be "card" or "bank_account"'),
  body('source.name').isString().trim().notEmpty().withMessage('source.name is required'),
  body('source.number').isString().trim().notEmpty().withMessage('source.number is required'),
];

router.get('/', pagination, ctrl.listBookings);
router.get('/:id', ctrl.getBooking);
router.post('/', createRules, ctrl.createBooking);
router.put('/:id', updateRules, ctrl.updateBooking);
router.delete('/:id', ctrl.deleteBooking);

router.post('/:id/payment', paymentRules, ctrl.createPayment);
router.get('/:id/payment', ctrl.getPayment);

module.exports = router;
