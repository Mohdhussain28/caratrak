const admin = require("firebase-admin");
admin.initializeApp();

module.exports = {
    v1: require("./v1"),
};
