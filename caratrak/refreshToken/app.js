const AWS = require("aws-sdk");
const cognito = new AWS.CognitoIdentityServiceProvider();
exports.lambdaHandler = async (event) => {
    const refreshToken = event.headers?.Authorization;
    const clientId = process.env.COGNITO_CLIENT_ID;
    try {
        const params = {
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: clientId,
            AuthParameters: {
                REFRESH_TOKEN: refreshToken
            }
        };

        const result = await cognito.initiateAuth(params).promise();
        return {
            stausCode: 200,
            body: JSON.stringify({
                message: "retrieve tokens successfully",
                idToken: result.AuthenticationResult.IdToken,
                refreshToken: result.AuthenticationResult.RefreshToken,
                expiresIn: result.AuthenticationResult.ExpiresIn
            })
        }
        // console.log('Access Token:', authResult.AuthenticationResult.AccessToken);
        // console.log('ID Token:', authResult.AuthenticationResult.IdToken);
        // console.log('Expires In:', authResult.AuthenticationResult.ExpiresIn, 'seconds');
        // Here you can return these tokens or save them as needed

    } catch (error) {
        return {
            stausCode: error.stausCode || 500,
            body: JSON.stringify({ message: error.message || "Internal Server Error" })
        }
    }



}