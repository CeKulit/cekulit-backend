require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./firebaseConfig");
const nodemailer = require("nodemailer");

const app = express();

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
    });

    sendOTP(email, otp);

    res.status(201).json({ message: "User registered successfully." });
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
      return res.status(401).json({ message: "Invalid credentials." });
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

app.put("/profile", authenticateToken, async (req, res) => {
  const { name, email } = req.body;

  // Pastikan pengguna hanya memperbarui `name` atau `email`
  if (!name && !email) {
    return res.status(400).json({ message: "Name or email is required." });
  }

  try {
    // Ambil pengguna berdasarkan email dari JWT
    const userEmail = req.user.email;
    const userDoc = await db.collection("users").doc(userEmail).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const updates = {};

    // Update field sesuai input
    if (name) updates.name = name;
    if (email) updates.email = email;

    // Update data pengguna di Firestore
    await db.collection("users").doc(userEmail).update(updates);

    res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
