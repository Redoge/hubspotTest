const redis = require('./redis');
const key = require('./keys');
const request = require('request-promise');
const actions = require('./actions');

exports.hubspot = async (allData) => {
    console.log('voip_events_all_data', JSON.stringify(allData));

    const event = {};

    switch (allData.a_marker) {
        case 'start_in': {
            await handleStartIn(allData, event);
            break;
        }
        case 'ClickToCall': {
            await handleClickToCall(allData, event);
            break;
        }
        case 'start_out': {
            await handleStartOut(allData, event);
            break;
        }
        case 'ring': {
            await handleRing(allData, event);
            break;
        }
        case 'answer': {
            await handleAnswer(allData, event);
            break;
        }
        case 'hangup': {
            await handleHangup(allData, event);
            break;
        }
        case 'Cdr': {
            await handleCdr(allData, event);
            break;
        }
        default:
            // No matching event type
            break;
    }
};

async function handleStartIn(allData, event) {
    event.event = "Start";
    event.type = "in";
    event.from = allData.callerid;
    event.to = allData.calleeid;
    event.via = allData.calleeid;
    event.sessionid = allData.sessionid;
    event.event_time = allData.time;

    await actions.createCallRecord(event, allData.int);
}

async function handleClickToCall(allData, event) {
    event.event = "Start";
    event.type = "out";
    event.from = allData.callerid;
    event.to = allData.calleeid;
    event.via = allData.calleeid;
    event.sessionid = allData.sessionid;
    event.event_time = allData.time;

    await actions.createCallRecord(event, allData.int);
}

async function handleStartOut(allData, event) {
    const sessionInfo = await redis.get_key_i_v2(allData);

    if (!sessionInfo) {
        console.log('-=- no send start_out no info -=-');
        return;
    }

    if (sessionInfo.transfer || sessionInfo.was_transfer || sessionInfo.transfer_with) {
        console.log('-=- no send start_out transfer||was_transfer||transfer_with -=-');
        return;
    }

    event.event = "Start";
    event.type = "out";
    event.from = allData.callerid;
    event.to = allData.calleeid;
    event.via = allData.calleeid;
    event.sessionid = allData.sessionid;
    event.event_time = allData.time;

    if (allData.internal_phones.includes(event.from)) {
        await actions.createCallRecord(event, allData.int);
    }
}

async function handleRing(allData, event) {
    const sessionInfo = await redis.get_key_i_v2(allData);
    if (!sessionInfo) {
        console.log('===no_send_out_ring no info -=-');
        console.log(' =======no_send_out_ring s_info  ', JSON.stringify(sessionInfo));
        console.log(' =======no_send_out_ring all_data  ', JSON.stringify(allData));
        return;
    }
    if (sessionInfo.type === 'in' && sessionInfo.transfer) {
        return; // No action needed
    }
    if (sessionInfo.type === 'in' && (sessionInfo.was_transfer || sessionInfo.transfer_with)) {
        await sendStartCallEvent(sessionInfo, allData, event, true);
        return;
    }
    if (sessionInfo.type === 'in') {
        await sendStartCallEvent(sessionInfo, allData, event, false);
        return;
    }
    if (sessionInfo.type === 'out' && (sessionInfo.transfer || sessionInfo.was_transfer || sessionInfo.transfer_with)) {
        console.log(' ==== send ev ring out was_transfer info ', JSON.stringify(sessionInfo));
        return;
    }
    if (sessionInfo.type === 'out') {
        await sendStartCallEvent(sessionInfo, allData, event, false);
    }
}

async function sendStartCallEvent(sessionInfo, allData, event, isRedirecting) {
    event.event = "StartCall";
    event.type = sessionInfo.type;
    event.from = sessionInfo.from;
    event.to = sessionInfo.to;
    event.via = sessionInfo.via;
    event.call_id = sessionInfo.callid;
    event.sessionid = allData.sessionid;
    event.redirecting = isRedirecting ? 1 : null;
    event.additionally = null;
    event.time_start = sessionInfo.time_start;
    event.event_time = sessionInfo.event_time;

    if (sessionInfo.type === 'in') {
        event.join = sessionInfo.join;
    }

    await exports.voipEventsSend(event, allData.int);
}

