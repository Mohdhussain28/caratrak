const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.COGNITO_REGION
});

const cognito = new AWS.CognitoIdentityServiceProvider();

async function verifyOTP(phone_number, otp, userPoolId, clientId) {
    const params = {
        ClientId: clientId,
        Username: phone_number,
        ConfirmationCode: otp,
    };

    // if (!username || !otp) {
    //     return {
    //         statusCode: 400,
    //         body: JSON.stringify({ message: "Please fill all the requirement field" })
    //     }
    // }

    try {
        await cognito.confirmSignUp(params).promise();
        console.log('User successfully verified OTP');
        return { message: 'User successfully verified OTP' };
    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        throw error;
    }
}

exports.lambdaHandler = async (event) => {
    const body = JSON.parse(event.body);
    const { phone_number, otp } = body;

    try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId = process.env.COGNITO_CLIENT_ID;

        const result = await verifyOTP(phone_number, otp, userPoolId, clientId);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,GET",
                "Access-Control-Allow-Credentials": "true"
            },
            body: JSON.stringify({ message: 'User successfully verified OTP', data: result }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,GET",
                "Access-Control-Allow-Credentials": "true"
            },
            body: JSON.stringify({ error: 'Error verifying OTP', message: error.message }),
        };
    }
};
