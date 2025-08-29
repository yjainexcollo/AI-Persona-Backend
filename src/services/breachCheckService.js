/**
 * BreachCheckService - Have I Been Pwned API integration
 * Checks passwords against breached database
 */

const crypto = require("crypto");
const axios = require("axios");
const logger = require("../utils/logger");

class BreachCheckService {
  constructor() {
    this.apiUrl = "https://api.pwnedpasswords.com/range/";
    this.userAgent = "AI-Persona-Backend/1.0.0";
  }

  /**
   * Check if password has been breached using HIBP API
   * Uses k-anonymity approach for privacy
   */
  async checkPasswordBreach(password) {
    try {
      // SHA-1 hash the password
      const sha1Hash = crypto
        .createHash("sha1")
        .update(password)
        .digest("hex")
        .toUpperCase();
      const prefix = sha1Hash.substring(0, 5);
      const suffix = sha1Hash.substring(5);

      // Make API request with only the prefix
      const response = await axios.get(`${this.apiUrl}${prefix}`, {
        headers: {
          "User-Agent": this.userAgent,
          "Add-Padding": "true",
        },
      });

      // Parse response and check if our suffix exists
      const data = typeof response?.data === "string" ? response.data : "";
      const hashes = data ? data.split("\r\n") : [];
      const foundHash = hashes.find((hash) => hash.startsWith(suffix));

      if (foundHash) {
        const parts = foundHash.split(":");
        const count = parts.length > 1 ? parseInt(parts[1]) : 0;
        logger.warn(`Password breach detected: ${count} occurrences`);
        return {
          breached: true,
          count: count,
          severity: this.getSeverityLevel(count),
        };
      }

      return {
        breached: false,
        count: 0,
        severity: "safe",
      };
    } catch (error) {
      logger.error(`HIBP API error: ${error.message}`);
      // Don't fail registration if HIBP is down
      return {
        breached: false,
        count: 0,
        severity: "unknown",
        error: "Service unavailable",
      };
    }
  }

  /**
   * Get severity level based on breach count
   */
  getSeverityLevel(count) {
    if (count > 10000) return "critical";
    if (count > 1000) return "high";
    if (count > 10) return "medium";
    if (count > 0) return "low";
    return "safe";
  }

  /**
   * Enhanced password validation with breach checking
   * Accepts strong passwords even if breached, but provides warning
   */
  async validatePasswordWithBreachCheck(password) {
    const breachResult = await this.checkPasswordBreach(password);

    // Check if password meets all strength requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;

    const isStrongPassword =
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar &&
      hasMinLength;

    if (breachResult.breached) {
      if (isStrongPassword) {
        // Accept strong passwords even if breached, but provide warning
        logger.warn(
          `Strong password accepted despite breach: ${breachResult.count} occurrences`
        );
        return {
          isValid: true,
          reason: `Password accepted (strong complexity) but has been breached ${breachResult.count} times. Consider using a different password.`,
          severity: breachResult.severity,
          count: breachResult.count,
          warning: true,
        };
      } else {
        // Reject weak breached passwords
        return {
          isValid: false,
          reason: `Password has been breached ${breachResult.count} times`,
          severity: breachResult.severity,
          count: breachResult.count,
        };
      }
    }

    return {
      isValid: true,
      reason: "Password is secure",
      severity: "safe",
    };
  }
}

module.exports = new BreachCheckService();
