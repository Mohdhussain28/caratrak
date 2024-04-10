const admin = require("firebase-admin");
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');

// Middlewares
const authMiddleware = require("../middlewares/auth");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(cors({ origin: true }));
const path = require('path');


// Load Swagger YAML file
const swaggerDocument = yaml.load(path.join(__dirname, './swagger.yaml'));

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", async (req, res) => {
    res.status(200).send({ message: "Hii, i am there" });
});

app.use(authMiddleware);
app.use("/users", userRoutes);

module.exports = functions.https.onRequest(app);
