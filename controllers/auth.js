const {exchangeCodeForToken, getAuthLinkString} = require("../services/authService");
const getAuthLink = async (req, res) => {
    const url = getAuthLinkString()
    res.redirect(url);
}

const getAuthCallback = async (req, res) => {
    const {code} = req.query;
    const data = await exchangeCodeForToken(code);
    res.redirect('/dashboard');
}