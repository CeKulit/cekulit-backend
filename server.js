const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
});
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./firebaseConfig");
const nodemailer = require("nodemailer");

const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const app = express();

const storage = multer.memoryStorage(); // File akan disimpan di memory sementara
const upload = multer({ storage });
const gcs = new Storage({
  keyFilename: path.join(__dirname, "gcp-credentials.json"),
});
const bucketName = "bucket-project21";

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access Denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token!" });
  }
};

// Konfigurasi nodemailer untuk mengirim email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Email pengirim
    pass: process.env.EMAIL_PASS, // Password aplikasi untuk Gmail
  },
});

// Fungsi untuk mengirim OTP
const sendOTP = (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    html: `
          <p>Hello,</p>
          <p>Your OTP code is: <b>${otp}</b></p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending OTP:", error);
    } else {
      console.log("OTP sent: " + info.response);
    }
  });
};

// Endpoint Registrasi
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ message: "Name, email and password are required." });
  }

  try {
    // Ambil pengguna dari Firestore
    const userDoc = await db.collection("users").doc(email).get();

    if (userDoc.exists) {
      return res.status(500).json({ message: "User exist." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Simpan pengguna ke Firestore
    await db.collection("users").doc(email).set({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      otp,
      avatarUrl:
        "https://storage.googleapis.com/bucket-project21/edit-profile/avatar.png",
      streak: 0,
      lastHit: new Date().toISOString(),
    });

    sendOTP(email, otp);

    res
      .status(201)
      .json({ message: "User registered successfully, please verified OTP" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    // Ambil pengguna dari Firestore
    const userDoc = await db.collection("users").doc(email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();

    if (!user.isVerified) {
      return res.status(500).json({ message: "User is not verified yet." });
    }

    // Periksa password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Buat token JWT
    const token = jwt.sign({ email }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP
app.post("/otp", async (req, res) => {
  const { otp, email } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and otp are required." });
  }

  try {
    // Ambil pengguna dari Firestore
    const userDoc = await db.collection("users").doc(email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();

    if (user.isVerified) {
      return res.status(500).json({ message: "User has been verified." });
    }

    if (user.otp != otp) {
      return res.status(403).json({ message: "Invalid OTP." });
    }

    await db.collection("users").doc(email).update({
      isVerified: true,
      otp: null,
    });

    res.status(200).json({ message: "User succesfully verified." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint untuk memulai proses Forget Password
app.post("/forget-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // Ambil pengguna dari Firestore
    const userDoc = await db.collection("users").doc(email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update OTP di database
    await db.collection("users").doc(email).update({
      otp,
    });

    sendOTP(email, otp); // Kirim OTP ke email

    res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint untuk mengubah password
app.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, OTP, and new password are required." });
  }

  try {
    // Ambil pengguna dari Firestore
    const userDoc = await db.collection("users").doc(email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();

    if (user.otp != otp) {
      return res.status(403).json({ message: "Invalid OTP." });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password di database
    await db.collection("users").doc(email).update({
      password: hashedPassword,
      otp: null, // Hapus OTP setelah digunakan
    });

    res.status(200).json({ message: "Password successfully reset." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/profile", authenticateToken, async (req, res) => {
  try {
    // Ambil pengguna berdasarkan email dari JWT
    const userEmail = req.user.email;
    const userDoc = await db.collection("users").doc(userEmail).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();

    // Return profil pengguna
    res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint untuk upload gambar
app.put(
  "/profile",
  upload.single("avatar"),
  authenticateToken,
  async (req, res) => {
    try {
      const { name, age, gender } = req.body;
      const avatar = req.file;

      const userEmail = req.user.email;
      const userDoc = await db.collection("users").doc(userEmail).get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
      }

      const updates = {};

      const avatarUrlNow = userDoc.get("avatarUrl");

      // Update field sesuai input
      if (name) updates.name = name;
      if (gender) updates.gender = gender;
      if (age) updates.age = age;

      if (avatar) {
        const folderName = "edit-profile"; // Nama folder di dalam bucket
        const fileName = `${folderName}/${Date.now()}-${req.file.originalname
          .split(" ")
          .join("_")}`; // Path file dengan folder
        const bucket = gcs.bucket(bucketName);
        const blob = bucket.file(fileName);

        // Mengupload file ke Google Cloud Storage
        const blobStream = blob.createWriteStream({
          resumable: false,
          contentType: avatar.mimetype,
        });

        blobStream.on("error", (err) => {
          console.error("Error uploading file:", err);
          res.status(500).json({ error: "File upload failed" });
        });

        blobStream.on("finish", async () => {
          // Mengambil URL file yang sudah diupload
          updates.avatarUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

          // Update data pengguna di Firestore
          await db.collection("users").doc(userEmail).update(updates);

          return res.status(200).json({
            message: "Successfully update profile!",
            avatarUrl: updates.avatarUrl,
          });
        });

        blobStream.end(avatar.buffer);
      } else {
        await db.collection("users").doc(userEmail).update(updates);

        return res.status(200).json({
          message: "Successfully update profile!",
          avatarUrl: avatarUrlNow,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

//Nambahin Streak
app.post("/streak", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email; // Mendapatkan email pengguna dari token
    const userDoc = await db.collection("users").doc(userEmail).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();
    const now = new Date();
    const lastUpdate = user.lastHit ? new Date(user.lastHit) : null;

    if (lastUpdate) {
      const timeDifference = now - lastUpdate; // Selisih waktu dalam milidetik
      const hoursDifference = timeDifference / (1000 * 60 * 60); // Konversi ke jam

      if (hoursDifference > 48) {
        // Lebih dari 48 jam, reset streak
        user.streak = 1;
      } else {
        // Kurang dari atau sama dengan 48 jam, tambahkan streak
        user.streak += 1;
      }
    } else {
      // Jika `lastHit` belum pernah diatur, mulai streak baru
      user.streak = 1;
    }

    // Perbarui timestamp terakhir dan streak di Firestore
    await db.collection("users").doc(userEmail).update({
      streak: user.streak,
      lastHit: now.toISOString(),
    });

    // Kirim respons dengan data streak
    res.status(200).json({
      message: "Streak updated successfully.",
      streak: user.streak,
      lastHit: now,
    });
  } catch (error) {
    console.error("Error updating streak:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
