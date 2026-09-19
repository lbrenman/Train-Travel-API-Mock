const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const auth = require('./middleware/auth');
const healthRoute = require('./routes/health');
const apiDocsRoute = require('./routes/apidocs');
const stationsRoute = require('./routes/stations');
const tripsRoute = require('./routes/trips');
const bookingsRoute = require('./routes/bookings');

const app = express();

// Required in Codespaces / any reverse-proxied environment so express-rate-limit
// can correctly read the client IP from X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.LOG_LEVEL === 'silent' ? 'combined' : 'dev', {
  skip: () => process.env.LOG_LEVEL === 'silent',
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    type: 'https://example.com/errors/too-many-requests',
    title: 'Too Many Requests',
    status: 429,
    detail: 'You have exceeded the rate limit.',
  },
});
app.use(limiter);

// Unauthenticated routes
app.use('/health', healthRoute);
app.use('/api-docs', apiDocsRoute);

// Authenticated routes — every resource is protected by API key auth (or
// left open if AUTH_MODE=none).
app.use('/stations', auth, stationsRoute);
app.use('/trips', auth, tripsRoute);
app.use('/bookings', auth, bookingsRoute);

app.get('/', (req, res) => {
  res.json({
    service: 'train-travel-api-mock',
    docs: '/api-docs',
    health: '/health',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    type: 'https://example.com/errors/not-found',
    title: 'Not Found',
    status: 404,
    detail: `No route matches ${req.method} ${req.originalUrl}.`,
  });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    type: 'https://example.com/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred.',
  });
});

module.exports = app;
