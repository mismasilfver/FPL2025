const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { initializeSchema } = require('./database');
const storageRouter = require('./routes/storage');
const fplRouter = require('./routes/fpl');

// Load environment variables from .env if present
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath, override: true });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/storage', storageRouter);
app.use('/api/fpl', fplRouter);

// Fallback error handler for routes that do not define their own
app.use((error, _req, res, _next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

function startServer(port = PORT, options = {}) {
  initializeSchema(options);
  const server = app.listen(port, () => {
    console.log(`SQLite storage server running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    console.error(`Failed to start SQLite storage server on port ${port}:`, error);
    if (require.main === module) {
      process.exitCode = 1;
    }
  });

  return server;
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  app,
  startServer
};
