/**
 * Console Email Provider
 * 
 * Development-only provider that logs emails to console instead of sending
 * Useful for local development and testing without email infrastructure
 */

const logger = require('../../../utils/logger');
const config = require('../../../config');

class ConsoleProvider {
    constructor() {
        const env = config.env || 'development';

        if (env === 'production') {
            throw new Error('Console email provider is not allowed in production');
        }

        logger.warn('Console email provider initialized - emails will be logged, not sent');
    }

    /**
     * "Send" email by logging to console
     * @param {Object} params - Email parameters
     * @param {string} params.toEmail - Recipient email address
     * @param {string} params.toName - Recipient name (optional)
     * @param {string} params.subject - Email subject
     * @param {string} params.html - HTML content
     * @param {string} params.text - Plain text content (optional)
     * @returns {Promise<Object>} { success: boolean, messageId: string }
     */
    async sendEmail({ toEmail, toName, subject, html, text }) {
        try {
            // Validate inputs
            if (!toEmail || !subject || !html) {
                throw new Error('Missing required parameters: toEmail, subject, or html');
            }

            // Extract verification/reset links from HTML for easy access
            const linkRegex = /href="([^"]*(?:verify-email|reset-password)[^"]*)"/gi;
            const links = [];
            let match;
            while ((match = linkRegex.exec(html)) !== null) {
                links.push(match[1]);
            }

            // Log email details to console
            logger.info('📧 [CONSOLE EMAIL PROVIDER] Email would be sent:', {
                provider: 'console',
                to: toEmail,
                toName: toName || 'N/A',
                subject,
                htmlLength: html.length,
                textLength: text?.length || 0,
            });

            // Log important links prominently
            if (links.length > 0) {
                logger.info('🔗 [CONSOLE EMAIL PROVIDER] Important links:', {
                    links,
                });

                // Also log to stdout for easy copy-paste
                console.log('\n' + '='.repeat(80));
                console.log('📧 EMAIL TO:', toEmail);
                console.log('📝 SUBJECT:', subject);
                if (links.length > 0) {
                    console.log('🔗 LINKS:');
                    links.forEach((link, i) => {
                        console.log(`   ${i + 1}. ${link}`);
                    });
                }
                console.log('='.repeat(80) + '\n');
            }

            return {
                success: true,
                messageId: 'console-dev-mode',
            };

        } catch (error) {
            logger.error('Console email provider error', {
                provider: 'console',
                error: error.message,
            });

            return {
                success: false,
                error: `Console provider error: ${error.message}`,
            };
        }
    }

    /**
     * Test console provider configuration (always succeeds)
     * @returns {Promise<boolean>}
     */
    async testConfig() {
        logger.info('Console email provider test - always succeeds in development');
        return true;
    }
}

module.exports = ConsoleProvider;
