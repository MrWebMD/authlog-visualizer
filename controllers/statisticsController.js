const { cache, CACHE_KEYS, pullParsedLogFromCache } = require("../helpers/cache");
const { entryAnalyzer } = require("../helpers/entryAnalyzer");

const getTimerange = async (req, res) => {
  /**
   * @type {Log}
   */
  let combinedLog;

  try {
    combinedLog = await pullParsedLogFromCache(CACHE_KEYS.COMBINED_LOGS_AS_JSON);
  } catch (err) {
    console.log(err);
  }

  if (!combinedLog) {
    res.json({
      status: 500,
      message: "Could not read auth log",
    });

    return;
  }

  res.json({
    earliestTimestamp: combinedLog.earliestTimestamp,
    latestTimestamp: combinedLog.latestTimestamp,
  });
};

const getStatistics = async (req, res) => {
  let combinedLog;

  try {
    combinedLog = await pullParsedLogFromCache(CACHE_KEYS.COMBINED_LOGS_AS_JSON);
  } catch (err) {
    console.log(err);
  }

  if (!combinedLog) {
    res.json({
      status: 500,
      message: "Could not read auth log",
    });

    return;
  }

  if (!req.body.startTimestamp || typeof req.body.startTimestamp !== "number") {
    res.json({
      status: 400,
      message: "property 'startTimestamp' must be of type number representing a date in milliseconds",
    });
    return;
  }

  if (!req.body.endTimestamp || typeof req.body.endTimestamp !== "number") {
    res.json({
      status: 400,
      message: "property 'endTimestamp' must be of type number representing a date in milliseconds",
    });
    return;
  }

  let stats = entryAnalyzer(combinedLog.entries, req.body.startTimestamp, req.body.endTimestamp);

  res.json(stats);
};

module.exports = {
  getStatistics,
  getTimerange,
};
