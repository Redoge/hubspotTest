const request = require("request-promise");

const createCallRecord = async (eventObj, intData) => {
    const {from, to, type, sessionid} = eventObj;
    const user = getUserFromIntData(intData);
    if (!user) return null;
    const client = type === 'in' ? from : to;
    console.log({client, to})
    console.log("Start getting lead")
    let lead;
    try {
        lead = await getOrCreateLead(user, client)
    } catch (error) {
        console.log(`Error getting or creating HUBSPOT contact: ${JSON.stringify(error, null, 2)}`)
        return null;
    }
    console.log({lead})
    console.log("End getting lead")
    console.log("Start pipeline")
    try {
        return await createCallRecordRequest(from, to, lead, user, type, sessionid); // TODO: save call id
    } catch (error) {
        console.log(`Error creating HUBSPOT call record: ${JSON.stringify(error, null, 2)}`)
        return null;
    }
}

const updateCallRecord = async (eventObj, intData) => {
    const user = getUserFromIntData(intData)
    const {event, recordUrl, time_start, event_time, result} = eventObj;
    const {callRecordId} = eventObj;// TODO: need receive this
    const status = mapEventName(event)
    console.log({status})
    if (result && result === 'no answer')
        try {
            return await processUnansweredCall(callRecordId, user) // Will be created ticket about unanswered call
        } catch (error) {
            console.log(`Error processUnansweredCall: ${JSON.stringify(error, null, 2)}`)
            return null;
        }
    const duration = new Date(event_time) - new Date(time_start) // TODO: need millis
    try {
        return await updateCallRecordRequest(callRecordId, user, status, recordUrl, duration, 'f240bbac-87c9-4f6e-bf70-924b57d47db7')
    } catch (error) {
        console.log(`Error updateCallRecordRequest: ${JSON.stringify(error, null, 2)}`)
        return null;
    }
}

const getOrCreateLead = async (user, phoneNumber) => {
    const token = user.token;
    console.log({token});
    const searchOptions = {
        method: 'POST',
        uri: 'https://api.hubapi.com/crm/v3/objects/contacts/search',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: {
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'phone',
                            operator: 'EQ',
                            value: phoneNumber // TODO: normalize number
                        }
                    ]
                }
            ],
            properties: ['firstname', 'lastname', 'email', 'phone'],
            limit: 1
        },
        json: true
    };
    const searchResponse = await request(searchOptions);
    let lead;
    if (searchResponse.results.length !== 0) {
        lead = searchResponse.results[0];
    } else {
        const createOptions = {
            method: 'POST',
            uri: 'https://api.hubapi.com/crm/v3/objects/contacts',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: {
                properties: {
                    phone: phoneNumber // TODO: normalize number
                }
            },
            json: true
        };
        lead = await request(createOptions);
    }
    return lead;
};

const getCallInfo = async (callRecordId, token) => {
    try {
        const options = {
            method: 'GET',
            uri: `https://api.hubapi.com/crm/v3/objects/calls/${callRecordId}`,
            qs: {
                associations: 'contacts',
                properties: 'hs_call_direction'
            },
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            json: true
        };
        const data = await request(options);
        console.log('Call info:', data);
        return data;
    } catch (error) {
        console.error('Error getting call info:', error.error || error.message);
    }
};

const getContactById = async (contactId, token, properties = ['phone']) => {
    try {
        const options = {
            method: 'GET',
            uri: `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
            qs: {
                properties: properties.join(',')
            },
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            json: true
        };
        const data = await request(options);
        console.log('Contact info:', data);
        return data;
    } catch (error) {
        console.error('Error getting contact info:', error.error || error.message);
    }
};

const getCallBySessionId = async (accessToken, sessionId) => {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    try {
        const calls = await request({
            method: 'GET',
            uri: `https://api.hubapi.com/crm/v3/objects/calls/search`,
            headers,
            body: {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'st_session_id',
                                operator: 'EQ',
                                value: sessionId
                            }
                        ]
                    }
                ],
                properties: ['st_session_id', 'subject', 'createdAt', 'id'],
                limit: 1
            },
            json: true
        });

        if (calls.results.length === 0) {
            console.log(`No call found with sessionId: ${sessionId}`);
        } else {
            console.log('Found call:', calls.results[0]);
            return calls.results[0];
        }
    } catch (err) {
        console.error('Error retrieving call by sessionId:', err.message);
        throw err;
    }
};

const createTicket = async ({
                                user,
                                recordId,
                                contactId,
                                subject,
                                content,
                                hs_pipeline = 0,
                                hs_pipeline_stage = 1,
                                hs_ticket_priority = 'MEDIUM',
                            }) => {
    try {
        if (!subject) subject = 'Unanswered call.';
        if (!content) content = 'Unanswered call.';

        const properties = {
            subject,
            content,
            hs_pipeline,
            hs_pipeline_stage,
            hs_ticket_priority,
            hubspot_owner_id: user.user_id
        };
        const associations = [
            {
                to: {id: recordId},
                types: [
                    {
                        associationCategory: 'HUBSPOT_DEFINED',
                        associationTypeId: 219
                    }
                ]
            },
            {
                to: {id: contactId},
                types: [
                    {
                        associationCategory: 'HUBSPOT_DEFINED',
                        associationTypeId: 16
                    }
                ]
            }
        ];
        const options = {
            method: 'POST',
            uri: 'https://api.hubapi.com/crm/v3/objects/tickets',
            headers: {
                Authorization: `Bearer ${user.token}`,
                'Content-Type': 'application/json'
            },
            body: {
                properties,
                associations
            },
            json: true
        };
        const data = await request(options);
        console.log('Ticket created:', data);
        return data;
    } catch (error) {
        console.error('Error by ticket creating:', error.error || error.message);
    }
};


