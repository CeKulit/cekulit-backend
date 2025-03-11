const transporter = require("../config/nodemailerConfig");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    html: `<p>Hello,</p><p>Your OTP code is: <b>${otp}</b></p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`OTP sent to ${email}: ${info.response}`);
    return info;
  } catch (error) {
    logger.error(`Error sending OTP to ${email}: ${error.message}`);
    throw error;
  }
};

module.exports = sendOTP;