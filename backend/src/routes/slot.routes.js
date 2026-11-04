
const express = require('express');

const { resetSlots, getSlots, } = require('../controllers/slot.controller');

const apiKeyAuth = require('../middleware/apiKeyAuth');

const router = express.Router();

router.use(apiKeyAuth);

router.post('/reset', resetSlots);
router.get('/slots', getSlots);

module.exports = router;
