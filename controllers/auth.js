const { getAuthLinkString, exchangeCodeForTokenAndSave} = require("../services/authService");
const {start} = require("../services/callPipeline");
const getAuthLink = async (req, res) => {
    const url = getAuthLinkString()
    res.redirect(url);
}

const getAuthCallback = async (req, res) => {
    const {code} = req.query;
    const user = await exchangeCodeForTokenAndSave(code);
    console.log({user})
    start("+380931806734","+380931806635","in",user.user_id)
    res.redirect('/dashboard');
}

module.exports = {getAuthLink, getAuthCallback}