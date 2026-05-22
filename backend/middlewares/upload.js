const multer = require('multer');

// Configure memory storage to process files before sending to AWS S3 or disk
const storage = multer.memoryStorage();

// File filter for media files
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only images and videos are allowed.'), false);
  }
};

// Limit uploads to 50MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = upload;
