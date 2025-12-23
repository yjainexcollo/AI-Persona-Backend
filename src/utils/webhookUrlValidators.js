/**
 * Webhook URL Validators
 * 
 * Strict validation functions to prevent cross-contamination between
 * chat and traits webhook URLs.
 * 
 * Security checks:
 * - HTTPS only
 * - Hostname allow-listing
 * - Path prefix enforcement
 * - Cross-contamination prevention
 */

const logger = require('./logger');

/**
 * Validate chat webhook URL with strict security checks
 * 
 * Rules:
 * - Must be valid URL
 * - Protocol must be https:
 * - Hostname must be n8n-excollo.azurewebsites.net
 * - Pathname must start with /webhook/chat/
 * - Must NOT include /webhook/traits/ or /webhook-test/
 * 
 * @param {string} url - Webhook URL to validate
 * @param {string} personaName - Persona name for error messages
 * @throws {Error} If URL is invalid or violates security rules
 */
function validateChatWebhookUrl(url, personaName) {
    if (!url || typeof url !== 'string') {
        throw new Error(`Chat webhook URL is required for persona "${personaName}"`);
    }

    // Parse URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        throw new Error(`Invalid chat webhook URL format for persona "${personaName}": ${error.message}`);
    }

    // Check protocol (HTTPS only)
    if (parsedUrl.protocol !== 'https:') {
        throw new Error(`Chat webhook URL must use HTTPS protocol for persona "${personaName}". Got: ${parsedUrl.protocol}`);
    }

    // Check hostname allow-list (prevent SSRF)
    if (parsedUrl.hostname !== 'n8n-excollo.azurewebsites.net') {
        throw new Error(
            `Chat webhook URL hostname not allowed for persona "${personaName}". ` +
            `Expected: n8n-excollo.azurewebsites.net, Got: ${parsedUrl.hostname}`
        );
    }

    // CRITICAL: Check for traits URL contamination
    if (parsedUrl.pathname.includes('/webhook/traits/')) {
        throw new Error(
            `CRITICAL: Chat webhook contains TRAITS path for persona "${personaName}". ` +
            `This will route chat requests to traits workflow! URL: ${url}`
        );
    }

    // Check for test webhook URL
    if (parsedUrl.pathname.includes('/webhook-test/')) {
        throw new Error(
            `Test webhook URL not allowed in production for persona "${personaName}". ` +
            `Please use production /webhook/chat/ URL from activated n8n workflow.`
        );
    }

    // Check path starts with /webhook/chat/
    if (!parsedUrl.pathname.startsWith('/webhook/chat/')) {
        throw new Error(
            `Invalid chat webhook path for persona "${personaName}". ` +
            `Must start with /webhook/chat/, Got: ${parsedUrl.pathname}`
        );
    }

    logger.debug('Chat webhook URL validation passed', {
        personaName,
        url,
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
    });

    return true;
}

/**
 * Validate traits webhook URL with strict security checks
 * 
 * Rules:
 * - Must be valid URL
 * - Protocol must be https:
 * - Hostname must be n8n-excollo.azurewebsites.net
 * - Pathname must start with /webhook/traits/
 * - Must NOT include /webhook/chat/ or /webhook-test/
 * 
 * @param {string} url - Webhook URL to validate
 * @param {string} personaName - Persona name for error messages
 * @throws {Error} If URL is invalid or violates security rules
 */
function validateTraitsWebhookUrl(url, personaName) {
    if (!url || typeof url !== 'string') {
        throw new Error(`Traits webhook URL is required for persona "${personaName}"`);
    }

    // Parse URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        throw new Error(`Invalid traits webhook URL format for persona "${personaName}": ${error.message}`);
    }

    // Check protocol (HTTPS only)
    if (parsedUrl.protocol !== 'https:') {
        throw new Error(`Traits webhook URL must use HTTPS protocol for persona "${personaName}". Got: ${parsedUrl.protocol}`);
    }

    // Check hostname allow-list (prevent SSRF)
    if (parsedUrl.hostname !== 'n8n-excollo.azurewebsites.net') {
        throw new Error(
            `Traits webhook URL hostname not allowed for persona "${personaName}". ` +
            `Expected: n8n-excollo.azurewebsites.net, Got: ${parsedUrl.hostname}`
        );
    }

    // CRITICAL: Check for chat URL contamination
    if (parsedUrl.pathname.includes('/webhook/chat/')) {
        throw new Error(
            `CRITICAL: Traits webhook contains CHAT path for persona "${personaName}". ` +
            `This will route traits requests to chat workflow! URL: ${url}`
        );
    }

    // Check for test webhook URL
    if (parsedUrl.pathname.includes('/webhook-test/')) {
        throw new Error(
            `Test webhook URL not allowed in production for persona "${personaName}". ` +
            `Please use production /webhook/traits/ URL from activated n8n workflow.`
        );
    }

    // Check path starts with /webhook/traits/
    if (!parsedUrl.pathname.startsWith('/webhook/traits/')) {
        throw new Error(
            `Invalid traits webhook path for persona "${personaName}". ` +
            `Must start with /webhook/traits/, Got: ${parsedUrl.pathname}`
        );
    }

    logger.debug('Traits webhook URL validation passed', {
        personaName,
        url,
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
    });

    return true;
}

module.exports = {
    validateChatWebhookUrl,
    validateTraitsWebhookUrl,
};
