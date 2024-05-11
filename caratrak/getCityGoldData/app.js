const AWS = require('aws-sdk');
const zlib = require('zlib');

AWS.config.update({ region: 'ap-south-1' });
const dynamodb = new AWS.DynamoDB();

// Function to fetch and decompress gold price data from DynamoDB
async function getDecompressedGoldData(goldTable_id, city) {
    const tableName = 'goldAPI-Table';
    const params = {
        TableName: tableName,
        Key: {
            'id': { S: goldTable_id }
        }
    };

    try {
        const data = await dynamodb.getItem(params).promise();
        if (!data.Item) {
            console.error('No data found for the provided id:', goldTable_id);
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

        // Extracting required fields and formatting the output
        const formattedData = {
            dates: [],
            tenGram24k: []
        };

        cityData.historicalData.forEach(item => {
            formattedData.dates.push(item.date);
            formattedData.tenGram24k.push(parseInt(item.TenGram24K));
        });

        return formattedData;
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

    const goldTable_id = "23243435";
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
        const goldData = await getDecompressedGoldData(goldTable_id, city);
        if (!goldData) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No data found for the provided id and city' })
            };
        }

        // Extracting tenGram24k values
        const tenGram24kValues = goldData.tenGram24k;

        // Finding highest and lowest values
        const max = Math.max(...tenGram24kValues);
        const min = Math.min(...tenGram24kValues);

        // Calculating range and dividing into 7 parts
        const range = max - min;
        const interval = range / 7;

        // Generating y-axis values
        const yAxisValues = [];
        for (let i = 0; i < 7; i++) {
            yAxisValues.push(parseFloat((min + interval * i).toFixed(3)));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                dates: goldData.dates,
                tenGram24k: goldData.tenGram24k,
                yAxisValues: yAxisValues
            })
        };
    } catch (err) {
        console.error('Error retrieving or formatting gold data:', err);
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Error retrieving or formatting gold data:' })
        };
    }
};