const createCallRecordRequest = async (
    fromNumber,
    toNumber,
    lead,
    user,
    direction,
    sessionid,
    status = "CONNECTING"
) => {
    const {message, title} = getTitleAndMessage(lead, fromNumber, toNumber, direction)
    const directionNormalized = direction === "in" ? "INBOUND" : "OUTBOUND";
    const timestamp = Date.now();
    console.log({timestamp});
    const properties = {
        hs_call_title: title,
        hs_call_body: message,
        hs_call_direction: directionNormalized,
        hs_call_status: status,
        hs_timestamp: timestamp,
        hs_call_from_number: fromNumber,
        hs_call_to_number: toNumber,
        hubspot_owner_id: user.user_id,
        hs_call_source: "INTEGRATIONS_PLATFORM",
        st_session_id: sessionid
    };

    console.log({properties});
    const associations = [
        {
            to: {
                id: lead.id
            },
            types: [
                {
                    associationCategory: "HUBSPOT_DEFINED",
                    associationTypeId: 194
                }
            ]
        }
    ];
    const options = {
        method: 'POST',
        uri: 'https://api.hubapi.com/crm/v3/objects/calls',
        headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json'
        },
        body: {
            properties,
            associations
        },
        json: true
    };
    try {
        const data = await request(options);
        console.log({create: data});
        return data;
    } catch (error) {
        console.error('Error creating call record:', error.error || error.message);
    }
};

const updateCallRecordRequest = async (callRecordId, user, status, audioUrl, callDuration, disposition) => {
    const properties = {};
    if (status) properties.hs_call_status = status;
    if (audioUrl) properties.hs_call_recording_url = audioUrl;
    if (callDuration) properties.hs_call_duration = callDuration;
    if (disposition) properties.hs_call_disposition = disposition;
    if (Object.keys(properties).length === 0) {
        console.log('No properties to update. Skipping request.');
        return;
    }
    const options = {
        method: 'PATCH',
        uri: `https://api.hubapi.com/crm/v3/objects/calls/${callRecordId}`,
        headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json'
        },
        body: {properties},
        json: true
    };
    try {
        const data = await request(options);
        console.log({update: data});
        return data;
    } catch (error) {
        console.error('Error updating call record:', error.error || error.message);
    }
};

const processUnansweredCall = async (callRecordId, user) => {
    const callResult = await updateCallRecordRequest(callRecordId, user, 'NO_ANSWER', undefined, 0, '73a0d17f-1163-4015-bdd5-ec830791da20')
    const callFullInfo = await getCallInfo(callRecordId, user.token)
    if (callFullInfo.properties.hs_call_direction === 'INBOUND') { // ONLY INBOUND UNANSWERED CALLS HAVE TICKET
        const contactId = callFullInfo.associations.contacts.results[0].id
        const contact = await getContactById(contactId, user.token, ['phone', 'firstname', 'lastname'])
        const messages = createSubjectAndContentByContact(contact.properties)
        const ticket = await createTicket({
            user,
            recordId: callRecordId,
            contactId,
            subject: messages.subject,
            content: messages.content
        });
        console.log({ticket})
    }
    return callResult
}


const createSubjectAndContentByContact = (contact) => {
    console.log(contact)
    const {phone, firstname, lastname} = contact;
    const res = {};
    if (firstname || lastname) {
        res.subject = `Unanswered call (${firstname ? firstname : ''}${lastname ? " " + lastname : ''})`
        res.content = `Unanswered call:\nContact: ${firstname} ${lastname}\nPhone: ${phone}`
    } else {
        res.subject = `Unanswered call (${phone})`
        res.content = `Unanswered call: ${phone}`
    }
    return res;
}

const getUserFromIntData = (intData) => {
    return intData // TODO: implement
}

const mapEventName = (event) => {
    const STEventName = event;
    console.log({STEventName})
    switch (STEventName) {
        case 'StartCall':
            return 'RINGING'
        case 'Answer':
            return 'IN_PROGRESS'
        case 'Hangup':
            return 'COMPLETED'
        default:
            return 'FAILED'
    }
}

const getTitleAndMessage = (lead, from, to, type) => {
    if (lead.properties.firstname || lead.properties.lastname) {
        return {
            message: `Call ${type === 'in' ? 'from' : 'to'} ${lead.properties.firstname} ${lead.properties.lastname} | ${from} -> ${to}`,
            title: `Call ${type === 'in' ? 'from' : 'to'} ${lead.properties.firstname} ${lead.properties.lastname}`
        }
    }
    return {
        message: `Call ${type === 'in' ? 'from' : 'to'} ${lead.properties.phone}`,
        title: `Call ${type === 'in' ? 'from' : 'to'} ${lead.properties.phone}`
    }
}


module.exports = {
    createCallRecord, updateCallRecord
}