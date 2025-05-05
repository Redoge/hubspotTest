const router = require('express').Router();
const {getApiKeyIframeController, getApiKeyIframeLinkController, postApiKeyIframeController, getCTCCardController,
    getCTCCardControllerData
} = require("../controllers/iframes");


router.get('/apikey', getApiKeyIframeController);
router.post('/apikey', postApiKeyIframeController);
router.get('/apikey/url', getApiKeyIframeLinkController);
router.get('/crm-card/ctc', getCTCCardController);
router.get('/crm-card/ctc/data', getCTCCardControllerData);
module.exports = router;
