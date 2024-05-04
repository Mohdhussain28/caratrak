const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

// Initialize AWS SDK
AWS.config.update({ region: process.env.COGNITO_REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

async function decodeToken(AccessToken) {
    const decodedToken = jwt.decode(AccessToken);
    return decodedToken.sub;
}

async function addSubValue(phone_number, sub) {
    try {
        const currentId = phone_number; // Provide the current primary key value
        const subAttribute = { subKey: sub }; // Provide the subattribute to add

        // Step 1: Define the update expression and expression attribute values to add the subattribute
        const updateExpression = "SET #subKey = :subValue";
        const expressionAttributeNames = { "#subKey": "subKey" };
        const expressionAttributeValues = { ":subValue": subAttribute.subKey };

        // Step 2: Update the item in DynamoDB to add the subattribute
        const updateParams = {
            TableName: "userTable",
            Key: { id: currentId },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW" // Optional parameter to return the updated item
        };

        await dynamodb.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "sub added" })
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error updating/retrieving item" })
        };
    }
}

async function verifyOTP(phone_number, otp, userPoolId, clientId) {
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: phone_number,
        ConfirmationCode: otp,
    };

    try {
        await cognito.confirmSignUp(params).promise();
        // console.log('User successfully verified OTP');

        // Perform user password authentication
        const authParams = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthParameters: {
                USERNAME: phone_number,
                PASSWORD: 'Admin@2000'
            }
        };

        const authResponse = await cognito.initiateAuth(authParams).promise();

        // console.log('User authenticated with password');
        return authResponse;
    } catch (error) {
        // console.error('Error verifying OTP:', error.message);
        throw error;
    }
}

exports.lambdaHandler = async (event) => {
    try {
        // console.log("Received event:", event);
        const body = JSON.parse(event.body);
        const { phone_number, otp, session } = body;

        if (session) {
            const params = {
                ChallengeName: 'CUSTOM_CHALLENGE',
                ClientId: process.env.COGNITO_CLIENT_ID,
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
                // Add sub value to DynamoDB
                const sub = await decodeToken(result.AccessToken);
                console.log("subkeyyyyy", sub)
                await addSubValue(phone_number, sub);

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'OTP verification successful',
                        authToken: result.AccessToken,
                        refreshToken: result.RefreshToken,
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
            const userPoolId = process.env.COGNITO_USER_POOL_ID;
            const clientId = process.env.COGNITO_CLIENT_ID;

            const result = await verifyOTP(phone_number, otp, userPoolId, clientId);

            if (result.AuthenticationResult && result.AuthenticationResult.AccessToken) {
                // Add sub value to DynamoDB
                const sub = await decodeToken(result.AuthenticationResult.AccessToken);
                await addSubValue(phone_number, sub);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'User successfully authenticated', authToken: result.AuthenticationResult.AccessToken }),
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
