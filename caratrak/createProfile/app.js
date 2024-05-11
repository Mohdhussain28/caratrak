const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function saveUserData(phone_number, id, name) {
    const timestamp = new Date();
    const day = timestamp.getDate();
    const monthIndex = timestamp.getMonth();
    const year = timestamp.getFullYear();

    const ordinalSuffix = (day) => {
        if (day >= 11 && day <= 13) {
            return 'th';
        }
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formattedDate = `${day}${ordinalSuffix(day)} ${months[monthIndex]} ${year}`;

    console.log(formattedDate); // Output: 28th May 2024

    const params = {
        TableName: 'userTable',
        Item: {
            id: id,
            profileData: [
                {
                    key: "Name",
                    value: name
                },
                {
                    key: "Phone Number",
                    value: phone_number
                },
                {
                    key: "Joining Date",
                    value: formattedDate
                }
            ]
        }
    };
    console.log("resss=", params)
    const result = await dynamodb.put(params).promise();
    return result;
    // try {
    //     await dynamodb.put(params).promise();
    //     return { statusCode: 200, body: JSON.stringify({ message: "Profile created successfully" }) };
    // } catch (err) {
    //     console.error('Unable to save profile:', err);
    //     return { statusCode: 500, body: JSON.stringify({ message: 'Unable to save profile' }) };
    // }
}
exports.lambdaHandler = async (event) => {
    const claims = event.requestContext.authorizer?.claims;
    const id = claims?.sub;
    const phone_number = claims?.phone_number
    const body = JSON.parse(event.body);
    const { name } = body;
    if (name === null || name === "") {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Name is required" })
        }
    }

    try {
        await saveUserData(phone_number, id, name)
        return { statusCode: 200, body: JSON.stringify({ message: "Profile created successfully" }) };
    } catch (err) {
        console.error('Unable to save profile:', err);
        return { statusCode: 500, body: JSON.stringify({ message: 'Unable to save profile' }) };
    }
};
