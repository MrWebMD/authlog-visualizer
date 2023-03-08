/**
 * These text nodes are used to update data displayed
 * on the dashboard
 */

let uniqueAttacksNode = createTextNode("#unique-attacks", "0");

let failedLoginAttemptsNode = createTextNode("#failedLoginAttempts", "0");

let totalUniqueGeolocatedAttemptsNode = createTextNode("#totalUniqueGeolocatedAttempts", "0");

let geolocationErrorsNode = createTextNode("#geolocationErrors", "0");

let largestSingleAttackCountryNameNode = createTextNode("#largestSingleAttackCountryName", "");

let largestSingleAttackLatNode = createTextNode("#largestSingleAttackLat", "");

let largestSingleAttackLngNode = createTextNode("#largestSingleAttackLng", "");

let largestSingleAttackAttemptsNode = createTextNode("#largestSingleAttackAttempts", "0");

let totalCountriesNode = createTextNode("#totalCountries", "0");

let mostDangerousCountryNameNode = createTextNode("#mostDangerousCountryName", "");

let mostDangerousCountryAttemptsNode = createTextNode("#mostDangerousCountryAttempts", "0");

let globe;

const originServer = {
  labelText: APP_SETTINGS.originServer.label,
  lat: APP_SETTINGS.originServer.lat,
  lng: APP_SETTINGS.originServer.lng,
};

const ringStyles = {
  maxR: 4,
  propagationSpeed: 3,
  // repeatPeriod: 1000,
  altitude: 0.05,
};

const labelStyles = {
  size: 0.7,
  dotRadius: 0.2,
  color: "#f1f4ff",
  resolution: 1,
  // altitude: 0.1,
};

/**
 * Create an element on the page which can be used to display text
 * @param selector The css selector of the element which will have a text node appended to it
 * @param defaultValue The content of the text node by default
 * @returns {TextNode}
 */
function createTextNode(selector, defaultValue) {
  let elem = document.querySelector(selector);

  let textNode = document.createTextNode(defaultValue);

  elem.appendChild(textNode);

  return textNode;
}

/**
 * Generate a random number between two numbers
 * @param {number} min The minimum number
 * @param {number} max The maximum number
 * @returns {number} Random number
 */
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Fade out the pulsing rings on the globe
 * @param {number} time Time left in the animation
 * @returns {string} rgba color
 */
const colorInterpolator = (time) => `rgba(104, 127, 201,${Math.sqrt(1 - time)})`;

/**
 * @typedef {Object} Entry
 * @property {string} ip The ip address of the machine that initiated the request
 * @property {boolean} geolocated Was this request able to be pin pointed by lat and lng?
 * @property {number | null} lat Latitude of the machine that initiated the request
 * @property {number | null} lng Longitude of the machine that initiated the request
 * @property {string | null} countryName
 * @property {number} timestamp Unix Timestamp of when the request was made
 * @property {number} port The port number of the machine that initiated the request
 * @property {number} appearances Amount of times this ip address has appeared in the logs within the specified timeframe
 */
/**
 * @typedef {Object} CountryAttempt
 * @property {string} name The name of the country
 * @property {number} attempts How many times this country has appeared in the logs within the specified timeframe
 */
/**
 * @typedef {Object} LogStats
 * @property {number} failedLoginAttempts The total number of failed login attempts within the specified timeframe
 * @property {number} geolocationErrors How many unique ip addresses were not able to be mapped by lat and lng
 * @property {Entry[]} uniqueAttacks How many unique ip addresses were found within the specified timeframe
 * @property {number} totalUniqueGeolocatedAttempts How many unique ip addresses were mapped to a lat and lng
 * @property {Entry} largestSingleAttack The ip address which appeared most often in the timespan of the log
 * @property {number} totalCountries How many unique countries were found in the logs within the specified timeframe
 * @property {CountryAttempt} mostDangerousCountry The country which appeared the most in the logs within the specified timeframe
 * @property {CountryAttempt[]} attemptsByCountry A list of how many times each unique country appeared in the logs
 */
/**
 * Make a request to the server for log statistics between
 * two specified timestamps
 * @param {number} startTimestamp Unix timestamp
 * @param {number} endTimestamp Unix timestamp
 * @returns {Promise.<LogStats>}
 */
const getLogStatistics = (startTimestamp, endTimestamp) =>
  new Promise((resolve, reject) => {
    fetch("/api/statistics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startTimestamp,
        endTimestamp,
      }),
    })
      .then((res) => resolve(res.json()))
      .catch(reject);
  });

