const axios = require("axios");

function filterCitiesByCountry(cities, countryName) {
    return cities.filter(city => city[3] === countryName);
}

exports.lambdaHandler = async (event) => {
    const inputCity = event.queryStringParameters?.city;
    if (!inputCity || inputCity.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "City is required" }),
        };
    }

    try {
        const response = await axios.get(
            `http://getnearbycities.geobytes.com/GetNearbyCities?radius=200&locationcode=${inputCity}`
        );
        const allCities = response.data;

        const indianCities = filterCitiesByCountry(allCities, "India");
        const excludePatterns = ["delhi", "dilli"];
        const filteredCities = indianCities.filter(city => {
            const cityName = city[1].toLowerCase();
            return cityName !== inputCity.toLowerCase() &&
                !excludePatterns.some(pattern => cityName.includes(pattern));
        });
        const limitedCities = filteredCities.slice(0, 5);
        const cityNames = limitedCities.map(city => ({ name: city[1] }));
        if (cityNames.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "No nearby cities found" }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(cityNames),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error fetching nearby cities", error: error.message }),
        };
    }
};
