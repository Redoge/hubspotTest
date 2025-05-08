const getAuthUsersByData = (data) => {
    const {portalId, userId, userEmail, appId, accountId} = data;
    return [{accountId, appId, accountName: userEmail, userId, portalId}]
}
module.exports = {getAuthUsersByData}
/*
[
    {
        "accountId": "joedoe@example.com",
        "accountName": "Joe Doe",
        "accountLogoUrl": "https://www.hubspot.com/hubfs/assets/hubspot.com/style-guide/brand-guidelines/guidelines_condemned-sprocket-2.svg",
        "appId": 11511621
    },
    {
        "accountId": "janedoe@example.com",
        "accountName": "Jane Doe",
        "accountLogoUrl": "https://www.hubspot.com/hubfs/assets/hubspot.com/style-guide/brand-guidelines/guidelines_approved-sprocket-2.svg",
        "appId": 11511621
    }
]*/
