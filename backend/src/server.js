require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./sockets');
const { db } = require('./db/connection');

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await db.getConnection().then(c => c.release());
    console.log('✓ MySQL connected');

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`✓ ETeams backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('✗ Startup failed:', err.message);
    process.exit(1);
  }
})();
