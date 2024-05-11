// index.js
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const docClient = new AWS.DynamoDB.DocumentClient();
async function saveUserData(phone_number, name) {
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
            id: phone_number,
            profileData: [
                {
                    key: "Name",
                    value: name
                },
                {
                    key: "Phone Number",
                    value: phone_number || null
                },
                {
                    key: "Joining Date",
                    value: formattedDate
                }
            ]
        }
    };
    console.log("resss=", params)

    try {
        await docClient.put(params).promise();
        return { statusCode: 200, body: JSON.stringify({ message: "Profile created successfully" }) };
    } catch (err) {
        console.error('Unable to save profile:', err);
        return { statusCode: 500, body: JSON.stringify({ message: 'Unable to save profile' }) };
    }
}
exports.lambdaHandler = async (event) => {
    const body = JSON.parse(event.body);

    let isExist = false;
    // console.log("event==", event)
    const { phone_number } = body;
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: phone_number,
        Password: 'Admin@2000',
        UserAttributes: [
            {
                Name: 'name',
                Value: "user"
            }
        ]
    };

    try {
        await cognito.signUp(params).promise();
        // const t = await saveUserData(phone_number, name);
        console.log("isExist result", isExist)
        return { statusCode: 200, body: JSON.stringify({ message: 'User signed up', isExist }) };
    } catch (error) {
        if (error.code === 'UsernameExistsException') {
            // User already exists, initiate a custom authentication flow to sign in
            const initiateAuthParams = {
                AuthFlow: 'CUSTOM_AUTH',
                ClientId: process.env.COGNITO_CLIENT_ID,
                AuthParameters: {
                    USERNAME: phone_number
                }
            };
            try {
                const signUpResponse = await cognito.initiateAuth(initiateAuthParams).promise();
                return { statusCode: 200, body: JSON.stringify({ message: 'OTP sent to existing user', data: signUpResponse, isExist: true }) };
            } catch (signInError) {
                console.error(signInError);
                return { statusCode: 500, body: JSON.stringify({ error: signInError.message }) };
            }
        } else {
            console.error(error);
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }
    }
};


