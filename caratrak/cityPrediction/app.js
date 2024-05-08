const axios = require('axios');

exports.lambdaHandler = async (event) => {
    const cityQuery = event.queryStringParameters?.cityQuery;

    try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
            params: {
                input: cityQuery,
                types: '(cities)',
                components: "country:in",
                key: process.env.API_KEY
            }
        });

        const predictions = response.data.predictions || [];
        const uniqueCityNames = new Set();

        predictions.forEach(prediction => {
            const description = prediction.description || '';
            const cityName = description.split(',')[0].trim();
            uniqueCityNames.add(cityName);
        });

        const cities = Array.from(uniqueCityNames);

        return {
            statusCode: 200,
            body: JSON.stringify({ cities: cities })
        };
    } catch (error) {
        console.error('Error fetching autocomplete predictions:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch autocomplete predictions' })
        };
    }
};
