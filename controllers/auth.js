const { getAuthLinkString, exchangeCodeForTokenAndSave} = require("../services/authService");
const getAuthLink = async (req, res) => {
    const url = getAuthLinkString()
    res.redirect(url);
}

const getAuthCallback = async (req, res) => {
    const {code} = req.query;
    await exchangeCodeForTokenAndSave(code);
    res.redirect('/dashboard');
}

module.exports = {getAuthLink, getAuthCallback}