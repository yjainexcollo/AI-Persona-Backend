/**
 * SMTP Email Provider
 * 
 * Backward compatibility wrapper for SMTP-based email delivery
 * Uses nodemailer (lazy-loaded only when EMAIL_PROVIDER=smtp)
 */

const logger = require('../../../utils/logger');
const config = require('../../../config');

class SmtpProvider {
    constructor() {
        // Lazy-load nodemailer only when SMTP provider is used
        const nodemailer = require('nodemailer');

        const resolvedPort = Number(config.smtpPort || 587);
        const useSecure = resolvedPort === 465;

        this.transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: resolvedPort,
            secure: useSecure, // true for 465, false for 587
            requireTLS: !useSecure, // enforce STARTTLS on 587
            family: 4, // prefer IPv4 to avoid IPv6 egress issues
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass,
            },
            // Reduced timeouts to prevent blocking registration
            connectionTimeout: 5000,  // 5s instead of 20s
            greetingTimeout: 5000,    // 5s instead of 10s
            socketTimeout: 10000,     // 10s instead of 30s
            pool: true,
            maxConnections: 2,
            maxMessages: 20,
            tls: {
                servername: config.smtpHost,
            },
        });

        this.fromEmail = config.smtpFrom;

        logger.info('SMTP email provider initialized', {
            host: config.smtpHost,
            port: resolvedPort,
            secure: useSecure,
            fromEmail: this.fromEmail,
        });
    }

    /**
     * Send email via SMTP
     * @param {Object} params - Email parameters
     * @param {string} params.toEmail - Recipient email address
     * @param {string} params.toName - Recipient name (optional)
     * @param {string} params.subject - Email subject
     * @param {string} params.html - HTML content
     * @param {string} params.text - Plain text content (optional)
     * @returns {Promise<Object>} { success: boolean, messageId?: string, error?: string }
     */
    async sendEmail({ toEmail, toName, subject, html, text }) {
        const startTime = Date.now();

        try {
            // Validate inputs
            if (!toEmail || !subject || !html) {
                throw new Error('Missing required parameters: toEmail, subject, or html');
            }

            // Extract domain for logging (privacy)
            const recipientDomain = toEmail.split('@')[1] || 'unknown';

            // Build nodemailer mail options
            const mailOptions = {
                from: this.fromEmail,
                to: toEmail,
                subject,
                html,
            };

            // Add text content if provided
            if (text) {
                mailOptions.text = text;
            }

            // Send email via SMTP
            const info = await this.transporter.sendMail(mailOptions);

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const messageId = info.messageId || 'unknown';

            logger.info('Email sent successfully via SMTP', {
                provider: 'smtp',
                recipientDomain,
                subject,
                messageId,
                duration: `${duration}s`,
                response: info.response,
            });

            return {
                success: true,
                messageId,
            };

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            logger.error('SMTP email error', {
                provider: 'smtp',
                error: error.message,
                code: error.code || 'UNKNOWN',
                duration: `${duration}s`,
            });

            return {
                success: false,
                error: `SMTP error: ${error.message}`,
            };
        }
    }

    /**
     * Test SMTP configuration
     * @returns {Promise<boolean>}
     */
    async testConfig() {
        try {
            logger.info('Testing SMTP configuration...');

            await this.transporter.verify();

            logger.info('SMTP configuration test successful');
            return true;
        } catch (error) {
            logger.error('SMTP configuration test failed', {
                error: error.message,
                code: error.code || 'UNKNOWN',
            });
            return false;
        }
    }
}

module.exports = SmtpProvider;
