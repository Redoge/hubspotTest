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
module.exports = {getApiKeyIframeController, getApiKeyIframeLinkController,postApiKeyIframeController}