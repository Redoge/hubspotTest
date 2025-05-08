const users = [];


const request = require("request-promise");

const ensureSTSessionIdProperty = async (accessToken) => {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    const fieldName = 'st_session_id';

    try {
        await request({
            method: 'GET',
            uri: `https://api.hubapi.com/crm/v3/properties/calls/${fieldName}`,
            headers,
            json: true
        });
        console.log(`Field "${fieldName}" already exists!`);
    } catch (err) {
        if (err.statusCode === 404) {
            console.log(`Creating field "${fieldName}"...`);

            await request({
                method: 'POST',
                uri: 'https://api.hubapi.com/crm/v3/properties/calls',
                headers,
                body: {
                    name: fieldName,
                    label: 'StreamTelecom Session ID',
                    description: 'StreamTelecom Session ID',
                    groupName: 'callInformation',
                    type: 'string',
                    fieldType: 'text'
                },
                json: true
            });

            console.log(`Field "${fieldName}" created!`);
        } else {
            console.error(`Error checking HUBSPOT field "${fieldName}":`, err.message);
            throw err;
        }
    }
};

const exchangeCodeForToken = async (code) => {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.APP_URL + '/auth/hubspot/callback';

    const options = {
        method: 'POST',
        uri: 'https://api.hubapi.com/oauth/v1/token',
        form: {
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code: code
        },
        json: true
    };

    try {
        const data = await request(options);
        await ensureSTSessionIdProperty(data.access_token);
        return data;
    } catch (error) {
        console.log(`Error HUBSPOT EXCHANGE CODE: ${JSON.stringify(error)}`)
        return null;
    }
};

const getAccessTokenInfo = async (accessToken) => {
    const url = `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`;

    const options = {
        method: 'GET',
        uri: url,
        json: true
    };
    try {
        return await request(options);
    } catch (error) {
        console.log(`Error getting HUBSPOT access token ${JSON.stringify(error, null, 2)}\n${options}`)
        return null;
    }
};
/*{
    "token": "CNrN-5zoMhIhAAEBQAAAAQIAAAAgAAAAAAIAAAAAAAAAAAAAAACoAgAQGMOn1EUg2rv6JSjFzr4FMhQ99EXm9dG8M_Zd5rBA3lqr0VRZPzpqAAAAQQAAAADABwAAAAAAAACAAAAAAAAAAAwAIAAAAA4A4AEAAAAAAAAABwAAANACAAAAAOAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw8PDwAAAAAAAAB0IUyCRD03yb0edlTcBopA8yw--K5sNKA2V1MVIAWgBgAGjau_olcAA",
    "user": "danylo.shchetinin@streamtele.com",
    "hub_domain": "streamtele.com",
    "scopes": [
    "oauth",
    "tickets",
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.companies.write",
    "crm.objects.deals.write",
    "crm.objects.line_items.write",
    "crm.objects.courses.write",
    "crm.objects.listings.write",
    "crm.objects.services.write",
    "crm.objects.appointments.write",
    "crm.objects.goals.write"
],
    "token_type": "access",
    "user_id": 79601114,
    "expires_in": 1745,
    "app_id": 11511621,
    "hub_id": 146084803,
    "signed_access_token": {
    "expiresAt": 1745964951258,
        "scopes": "AAEBQAAAAQIAAAAgAAAAAAIAAAAAAAAAAAAAAACoAgAQ",
        "hubId": 146084803,
        "userId": 79601114,
        "appId": 11511621,
        "signature": "PfRF5vXRvDP2XeawQN5aq9FUWT8=",
        "scopeToScopeGroupPks": "AAAAQQAAAADABwAAAAAAAACAAAAAAAAAAAwAIAAAAA4A4AEAAAAAAAAABwAAANACAAAAAOAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw8PDwAAAAAAAABw==",
        "newSignature": "yCRD03yb0edlTcBopA8yw++K5sM=",
        "hublet": "eu1",
        "trialScopes": "",
        "trialScopeToScopeGroupPks": "",
        "isUserLevel": false,
        "installingUserId": 79601114,
        "isServiceAccount": false
}
}*/

const updateToken = async (tokenData) => {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const refreshToken = tokenData.refreshToken;

    const options = {
        method: 'POST',
        uri: 'https://api.hubapi.com/oauth/v1/token',
        form: {
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken
        },
        json: true
    };

    const data = await request(options); // {token_type, refresh_token, expires_in, access_token}
    const tokenInfo = await getAccessTokenInfo(data.access_token);
    if (!tokenInfo) return null;
    const userInfo = {...tokenInfo, refreshToken: data.refresh_token};

    saveAuthUser(userInfo);
    return userInfo;
};

const getAuthLinkString = () => {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.APP_URL + '/auth/hubspot/callback';
    return `https://app-eu1.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=crm.objects.line_items.write%20crm.objects.goals.write%20oauth%20crm.objects.courses.write%20crm.objects.listings.write%20crm.objects.services.write%20tickets%20crm.objects.contacts.write%20crm.objects.appointments.write%20crm.objects.companies.write%20crm.objects.deals.write%20crm.objects.contacts.read`;
}

const exchangeCodeForTokenAndSave = async (code) => {
    try {
        const data = await exchangeCodeForToken(code);
        const tokenData = await getAccessTokenInfo(data.access_token);
        saveAuthUser({...tokenData, refreshToken: data.refresh_token});
        console.log({user: tokenData})
        return tokenData;
    } catch (error) {
        console.log(`Error exchange HUBSPOT code for token: ${error}`)
        return null;
    }

}


const saveAuthUser = (data) => {
    users.push(data); // TODO: Change
}

module.exports = {exchangeCodeForToken, getAuthLinkString, exchangeCodeForTokenAndSave, users}