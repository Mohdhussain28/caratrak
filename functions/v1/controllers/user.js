const admin = require("firebase-admin");
const functions = require("firebase-functions");
const Firestore = admin.firestore();
const { success, error } = require("../../utils/index");

// Function to save user data in Firestore
const signup = async (req, res) => {
    const userId = req.body?.userId;
    const email = req.body?.email;
    const name = req.body?.name;

    if (!name) {
        return res.status(400).json({ message: "Name is not entered" });
    }

    return Firestore.collection('users')
        .doc(userId)
        .set({
            userId,
            email: email || null,
            name
        })
        .then(() => {
            res.status(201).json(success(null, "User is created successfully"));
        })
        .catch((err) => {
            functions.logger.error(err);
            res.status(500).json(error(err));
        });
};

module.exports = { signup }