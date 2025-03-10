require("dotenv").config();
const express = require("express");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const streakRoutes = require("./routes/streakRoutes");
const skincareRoutes = require("./routes/skincareRoutes");
const productRoutes = require("./routes/productRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const gcs = new Storage();
const bucketName = process.env.BUCKET_NAME;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount rute
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes(upload, gcs, bucketName));
app.use("/streak", streakRoutes);
app.use("/sc", skincareRoutes(bucketName));
app.use("/data", productRoutes);

// Middleware error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});