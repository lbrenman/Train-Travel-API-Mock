const express = require('express');
const { body } = require('express-validator');
const { pagination } = require('../middleware/pagination');
const ctrl = require('../controllers/trips');

const router = express.Router();

const createRules = [
  body('origin').isUUID().withMessage('origin must be a valid station id'),
  body('destination').isUUID().withMessage('destination must be a valid station id'),
  body('departure_time').isISO8601().withMessage('departure_time must be an ISO 8601 date-time'),
  body('arrival_time').isISO8601().withMessage('arrival_time must be an ISO 8601 date-time'),
  body('operator').isString().trim().notEmpty().withMessage('operator is required'),
  body('price').isFloat({ gt: 0 }).withMessage('price must be a positive number'),
  body('bicycles_allowed').optional().isBoolean(),
  body('dogs_allowed').optional().isBoolean(),
];

const updateRules = [
  body('origin').optional().isUUID(),
  body('destination').optional().isUUID(),
  body('departure_time').optional().isISO8601(),
  body('arrival_time').optional().isISO8601(),
  body('operator').optional().isString().trim().notEmpty(),
  body('price').optional().isFloat({ gt: 0 }),
  body('bicycles_allowed').optional().isBoolean(),
  body('dogs_allowed').optional().isBoolean(),
];

router.get('/', pagination, ctrl.listTrips);
router.get('/:id', ctrl.getTrip);
router.post('/', createRules, ctrl.createTrip);
router.put('/:id', updateRules, ctrl.updateTrip);
router.delete('/:id', ctrl.deleteTrip);

module.exports = router;
