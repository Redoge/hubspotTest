const router = require('express').Router();
const iframes = require('../routes/iframes')

router.use("/iframes", iframes)

module.exports = router;
