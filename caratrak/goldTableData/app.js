const AWS = require('aws-sdk');
const zlib = require('zlib');

// Initialize the AWS SDK
AWS.config.update({ region: 'ap-south-1' });
const dynamodb = new AWS.DynamoDB();

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

        const cityData = parsedData.GoldHistory.find(item => item.city === city);
        if (!cityData || !cityData.historicalData || !Array.isArray(cityData.historicalData)) {
            console.error('No valid data found for the provided city:', city);
            return null;
        }

        const formattedData = cityData.historicalData.map(item => ({
            date: item.date,
            tenGram24k: parseInt(item.TenGram24K)
        }));

        return formattedData;
    } catch (err) {
        console.error('Error retrieving or decompressing data:', err);
        throw err;
    }
}

function transformGoldData(goldData) {
    const transformedData = [];

    const todayPrice = goldData[0].tenGram24k;
    const yesterdayPrice = goldData[1].tenGram24k;

    const grams = [1, 8, 10, 25, 50, 100];

    grams.forEach(gram => {
        transformedData.push({
            gram: gram,
            today: todayPrice * (gram / 10),
            yesterday: yesterdayPrice * (gram / 10),
            change: (todayPrice - yesterdayPrice) * (gram / 10)
        });
    });

    return transformedData;
}


exports.lambdaHandler = async (event) => {
    const queryParams = event.queryStringParameters;
    if (!queryParams || !queryParams?.city) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'City parameter is missing in the query string' })
        };
    }

    const id = "23243435";
    let city = queryParams?.city;
    if (city && typeof city === 'string') {
        // Convert city to lowercase if all letters are in capitals
        if (city === city.toUpperCase()) {
            city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        } else {
            // Convert city to lowercase and then capitalize the first letter
            city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        }
        // Transform "new delhi" or "delhi" to "New-delhi"
        city = city.toLowerCase() === 'new delhi' || city.toLowerCase() === 'delhi' ? 'New-delhi' : city;
    }

    try {
        const goldData = await getDecompressedGoldData(id, city);
        if (!goldData) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No data found for the provided id and city' })
            };
        }

        const transformedGoldData = transformGoldData(goldData);

        return {
            statusCode: 200,
            body: JSON.stringify(transformedGoldData)
        };
    } catch (err) {
        console.error('Error retrieving or formatting gold data:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
