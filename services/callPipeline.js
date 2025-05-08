const createHttpError = require("http-errors");
const {
    createCallRecord, updateCallRecord
} = require("../gate/02/hubspot/actions");
const {users} = require("../gate/02/hubspot/authActions");



const start = async (from, to, type, userId, sessionId) => {
    console.log({users, from, to, type, userId})
    const user = users.find(u => u.user_id === userId);
    if (!user) throw createHttpError(404, 'User not found')
    console.log("End getting lead")

    console.log("Start pipeline")
    const startTime = Date.now();

    const callRecord = await createCallRecord({from, to, type, sessionid: sessionId}, user);
    console.log("Created record")

    await delay(100);
    let recordId = callRecord.id;
    console.log({recordId})
    await updateCallRecord({event: 'StartCall', callRecordId: recordId}, user);
    console.log("Updated record")

    await delay(5000);
    await updateCallRecord({event: 'Answer', callRecordId: recordId}, user);
    console.log("Updated record")

    await delay(5000);
    await updateCallRecord({
        event: 'Hangup',
        callRecordId: recordId,
        time_start: startTime,
        event_time: Date.now(),
        recordUrl: 'https://download.samplelib.com/mp3/sample-3s.mp3',
        result: 'answer'
    }, user);
    console.log("Updated record")

    // await delay(5000);
    // await updateCallRecord({
    //     event: 'Hangup',
    //     callRecordId: recordId,
    //     time_start: startTime,
    //     event_time: Date.now(),
    //     result: 'no answer'
    // }, user);
    // console.log("Updated record")

}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


module.exports = {start}