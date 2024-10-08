const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const claims = event.requestContext.authorizer?.claims;
    const id = claims.sub;
    console.log("object", id)

    const params = {
        TableName: 'userTable',
        Key: {
            id: id
        }
    };
    console.log("object22", params)

    try {
        const data = await dynamodb.get(params).promise();
        if (!data.Item) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Profile not found' }) };
        }

        return { statusCode: 200, body: JSON.stringify(data.Item.profileData) };
    } catch (err) {
        console.error('Unable to get profile:', err);
        return { statusCode: 500, body: JSON.stringify({ message: 'Unable to get profile' }) };
    }
};
