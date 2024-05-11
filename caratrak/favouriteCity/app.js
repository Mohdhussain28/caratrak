const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const claims = event.requestContext.authorizer?.claims;
    const id = claims.sub;
    const city = event.queryStringParameters?.city;

    if (!id || !city) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "ID and city parameters are required." })
        };
    }

    try {
        const getResult = await dynamodb.get({
            TableName: "favourite-table",
            Key: { id: id }
        }).promise();

        const existingCities = getResult.Item ? getResult.Item.cities || [] : [];

        const cityExists = existingCities.some(c => c.city === city);

        if (!cityExists) {
            existingCities.push({ city: city });

            await dynamodb.update({
                TableName: "favourite-table",
                Key: { id: id },
                UpdateExpression: "SET cities = :cities",
                ExpressionAttributeValues: {
                    ":cities": existingCities
                }
            }).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({ cityExists: false, message: "City added successfully to the Favourite List." })
            };
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({ cityExists: true, message: "City already exists in the Favourite List." })
            };
        }
    } catch (error) {
        console.error("Error adding city:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error." })
        };
    }
};
