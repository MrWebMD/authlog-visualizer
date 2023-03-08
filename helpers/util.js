const crypto = require("crypto");
const fs = require("fs");
/**
 * Read a file and get its contents as a string
 * @param {string} filePath The location of the file on disk
 * @returns {string} File contents
 */
const readFile = (filePath) => {
  const fileContent = fs.readFileSync(filePath, {
    encoding: "utf8",
    flag: "r",
  });

  return fileContent;
};

/**
 * @param {string} content String to be hashed
 * @returns {string} sha512 hash
 */
const sha512hash = (content) => {
  const hashAlgorithm = crypto.createHash("sha512");

  const hashAsBytes = hashAlgorithm.update(content, "utf-8");

  const hashAsHexString = hashAsBytes.digest("hex");

  return hashAsHexString;
};

module.exports = {
  readFile,
  sha512hash,
};
