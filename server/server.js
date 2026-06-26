const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const translateRoutes = require('./routes/translate');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/translate', limiter);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: {
      deepl_key: process.env.DEEPL_API_KEY ? 'present' : 'missing',
      firebase_key: process.env.FIREBASE_PRIVATE_KEY ? 'present' : 'missing'
    }
  });
});

app.use('/translate', translateRoutes);

// Error Handling
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 WordSnap Backend running on http://localhost:${PORT}`);
  if (!process.env.DEEPL_API_KEY) {
    console.warn('⚠️ WARNING: DEEPL_API_KEY is missing in .env');
  }
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('⚠️ WARNING: FIREBASE credentials are missing in .env');
  }
});
