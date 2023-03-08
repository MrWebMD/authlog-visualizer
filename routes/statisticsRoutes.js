const { Router } = require("express");

const { getStatistics, getTimerange } = require("../controllers/statisticsController");

const router = Router();

router.post("/statistics", getStatistics);

router.get("/timerange", getTimerange);

module.exports = {
  routes: router,
};
