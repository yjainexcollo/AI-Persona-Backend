/**
 * Email Client Factory
 * 
 * Initializes and provides the appropriate email provider based on configuration
 * Supports: Brevo API, SMTP (nodemailer), Console (dev only)
 */

const logger = require('../../utils/logger');
const config = require('../../config');

let emailProvider = null;

/**
 * Initialize email provider based on EMAIL_PROVIDER env var
 * @returns {Object} Email provider instance
 */
function initializeProvider() {
    if (emailProvider) {
        return emailProvider;
    }

    const providerType = config.emailProvider;
    const env = config.env || 'development';
    const isProduction = env === 'production';

    logger.info('Initializing email provider...', {
        providerType: providerType || 'auto-detect',
        environment: env,
    });

    // Provider selection logic
    if (providerType === 'brevo') {
        // Explicit Brevo provider
        const BrevoProvider = require('./providers/brevoProvider');
        emailProvider = new BrevoProvider();

    } else if (providerType === 'smtp') {
        // Explicit SMTP provider
        const SmtpProvider = require('./providers/smtpProvider');
        emailProvider = new SmtpProvider();

    } else if (providerType === 'console') {
        // Explicit console provider (dev only)
        if (isProduction) {
            throw new Error('Console email provider is not allowed in production');
        }
        const ConsoleProvider = require('./providers/consoleProvider');
        emailProvider = new ConsoleProvider();

    } else if (!providerType) {
        // Auto-detect provider
        if (config.brevoApiKey && config.emailFrom) {
            // Brevo credentials found
            logger.info('Auto-detected Brevo provider (BREVO_API_KEY found)');
            const BrevoProvider = require('./providers/brevoProvider');
            emailProvider = new BrevoProvider();

        } else if (config.smtpHost && config.smtpUser) {
            // SMTP credentials found
            logger.info('Auto-detected SMTP provider (SMTP_HOST found)');
            const SmtpProvider = require('./providers/smtpProvider');
            emailProvider = new SmtpProvider();

        } else if (isProduction) {
            // Production requires explicit configuration
            throw new Error(
                'No email provider configured. Set EMAIL_PROVIDER=brevo with BREVO_API_KEY and EMAIL_FROM, ' +
                'or EMAIL_PROVIDER=smtp with SMTP_* variables'
            );

        } else {
            // Development: fall back to console provider
            logger.warn('No email provider configured. Using console mode (emails will be logged)');
            const ConsoleProvider = require('./providers/consoleProvider');
            emailProvider = new ConsoleProvider();
        }

    } else {
        // Invalid provider type
        throw new Error(
            `Invalid EMAIL_PROVIDER: ${providerType}. Must be 'brevo', 'smtp', or 'console'`
        );
    }

    logger.info('Email provider initialized successfully', {
        provider: emailProvider.constructor.name,
    });

    return emailProvider;
}

/**
 * Get initialized email provider (singleton)
 * @returns {Object} Email provider instance
 */
function getProvider() {
    if (!emailProvider) {
        return initializeProvider();
    }
    return emailProvider;
}

/**
 * Send email using configured provider
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.toName - Recipient name (optional)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} params.text - Plain text content (optional)
 * @returns {Promise<Object>} { success: boolean, messageId?: string, error?: string }
 */
async function sendEmail({ toEmail, toName, subject, html, text }) {
    const provider = getProvider();
    return await provider.sendEmail({ toEmail, toName, subject, html, text });
}

/**
 * Test email provider configuration
 * @returns {Promise<boolean>}
 */
async function testConfig() {
    const provider = getProvider();
    return await provider.testConfig();
}

/**
 * Reset provider (for testing)
 */
function resetProvider() {
    emailProvider = null;
}

module.exports = {
    sendEmail,
    testConfig,
    getProvider,
    resetProvider, // For testing only
};
