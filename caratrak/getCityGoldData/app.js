const AWS = require('aws-sdk');
const zlib = require('zlib');

AWS.config.update({ region: 'ap-south-1' });
const dynamodb = new AWS.DynamoDB();

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
        if (city === city.toUpperCase()) {
            city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        } else {
            city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        }
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

        const tenGram24kValues = goldData.tenGram24k;
        const max = Math.max(...tenGram24kValues);
        const min = Math.min(...tenGram24kValues);

        const range = max - min;
        const interval = range / 7;

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