/**
 * @typedef {Object} Timerange
 * @property {number} earliestTimestamp Unix Timestamp The earliest date of all logs parsed
 * @property {number} latestTimestamp Unix Timestamp The latest date of all logs parsed
 */

/**
 * Get a range of dates which represent the total range of
 * time across all parsed log entries
 * @returns {Promise.<Timerange>}
 */
const getTimerange = () =>
  new Promise((resolve, reject) => {
    fetch("/api/timerange")
      .then((res) => resolve(res.json()))
      .catch(reject);
  });

/**
 * Take a LogStats object response from the api and
 * render every bit of data on the screen.
 * @param {LogStats} logStats
 */
const renderLogStatistics = (logStats) => {
  /**
   * Below describes data points which will be passed
   * to the globe.gl library. Reference the documentation and examples for
   * the arc, label, and ring layers to understand why the data
   * is being structured this way.
   */

  /**
   * @typedef {Object} GlobePoint
   * @property {number} startLat The latitude of where the attack originated from
   * @property {number} startLng The longitude of where the attack originated from
   * @property {number} endLat The latitude of where the attack was directed
   * @property {number} endLng The longitude of where the attack was directed
   * @property {string} srcIp The ip address of the recipient of the attack
   * @property {string} dstIp The ip address of the person who initiated the attack
   *
   */
  /**
   * @type {GlobePoint[]}
   */
  let attemptData = [];

  /**
   * Generate points that can be used with GlobeGL
   * from the log statistics returned from the API
   */
  logStats.uniqueAttacks.forEach((entry) => {
    if (!entry.geolocated) {
      return;
    }
    attemptData.push({
      startLat: entry.lat,
      startLng: entry.lng,
      endLat: originServer.lat,
      endLng: originServer.lng,
      srcIp: entry.ip,
      dstIp: "137.184.216.122",
    });
  });
  /**
   * https://globe.gl/#arcs-layer
   * https://vasturiano.github.io/globe.gl/example/random-arcs/
   * https://github.com/vasturiano/globe.gl/blob/master/example/random-arcs/index.html
   */
  arcsData = attemptData.map((attempt) => {
    return {
      ...attempt,
      labelText: attempt.srcIp,
      color: ["white", "#819eff"],
    };
  });

  /**
   * https://globe.gl/#rings-layer
   * https://vasturiano.github.io/globe.gl/example/random-rings/
   * https://github.com/vasturiano/globe.gl/blob/master/example/random-rings/index.html
   */
  ringData = attemptData.map((attempt) => ({
    lat: attempt.startLat,
    lng: attempt.startLng,
    labelText: attempt.srcIp,
    ...ringStyles,
  }));

  /**
   * Create a separate pulsing ring around the origin server
   * on the globe
   */
  ringData.push({
    ...originServer,
    ...ringStyles,
  });

  /**
   * https://globe.gl/#labels-layer
   * https://vasturiano.github.io/globe.gl/example/world-cities/
   * https://github.com/vasturiano/globe.gl/blob/master/example/world-cities/index.html
   */
  labelData = attemptData.map((attempt) => ({
    lat: attempt.startLat,
    lng: attempt.startLng,
    labelText: attempt.srcIp,
    ...labelStyles,
  }));

  /**
   * Create a separate label to show where the origin server is
   * on the globe
   */

  labelData.push({
    ...originServer,
    ...labelStyles,
  });

  /**
   * Using the globe object, reset the data for all used map features
   */

  globe.arcsData(arcsData).ringsData(ringData).labelsData(labelData);

  /**
   * Show all log statistics numbers on the dashboard by
   * updating the text nodes
   */

  failedLoginAttemptsNode.nodeValue = logStats.failedLoginAttempts;
  uniqueAttacksNode.nodeValue = logStats.uniqueAttacks.length;

  totalUniqueGeolocatedAttemptsNode.nodeValue = logStats.totalUniqueGeolocatedAttempts;
  geolocationErrorsNode.nodeValue = logStats.geolocationErrors;

  largestSingleAttackCountryNameNode.nodeValue = logStats.largestSingleAttack.countryName;

  largestSingleAttackLatNode.nodeValue = logStats.largestSingleAttack.lat;
  largestSingleAttackLngNode.nodeValue = logStats.largestSingleAttack.lng;

  largestSingleAttackAttemptsNode.nodeValue = logStats.largestSingleAttack.appearances;

  totalCountriesNode.nodeValue = logStats.totalCountries;
  mostDangerousCountryNameNode.nodeValue = logStats.mostDangerousCountry.name;
  mostDangerousCountryAttemptsNode.nodeValue = logStats.mostDangerousCountry.attempts;

  /**
   * Reinitialize the dashboard chart to display the newest information,
   * or create it if it does not already exist
   */

  /**
   * x axis data for the dashboard chart
   * @type {string[]}
   */
  let chartLabels = [];
  /**
   * y axis data for the dashboard chart
   * @type {number[]}
   */
  let chartValues = [];

  /**
   * Sort the attempts for each country from highest to lowest
   */
  let attemptsByCountry = logStats.attemptsByCountry.sort((a, b) => {
    return b.attempts - a.attempts;
  });

  /**
   * Add the data for attempts by country to the arrays
   * which will be displayed on the chart
   */

  attemptsByCountry.forEach((countryAttempt) => {
    chartLabels.push(countryAttempt.name);
    chartValues.push(countryAttempt.attempts);
  });

  /**
   * Make the chart display text in the color white
   */

  Chart.defaults.global.defaultFontColor = "#fff";

  /**
   * Create a new chart on the dashboard using the fetched data
   * https://www.chartjs.org/docs/latest/getting-started/
   */
  new Chart("attacksByCountry", {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          backgroundColor: "#1aff98",
          data: chartValues,
        },
      ],
    },
    options: {
      legend: { display: false },
      title: {
        display: true,
        text: "",
      },
    },
  });
};

