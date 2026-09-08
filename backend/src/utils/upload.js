const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const fileType = require('file-type');
const User = require('../models/User');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'video/mp4', 'application/zip'];
const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.mp4', '.zip'];

/**
 * Validates a file and permanently saves it.
 * @param {string} tempPath - Absolute path to temporary file
 * @param {string} originalName - Original filename
 * @param {string} finalFilename - Final generated filename
 * @param {string} userId - ID of the user uploading the file
 * @param {number} size - File size in bytes
 * @returns {Promise<string>} The storage key if successful
 */
async function processUpload(tempPath, originalName, finalFilename, userId, size) {
  try {
    // 1. Magic Bytes Validation
    const extName = path.extname(originalName).toLowerCase();
    
    // fileTypeFromFile returns undefined for some plain text files.
    // If it's a text file we can optionally skip magic bytes or just allow it if it's text.
    let type = await fileType.fromFile(tempPath);
    
    if (!type && extName !== '.txt') {
      throw new Error('Unknown file type (magic bytes missing)');
    }
    
    if (type) {
      if (!allowedMimeTypes.includes(type.mime)) {
        throw new Error('Active content / Disallowed mime type detected');
      }
      // Special case: .txt won't have a specific file type signature we care about checking deeply
      // But for others, ensure extension matches the mime magic bytes
      if (!allowedExts.includes('.' + type.ext) && type.ext !== 'zip') { 
         // Note: .docx is zip under the hood, but we are only allowing strict types for now
         throw new Error('Magic bytes extension mismatch');
      }
    }

    // 2. Quota Reservation
    const reserved = await User.reserveQuota(userId, size);
    if (!reserved) {
      throw new Error('Upload quota exceeded');
    }

    // 3. Move to permanent storage
    const permDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
    const permPath = path.join(permDir, finalFilename);
    
    // Try to move
    try {
      await fsPromises.rename(tempPath, permPath);
    } catch (e) {
      // rollback quota if move fails
      await User.rollbackQuota(userId, size);
      throw e;
    }
    
    return `uploads/${finalFilename}`;
  } catch (error) {
    // 4. Physical cleanup of temp file
    try {
      if (fs.existsSync(tempPath)) {
        await fsPromises.unlink(tempPath);
      }
    } catch (cleanupError) {
      console.error('[Upload] Failed to cleanup temp file:', cleanupError);
    }
    throw error;
  }
}

/**
 * Rolls back an upload if a subsequent DB transaction fails
 */
async function rollbackUpload(storageKey, userId, size) {
  try {
    const permPath = path.join(__dirname, '..', '..', storageKey);
    if (fs.existsSync(permPath)) {
      await fsPromises.unlink(permPath);
    }
    if (userId && size) {
      await User.rollbackQuota(userId, size);
    }
  } catch (err) {
    console.error('[Upload] Rollback failed:', err);
  }
}

module.exports = {
  processUpload,
  rollbackUpload
};
