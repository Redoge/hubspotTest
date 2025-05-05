const router = require('express').Router();
const {getApiKeyIframeController, getApiKeyIframeLinkController, postApiKeyIframeController, getCTCCardController} = require("../controllers/iframes");


router.get('/apikey', getApiKeyIframeController);
router.post('/apikey', postApiKeyIframeController);
router.get('/apikey/url', getApiKeyIframeLinkController);
router.get('/crm-card/ctc', getCTCCardController);
module.exports = router;
