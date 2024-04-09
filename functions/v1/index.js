// Firebase SDK
const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Third Party Libraries
const express = require("express");
const cors = require("cors");

// Middlewares
const authMiddleware = require("../middlewares/auth")

const app = express();
app.use(cors({ origin: true }));

app.get("/", async (req, res) => {
    res.status(200).send({ message: "Hii, i am there" })
})
app.use(authMiddleware);
app.use("/users", require("./routes/userRoutes"))

module.exports = functions.https.onRequest(app);