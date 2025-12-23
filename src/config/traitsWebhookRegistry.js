/**
 * Traits Webhook Registry
 * 
 * Central registry mapping persona slugs to n8n traits webhook URLs.
 * Provides URL resolution, validation, and startup verification.
 * 
 * Features:
 * - Slug-based mapping (primary key)
 * - Name normalization fallback for backward compatibility
 * - Production URL validation (rejects /webhook-test/)
 * - Startup validation function
 * - Easy to extend for new personas
 */

const logger = require('../utils/logger');

/**
 * Central registry mapping persona slugs to n8n traits webhook URLs
 * Key: persona.slug (from database)
 * Value: n8n production webhook URL
 */
const TRAITS_WEBHOOK_REGISTRY = {
    'hris-lead-finance-ops-controller': 'https://n8n-excollo.azurewebsites.net/webhook/traits/HRIS-Lead-and-Finance-Ops-Controller',
    'chief-financial-officer': 'https://n8n-excollo.azurewebsites.net/webhook/traits/Chief-Financial-Officer',
    'chief-business-officer': 'https://n8n-excollo.azurewebsites.net/webhook/traits/Chief-Business-Officer',
    'hr-ops-payroll-manager': 'https://n8n-excollo.azurewebsites.net/webhook/traits/HR-Ops-Payroll-Manager',
    'head-revenue-ops-growth-strategy': 'https://n8n-excollo.azurewebsites.net/webhook/traits/VP-Head-of-Revenue-Operations-Growth-Strategy',
    'chief-marketing-officer': 'https://n8n-excollo.azurewebsites.net/webhook/traits/Chief-Marketing-Officer',
    'chief-executive-officer': 'https://n8n-excollo.azurewebsites.net/webhook/traits/Chief-Executive-Officer',
    'chief-product-officer': 'https://n8n-excollo.azurewebsites.net/webhook/traits/Chief-Product-Officer',
};

/**
 * Normalize persona name to slug format for fallback lookup
 * Converts various name formats to consistent slug format
 * 
 * Examples:
 *   "Chief Business Officer" -> "chief-business-officer"
 *   "VP / Head of Revenue Operations & Growth Strategy" -> "vp-head-of-revenue-operations-growth-strategy"
 *   "HRIS Lead and Finance Ops/Controller" -> "hris-lead-and-finance-ops-controller"
 * 
 * @param {string} name - Persona name
 * @returns {string} Normalized slug
 */
function normalizePersonaKey(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    return name
        .toLowerCase()
        .trim()
        // Replace special characters with spaces
        .replace(/[\/&()]/g, ' ')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Replace spaces with hyphens
        .replace(/\s/g, '-')
        // Remove any remaining special characters except hyphens
        .replace(/[^a-z0-9-]/g, '')
        // Remove duplicate hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Get traits webhook URL for a persona
 * Resolution order:
 * 1. Direct slug lookup in registry
 * 2. Normalized name lookup in registry (backward compatibility)
 * 3. Return null if not found
 * 
 * @param {string} personaSlug - Persona slug from database (preferred)
 * @param {string} personaName - Persona name (fallback)
 * @returns {string|null} Webhook URL or null if not found
 */
function getTraitsWebhookUrl(personaSlug, personaName) {
    // Try direct slug lookup (preferred)
    if (personaSlug && TRAITS_WEBHOOK_REGISTRY[personaSlug]) {
        logger.debug('Traits webhook URL resolved by slug', {
            personaSlug,
            url: TRAITS_WEBHOOK_REGISTRY[personaSlug],
        });
        return TRAITS_WEBHOOK_REGISTRY[personaSlug];
    }

    // Try normalized name lookup (backward compatibility)
    if (personaName) {
        const normalizedKey = normalizePersonaKey(personaName);
        if (TRAITS_WEBHOOK_REGISTRY[normalizedKey]) {
            logger.debug('Traits webhook URL resolved by normalized name', {
                personaName,
                normalizedKey,
                url: TRAITS_WEBHOOK_REGISTRY[normalizedKey],
            });
            return TRAITS_WEBHOOK_REGISTRY[normalizedKey];
        }
    }

    // Not found in registry
    logger.debug('Traits webhook URL not found in registry', {
        personaSlug,
        personaName,
    });
    return null;
}

/**
 * Validate webhook URL is a production URL with security hardening
 * 
 * Security checks:
 * - HTTPS only (no HTTP)
 * - Hostname allow-listing (n8n-excollo.azurewebsites.net only)
 * - Production path only (/webhook/, not /webhook-test/)
 * - Valid URL format
 * 
 * Prevents:
 * - SSRF attacks
 * - Accidental staging/test URLs
 * - Future misconfiguration
 * 
 * @param {string} url - Webhook URL to validate
 * @throws {Error} If URL is invalid, test URL, or not allowed
 */
function validateWebhookUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('Webhook URL is required and must be a string');
    }

    // Parse URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        throw new Error(`Invalid webhook URL format: ${error.message}`);
    }

    // Check protocol (HTTPS only)
    if (parsedUrl.protocol !== 'https:') {
        throw new Error('Webhook URL must use HTTPS protocol');
    }

    // Check hostname allow-list (prevent SSRF)
    if (parsedUrl.hostname !== 'n8n-excollo.azurewebsites.net') {
        throw new Error(
            `Webhook URL hostname not allowed: ${parsedUrl.hostname}. Only n8n-excollo.azurewebsites.net is permitted.`
        );
    }

    // Check for test webhook URL
    if (parsedUrl.pathname.includes('/webhook-test/')) {
        throw new Error(
            'Test webhook URL not allowed in production. Please use /webhook/ URL from activated n8n workflow.'
        );
    }

    // Check path starts with /webhook/traits/ (CRITICAL: prevents chat contamination)
    if (!parsedUrl.pathname.startsWith('/webhook/traits/')) {
        throw new Error(
            `Invalid traits webhook path: ${parsedUrl.pathname}. Must start with /webhook/traits/ (not /webhook/chat/)`
        );
    }

    return true;
}

