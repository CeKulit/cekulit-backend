const db = require("../config/firebaseConfig");

exports.getProfile = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const userDoc = await db.collection("users").doc(userEmail).get();

    if (!userDoc.exists) return res.status(404).json({ message: "User not found." });

    const user = userDoc.data();
    res.status(200).json({ name: user.name, email: user.email });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = (upload, gcs, bucketName) => async (req, res, next) => {
  try {
    const { name, age, gender } = req.body;
    const avatar = req.file;
    const userEmail = req.user.email;

    const userDoc = await db.collection("users").doc(userEmail).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found." });

    const updates = {};
    const avatarUrlNow = userDoc.get("avatarUrl");

    if (name) updates.name = name;
    if (gender) updates.gender = gender;
    if (age) updates.age = age;

    if (avatar) {
      const folderName = "edit-profile";
      const fileName = `${folderName}/${Date.now()}-${req.file.originalname.split(" ").join("_")}`;
      const bucket = gcs.bucket(bucketName);
      const blob = bucket.file(fileName);

      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: avatar.mimetype,
      });

      blobStream.on("error", (err) => {
        console.error("Error uploading file:", err);
        res.status(500).json({ error: "File upload failed" });
      });

      blobStream.on("finish", async () => {
        updates.avatarUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        await db.collection("users").doc(userEmail).update(updates);
        res.status(200).json({ message: "Successfully updated profile!", avatarUrl: updates.avatarUrl });
      });

      blobStream.end(avatar.buffer);
    } else {
      await db.collection("users").doc(userEmail).update(updates);
      res.status(200).json({ message: "Successfully updated profile!", avatarUrl: avatarUrlNow });
    }
  } catch (error) {
    next(error);
  }
};