const AWS = require('aws-sdk');
const zlib = require('zlib');

AWS.config.update({ region: 'ap-south-1' });
const dynamodb = new AWS.DynamoDB();

async function getDecompressedGoldData(goldTable_id, cities) {
    console.log('Cities:', cities);

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
        console.log('Gold Data:', parsedData);
        return parsedData;
    } catch (err) {
        console.error('Error retrieving or decompressing data:', err);
        throw err;
    }
}

exports.lambdaHandler = async (event) => {
    try {
        const queryParams = event.queryStringParameters;
        if (!queryParams || !queryParams.city) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'city parameters are required in the query string' })
            };
        }

        const city1 = "New-delhi";
        let city2 = queryParams?.city;
        if (city2 && typeof city2 === 'string') {
            if (city2 === city2.toUpperCase()) {
                city2 = city2.charAt(0).toUpperCase() + city2.slice(1).toLowerCase();
            } else {
                city2 = city2.charAt(0).toUpperCase() + city2.slice(1).toLowerCase();
            }
            city2 = city2.toLowerCase() === 'new delhi' || city2.toLowerCase() === 'delhi' ? 'New-delhi' : city2;
        }
        const goldTable_id = "23243435";
        const goldData = await getDecompressedGoldData(goldTable_id, [city1, city2]);

        if (!goldData) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No data found for the provided id and cities' })
            };
        }

        const response = {};

        const city1Data = goldData.GoldHistory.find(item => item.city === city1);
        // console.log('City1 Data:', city1Data);
        if (city1Data && city1Data.historicalData.length > 0) {
            response[`newDelhiPrice`] = parseInt(city1Data.historicalData[0].TenGram24K);
        } else {
            response[`newDelhiPrice`] = null;
        }

        const city2Data = goldData.GoldHistory.find(item => item.city === city2);
        // console.log('City2 Data:', city2Data);
        if (city2Data && city2Data.historicalData.length > 0) {
            response.searchCityPrice = parseInt(city2Data.historicalData[0].TenGram24K);
        } else {
            response.searchCityPrice = null;
        }

        if (response[`newDelhiPrice`] !== null && response.searchCityPrice !== null) {
            const priceDifference = response.searchCityPrice - response[`newDelhiPrice`];
            const percentageDifference = (priceDifference / response[`newDelhiPrice`]) * 100;
            response.priceDifference = priceDifference;
            response.percentageDifference = percentageDifference.toFixed(2) + "%";
        } else {
            response.priceDifference = null;
            response.percentageDifference = null;
        }

        return {
            statusCode: 200,
            body: JSON.stringify(response)
        };
    } catch (err) {
        console.error('Error retrieving or formatting gold data:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
