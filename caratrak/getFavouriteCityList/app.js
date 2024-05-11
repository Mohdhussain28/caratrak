const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const claims = event.requestContext.authorizer?.claims;
    const id = claims.sub;

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "ID parameter is required." })
        };
    }

    try {
        const getResult = await dynamodb.get({
            TableName: "favourite-table",
            Key: { id: id }
        }).promise();

        console.log("DynamoDB Result:", getResult);

        const cities = getResult.Item ? getResult.Item.cities || [] : [];
        console.log("Cities Array:", cities);

        return {
            statusCode: 200,
            body: JSON.stringify(cities)
        };
    } catch (error) {
        console.error("Error getting cities:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error." })
        };
    }
};
