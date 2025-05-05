const getApiKeyIframeController = (req, res) => {
    const {portalId, userId, userEmail, appId, accountId} = req.query;
    const postApiKeySave = `${process.env.APP_URL}/iframes/apikey`
    const data = {
        postApiKeySave, portalId, userId, userEmail, appId, accountId
    }
    res.render('iframes/apikey', data);
}
const getApiKeyIframeLinkController = (req, res) => {
    const {portalId, userId, userEmail, appId, accountId} = req.query;
    const url = `${process.env.APP_URL}/iframes/apikey?portalId=${portalId}&userId=${userId}&userEmail=${userEmail}&appId=${appId}&accountId=${accountId}`;
    const response = {iframeUrl: url}
    res.json({response});
}
const postApiKeyIframeController = (req, res) => {
    const {apikey, userEmail, appId, accountId, userId, portalId} = req.body;
    const date = new Date().toLocaleString('uk-UA', {timeZone: 'Europe/Kyiv'});
    console.log(`Connection request time: ${date} (uk-UA) \n${JSON.stringify({
        apikey,
        userEmail,
        appId,
        accountId,
        userId,
        portalId
    })}`);
    res.render('iframes/apikeySuccess', {userEmail})
}
const getCTCCardController = (req, res) => {
    const body = req.body;
    const query = req.body;
    console.log({body})
    console.log({query})
    res.render('iframes/ctc')
}


module.exports = {getApiKeyIframeController, getApiKeyIframeLinkController, postApiKeyIframeController,getCTCCardController}