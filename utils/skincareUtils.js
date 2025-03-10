const skincareData = require("../skincare-data.json");

function capitalize(d) {
  return d[0].toUpperCase() + d.substring(1);
}

function getListSkincare(time) {
  let data = structuredClone(skincareData["normal"]);
  if (time === "night") delete data["Sunscreen"];
  else if (time === "day") delete data["Cleanser"];

  const tempData = Object.keys(data);
  return tempData.map((d) => ({
    title: capitalize(d),
    photoUrl: `https://storage.googleapis.com/${process.env.BUCKET_NAME || "bucket-project21"}/skincare/${d}.png`,
  }));
}

function getDetailSkincare(skinType, time) {
  let data = structuredClone(skincareData[skinType]);
  if (time === "night") delete data["Sunscreen"];
  else if (time === "day") delete data["Cleanser"];

  Object.keys(data).forEach((key) => {
    data[key].photoUrl = `https://storage.googleapis.com/${process.env.BUCKET_NAME}/skincare/${key}.png`;
    data[key].title = capitalize(key);
  });
  return data;
}

function getDetailSkincareByName(skinType, time, name) {
  let data = structuredClone(skincareData[skinType]);
  if (time === "night") delete data["Sunscreen"];
  else if (time === "day") delete data["Cleanser"];

  data[name].photoUrl = `https://storage.googleapis.com/${process.env.BUCKET_NAME}/skincare/${name}.png`;
  data[name].title = capitalize(name);
  return data[name];
}

module.exports = { getListSkincare, getDetailSkincare, getDetailSkincareByName };