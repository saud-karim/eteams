const router = require('express').Router();
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/channels', require('./channels'));
router.use('/messages', require('./messages'));
router.use('/broadcasts', require('./broadcasts'));
router.use('/admin', require('./admin'));
module.exports = router;
