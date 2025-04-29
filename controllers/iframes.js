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
    const {body, params, query, headers} = req;
    res.json({body, params, query});
}


module.exports = {getApiKeyIframeController, getApiKeyIframeLinkController, postApiKeyIframeController}