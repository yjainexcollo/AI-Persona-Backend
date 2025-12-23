/**
 * Brevo Email Provider
 * 
 * Sends transactional emails via Brevo API (formerly Sendinblue)
 * API Documentation: https://developers.brevo.com/reference/sendtransacemail
 */

const axios = require('axios');
const logger = require('../../../utils/logger');
const config = require('../../../config');

class BrevoProvider {
    constructor() {
        this.apiKey = config.brevoApiKey;
        this.fromEmail = config.emailFrom;
        this.fromName = config.emailFromName || 'AI Persona';
        this.apiUrl = 'https://api.brevo.com/v3/smtp/email';

        if (!this.apiKey) {
            throw new Error('BREVO_API_KEY is required for Brevo email provider');
        }
        if (!this.fromEmail) {
            throw new Error('EMAIL_FROM is required for Brevo email provider');
        }

        logger.info('Brevo email provider initialized', {
            fromEmail: this.fromEmail,
            fromName: this.fromName,
        });
    }

    /**
     * Send email via Brevo API
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

            // Build Brevo API payload
            const payload = {
                sender: {
                    name: this.fromName,
                    email: this.fromEmail,
                },
                to: [
                    {
                        email: toEmail,
                        name: toName || toEmail.split('@')[0],
                    },
                ],
                subject,
                htmlContent: html,
            };

            // Add text content if provided, otherwise Brevo will auto-generate
            if (text) {
                payload.textContent = text;
            }

            // Send request to Brevo API
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10 second timeout
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const messageId = response.data?.messageId || 'unknown';

            logger.info('Email sent successfully via Brevo', {
                provider: 'brevo',
                recipientDomain,
                subject,
                messageId,
                duration: `${duration}s`,
                status: response.status,
            });

            return {
                success: true,
                messageId,
            };

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            // Extract error details
            let errorMessage = error.message;
            let statusCode = null;

            if (error.response) {
                // Brevo API error response
                statusCode = error.response.status;
                errorMessage = error.response.data?.message || error.response.data?.error || error.message;

                logger.error('Brevo API error', {
                    provider: 'brevo',
                    statusCode,
                    error: errorMessage,
                    duration: `${duration}s`,
                    // Don't log full response body (may contain sensitive data)
                });
            } else if (error.request) {
                // Network error (no response received)
                logger.error('Brevo API network error', {
                    provider: 'brevo',
                    error: errorMessage,
                    duration: `${duration}s`,
                });
            } else {
                // Other error (validation, etc.)
                logger.error('Brevo email error', {
                    provider: 'brevo',
                    error: errorMessage,
                    duration: `${duration}s`,
                });
            }

            return {
                success: false,
                error: `Brevo API error: ${errorMessage}`,
            };
        }
    }

    /**
     * Test Brevo configuration
     * @returns {Promise<boolean>}
     */
    async testConfig() {
        try {
            logger.info('Testing Brevo configuration...');

            // Send a test email to the sender address
            const result = await this.sendEmail({
                toEmail: this.fromEmail,
                toName: 'Test',
                subject: 'Brevo Configuration Test',
                html: '<p>This is a test email to verify Brevo configuration.</p>',
                text: 'This is a test email to verify Brevo configuration.',
            });

            if (result.success) {
                logger.info('Brevo configuration test successful', {
                    messageId: result.messageId,
                });
                return true;
            } else {
                logger.error('Brevo configuration test failed', {
                    error: result.error,
                });
                return false;
            }
        } catch (error) {
            logger.error('Brevo configuration test error', {
                error: error.message,
            });
            return false;
        }
    }
}

module.exports = BrevoProvider;
