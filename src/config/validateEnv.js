/**
 * Environment Variable Validation
 * Validates required environment variables on application startup
 */

const logger = require("../utils/logger");

/**
 * Validate ENCRYPTION_KEY format and length
 * @param {string} key - The encryption key to validate
 * @returns {Object} Validation result
 */
function validateEncryptionKey(key) {
    if (!key || typeof key !== "string") {
        return {
            valid: false,
            error: "ENCRYPTION_KEY must be a non-empty string",
        };
    }

    // Try to decode as base64
    try {
        const base64Key = Buffer.from(key, "base64");
        if (base64Key.length === 32) {
            return { valid: true, format: "base64", length: 32 };
        }
    } catch (error) {
        // Not valid base64, continue
    }

    // Try UTF-8 encoding
    const utf8Key = Buffer.from(key, "utf8");
    if (utf8Key.length === 32) {
        return { valid: true, format: "utf8", length: 32 };
    }

    // If neither works, the key will be hashed to 32 bytes (acceptable)
    // This is handled by the encrypt utility
    return {
        valid: true,
        format: "will_be_hashed",
        length: key.length,
        warning: "Key will be hashed to 32 bytes (SHA-256)",
    };
}

/**
 * Validate environment variables based on NODE_ENV
 * @throws {Error} If validation fails in production
 */
function validateEnvironment() {
    const env = process.env.NODE_ENV || "development";
    const isProduction = env === "production";
    const errors = [];
    const warnings = [];

    logger.info(`Validating environment variables for ${env} mode...`);

    // Validate WEBHOOK_SECRET
    if (!process.env.WEBHOOK_SECRET) {
        const message = "WEBHOOK_SECRET is not set";
        if (isProduction) {
            errors.push(message);
        } else {
            warnings.push(message + " (webhook signature verification disabled)");
        }
    } else if (process.env.WEBHOOK_SECRET.length < 32) {
        warnings.push(
            `WEBHOOK_SECRET is short (${process.env.WEBHOOK_SECRET.length} chars). Recommended: 32+ characters`
        );
    }

    // Validate ENCRYPTION_KEY
    if (!process.env.ENCRYPTION_KEY) {
        errors.push("ENCRYPTION_KEY is not set (required for persona webhook URLs)");
    } else {
        const keyValidation = validateEncryptionKey(process.env.ENCRYPTION_KEY);
        if (!keyValidation.valid) {
            errors.push(`ENCRYPTION_KEY validation failed: ${keyValidation.error}`);
        } else if (keyValidation.warning) {
            warnings.push(`ENCRYPTION_KEY: ${keyValidation.warning}`);
        } else {
            logger.info(
                `ENCRYPTION_KEY validated: ${keyValidation.format} format, ${keyValidation.length} bytes`
            );
        }
    }

    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
        errors.push("DATABASE_URL is not set");
    }

    // Validate JWT_SECRET
    if (!process.env.JWT_SECRET) {
        errors.push("JWT_SECRET is not set");
    } else if (process.env.JWT_SECRET.length < 32) {
        warnings.push(
            `JWT_SECRET is short (${process.env.JWT_SECRET.length} chars). Recommended: 32+ characters`
        );
    }

    // Validate Email Provider Configuration
    const emailProvider = process.env.EMAIL_PROVIDER || null;

    if (emailProvider === 'brevo') {
        // Brevo mode: require BREVO_API_KEY and EMAIL_FROM
        if (!process.env.BREVO_API_KEY) {
            errors.push('EMAIL_PROVIDER=brevo requires BREVO_API_KEY');
        }
        if (!process.env.EMAIL_FROM) {
            errors.push('EMAIL_PROVIDER=brevo requires EMAIL_FROM (verified sender email)');
        }
        logger.info('Email provider: Brevo API');

    } else if (emailProvider === 'smtp') {
        // SMTP mode: require SMTP_* variables
        const requiredSmtpVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
        requiredSmtpVars.forEach(varName => {
            if (!process.env[varName]) {
                errors.push(`EMAIL_PROVIDER=smtp requires ${varName}`);
            }
        });
        logger.info('Email provider: SMTP');

    } else if (emailProvider === 'console') {
        // Console mode: only allowed in development
        if (isProduction) {
            errors.push('EMAIL_PROVIDER=console is not allowed in production');
        } else {
            warnings.push('Email provider: Console (development mode - emails will be logged)');
        }

    } else if (!emailProvider) {
        // No provider specified: auto-detect
        if (process.env.BREVO_API_KEY && process.env.EMAIL_FROM) {
            logger.info('Email provider: Auto-detected Brevo (BREVO_API_KEY found)');
        } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            logger.info('Email provider: Auto-detected SMTP (SMTP_HOST found)');
        } else if (isProduction) {
            errors.push(
                'No email provider configured. Set EMAIL_PROVIDER=brevo with BREVO_API_KEY and EMAIL_FROM, ' +
                'or EMAIL_PROVIDER=smtp with SMTP_* variables'
            );
        } else {
            warnings.push('No email provider configured. Using console mode (emails will be logged)');
        }

    } else {
        errors.push(`Invalid EMAIL_PROVIDER: ${emailProvider}. Must be 'brevo', 'smtp', or 'console'`);
    }

    // Log warnings
    if (warnings.length > 0) {
        warnings.forEach((warning) => logger.warn(`⚠️  ${warning}`));
    }

    // Handle errors
    if (errors.length > 0) {
        const errorMessage = `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`;
        logger.error(errorMessage);

        if (isProduction) {
            throw new Error(errorMessage);
        } else {
            logger.warn("Continuing in development mode despite validation errors");
        }
    } else {
        logger.info("✅ Environment validation passed");
    }
}

module.exports = {
    validateEnvironment,
    validateEncryptionKey,
};
