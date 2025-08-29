const logger = require("./logger");

function asyncHandler(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("asyncHandler expects a function");
  }

  return function (req, res, next) {
    try {
      const result = fn(req, res, next);

      // Check if the result is a promise (async function)
      if (result && typeof result.then === "function") {
        // Handle async function - properly catch promise rejections
        result.catch((err) => {
          // Log error with request context
          logger.error(
            "Async error in route %s %s: %o",
            req.method,
            req.originalUrl,
            err
          );
          next(err);
        });
      }
      // Don't return the result - asyncHandler should only handle errors
    } catch (err) {
      // Handle synchronous errors
      logger.error(
        "Sync error in route %s %s: %o",
        req.method,
        req.originalUrl,
        err
      );
      next(err);
    }
  };
}

module.exports = asyncHandler;
