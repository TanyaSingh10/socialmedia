const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let s3Client = null;
const useS3 = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION &&
  process.env.AWS_BUCKET_NAME
);

if (useS3) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log('AWS S3 storage is enabled.');
} else {
  console.log('AWS S3 is not fully configured. Using local filesystem fallback storage.');
}

/**
 * Uploads a file (buffer or stream or local path) to either S3 or local uploads/ directory.
 * @param {Object} file - The file object from multer.
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
const uploadFile = async (file) => {
  if (!file) return null;

  const fileExt = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExt}`;

  if (useS3 && s3Client) {
    try {
      const bucketName = process.env.AWS_BUCKET_NAME;
      const key = `uploads/${fileName}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      // Return AWS S3 Public URL (assumes public access or CloudFront is configured)
      return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('AWS S3 upload failed, trying local backup:', error.message);
      // fallback to local on S3 failure
    }
  }

  // Local filesystem fallback
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const localFilePath = path.join(uploadsDir, fileName);
  await fs.promises.writeFile(localFilePath, file.buffer);

  // Return local Express URL (server host will be appended in controller or keep it path-relative)
  return `/uploads/${fileName}`;
};

module.exports = {
  uploadFile,
  useS3,
};
