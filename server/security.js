const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Parses the ALLOWED_ORIGINS environment variable into a list of exact origins.
 * @param {string} [value] Comma separated list of origins.
 * @returns {Array<string>} Normalized origins without trailing slashes.
 */
function parseAllowedOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/**
 * Determines whether an origin points at the local machine.
 * @param {string} origin Origin header value.
 * @returns {boolean} True for http(s) origins on a loopback hostname.
 */
function isLoopbackOrigin(origin) {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return LOOPBACK_HOSTNAMES.has(hostname);
  } catch (error) {
    return false;
  }
}

/**
 * Builds the CORS options for the storage API.
 *
 * The API is unauthenticated, so cross-origin access is limited to the local
 * machine: any browser page from another site would otherwise be able to read
 * and overwrite the stored team data. Set ALLOWED_ORIGINS to opt extra origins
 * in explicitly.
 * @param {Record<string, string>} [env] Environment to read configuration from.
 * @returns {import('cors').CorsOptions} Options for the cors middleware.
 */
function createCorsOptions(env = process.env) {
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

  return {
    origin(origin, callback) {
      // Requests without an Origin header are not browser cross-origin
      // requests (curl, same-origin fetches, server-to-server calls).
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized) || isLoopbackOrigin(normalized)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    maxAge: 600
  };
}

/**
 * Validates that a request body is a JSON object usable as a payload.
 * @param {unknown} body Parsed request body.
 * @returns {boolean} True when the body is a plain (non-array) object.
 */
function isPlainObject(body) {
  return Boolean(body) && typeof body === 'object' && !Array.isArray(body);
}

module.exports = {
  createCorsOptions,
  isLoopbackOrigin,
  isPlainObject,
  parseAllowedOrigins
};
