const fs = require("fs");
const path = require("path");
const Reader = require("@maxmind/geoip2-node").Reader;

const dbBuffer = fs.readFileSync(path.join(__dirname, "../databases/GeoLite2-City.mmdb"));

const iplookup = Reader.openBuffer(dbBuffer);

/**
 * @typedef {Object} Entry
 * @property {string} ip
 * @property {boolean} geolocated
 * @property {number | null} lat
 * @property {number | null} lng
 * @property {string | null} countryName
 * @property {number} timestamp
 * @property {number} port
 * @property {number} appearances
 */

/**
 * @typedef {Object} Log
 * @property {number} earliestTimestamp
 * @property {number} latestTimestamp
 * @property {Entry[]} entries
 */

/**
 * Turn the linux auth.log into a JSON format filtered by
 * only sshd failed log in attempts.
 * @param {string} authLogContent
 * @param {number} logYear System logs by default don't include a year in the timestamp. It must be supplied
 * @returns {Log}
 */
const authLogParser = (authLogContent, logYear) => {
  let lines = authLogContent.split("\n");

  /**
   * @type {Log}
   */
  let log = {
    earliestTimestamp: null,
    latestTimestamp: null,
    entries: [],
  };
  lines.forEach((line) => {
    /**
     * Feb 11 03:47:00 nimbus sshd[1673]: Invalid user stymira from 159.223.158.102 port 52751
     * Mar  1 00:59:03 nimbus sshd[1638]: Invalid user zhenli from 93.43.56.134 port 56502
     */
    if (!/Invalid user/g.test(line) || !/sshd/g.test(line)) return;

    /**
     * Extract the timestamp of the log entry
     */

    let time = line.match(/([0-9]{2}:[0-9]{2}:[0-9]{2})/g)[0];

    let dateTime = logYear + " " + line.slice(0, line.indexOf(time) + time.length);

    let timestamp = new Date(dateTime).getTime();

    /**
     * Extract the ip address from the log line
     */
    let ip = line.match(/(\b25[0-5]|\b2[0-4][0-9]|\b[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}/g)[0];

    if (!ip) return;

    /**
     * Attempt to geolocate the ip address in the log
     */

    let lookupResult;

    let lat = null;
    let lng = null;
    let countryName = null;
    let geolocated = false;

    try {
      lookupResult = iplookup.city(ip);

      lat = lookupResult.location.latitude;
      lng = lookupResult.location.longitude;

      countryName = lookupResult.country.names.en;

      geolocated = true;
    } catch (err) {
      // console.log("Could not geolocate ", ip);
    }

    /**
     * Extract the user used to log in
     */

    let user = line.match(/(?<=Invalid user)(.*)(?=from)/g)[0].trim();

    if (!user) {
      user = "(EMPTY USERNAME)";
    }

    /**
     * Extract port number
     */

    let port = line.match(/(?<= port )(.*)(?=\n|$)/g)[0].trim();

    if (port.length > 7 || !port) {
      console.log("cannot find port");
      console.log(line);
      console.log(port);
      port = 0;
    }

    port = parseInt(port);

    let entry = {
      ip,
      geolocated,
      lat,
      lng,
      countryName,
      timestamp,
      port,
      appearances: 0,
    };

    log.entries.push(entry);
  });

  if (log.entries.length <= 2) {
    throw new Error("There are not enough sshd failed login attempts in this file. This program has found less than 2 valid lines. Another thing to note is that only failed user names are currently considered.");
  }

  log.earliestTimestamp = log.entries[0].timestamp;
  log.latestTimestamp = log.entries[log.entries.length - 1].timestamp;

  return log;
};

module.exports = {
  authLogParser,
};
