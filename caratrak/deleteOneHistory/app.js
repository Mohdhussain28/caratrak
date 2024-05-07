const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'compared-table';

exports.lambdaHandler = async (event) => {
    try {
        const { id, item_id } = JSON.parse(event.body);

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
            body: JSON.stringify('Object deleted successfully')
        };
    } catch (err) {
        console.error('Error deleting object:', err);
        return {
            statusCode: 500,
            body: JSON.stringify('Error deleting object')
        };
    }
};