const main = async () => {
  /**
   * Initialize the Globe!!!!
   * Give the user something to look at while
   * the server is responding to the statistics request
   */
  globe = Globe();

  globe
    .globeImageUrl("/images/map1.jpg")
    .bumpImageUrl("/images/earth-topology-bump-map.png")
    .backgroundImageUrl("/images/space.jpg")
    .arcLabel((d) => d.labelText)
    .arcColor("color")
    .arcStroke(() => "0.2px")
    .arcDashLength(() => 0.03)
    .arcDashGap(() => 2)
    .arcDashAnimateTime(() => Math.random() * 7000 + 3000)
    .ringColor(() => colorInterpolator)
    .ringMaxRadius("maxR")
    .ringPropagationSpeed("propagationSpeed")
    .ringRepeatPeriod(() => 1000 * Math.random() + 1000)
    .ringAltitude("altitude")
    .labelLat("lat")
    .labelLng("lng")
    .labelText("labelText")
    .labelSize("size")
    .labelDotRadius((label) => label.dotRadius)
    .labelColor(() => `rgba(255, 255, 255, ${getRandomArbitrary(0.2, 1)})`)
    .labelResolution(2)
    .labelAltitude(() => 0.4 * Math.random() + 0.2)
    .atmosphereAltitude(0.3)(document.getElementById("globeViz"));
  /**
   * Determine what the earliest date and latest date
   * in the parsed logs are.
   */

  let startDate;
  let endDate;

  try {
    let timerangeData = await getTimerange();

    startDate = timerangeData.earliestTimestamp;
    endDate = timerangeData.latestTimestamp;

    console.log("The timerange is", startDate, endDate);
  } catch (err) {
    console.log("Could not fetch log time range", err);
    return;
  }

  /**
   * Attempt to fetch the most recent log statistics
   */

  let logStats;

  try {
    logStats = await getLogStatistics(startDate, endDate);
  } catch (err) {
    console.log(err);
    return;
  }

  /**
   * Create the date picker which can be used to filter logs on the dashboard
   */
  const picker = new Litepicker({
    element: document.getElementById("datepicker"),
    singleMode: false,
    minDate: startDate,
    maxDate: endDate,
  });

  /**
   * When a new date range is submitted, update the dashboard
   * with new data fetched from the server
   */
  document.querySelector("#changeLogRangeButton").onclick = async () => {
    let logStats;

    try {
      logStats = await getLogStatistics(picker.getStartDate().getTime(), picker.getEndDate().getTime());
    } catch (err) {
      console.log(err);
      return;
    }

    renderLogStatistics(logStats);
  };

  /**
   * When no distractions mode is enabled, hide all of the main content of
   * the dashboard and make the navigation slightly transparent
   */
  document.querySelector("#noDistractionsSwitch").onchange = (event) => {
    let dashboardMainContent = document.querySelector(".dashboard__main");
    let dashboardNav = document.querySelector(".dashboard__nav");

    if (event.target.checked) {
      dashboardMainContent.classList.add("hidden");
      dashboardNav.classList.add("lowOpacity");
      return;
    }

    dashboardMainContent.classList.remove("hidden");
    dashboardNav.classList.remove("lowOpacity");
  };

  /**
   * Display the fetched log data to the screen!
   */
  renderLogStatistics(logStats);
};

main();
