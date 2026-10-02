import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import rentalRoutes from './routes/rentalRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import activityLogRoutes from './routes/activityLogRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ======================================================
// CORS CONFIGURATION
// ======================================================

const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean)
  : [];

const defaultOrigins = [
  'https://decordesigns.online',
  'https://www.decordesigns.online',
  'http://decordesigns.online',
  'http://www.decordesigns.online',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*decordesigns\.online(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+.*\.vercel\.app$/.test(origin)) return true;
  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Request blocked from unauthorized origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Range',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Apply CORS before other middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ======================================================
// SECURITY
// ======================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// ======================================================
// BODY PARSER
// ======================================================

app.use(
  express.json({
    limit: '20mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb',
  })
);

// ======================================================
// LOGGER
// ======================================================

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ======================================================
// STATIC UPLOADS
// ======================================================

const uploadsDir = path.join(process.cwd(), 'uploads');

app.use(
  '/uploads',
  express.static(uploadsDir)
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'LUMIÈRE DECOR API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ======================================================
// API ROUTES
// ======================================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/upload', uploadRoutes);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(errorHandler);

// ======================================================
// START SERVER
// ======================================================

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('==========================================');
    console.log('✨ LUMIÈRE DECOR API');
    console.log('==========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
    console.log('==========================================');
    console.log('Allowed CORS Origins:');
    console.log(allowedOrigins);
    console.log('==========================================');
  });
}

export default app;