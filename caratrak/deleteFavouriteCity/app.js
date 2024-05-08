const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const id = event.queryStringParameters?.id;
    const citiesToDelete = event.queryStringParameters?.cities;
    const deleteAll = event.queryStringParameters?.deleteAll === "true";

    // Check if id is provided
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "ID parameter is required." })
        };
    }

    try {
        let existingCities = [];

        // Retrieve the current list of cities for the given id
        const getResult = await dynamodb.get({
            TableName: "favourite-table",
            Key: { id: id }
        }).promise();

        if (getResult.Item) {
            existingCities = getResult.Item.cities || [];
        }

        // Determine the list of cities to delete
        let citiesToDeleteList = [];
        if (deleteAll) {
            // Delete all cities
            citiesToDeleteList = existingCities;
        } else if (citiesToDelete) {
            // Delete specific cities
            citiesToDeleteList = citiesToDelete.split(",");
        }

        // Remove the specified cities from the list
        citiesToDeleteList.forEach(city => {
            const cityIndex = existingCities.indexOf(city);
            if (cityIndex !== -1) {
                existingCities.splice(cityIndex, 1);
            }
        });

        // Update the DynamoDB item with the new list of cities
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
            body: JSON.stringify({ message: "Cities deleted successfully." })
        };
    } catch (error) {
        console.error("Error deleting cities:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error." })
        };
    }
};
