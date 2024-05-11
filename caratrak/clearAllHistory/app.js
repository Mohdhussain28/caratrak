const AWS = require("aws-sdk");
const DynamoDB = new AWS.DynamoDB.DocumentClient();

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
        Key: {
            id: id
        }
    };

    try {
        await DynamoDB.delete(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item deleted successfully" })
        };
    } catch (error) {
        console.error("Error deleting item:", error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ message: error.message || "Internal Server Error" })
        };
    }
};
