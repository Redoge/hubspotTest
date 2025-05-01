const {getAuthCallback, getAuthLink} = require("../controllers/auth");
const router = require('express').Router();

router.get('/callback', getAuthCallback)
router.get('/auth', getAuthLink)

module.exports = router;