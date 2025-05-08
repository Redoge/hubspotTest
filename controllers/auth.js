const {start} = require("../services/callPipeline");
const {exchangeCodeForTokenAndSave, getAuthLinkString} = require("../gate/02/hubspot/authActions");
const getAuthLink = async (req, res) => {
    const url = getAuthLinkString()
    res.redirect(url);
}

const getAuthCallback = async (req, res) => {
    const {code} = req.query;
    const user = await exchangeCodeForTokenAndSave(code);
    console.log({user})
    start("+380931806635","+380931806733","in",user.user_id,  Date.now())
    res.redirect('/dashboard');
}

module.exports = {getAuthLink, getAuthCallback}