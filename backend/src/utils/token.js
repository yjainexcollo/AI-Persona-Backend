const crypto = require("crypto");

function generateToken(length = 48) {
  return crypto.randomBytes(length).toString("hex");
}

module.exports = {
  generateToken,
};
