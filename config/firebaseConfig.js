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

function getFirebaseCredentials() {
  if (process.env.SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
      return admin.credential.cert(serviceAccount);
    } catch (error) {
      logger.error("Error parsing SERVICE_ACCOUNT from env:", error);
      throw new Error("Invalid SERVICE_ACCOUNT JSON");
    }
  }

  return admin.credential.applicationDefault();
}

try {
  const firebaseConfig = {
    credential: getFirebaseCredentials(),
  };

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