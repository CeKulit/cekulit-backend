const db = require("../config/firebaseConfig");

exports.updateStreak = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const userDoc = await db.collection("users").doc(userEmail).get();

    if (!userDoc.exists) return res.status(404).json({ message: "User not found." });

    const user = userDoc.data();
    const now = new Date();
    const lastUpdate = user.lastHit ? new Date(user.lastHit) : null;

    if (lastUpdate) {
      const hoursDifference = (now - lastUpdate) / (1000 * 60 * 60);
      user.streak = hoursDifference > 48 ? 1 : user.streak + 1;
    } else {
      user.streak = 1;
    }

    await db.collection("users").doc(userEmail).update({
      streak: user.streak,
      lastHit: now.toISOString(),
    });

    res.status(200).json({ message: "Streak updated successfully.", streak: user.streak, lastHit: now });
  } catch (error) {
    next(error);
  }
};