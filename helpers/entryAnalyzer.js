/**
 * @typedef {Object} logStats
 * @property {number} failedLoginAttempts
 * @property {number} geolocationErrors
 * @property {Entry[]} uniqueAttacks
 * @property {number} totalUniqueGeolocatedAttempts
 * @property {Entry} largestSingleAttack
 * @property {object} uniqueAttacks
 * @property {number} totalCountries
 * @property {countryAttempt} mostDangerousCountry
 * @property {countryAttempt[]} attemptsByCountry
 */
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
 * @typedef {Object} countryAttempt
 * @property {string} name
 * @property {number} attempts
 */

/**
 * @param {Entry[]} logEntries
 * @param {number} startTimestamp
 * @param {number} endTimestamp
 * @returns {logStats}
 */
const entryAnalyzer = (logEntries, startTimestamp, endTimestamp) => {
  /**
   * @type {countryAttempt[]}
   */
  let attemptsByCountry = [];
  /**
   * @type {Entry[]}
   */
  let uniqueAttacks = [];
  let failedLoginAttempts = 0;
  let geolocationErrors = 0;
  let uniqueIpAddresses = 0;
  let totalCountries = 0;
  /**
   * @type {countryAttempt}
   */
  let mostDangerousCountry = {
    name: "",
    attempts: 0,
  };
  let totalUniqueGeolocatedAttempts = 0;
  /**
   * @type {Entry}
   */
  let largestSingleAttack = {
    ip: null,
    geolocated: false,
    lat: null,
    lng: null,
    countryName: null,
    timestamp: 0,
    port: 0,
    appearances: 0,
  };

  logEntries.forEach((entry) => {
    if (entry.timestamp < startTimestamp || entry.timestamp > endTimestamp) {
      return;
    }
    failedLoginAttempts++;

    let uniqueAttackIndex = uniqueAttacks.findIndex((attack) => attack.ip == entry.ip);

    /**
     * When an ip address has not been seen already,
     * add it to the uniqueAttacks list or tally
     * how many times it has appeared.
     */
    if (uniqueAttackIndex < 0) {
      if (!entry.geolocated) {
        geolocationErrors++;
      } else {
        totalUniqueGeolocatedAttempts++;
      }

      entry.appearances++;
      uniqueAttacks.push(entry);
    } else {
      let attack = uniqueAttacks[uniqueAttackIndex];

      attack.appearances++;

      if (attack.appearances > largestSingleAttack.appearances) {
        largestSingleAttack = attack;
      }
    }

    let attemptsByCountryIndex = attemptsByCountry.findIndex((countryAttempt) => countryAttempt.name == (entry.countryName || "unknown"));

    if (attemptsByCountryIndex < 0) {
      attemptsByCountry.push({
        name: entry.countryName || "unknown",
        attempts: 1,
      });
    } else {
      attemptsByCountry[attemptsByCountryIndex].attempts++;

      if (attemptsByCountry[attemptsByCountryIndex].attempts > mostDangerousCountry.attempts) {
        mostDangerousCountry = attemptsByCountry[attemptsByCountryIndex];
      }
    }
  });
  uniqueIpAddresses = uniqueAttacks.length;
  totalCountries = attemptsByCountry.length;

  return {
    failedLoginAttempts,
    geolocationErrors,
    uniqueIpAddresses,
    totalUniqueGeolocatedAttempts,
    totalCountries,
    mostDangerousCountry,
    largestSingleAttack,
    attemptsByCountry,
    uniqueAttacks,
  };
};

module.exports = {
  entryAnalyzer,
};
