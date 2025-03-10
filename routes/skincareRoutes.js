const express = require("express");
const router = express.Router();
const skincareController = require("../controllers/skincareController");

module.exports = (bucketName) => {
  router.get("/list/:time", skincareController.getList);
  router.get("/detail/:type/:time", skincareController.getDetail);
  router.get("/detail/:type/:time/:name", skincareController.getDetailByName);
  return router;
};