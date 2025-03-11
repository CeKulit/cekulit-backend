require("dotenv").config();
const express = require("express");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const winston = require("winston");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const streakRoutes = require("./routes/streakRoutes");
const skincareRoutes = require("./routes/skincareRoutes");
const productRoutes = require("./routes/productRoutes");
const errorHandler = require("./middlewares/errorHandler");

// Inisialisasi logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const gcs = new Storage();
const bucketName = process.env.BUCKET_NAME;

// Middleware dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later.",
  })
);

// Mount rute dengan prefiks yang benar
app.use(authRoutes);
app.use("/profile", profileRoutes(upload, gcs, bucketName));
app.use("/streak", streakRoutes);
app.use("/sc", skincareRoutes(bucketName));
app.use("/data", productRoutes);

// Middleware error handling
app.use(errorHandler);

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});