const AWS = require('aws-sdk');
const zlib = require('zlib');

// Initialize the AWS SDK
AWS.config.update({ region: 'ap-south-1' });
const dynamodb = new AWS.DynamoDB();

// Function to fetch and decompress gold price data from DynamoDB
async function getDecompressedGoldData(id, city) {
    const tableName = 'goldAPI-Table';
    const params = {
        TableName: tableName,
        Key: {
            'id': { S: id }
        }
    };

    try {
        const data = await dynamodb.getItem(params).promise();
        if (!data.Item) {
            console.error('No data found for the provided id:', id);
            return null;
        }
        const compressedData = data.Item.compressedData.B;
        const decompressedData = zlib.gunzipSync(compressedData).toString('utf-8');
        const parsedData = JSON.parse(decompressedData);

        // console.log("hk",parsedData)
        const cityData = parsedData.GoldHistory.find(item => item.city === city);
        if (!cityData || !cityData.historicalData || !Array.isArray(cityData.historicalData)) {
            console.error('No valid data found for the provided city:', city);
            return null;
        }

        // Extracting required fields and formatting the output
        const formattedData = cityData.historicalData.map(item => ({
            date: item.date,
            tenGram24k: parseInt(item.TenGram24K)
        }));

        return {
            [city]: formattedData
        };
    } catch (err) {
        console.error('Error retrieving or decompressing data:', err);
        throw err;
    }
}

// Main Lambda handler function
exports.lambdaHandler = async (event) => {
    const queryParams = event.queryStringParameters;
    if (!queryParams || !queryParams?.city) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'City parameter is missing in the query string' })
        };
    }

    const id = "23243435";
    let city = queryParams?.city
    if (city && typeof city === 'string') {
        city = city.charAt(0).toUpperCase() + city.slice(1);
    }

    try {
        const goldData = await getDecompressedGoldData(id, city);
        if (!goldData) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No data found for the provided id and city' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(goldData)
        };
    } catch (err) {
        console.error('Error retrieving or formatting gold data:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
