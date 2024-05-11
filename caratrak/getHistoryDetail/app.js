const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const claims = event.requestContext.authorizer?.claims;
    const id = claims.sub;

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing id parameter' })
        };
    }

    const params = {
        TableName: 'compared-table',
        KeyConditionExpression: 'id = :i',
        ExpressionAttributeValues: {
            ':i': id
        }
    };

    try {
        const data = await dynamodb.query(params).promise();
        if (!data.Items || data.Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No data found for the provided id' })
            };
        }
        // const formattedData = {
        //     id: id,
        //     comparedData: data.Items
        // };
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items[0].comparedData)
        };
    } catch (error) {
        console.error('Error retrieving data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
