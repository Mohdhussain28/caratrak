const AWS = require("aws-sdk");
const cognito = new AWS.CognitoIdentityServiceProvider();
exports.lambdaHandler = async (event) => {
    console.log("eee", event)
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
        console.log("object", result)
        return {
            stausCode: 200,
            body: JSON.stringify({
                message: "retrieve tokens successfully",
                idToken: result.AuthenticationResult.IdToken,
                accessToken: result.AuthenticationResult.AccessToken,
                expiresIn: result.AuthenticationResult.ExpiresIn
            })
        }
    } catch (error) {
        return {
            stausCode: error.stausCode || 500,
            body: JSON.stringify({ message: error.message || "Internal Server Error" })
        }
    }



}