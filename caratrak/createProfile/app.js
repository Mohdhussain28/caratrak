const AWS = require('aws-sdk');

// Create DynamoDB DocumentClient
const docClient = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const body = JSON.parse(event.body);
    const { phone_number, name } = body;

    const timestamp = new Date();
    const day = ('0' + timestamp.getDate()).slice(-2); // Add leading zero if needed
    const month = ('0' + (timestamp.getMonth() + 1)).slice(-2); // Add leading zero if needed
    const year = timestamp.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    const params = {
        TableName: 'profileTable',
        Item: {
            phone_number: phone_number,
            name: name,
            creation_time: formattedDate
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
