const { getListSkincare, getDetailSkincare, getDetailSkincareByName } = require("../utils/skincareUtils");

exports.getList = (req, res) => {
  res.status(200).json(getListSkincare(req.params.time));
};

exports.getDetail = (req, res) => {
  const { type, time } = req.params;
  res.status(200).json(getDetailSkincare(type, time));
};

exports.getDetailByName = (req, res) => {
  const { type, time, name } = req.params;
  res.status(200).json(getDetailSkincareByName(type, time, name));
};