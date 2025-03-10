require("dotenv").config();
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.DB_URL,
});

const db = admin.firestore();
module.exports = db;