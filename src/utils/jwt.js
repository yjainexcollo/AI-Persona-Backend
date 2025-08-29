const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const config = require("../config");
const ApiError = require("./apiError");
const apiResponse = require("./apiResponse");

/**
 * JWT utility with key rotation, kid headers, and JWKS support
 * Uses RSA key pairs for production security
 */

// Key management
let currentKeyPair = null;
let keyId = null;

// Key storage path
const KEY_STORAGE_PATH = path.join(__dirname, "../../.keys");

// Check if we're in test environment
const isTestEnvironment =
  process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID;

// Initialize RSA keys
async function initializeKeys() {
  if (currentKeyPair && keyId) {
    return {
      privateKey: currentKeyPair.privateKey,
      publicKey: currentKeyPair.publicKey,
      kid: keyId,
    };
  }

  try {
    await fs.mkdir(KEY_STORAGE_PATH, { recursive: true });
    const privateKeyPath = path.join(KEY_STORAGE_PATH, "private.pem");
    const publicKeyPath = path.join(KEY_STORAGE_PATH, "public.pem");
    const keyIdPath = path.join(KEY_STORAGE_PATH, "keyid.txt");

    try {
      // Try to load existing keys
      const [privateKey, publicKey, storedKeyId] = await Promise.all([
        fs.readFile(privateKeyPath, "utf8"),
        fs.readFile(publicKeyPath, "utf8"),
        fs.readFile(keyIdPath, "utf8"),
      ]);

      currentKeyPair = { privateKey, publicKey };
      keyId = storedKeyId.trim();

      if (!isTestEnvironment) {
        console.log("✅ Loaded existing RSA keys from storage");
      }
    } catch (error) {
      // Keys don't exist, generate new ones
      if (!isTestEnvironment) {
        console.log("🔑 Generating new RSA key pair...");
      }

      currentKeyPair = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });

      keyId = crypto.randomBytes(16).toString("hex");

      // Save keys to storage
      await Promise.all([
        fs.writeFile(privateKeyPath, currentKeyPair.privateKey),
        fs.writeFile(publicKeyPath, currentKeyPair.publicKey),
        fs.writeFile(keyIdPath, keyId),
      ]);

      if (!isTestEnvironment) {
        console.log("✅ Generated and saved new RSA keys");
      }
    }
  } catch (error) {
    if (!isTestEnvironment) {
      console.error("❌ Error initializing keys:", error.message);
    }
    // Fallback to in-memory keys if storage fails
    currentKeyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });
    keyId = crypto.randomBytes(16).toString("hex");
  }

  return {
    privateKey: currentKeyPair.privateKey,
    publicKey: currentKeyPair.publicKey,
    kid: keyId,
  };
}

// Rotate keys (for production)
async function rotateKeys() {
  const newKeyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  // Keep old key for token verification during transition
  const oldKeyPair = currentKeyPair;
  const oldKid = keyId;

  currentKeyPair = newKeyPair;
  keyId = crypto.randomBytes(16).toString("hex");

  // Save new keys
  try {
    await fs.mkdir(KEY_STORAGE_PATH, { recursive: true });
    const privateKeyPath = path.join(KEY_STORAGE_PATH, "private.pem");
    const publicKeyPath = path.join(KEY_STORAGE_PATH, "public.pem");
    const keyIdPath = path.join(KEY_STORAGE_PATH, "keyid.txt");

    await Promise.all([
      fs.writeFile(privateKeyPath, newKeyPair.privateKey),
      fs.writeFile(publicKeyPath, newKeyPair.publicKey),
      fs.writeFile(keyIdPath, keyId),
    ]);
  } catch (error) {
    if (!isTestEnvironment) {
      console.error("❌ Error saving rotated keys:", error.message);
    }
  }

  return {
    newKey: {
      privateKey: newKeyPair.privateKey,
      publicKey: newKeyPair.publicKey,
      kid: keyId,
    },
    oldKey: {
      privateKey: oldKeyPair.privateKey,
      publicKey: oldKeyPair.publicKey,
      kid: oldKid,
    },
  };
}

// Get current keys for JWKS
async function getCurrentKeys() {
  const keys = await initializeKeys();
  return {
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
    kid: keys.kid,
  };
}

// Generate JWKS (JSON Web Key Set)
async function generateJWKS() {
  const keys = await getCurrentKeys();

  try {
    // Use Node.js crypto to extract RSA components
    const publicKeyObj = crypto.createPublicKey(keys.publicKey);
    const publicKeyDer = publicKeyObj.export({ format: "der", type: "spki" });

    // Extract modulus and exponent from DER
    // This is a simplified approach - in production, consider using a library like 'jose'
    const modulusLength = 256; // 2048 bits = 256 bytes
    const modulus = publicKeyDer.slice(-modulusLength);

    const jwk = {
      kty: "RSA",
      use: "sig",
      kid: keys.kid,
      x5t: keys.kid,
      n: modulus.toString("base64url"),
      e: "AQAB", // Standard RSA exponent (65537)
    };

    return {
      keys: [jwk],
    };
  } catch (error) {
    // Fallback to simplified approach if crypto parsing fails
    const publicKeyBuffer = Buffer.from(
      keys.publicKey.replace(/-----.+-----/g, "").replace(/\s/g, ""),
      "base64"
    );

    const jwk = {
      kty: "RSA",
      use: "sig",
      kid: keys.kid,
      x5t: keys.kid,
      n: publicKeyBuffer.toString("base64url"),
      e: "AQAB",
    };

    return {
      keys: [jwk],
    };
  }
}

async function signToken(payload, options = {}) {
  const keys = await getCurrentKeys();
  const opts = {
    expiresIn: options.expiresIn || config.jwtExpiresIn,
    algorithm: "RS256",
  };

  // Only add defined options
  if (options.issuer) opts.issuer = options.issuer;
  if (options.audience) opts.audience = options.audience;
  if (options.subject) opts.subject = options.subject;
  if (options.jwtid) opts.jwtid = options.jwtid;
  if (options.notBefore) opts.notBefore = options.notBefore;

  const token = jwt.sign(payload, keys.privateKey, opts);
  if (options.apiResponse) {
    return apiResponse({ data: { token }, message: "Token generated" });
  }
  return token;
}

async function verifyToken(token) {
  try {
    const keys = await getCurrentKeys();
    return jwt.verify(token, keys.publicKey, { algorithms: ["RS256"] });
  } catch (err) {
    throw new ApiError(401, "Invalid or expired access token");
  }
}

async function signRefreshToken(payload, options = {}) {
  const keys = await getCurrentKeys();
  const opts = {
    expiresIn: options.expiresIn || config.jwtRefreshExpiresIn,
    algorithm: "RS256",
  };

  // Only add defined options
  if (options.issuer) opts.issuer = options.issuer;
  if (options.audience) opts.audience = options.audience;
  if (options.subject) opts.subject = options.subject;
  if (options.jwtid) opts.jwtid = options.jwtid;
  if (options.notBefore) opts.notBefore = options.notBefore;

  return jwt.sign(payload, keys.privateKey, opts);
}

async function verifyRefreshToken(token) {
  try {
    const keys = await getCurrentKeys();
    return jwt.verify(token, keys.publicKey, { algorithms: ["RS256"] });
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
}

// Initialize keys on module load
initializeKeys().catch(console.error);

module.exports = {
  signToken,
  verifyToken,
  signRefreshToken,
  verifyRefreshToken,
  generateJWKS,
  rotateKeys,
  getCurrentKeys,
};