/**
 * Validate the entire webhook registry at startup
 * Checks for:
 * - Test URLs in registry
 * - Invalid URL formats
 * - Duplicate URLs
 * - Empty registry
 * 
 * @returns {Object} Validation result with { isValid, errors, warnings }
 */
function validateRegistry() {
    const errors = [];
    const warnings = [];
    const seenUrls = new Set();

    // Check if registry is empty
    const registryKeys = Object.keys(TRAITS_WEBHOOK_REGISTRY);
    if (registryKeys.length === 0) {
        errors.push('Traits webhook registry is empty');
        return { isValid: false, errors, warnings };
    }

    // Validate each entry
    for (const [slug, url] of Object.entries(TRAITS_WEBHOOK_REGISTRY)) {
        // Check for test URLs
        if (url.includes('/webhook-test/')) {
            errors.push(`Test URL found in registry for "${slug}": ${url}`);
        }

        // Validate URL format
        try {
            const parsedUrl = new URL(url);
            if (!parsedUrl.protocol.startsWith('http')) {
                errors.push(`Invalid protocol for "${slug}": ${url}`);
            }
        } catch (error) {
            errors.push(`Invalid URL format for "${slug}": ${url}`);
        }

        // Check for duplicate URLs
        if (seenUrls.has(url)) {
            warnings.push(`Duplicate URL found: ${url}`);
        }
        seenUrls.add(url);
    }

    const isValid = errors.length === 0;

    // Log results
    if (isValid) {
        logger.info('Traits webhook registry validation passed', {
            personaCount: registryKeys.length,
            warnings: warnings.length,
        });
    } else {
        logger.error('Traits webhook registry validation failed', {
            errors,
            warnings,
        });
    }

    if (warnings.length > 0) {
        logger.warn('Traits webhook registry validation warnings', { warnings });
    }

    return { isValid, errors, warnings };
}

/**
 * Get all registered persona slugs
 * Useful for debugging and testing
 * 
 * @returns {string[]} Array of persona slugs
 */
function getRegisteredSlugs() {
    return Object.keys(TRAITS_WEBHOOK_REGISTRY);
}

/**
 * Get registry statistics
 * 
 * @returns {Object} Registry stats
 */
function getRegistryStats() {
    const slugs = Object.keys(TRAITS_WEBHOOK_REGISTRY);
    const urls = Object.values(TRAITS_WEBHOOK_REGISTRY);
    const uniqueUrls = new Set(urls);

    return {
        totalPersonas: slugs.length,
        uniqueUrls: uniqueUrls.size,
        duplicateUrls: urls.length - uniqueUrls.size,
        slugs: slugs,
    };
}

module.exports = {
    getTraitsWebhookUrl,
    normalizePersonaKey,
    validateWebhookUrl,
    validateRegistry,
    getRegisteredSlugs,
    getRegistryStats,
    // Export registry for testing
    TRAITS_WEBHOOK_REGISTRY,
};
