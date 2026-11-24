import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { cookieParser } from './utils/cookies.js';
import apiRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable trusted proxy for ngrok HTTPS reverse proxy tunnels
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false // Allows flex for SPA frontend assets & external icons/styles
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching allowed origins
      if (!origin || origin === env.FRONTEND_URL || origin === 'http://localhost:5173') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/ngrok tunnels
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
  })
);

// Body parsing with request size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser);

// Structured request logging
if (env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Mount API routes at /api
app.use('/api', apiRoutes);

// Single-Port Production Mode: Serve Frontend Build if present
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  // Client-side routing fallback (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    if (req.method === 'GET') {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    return next();
  });
}

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
