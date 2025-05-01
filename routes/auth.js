const {getAuthCallback, getAuthLink} = require("../controllers/auth");
const router = require('express').Router();

router.get('/hubspot/callback', getAuthCallback)
router.get('/hubspot', getAuthLink)

module.exports = router;