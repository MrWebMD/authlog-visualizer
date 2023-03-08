const express = require("express");
const app = express();
const path = require("path");
const YAML = require("yaml");
const { authLogParser } = require("./helpers/authLogParser");

const { cache, CACHE_KEYS, pullParsedLogFromCache } = require("./helpers/cache");
const { readFile, sha512hash } = require("./helpers/util");

const dotenv = require("dotenv");
dotenv.config();

const statisticsRoutes = require("./routes/statisticsRoutes");

const PORT = process.env.PORT || 80;

/**
 * @typedef {Object} Log
 * @property {number} earliestTimestamp
 * @property {number} latestTimestamp
 * @property {Entry[]} entries
 */
/**
 * @typedef {Object} ConfigLog
 * @property {string} path Path on disk to the log file
 * @property {number} year What year this log file has records of. The year will be used to create a full YYYYMMDD timestamp
 */

/**
 * @typedef {Object} AppSettings
 * @property {Object} originServer
 * @property {string} originServer.label The name of the recipient server which will appear on the dashboard
 * @property {number} originServer.lat The latitude coordinate of where the server is
 * @property {number} originServer.lng The longitude coordinate of where the server is
 */
/**
 * @typedef {Object} Config
 * @property {ConfigLog[]} logs
 * @property {AppSettings} appSettings
 */
/**
 * These are logs from /var/log/auth.log on linux. After downloading your own logs
 * you can place them in the logs folder. Make sure to decompress your logs as well.
 */

const init = async () => {
  let startInitializationTime = Date.now();

  /**
   * @type {Config}
   */
  let config;

  try {
    let configFileContents = readFile("./config.yaml");

    config = YAML.parse(configFileContents);
  } catch (err) {
    console.log("Failed to read configuration file ", err);
    process.exit();
  }

  /**
   * @type {Log}
   */
  let combinedLog = {
    earliestTimestamp: null,
    latestTimestamp: null,
    entries: [],
  };

  /**
   * All logs must be parsed into a JSON object.
   * If they have already been parsed the result will get
   * pulled from cache
   */

  for (let log of config.logs) {
    let authLogContent;

    /**
     * @type {Log}
     */
    let logData = null;
    /**
     * Read the log from disk
     */

    try {
      authLogContent = readFile(path.join(__dirname, log.path));
    } catch (err) {
      console.log(`Failed to read log file ${log.path} year ${log.year} from disk`);
      console.log(err);
      continue;
    }

    /**
     * Determine the sha512 hash of the log file
     */
    let logFileHash = sha512hash(authLogContent);

    console.log(`${log.path}, ${log.year}, SHA512: ${logFileHash}`);

    /**
     * Check if that file hash exists in the cache,
     * if it does then the JSON version of the file is pulled
     * from the cache and nothing else needs to be done.
     */

    try {
      logData = await pullParsedLogFromCache(logFileHash);
    } catch (err) {
      console.log(`An error occured when attempting to pull the parsed version of log file ${log.path} year ${log.year} from the program cache`);
      console.log(err);
    }

    if (!logData) {
      console.log(`Log file ${log.path} year ${log.year} did not have a processed version in the cache`);

      /**
       * When the parsed version of the log is not found in the cache,
       * parse it and then add the result as JSON to the cache.
       */
      try {
        logData = authLogParser(authLogContent, log.year);
      } catch (err) {
        console.log(`Log file ${log.path} year ${log.year} could not be parsed `, err);
        continue;
      }

      try {
        await cache.set(logFileHash, JSON.stringify(logData));
      } catch (err) {
        console.log(`Log file ${log.path} year ${log.year} was processed but failed to get saved in the programs cache.`);
        console.log(err);
        continue;
      }
    }

    combinedLog.entries.push(...logData.entries);

    /**
     * Determine what the latest and earliest timestamp is
     * across all logs and set that to the combinedLogs date range
     */

    if (!combinedLog.earliestTimestamp && !combinedLog.latestTimestamp) {
      combinedLog.earliestTimestamp = logData.earliestTimestamp;
      combinedLog.latestTimestamp = logData.latestTimestamp;
      continue;
    }

    if (combinedLog.earliestTimestamp > logData.earliestTimestamp) {
      combinedLog.earliestTimestamp = logData.earliestTimestamp;
    }
    if (combinedLog.latestTimestamp < logData.latestTimestamp) {
      combinedLog.latestTimestamp = logData.latestTimestamp;
    }
  }

  /**
   * Save the combined log to the cache so it can be used again all across the server.
   */
  let combinedLogAsJson = JSON.stringify(combinedLog);

  try {
    await cache.set(CACHE_KEYS.COMBINED_LOGS_AS_JSON, combinedLogAsJson);
  } catch (err) {
    console.log("Failed to cache combined log parsing result: ", err);
    process.exit();
  }

  if (combinedLog.entries.length == 0) {
    console.log("Failed to initialize, no log entries accepted");
    process.exit();
  }

  console.log(`All logs processed in ${(Date.now() - startInitializationTime) / 1000} seconds`);

  main(config.appSettings);
};

/**
 *
 * @param {AppSettings} appSettings
 */
const main = (appSettings) => {
  app.set("view engine", "ejs");

  app.use(express.json());

  app.use(express.static(path.join(__dirname, "pub")));

  app.get("/", function (req, res) {
    res.render("pages/index", { appSettings });
  });

  app.use("/api", statisticsRoutes.routes);

  app.listen(PORT);

  console.log(`Server is listening on http://localhost:${PORT}`);
};

init();
