const AWS = require('aws-sdk');

// Create DynamoDB DocumentClient
const docClient = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const body = JSON.parse(event.body);
    const { phone_number, name } = body;

    const timestamp = new Date().getTime();

    const params = {
        TableName: 'profileTable',
        Item: {
            phone_number: phone_number,
            name: name,
            creation_time: timestamp
        }
    };

    try {
        await docClient.put(params).promise();
        return { statusCode: 200, body: JSON.stringify({ message: "Profile created successfully" }) };
    } catch (err) {
        console.error('Unable to save profile:', err);
        return { statusCode: 500, body: JSON.stringify({ message: 'Unable to save profile' }) };
    }
};
