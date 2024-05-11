const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'compared-table';

exports.lambdaHandler = async (event) => {
    const claims = event.requestContext.authorizer?.claims;
    const id = claims.sub;
    const item_id = event.queryStringParameters?.item_id;
    try {
        if (!id || !item_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "id or item_id doesnt entered" })
            }
        }
        const getItemParams = {
            TableName: tableName,
            Key: {
                id: id
            }
        };
        const { Item } = await dynamodb.get(getItemParams).promise();
        let comparedData = Item.comparedData || [];
        comparedData = comparedData.filter(obj => obj.item_id !== item_id);

        const updateParams = {
            TableName: tableName,
            Key: {
                id: id
            },
            UpdateExpression: 'SET comparedData = :comparedData',
            ExpressionAttributeValues: {
                ':comparedData': comparedData
            }
        };

        await dynamodb.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Object deleted successfully" })
        };
    } catch (err) {
        console.error('Error deleting object:', err);
        return {
            statusCode: 500,
            body: JSON.stringify('Error deleting object')
        };
    }
};
