const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const id = event.queryStringParameters?.id
    console.log("object", id)

    const params = {
        TableName: 'userTable',
        Key: {
            id: id
        }
    };
    console.log("object22", params)

    try {
        const data = await docClient.get(params).promise();
        if (!data.Item) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Profile not found' }) };
        }

        return { statusCode: 200, body: JSON.stringify(data.Item.profileData) };
    } catch (err) {
        console.error('Unable to get profile:', err);
        return { statusCode: 500, body: JSON.stringify({ message: 'Unable to get profile' }) };
    }
};
