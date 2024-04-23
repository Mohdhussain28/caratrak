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

        return cityData.historicalData;
    } catch (err) {
        console.error('Error retrieving or decompressing data:', err);
        throw err;
    }
}

function transformGoldData(goldData, inputPrice, carat) {
    let todayPrice;
    if (carat === "24k") {
        todayPrice = goldData[0].TenGram24K;
    } else if (carat === "22k") {
        todayPrice = goldData[0].TenGram22K;
    }

    const marketPrice = todayPrice / 10;
    const differenceInPrice = marketPrice - inputPrice;

    return {
        carat: carat,
        marketPrice: marketPrice,
        inputPrice: inputPrice,
        difference: differenceInPrice.toFixed(3),
        differencePercentage: ((differenceInPrice / inputPrice) * 100).toFixed(3) + '%'
    }

}

async function storeTransformedGoldData(id, transformedGoldData) {
    try {
        // Get current timestamp in milliseconds since the epoch
        const timestamp = new Date().getTime();

        // Create the DynamoDB item
        const item = {
            id: { S: id },
            compared_id: { N: timestamp },
            timestamp: { N: timestamp }, // Store timestamp as a number
            data: { S: JSON.stringify(transformedGoldData) }
        };

        // Define the parameters for DynamoDB putItem operation
        const params = {
            TableName: 'YourTableName',
            Item: item
        };

        // Put the item into DynamoDB
        await dynamodb.putItem(params).promise();

        console.log('Data stored successfully');
    } catch (err) {
        console.error('Error storing data:', err);
        throw err;
    }
}

exports.lambdaHandler = async (event) => {
    let city = event.queryStringParameters?.city;
    const carat = event.queryStringParameters?.carat;
    const inputPrice = parseFloat(event.queryStringParameters?.inputPrice);
    const id = "23243435";
    if (!city || !carat || !inputPrice) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'city, carat, or input price is missing in the query string' })
        };
    }

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

        const transformedGoldData = transformGoldData(goldData, inputPrice, carat);
        storeTransformedGoldDataw(id)
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
