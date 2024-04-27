const AWS = require('aws-sdk');

// Create DynamoDB DocumentClient
const docClient = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const phone_number = event.queryStringParameters?.phone_number; // Access phone_number directly
    console.log("object", phone_number)

    // Define params for DynamoDB get operation
    const params = {
        TableName: 'profileTable',
        Key: {
            phone_number: `+${phone_number}`
        }
    };
    console.log("object22", params)

    try {
        // Get item from DynamoDB table
        const data = await docClient.get(params).promise();
        console.log("resukt", data)
        if (!data.Item) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Profile not found' }) };
        }

        return { statusCode: 200, body: JSON.stringify(data.Item) };
    } catch (err) {
        console.error('Unable to get profile:', err);
        return { statusCode: 500, body: JSON.stringify({ message: 'Unable to get profile' }) };
    }
};
