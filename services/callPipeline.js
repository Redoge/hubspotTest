const {users} = require("./userService");
const createHttpError = require("http-errors");
const axios = require("axios");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


/*
* Return: {id: string, properties: {"phone": "+380931806738"...}}
* in prop. may be "firstname", "lastname", "email", "phone" if exists but IMPORTANT - phone
* */
const getOrCreateLead = async (user, client) => {
    const token = user.token;
    console.log({token})
    const existsLeadResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
            filterGroups: [
                {
                    filters: [
                        {
                            "propertyName": "phone",
                            "operator": "EQ",
                            "value": client // TODO: normalize number (hs can receive abracadabra...)
                        }
                    ]
                }
            ],
            properties: ["firstname", "lastname", "email", "phone"],
            limit: 1
            ,

        }, {
            headers: {
                Authorization: `Bearer ${user.token}`
            }
        })
    const data = existsLeadResponse.data;
    let lead;
    if (data.results.length !== 0) {
        lead = existsLeadResponse.data.results[0]
    } else {
        const leadResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts', {
                properties: {
                    phone: client // TODO: normalize number (hs can receive abracadabra...)
                }
            }
            , {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            })
        lead = leadResponse.data
    }
    return lead;
}


const start = async (from, to, type, userId) => {
    console.log({users, from, to, type, userId})
    const user = users.find(u => u.user_id === userId);
    if (!user) throw createHttpError(404, 'User not found')
    let manager, client;
    if (type === 'in') {
        manager = to
        client = from
    } else {
        manager = from
        client = to
    }
    console.log({client, to})
    console.log("Start getting lead")
    const lead = await getOrCreateLead(user, client, manager)
    console.log({lead})
    console.log("End getting lead")

    console.log("Start pipeline")
    const startTime = Date.now();

    const callRecord = await createCallRecord(from, to, lead, user, type);
    console.log("Created record")

    await delay(5000);
    let recordId = callRecord.id;
    console.log({recordId})
    await updateCallRecord(recordId, user, "RINGING");
    console.log("Updated record")

    await delay(5000);
    await updateCallRecord(recordId, user, "IN_PROGRESS");
    console.log("Updated record")

    await delay(5000);
    const callDuration = Math.floor((Date.now() - startTime) / 1000);
    await updateCallRecord(recordId, user, "COMPLETED", 'https://download.samplelib.com/mp3/sample-3s.mp3', callDuration);
    console.log("Updated record")

}

const createCallRecord = async (fromNumber, toNumber, lead, user, direction, bodyMessage = "Body", title = "Title", status = "CONNECTING") => {
    const directionNormalized = "in" ? "INBOUND" : "OUTBOUND"
    const timestamp = Date.now()
    console.log({timestamp})
    const properties = {
        hs_call_title: title,
        hs_call_body: bodyMessage,
        hs_call_direction: directionNormalized,
        hs_call_status: status,
        hs_timestamp: timestamp,
        hs_call_from_number: fromNumber,
        hs_call_to_number: toNumber,
        hubspot_owner_id: user.user_id,
        hs_call_source: "INTEGRATIONS_PLATFORM",
    }
    console.log({properties})
    const associations = [
        {
            to: {
                id: lead.id
            },
            types: [
                {
                    "associationCategory": "HUBSPOT_DEFINED",
                    "associationTypeId": 194
                }
            ]
        }
    ]
    const body = {properties, associations}
    const token = user.token;
    const callRecordResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/calls',
        body
        , {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
    let data = callRecordResponse.data;
    console.log({create: data})
    return data
    // {
    //     "id": "190232235197",
    //     "properties": {
    //     "hs_all_owner_ids": "79601114",
    //         "hs_body_preview": "Test call",
    //         "hs_body_preview_html": "<html>\n <head></head>\n <body>\n Test call\n </body>\n</html>",
    //         "hs_body_preview_is_truncated": "false",
    //         "hs_call_body": "Test call",
    //         "hs_call_direction": "OUTBOUND",
    //         "hs_call_from_number": "+380931806733",
    //         "hs_call_source": "INTEGRATIONS_PLATFORM",
    //         "hs_call_status": "CONNECTING",
    //         "hs_call_title": "Test call",
    //         "hs_call_to_number": "+380931806738",
    //         "hs_connected_count": "0",
    //         "hs_createdate": "2025-05-01T13:39:33.903Z",
    //         "hs_engagements_last_contacted": "2025-04-24T20:01:33Z",
    //         "hs_lastmodifieddate": "2025-05-01T13:39:33.903Z",
    //         "hs_obj_coords": "0-48-190232235197",
    //         "hs_object_id": "190232235197",
    //         "hs_object_source": "INTEGRATION",
    //         "hs_object_source_id": "11511621",
    //         "hs_object_source_label": "INTEGRATION",
    //         "hs_timestamp": "2025-04-24T20:01:33Z",
    //         "hs_user_ids_of_all_owners": "79601114",
    //         "hs_voicemail_count": "0",
    //         "hubspot_owner_assigneddate": "2025-05-01T13:39:33.903Z",
    //         "hubspot_owner_id": "79601114"
    // },
    //     "createdAt": "2025-05-01T13:39:33.903Z",
    //     "updatedAt": "2025-05-01T13:39:33.903Z",
    //     "archived": false
    // }
}
const updateCallRecord = async (callRecordId, user, status, audioUrl, callDuration) => {
    const properties = {}
    if (status) properties.hs_call_status = status
    if (audioUrl) properties.hs_call_recording_url = audioUrl
    if (callDuration) properties.hs_call_duration = callDuration
    const body = {properties}
    const token = user.token;
    const callRecordResponse = await axios.patch(`https://api.hubapi.com/crm/v3/objects/calls/${callRecordId}`,
        body
        , {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
    let data = callRecordResponse.data;
    console.log({update: data})
    return data
}
module.exports = {start}