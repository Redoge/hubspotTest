const getApiKeyIframeController = (req, res) => {
    const postApiKeySave = `${process.env.APP_URL}/iframes/apikey`
    const data = {
        postApiKeySave
    }
    res.render('iframes/apikey', data);
}
const getApiKeyIframeLinkController = (req, res) => {
    const url = `${process.env.APP_URL}/iframes/apikey`
    res.json(url);
}
const postApiKeyIframeController = (req, res)=>{
    const {body, params, query, headers} = req;
    res.json({body, params, query, headers});
}


// First req: ?actionType=IFRAME_FETCH&portalId=146088390&userId=79601114&userEmail=danylo.shchetinin@streamtele.com&appId=11511621&accountId=joedoe@example.com
module.exports = {getApiKeyIframeController, getApiKeyIframeLinkController,postApiKeyIframeController}