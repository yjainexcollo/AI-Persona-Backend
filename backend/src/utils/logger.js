const { createLogger, format, transports } = require("winston");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

const logger = createLogger({
  level: isProduction ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "ai-persona-backend" },
  transports: [
    // Console transport for all environments
    new transports.Console({
      format: isProduction
        ? format.combine(format.json())
        : format.combine(format.colorize(), format.simple()),
    }),
    // File transports for production (uncomment to enable file logging)
    // new transports.File({ filename: path.join(__dirname, '../../logs/error.log'), level: 'error' }),
    // new transports.File({ filename: path.join(__dirname, '../../logs/combined.log') }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Stream for morgan HTTP request logging integration
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