async function handleAnswer(allData, event) {
    const sessionInfo = await redis.get_key_i_v2(allData);
    if (!sessionInfo) return;

    event.event = "Answer";
    event.type = sessionInfo.type;
    event.from = sessionInfo.from;
    event.to = sessionInfo.to;
    event.via = sessionInfo.via;
    event.call_id = sessionInfo.callid;
    event.sessionid = sessionInfo.sessionid;
    event.redirecting = (sessionInfo.was_transfer || sessionInfo.transfer_with) ? 1 : null;
    event.additionally = null;
    event.time_start = sessionInfo.time_start;
    event.time_ring = sessionInfo.time_ring;
    event.event_time = sessionInfo.event_time;
    event.join = (sessionInfo.type === 'in') ? sessionInfo.join : null;

    await actions.updateCallRecord(event, allData.int);
}

async function handleHangup(allData, event) {
    const sessionInfo = await redis.get_key_i_v2(allData);
    if (!sessionInfo) return;

    let ctData = null;
    const brandOptions = JSON.parse(allData.int.options);
    const brandUrl = brandOptions.brand_url;
    const brandAudioUrl = brandOptions.brand_audio_url;

    if (sessionInfo.type === 'in' && brandOptions.ct_event === 1) {
        ctData = await exports.getCt(sessionInfo.sessionid, allData.int);
    }

    const mp3Url = `${brandUrl}/api/${allData.int.name}/audio?${await key.get_audio_key2(sessionInfo.sessionid, brandAudioUrl)}`;

    event.event = "Hangup";
    event.type = sessionInfo.type;
    event.from = sessionInfo.from;
    event.to = sessionInfo.to;
    event.via = sessionInfo.via;
    event.call_id = sessionInfo.callid;
    event.sessionid = sessionInfo.sessionid;
    event.redirecting = (sessionInfo.was_transfer || sessionInfo.transfer_with) ? 1 : null;
    event.additionally = sessionInfo.additionally;
    event.result = sessionInfo.answer ? 'answer' : 'no answer';
    event.recordUrl = sessionInfo.answer ? mp3Url : (event.redirecting ? mp3Url : null);
    event.time_start = sessionInfo.time_start;
    event.time_ring = sessionInfo.time_ring;
    event.time_answer = sessionInfo.time_answer;
    event.event_time = sessionInfo.event_time;
    event.join = (sessionInfo.type === 'in') ? sessionInfo.join : null;
    event.end_sess = (sessionInfo.type === 'in') ? sessionInfo.end_sess : null;
    event.ct_data = ctData;

    await actions.updateCallRecord(event, allData.int);
}

async function handleCdr(allData, event) {
    const sessionInfo = await redis.get_key_i_v2(allData);
    if (!sessionInfo) return;

    let ctData = null;
    const options = JSON.parse(allData.int.options);

    if (sessionInfo.type === 'in' && options.ct_event === 1) {
        ctData = await exports.getCt(sessionInfo.sessionid, allData.int);
    }

    event.event = sessionInfo.event;
    event.type = sessionInfo.type;
    event.from = sessionInfo.from;
    event.to = sessionInfo.to;
    event.via = sessionInfo.via;
    event.time_start = sessionInfo.time_start;
    event.event_time = sessionInfo.event_time;
    event.sessionid = sessionInfo.sessionid;
    event.ct_data = ctData;

    console.log('voip_events info_end_in ', sessionInfo);
    await actions.updateCallRecord(event, allData.int);
}

exports.getCt = async (sessionid, confSend) => {
    const startTime = new Date();
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${confSend.crmstream_key}`
        },
        uri: 'https://gate.streamtele.com/api/streamtele_calltracking/v1/utm',
        method: 'POST',
        body: {
            'sessionid': sessionid
        },
        json: true
    };

    console.log('Before delay:', new Date() - startTime, 'ms');

    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('After delay:', new Date() - startTime, 'ms');

    try {
        const responseStartTime = new Date();
        const response = await request(options);

        console.log('voip_events_send_get_ct', JSON.stringify(response), '| options', JSON.stringify(options));
        console.log('Response time:', new Date() - responseStartTime, 'ms');

        return response;
    } catch (error) {
        console.log('error_voip_events_send_get_ct', JSON.stringify(error), '| options', JSON.stringify(options));
        return null;
    }
};