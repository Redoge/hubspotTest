const {getAuthUsers} = require("../controllers/users");
const router = require('express').Router();

router.get('/me', getAuthUsers)

module.exports = router;