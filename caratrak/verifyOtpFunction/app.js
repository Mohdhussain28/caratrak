const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
AWS.config.update({ region: process.env.COGNITO_REGION });
const cognito = new AWS.CognitoIdentityServiceProvider();

async function decodeToken(AccessToken) {
    const decodedToken = jwt.decode(AccessToken);
    return decodedToken.sub;
}

async function verifyOTP(phone_number, otp, userPoolId, clientId) {
    const params = {
        ClientId: clientId,
        Username: phone_number,
        ConfirmationCode: otp,
    };

    try {
        await cognito.confirmSignUp(params).promise();
        console.log('User successfully verified OTP');

        // Perform user password authentication
        const authParams = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: clientId,
            AuthParameters: {
                USERNAME: phone_number,
                PASSWORD: 'Admin@2000'
            }
        };
        console.log("authParams==", authParams)
        const authResponse = await cognito.initiateAuth(authParams).promise();

        console.log('User authenticated with password', authResponse);
        return authResponse;
    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        throw error;
    }
}

exports.lambdaHandler = async (event) => {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    try {
        // console.log("Received event:", event);
        const body = JSON.parse(event.body);
        const { phone_number, otp, session } = body;

        if (session) {
            const params = {
                ChallengeName: 'CUSTOM_CHALLENGE',
                ClientId: clientId,
                ChallengeResponses: {
                    USERNAME: phone_number,
                    ANSWER: otp
                },
                Session: session
            };

            const verifyResponse = await cognito.respondToAuthChallenge(params).promise();
            const result = verifyResponse.AuthenticationResult;
            console.log("result value", verifyResponse)
            if ((verifyResponse && verifyResponse.ChallengeName === 'CUSTOM_CHALLENGE' && verifyResponse.ChallengeResult === true) || result.AccessToken) {
                // const sub = await decodeToken(result.AccessToken);
                // console.log("subkeyyyyy", sub)

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'User successfully authenticated',
                        // authToken: result.AccessToken,
                        refreshToken: result.RefreshToken,
                        idToken: result.IdToken,
                        expiresIn: result.ExpiresIn
                    })
                };
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'OTP verification failed' })
                };
            }
        } else {


            const result = await verifyOTP(phone_number, otp, userPoolId, clientId);

            if (result.AuthenticationResult && result.AuthenticationResult.AccessToken) {
                // const sub = await decodeToken(result.AuthenticationResult.AccessToken);
                // console.log("subkeyyyyy", sub)
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'User successfully authenticated',
                        // authToken: response.AuthenticationResult.AccessToken,
                        idToken: response.AuthenticationResult.IdToken,
                        refreshToken: response.AuthenticationResult.RefreshToken,
                        expiresIn: response.AuthenticationResult.ExpiresIn
                    }),
                };
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'User authentication failed' }),
                };
            }
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error', message: error.message }),
        };
    }
};
