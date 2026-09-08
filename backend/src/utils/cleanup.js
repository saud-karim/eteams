const fs = require('fs/promises');
const path = require('path');

async function cleanupTempUploads() {
  const tempDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'temp');
  
  try {
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = await fs.stat(filePath);
        // Delete if older than 1 hour
        if (now - stats.mtimeMs > 60 * 60 * 1000) {
          await fs.unlink(filePath);
          console.log(`[Cleanup] Deleted orphaned temp file: ${file}`);
        }
      } catch (err) {
        console.error(`[Cleanup] Failed to process ${file}:`, err);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[Cleanup] Failed to read temp directory:', err);
    }
  }
}

function startCleanupJob() {
  // Run every 15 minutes
  setInterval(cleanupTempUploads, 15 * 60 * 1000);
  // Also run once on startup after a delay
  setTimeout(cleanupTempUploads, 5000);
}

module.exports = { startCleanupJob };
