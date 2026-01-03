const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { initializeSchema } = require('./database');
const storageRouter = require('./routes/storage');

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

function startServer(port = PORT, options = {}) {
  initializeSchema(options);
  return app.listen(port, () => {
    console.log(`SQLite storage server running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  app,
  startServer
};
