const logger = require("./logger"); 

function asyncHandler(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("asyncHandler expects a function");
  }
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Optional: log error with request context
      logger.error(
        "Async error in route %s %s: %o",
        req.method,
        req.originalUrl,
        err
      );
      next(err);
    });
  };
}

module.exports = asyncHandler;
