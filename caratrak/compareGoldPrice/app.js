const AWS = require('aws-sdk');
const zlib = require('zlib');

AWS.config.update({ region: 'ap-south-1' });
const docClient = new AWS.DynamoDB.DocumentClient();

async function getDecompressedGoldData(goldData_id, city) {
    const tableName = 'goldAPI-Table';
    const params = {
        TableName: tableName,
        Key: {
            'id': goldData_id
        }
    };

    try {
        const data = await docClient.get(params).promise();
        if (!data.Item) {
            console.error('No data found for the provided id:', goldData_id);
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

async function storeTransformedGoldData(id, transformedGoldData) {
    try {
        const timestamp = new Date().getTime();
        const uniqueId = id + '_' + timestamp;
        const params = {
            TableName: 'compared-table',
            Key: { id: id },
            UpdateExpression: 'SET #comparedData = list_append(if_not_exists(#comparedData, :emptyList), :newData)',
            ExpressionAttributeNames: {
                '#comparedData': 'comparedData'
            },
            ExpressionAttributeValues: {
                ':newData': [{
                    item_id: uniqueId,
                    data: {
                        carat: transformedGoldData.carat,
                        pricePerGram: transformedGoldData.pricePerGram,
                        totalPrice: transformedGoldData.totalPrice,
                        inputGrams: transformedGoldData.inputGrams,
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
    const grams = parseFloat(event.queryStringParameters?.grams);
    const claims = event.requestContext.authorizer?.claims;
    const id = claims.sub;
    // console.log("object", claims)
    const goldData_id = "23243435";
    console.log("ecnnn=", event)
    if (!city || !carat || !grams) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'city, carat, or grams is missing in the query string' })
        };
    }

    if (city && typeof city === 'string') {
        if (city === city.toUpperCase()) {
            city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        } else {
            city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        }
        city = city.toLowerCase() === 'new delhi' || city.toLowerCase() === 'delhi' ? 'New-delhi' : city;
    }

    try {
        const goldData = await getDecompressedGoldData(goldData_id, city);
        // console.log("dataa=>", goldData);
        if (!goldData) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No data found for the provided id and city' })
            };
        }

        const transformedGoldData = transformGoldData(goldData, grams, carat);
        await storeTransformedGoldData(id, transformedGoldData)
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

function transformGoldData(goldData, grams, carat) {
    let todayPrice;
    if (carat === "24k") {
        todayPrice = goldData[0].TenGram24K;
    } else if (carat === "22k") {
        todayPrice = goldData[0].TenGram22K;
    }

    const pricePerGram = todayPrice / 10;
    const totalPrice = pricePerGram * grams;

    return {
        carat: carat,
        pricePerGram: pricePerGram,
        inputGrams: grams,
        totalPrice: parseFloat(totalPrice.toFixed(3))
    };
}
