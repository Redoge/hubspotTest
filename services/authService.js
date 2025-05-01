const axios = require("axios");
const {users} = require("./userService");
const exchangeCodeForToken = async (code) => {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.APP_URL + '/auth/hubspot/callback';
    const url = `https://api.hubapi.com/oauth/v1/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&code=${code}`;
    const response = await axios.post(url);
    const data = response.data; //  {token_type, refresh_token, expires_in, access_token}
    return data
}
const exchangeCodeForTokenAndSave = async (code) =>{
    const data = await exchangeCodeForToken(code);
    const tokenData = await getAccessTokenInfo(data.access_token);
    saveAuthUser(tokenData);
    console.log({user: tokenData})
    return tokenData;
}
const saveAuthUser = (data) => {
    users.push(data);
}
const getAuthLinkString = () => {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.APP_URL + '/auth/hubspot/callback';
    const url = `https://app-eu1.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=crm.objects.line_items.write%20crm.objects.goals.write%20oauth%20crm.objects.courses.write%20crm.objects.listings.write%20crm.objects.services.write%20tickets%20crm.objects.contacts.write%20crm.objects.appointments.write%20crm.objects.companies.write%20crm.objects.deals.write%20crm.objects.contacts.read`
    return url;
}

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
const getAccessTokenInfo = async (accessToken) => {
    const url = `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`;
    const response = await axios.get(url);
    const data = response.data; //  {token, user, hub_domain, scopes, token_type, user_id, expires_in, app_id, hub_id, signed_access_token}
    return data
}
module.exports = {exchangeCodeForToken,getAuthLinkString,exchangeCodeForTokenAndSave}