const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

AWS.config.update({
    region: process.env.COGNITO_REGION
});

const cognito = new AWS.CognitoIdentityServiceProvider();

async function signUpUser(phone_number, password, name, userPoolId, clientId) {
    const params = {
        ClientId: clientId,
        Username: phone_number,
        Password: password,
        UserAttributes: [
            {
                Name: 'name',
                Value: name
            }
            // Add other required attributes as needed
        ]
    };

    try {
        const data = await cognito.signUp(params).promise();
        console.log('User successfully signed up:', data);
        return data;
    } catch (error) {
        if (error.name === 'UsernameExistsException') {
            throw {
                statusCode: 409,
                headers: {
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST,GET",
                    "Access-Control-Allow-Credentials": "true"
                },
                message: 'User with the same number already exists',
            };
        }
        console.error('Error signing up user:', error.message);
        throw error;
    }
}

exports.lambdaHandler = async (event) => {
    const body = JSON.parse(event.body);
    // console.log("object", event.requestContext.identity)
    const { phone_number, password, name, email } = body;

    if (!phone_number || !password || !name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "All fields  are required" }),
            headers: {
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,GET",
                "Access-Control-Allow-Credentials": "true"
            },
        };
    }

    try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId = process.env.COGNITO_CLIENT_ID;
        const result = await signUpUser(phone_number, password, name, userPoolId, clientId);

        const userId = result.UserSub;
        if (!userId) {
            return {
                statusCode: 404,
                body: JSON.stringify("userID is not found"),
                headers: {
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST,GET",
                    "Access-Control-Allow-Credentials": "true"
                },
            };
        }

        const params = {
            TableName: "userTable",
            Item: {
                id: userId,
                phone_number: phone_number,
                name: name,
                email: email || null
            }
        };

        await dynamodb.put(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User successfully signed up', data: result }),
            headers: {
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,GET",
                "Access-Control-Allow-Credentials": "true"
            },
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
            headers: {
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,GET",
                "Access-Control-Allow-Credentials": "true"
            },
        };
    }
};
