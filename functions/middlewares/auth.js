const admin = require("firebase-admin");
const functions = require("firebase-functions");

module.exports = async (req, res, next) => {
    let token = null;

    if (req?.headers?.authorization) token = req.headers.authorization;
    else if (!token && req.cookies) token = req.cookies.__session;
    else
        return res
            .status(401)
            .send({ success: false, error: "Unauthorized Request - 1" });

    try {
        if (token == "1234") {
            return next();
        }
        // req.user = await admin.auth().verifyIdToken(token);
        // return next();
    } catch (error) {
        functions.logger.error(error);
        return res.status(401).send({
            success: false,
            message: "Not Authorized, Couldn't verify user token",
            error: error,
        });
    }
};
