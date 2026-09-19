const express = require('express');
const { body } = require('express-validator');
const { pagination } = require('../middleware/pagination');
const ctrl = require('../controllers/stations');

const router = express.Router();

const createRules = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('address').isString().trim().notEmpty().withMessage('address is required'),
  body('country_code').isString().trim().isLength({ min: 2, max: 2 }).withMessage('country_code must be a 2-letter code'),
  body('timezone').optional().isString(),
];

const updateRules = [
  body('name').optional().isString().trim().notEmpty(),
  body('address').optional().isString().trim().notEmpty(),
  body('country_code').optional().isString().trim().isLength({ min: 2, max: 2 }),
  body('timezone').optional().isString(),
];

router.get('/', pagination, ctrl.listStations);
router.get('/:id', ctrl.getStation);
router.post('/', createRules, ctrl.createStation);
router.put('/:id', updateRules, ctrl.updateStation);
router.delete('/:id', ctrl.deleteStation);

module.exports = router;
