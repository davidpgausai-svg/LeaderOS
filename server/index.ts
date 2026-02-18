import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { registerRoutes } from "./routes";
import { startDueDateScheduler } from "./scheduler";
import { validateCsrf } from "./jwtAuth";
import { logger } from "./logger";
import { runMigrations } from './migrate';
import fs from "fs";
import path from "path";

// Global API rate limiter - generous limits for normal use
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500, // 500 requests per 15 minutes per IP
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for auth endpoints (they have their own stricter limits)
    // Use originalUrl since middleware is mounted at /api
    const fullPath = req.originalUrl || req.path;
    return fullPath.startsWith('/api/auth/');
  },
  handler: (req, res, next, options) => {
    const fullPath = req.originalUrl || req.path;
    logger.warn(`[SECURITY] API rate limit exceeded from IP ${req.ip} for ${req.method} ${fullPath}`);
    res.status(429).json(options.message);
  },
});

// Stricter rate limiter for write operations (POST, PUT, PATCH, DELETE)
const writeOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 write operations per 15 minutes per IP
  message: { error: 'Too many write operations. Please slow down.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to write operations, skip auth endpoints
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    // Use originalUrl since middleware is mounted at /api
    const fullPath = req.originalUrl || req.path;
    const isAuthEndpoint = fullPath.startsWith('/api/auth/');
    return !isWriteOperation || isAuthEndpoint;
  },
  handler: (req, res, next, options) => {
    const fullPath = req.originalUrl || req.path;
    logger.warn(`[SECURITY] Write operation rate limit exceeded from IP ${req.ip} for ${req.method} ${fullPath}`);
    res.status(429).json(options.message);
  },
});

// AI endpoint rate limiter - expensive operations
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // 20 AI requests per minute per IP
  message: { error: 'Too many AI requests. Please wait a moment before trying again.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`[SECURITY] AI rate limit exceeded from IP ${req.ip}`);
    res.status(429).json(options.message);
  },
});

const app = express();

// Trust proxy - necessary for rate limiting behind reverse proxy (Replit)
app.set('trust proxy', 1);

// Cookie parser for HTTP-only auth cookies
app.use(cookieParser());

// Apply rate limiters to API routes
app.use('/api', apiLimiter);
app.use('/api', writeOperationLimiter);
app.use('/api/ai', aiLimiter);

// CSRF validation for all API routes (applied before routes are registered)
app.use('/api', validateCsrf);

// Simple log function for production (doesn't need vite)
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Security headers
app.use((req, res, next) => {
  // Content Security Policy - stricter for production
  const isProduction = process.env.NODE_ENV === 'production';
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: Allow inline for React, eval for dev hot reload
    isProduction 
      ? "script-src 'self' 'unsafe-inline'" 
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // Allow database and API connections
    "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com",
    "frame-src https://www.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy - restrict sensitive browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // Only use HSTS in production
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Production static file serving (doesn't need vite)
function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

(async () => {
  try {
  // Run SQLite migrations via Drizzle
  runMigrations();

  // Ensure a default organization exists (creates one if DB is empty)
  const { ensureDefaultOrganization, getAllOrganizations } = await import('./pgStorage');
  await ensureDefaultOrganization();
  
  const { storage: storageInstance } = await import('./storage');
  const allUsers = await storageInstance.getAllUsers();
  const allOrgs = await getAllOrganizations();
  console.log(`[STARTUP] Found ${allUsers.length} users and ${allOrgs.length} organizations in database`);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const viteMod = "./vite";
    const { setupVite } = await import(viteMod);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the due date notification scheduler
  // Check every hour for actions that are due soon or overdue
  startDueDateScheduler(60);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });

  } catch (err) {
    console.error('[FATAL] Server failed to start:', err);
    process.exit(1);
  }
})();
