// Firebase SDK
const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Third Party Libraries
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: true }));

app.get("/", async (req, res) => {
    res.status(200).send({ message: "Hii, i am there" })
})

module.exports = functions.https.onRequest(app);