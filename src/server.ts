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

// Allowed Origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://decordesigns.online',
  'https://www.decordesigns.online',
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : []),
];

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an origin
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

// JSON Body Parser
app.use(
  express.json({
    limit: '20mb',
  })
);

// URL Encoded Body Parser
app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb',
  })
);

// Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static Uploads Directory
const uploadsDir = path.join(process.cwd(), 'uploads');

app.use(
  '/uploads',
  express.static(uploadsDir)
);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LUMIÈRE DECOR API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount Resource API Routes
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

// Global Error Handler
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(
      `✨ LUMIÈRE DECOR API Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
    );

    console.log(
      `🔗 API Base: http://localhost:${PORT}/api`
    );

    console.log(
      `🌐 Allowed Origins: ${allowedOrigins.join(', ')}`
    );
  });
}

export default app;