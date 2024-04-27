const AWS = require('aws-sdk');
const zlib = require('zlib');

// Initialize the AWS SDK
AWS.config.update({ region: 'ap-south-1' });
const docClient = new AWS.DynamoDB.DocumentClient();

async function getDecompressedGoldData(id, city) {
    const tableName = 'goldAPI-Table';
    const params = {
        TableName: tableName,
        Key: {
            'id': id
        }
    };

    try {
        const data = await docClient.get(params).promise();
        if (!data.Item) {
            console.error('No data found for the provided id:', id);
            return null;
        }
        const compressedData = data.Item.compressedData;
        const decompressedData = zlib.gunzipSync(Buffer.from(compressedData, 'base64')).toString('utf-8');
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

async function storeTransformedGoldData(userId, transformedGoldData) {
    try {
        const timestamp = new Date().getTime();

        const params = {
            TableName: 'compared-table',
            Key: { id: userId },
            UpdateExpression: 'SET #comparedData = list_append(if_not_exists(#comparedData, :emptyList), :newData)',
            ExpressionAttributeNames: {
                '#comparedData': 'comparedData'
            },
            ExpressionAttributeValues: {
                ':newData': [{
                    data: {
                        carat: transformedGoldData.carat,
                        difference: transformedGoldData.difference,
                        differencePercentage: transformedGoldData.differencePercentage,
                        inputPrice: transformedGoldData.inputPrice,
                        marketPrice: transformedGoldData.marketPrice
                    },
                    timestamp: timestamp
                }],
                ':emptyList': []
            },
            ReturnValues: 'UPDATED_NEW'
        };

        await docClient.update(params).promise();

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
        await storeTransformedGoldData("user23", transformedGoldData)
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
        difference: parseFloat(differenceInPrice.toFixed(3)),
        differencePercentage: parseFloat(((differenceInPrice / inputPrice) * 100).toFixed(3))
    };
}
