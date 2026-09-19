/**
 * Parses ?page and ?limit query params and attaches { page, limit, offset }
 * to req.pagination. Mirrors the `page` / `limit` parameters defined in the
 * upstream Train Travel API spec.
 */
function pagination(req, res, next) {
  const defaultLimit = parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 10;
  const maxLimit = parseInt(process.env.MAX_PAGE_SIZE, 10) || 100;

  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
}

/**
 * Builds the `links` object used throughout the upstream spec's
 * Wrapper-Collection responses: { self, next, prev }.
 */
function buildLinks(req, total) {
  const { page, limit } = req.pagination;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  const query = new URLSearchParams(req.query);

  const withPage = (p) => {
    const q = new URLSearchParams(query);
    q.set('page', p);
    q.set('limit', limit);
    return `${baseUrl}?${q.toString()}`;
  };

  const links = { self: withPage(page) };
  if (page < totalPages) links.next = withPage(page + 1);
  if (page > 1) links.prev = withPage(page - 1);

  return links;
}

module.exports = { pagination, buildLinks };
