const skincareData = require("./skincare-data.json");
const express = require("express");

const router = express.Router();

function capitalize(d) {
  return d[0].toUpperCase() + d.substring(1);
}

function getListSkincare(time) {
  let data = structuredClone(skincareData["normal"]);
  if (time === "night") {
    delete data["sunscreen"];
  } else if (time === "day") {
    delete data["cleanser"];
  }

  return Object.keys(data).map(capitalize);
}

function getDetailSkincare(skin_type, time) {
  let data = structuredClone(skincareData[skin_type]);
  if (time === "night") {
    delete data["sunscreen"];
  } else if (time === "day") {
    delete data["cleanser"];
  }
  Object.keys(data).forEach((key) => {
    data[key][
      "photoUrl"
    ] = `https://storage.googleapis.com/bucket-project21/skincare/${key}.png`;
    data[key]["title"] = capitalize(key);
  });
  return data;
}

function getDetailSkincareByName(skin_type, time, name) {
  let data = structuredClone(skincareData[skin_type]);
  if (time === "night") {
    delete data["sunscreen"];
  } else if (time === "day") {
    delete data["cleanser"];
  }
  data[name][
    "photoUrl"
  ] = `https://storage.googleapis.com/bucket-project21/skincare/${name}.png`;
  data[name]["title"] = capitalize(name);
  return data[name];
}

router.get("/list/:time", (req, res) => {
  return res.status(200).json(getListSkincare(req.params.time));
});

router.get("/detail/:type/:time", (req, res) => {
  const { type, time } = req.params;

  return res.status(200).json(getDetailSkincare(type, time));
});

router.get("/detail/:type/:time/:name", (req, res) => {
  const { type, time, name } = req.params;

  return res.status(200).json(getDetailSkincareByName(type, time, name));
});

module.exports = router;
