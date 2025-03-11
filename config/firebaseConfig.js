require("dotenv").config();
const admin = require("firebase-admin");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

try {
  const firebaseConfig = {
    credential: admin.credential.applicationDefault(),
  };

  // Only add databaseURL if it exists and is valid
  if (process.env.DB_URL) {
    firebaseConfig.databaseURL = process.env.DB_URL;
  }

  admin.initializeApp(firebaseConfig);
  logger.info("Firebase Admin initialized successfully");
} catch (error) {
  logger.error("Error initializing Firebase Admin:", error);
  throw new Error("Failed to initialize Firebase Admin SDK");
}

const db = admin.firestore();
module.exports = db;