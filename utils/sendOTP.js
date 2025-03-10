const transporter = require("../config/nodemailerConfig");

const sendOTP = (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    html: `<p>Hello,</p><p>Your OTP code is: <b>${otp}</b></p>`,
  };

  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("Error sending OTP:", error);
    else console.log("OTP sent: " + info.response);
  });
};

module.exports = sendOTP;