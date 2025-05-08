const jwt = require('jsonwebtoken');
const fs = require('fs');
const rsa_key = fs.readFileSync(require('../../../../servconf').jwt.rsa_event_manager.rsa_key);
const options_one = require('../../../../servconf').jwt.options2;

exports.get_one_key = async () => {
    return await jwt.sign({}, rsa_key, options_one);
}
exports.get_audio_key2 = async (sess,b_audio) => {
    return await jwt.sign({ sess,b_audio }, 'audio');
}
