const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { initializeSchema } = require('./database');
const { createCorsOptions } = require('./security');
const storageRouter = require('./routes/storage');
const fplRouter = require('./routes/fpl');

// Load environment variables from .env if present
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath, override: true });

const app = express();
const PORT = process.env.PORT || 4000;
// The storage API has no authentication, so bind to loopback unless the
// operator explicitly opts into exposing it on the network.
const HOST = process.env.HOST || '127.0.0.1';

app.disable('x-powered-by');
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/storage', storageRouter);
app.use('/api/fpl', fplRouter);

function startServer(port = PORT, options = {}) {
  initializeSchema(options);
  const host = options.host || HOST;
  return app.listen(port, host, () => {
    console.log(`SQLite storage server running on http://${host}:${port}`);
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  app,
  startServer
};
