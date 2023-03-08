const Cache = require("file-system-cache").default;
const path = require("path");

const CACHE_KEYS = {
  COMBINED_LOGS_AS_JSON: "COMBINED_LOGS_AS_JSON",
};

const cache = Cache({
  basePath: path.join(__dirname, "../.cache"),
});

/**
 * Using the file hash of a log file, attempt to pull
 * its parsed version from the program cache
 * @param {string} logFileHash The SHA512 hash of the log file
 * @returns {Promise<Entry[]>}
 */
const pullParsedLogFromCache = (logFileHash) => {
  return new Promise(async (resolve, reject) => {
    /**
     * Try to retrieve item from the cache
     */
    let cachedResult = await cache.get(logFileHash);

    if (!cachedResult) {
      reject(`Key ${logFileHash} missed in cache`);
      return;
    }

    console.log(`Parsed log pulled from cache ${logFileHash}`);

    /**
     * The parsed logs are stored as JSON within the cache.
     */
    resolve(JSON.parse(cachedResult));
  });
};

module.exports = {
  cache,
  CACHE_KEYS,
  pullParsedLogFromCache,
};
