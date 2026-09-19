/**
 * API key authentication middleware.
 *
 * Behavior is controlled by AUTH_MODE:
 *   - "none"   — passes every request through unchecked (development only)
 *   - "apikey" — requires a valid `x-api-key` header matching API_KEY (default)
 */
function auth(req, res, next) {
  const mode = process.env.AUTH_MODE || 'apikey';

  if (mode === 'none') {
    return next();
  }

  if (mode === 'apikey') {
    const providedKey = req.header('x-api-key');

    if (!providedKey) {
      return res.status(401).json({
        type: 'https://example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Missing x-api-key header.',
      });
    }

    if (providedKey !== process.env.API_KEY) {
      return res.status(401).json({
        type: 'https://example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'The provided x-api-key is not valid.',
      });
    }

    return next();
  }

  // Unknown AUTH_MODE — fail closed.
  return res.status(500).json({
    type: 'https://example.com/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: `Unsupported AUTH_MODE "${mode}". Use "none" or "apikey".`,
  });
}

module.exports = auth;
