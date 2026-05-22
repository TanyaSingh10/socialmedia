require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./sockets/socket');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const server = http.createServer(app);

// Enable real-time WebSocket connection
const io = initSocket(server);

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares
app.use(express.json());
app.use(cors({ origin: '*' }));
// Configure Helmet. Since we are serving images locally, we need to allow cross-origin resource sharing/loading for standard image components in browsers.
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(morgan('dev'));

// Static uploads directory serving
app.use('/uploads', express.static(uploadsDir));

// Connect Databases
connectDB();
connectRedis();

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Welcome to the Scalable & Secure Social Media API Server',
    services: {
      redisCache: process.env.REDIS_URL ? 'caching-enabled' : 'fallback-memory',
      s3Storage: process.env.AWS_BUCKET_NAME ? 's3-enabled' : 'local-filesystem-fallback',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
