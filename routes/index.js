const router = require('express').Router();
const iframes = require('../routes/iframes')
const auth = require('../routes/auth')
const user = require('../routes/user')

router.use("/iframes", iframes)
router.use("/user", user)
router.use("/auth", auth)

module.exports = router;
