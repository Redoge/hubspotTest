const {getAuthUsersByData} = require("../services/userService");
const getAuthUsers = async (req, res) => {
    const data = req.query;
    const result = await getAuthUsersByData(data)
    res.json({result})
}


module.exports = {getAuthUsers}