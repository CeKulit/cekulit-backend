const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const validator = require("email-validator");
const db = require("../config/firebaseConfig");
const sendOTP = require("../utils/sendOTP");

exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name)
    return res.status(400).json({ message: "Name, email, and password are required." });

  if (!validator.validate(email))
    return res.status(400).json({ message: "Invalid email format." });

  if (password.length < 8)
    return res.status(400).json({ message: "Password must be at least 8 characters long." });

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (userDoc.exists) return res.status(409).json({ message: "User already exists." });

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

    sendOTP(email, otp);
    res.status(201).json({ message: "User registered successfully, please verify OTP" });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required." });

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found." });

    const user = userDoc.data();
    if (!user.isVerified) return res.status(403).json({ message: "User is not verified yet." });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid password." });

    const token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ userId: user.userId, token });
  } catch (error) {
    next(error);
  }
};

exports.verifyOTP = async (req, res, next) => {
  const { otp, email } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required." });

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found." });

    const user = userDoc.data();
    if (user.isVerified && !user.is_reset_password)
      return res.status(400).json({ message: "User has been verified." });

    if (user.otp !== otp) return res.status(403).json({ message: "Invalid OTP." });

    await db.collection("users").doc(email).update({ isVerified: true, otp: null });
    res.status(200).json({ message: "User successfully verified." });
  } catch (error) {
    next(error);
  }
};

exports.forgetPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found." });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await db.collection("users").doc(email).update({ otp, is_reset_password: true });

    sendOTP(email, otp);
    res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword)
    return res.status(400).json({ message: "Email and new password are required." });

  try {
    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found." });

    const user = userDoc.data();
    if (!user.is_reset_password || user.otp !== null)
      return res.status(403).json({ message: "User does not have access to reset password." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection("users").doc(email).update({
      password: hashedPassword,
      is_reset_password: false,
    });

    res.status(200).json({ message: "Password successfully reset." });
  } catch (error) {
    next(error);
  }
};