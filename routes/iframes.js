const router = require('express').Router();
const {getApiKeyIframeController, getApiKeyIframeLinkController, postApiKeyIframeController} = require("../controllers/iframes");


router.get('/apikey', getApiKeyIframeController);
router.post('/apikey', postApiKeyIframeController);
router.get('/apikey/url', getApiKeyIframeLinkController);

module.exports = router;
