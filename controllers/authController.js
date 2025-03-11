const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const validator = require("email-validator");
const db = require("../config/firebaseConfig");
const sendOTP = require("../utils/sendOTP");
const winston = require("winston");

// Konfigurasi logger dengan Winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Fungsi Register
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    logger.warn("Register attempt with missing fields");
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  if (!validator.validate(email)) {
    logger.warn(`Invalid email format: ${email}`);
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (password.length < 8) {
    logger.warn(`Password too short for ${email}`);
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (userDoc.exists) {
      logger.info(`User already exists: ${email}`);
      return res.status(409).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await db.collection("users").doc(email).set({
      userId,
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      otp,
      avatarUrl: `https://storage.googleapis.com/${process.env.BUCKET_NAME}/edit-profile/avatar.png`,
      streak: 0,
      lastHit: new Date().toISOString(),
    });

    await sendOTP(email, otp);
    logger.info(`User registered successfully: ${email}`);
    res.status(201).json({ message: "User registered successfully, please verify OTP" });
  } catch (error) {
    logger.error(`Error registering user ${email}: ${error.message}`);
    next(error);
  }
};

// Fungsi Login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn("Login attempt with missing email or password");
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) {
      logger.info(`Login failed: User not found - ${email}`);
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();
    if (!user.isVerified) {
      logger.info(`Login failed: User not verified - ${email}`);
      return res.status(403).json({ message: "User is not verified yet." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.info(`Login failed: Invalid password for ${email}`);
      return res.status(401).json({ message: "Invalid password." });
    }

    const token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: "1h" });
    logger.info(`User logged in successfully: ${email}`);
    res.status(200).json({ userId: user.userId, token });
  } catch (error) {
    logger.error(`Error during login for ${email}: ${error.message}`);
    next(error);
  }
};

// Fungsi Verify OTP
exports.verifyOTP = async (req, res, next) => {
  const { otp, email } = req.body;

  if (!email || !otp) {
    logger.warn("Verify OTP attempt with missing email or OTP");
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) {
      logger.info(`Verify OTP failed: User not found - ${email}`);
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();
    if (user.isVerified && !user.is_reset_password) {
      logger.info(`Verify OTP failed: User already verified - ${email}`);
      return res.status(400).json({ message: "User has been verified." });
    }

    if (user.otp !== otp) {
      logger.info(`Verify OTP failed: Invalid OTP for ${email}`);
      return res.status(403).json({ message: "Invalid OTP." });
    }

    await db.collection("users").doc(email).update({ isVerified: true, otp: null });
    logger.info(`User verified successfully: ${email}`);
    res.status(200).json({ message: "User successfully verified." });
  } catch (error) {
    logger.error(`Error verifying OTP for ${email}: ${error.message}`);
    next(error);
  }
};

// Fungsi Forget Password
exports.forgetPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    logger.warn("Forget password attempt with missing email");
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) {
      logger.info(`Forget password failed: User not found - ${email}`);
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await db.collection("users").doc(email).update({ otp, is_reset_password: true });

    await sendOTP(email, otp);
    logger.info(`OTP sent for password reset: ${email}`);
    res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    logger.error(`Error sending OTP for password reset to ${email}: ${error.message}`);
    next(error);
  }
};

// Fungsi Reset Password
exports.resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    logger.warn("Reset password attempt with missing email or new password");
    return res.status(400).json({ message: "Email and new password are required." });
  }

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) {
      logger.info(`Reset password failed: User not found - ${email}`);
      return res.status(404).json({ message: "User not found." });
    }

    const user = userDoc.data();
    if (!user.is_reset_password || user.otp !== null) {
      logger.info(`Reset password failed: Access denied for ${email}`);
      return res.status(403).json({ message: "User does not have access to reset password." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection("users").doc(email).update({
      password: hashedPassword,
      is_reset_password: false,
    });

    logger.info(`Password reset successfully for ${email}`);
    res.status(200).json({ message: "Password successfully reset." });
  } catch (error) {
    logger.error(`Error resetting password for ${email}: ${error.message}`);
    next(error);
  }
};