const axios = require("axios");

// Function to filter cities by country
function filterCitiesByCountry(cities, countryName) {
    return cities.filter(city => city[3] === countryName);
}

exports.lambdaHandler = async (event) => {
    const city = event.queryStringParameters?.city;
    if (!city || city.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "City is required" }),
        };
    }

    try {
        // Fetch nearby cities using the Geobytes API
        const response = await axios.get(
            `http://getnearbycities.geobytes.com/GetNearbyCities?radius=100&locationcode=${city}`
        );
        const allCities = response.data;

        // Filter the results to only include cities in India
        const indianCities = filterCitiesByCountry(allCities, "India");

        return {
            statusCode: 200,
            body: JSON.stringify(indianCities),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error fetching nearby cities", error: error.message }),
        };
    }
};
