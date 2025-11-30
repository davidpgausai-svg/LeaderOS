import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}
const SECRET = JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function setupAuth(app: Express) {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const existingUsers = await storage.getAllUsers();
      if (existingUsers.some((u: any) => u.email?.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const isFirstUser = existingUsers.length === 0;

      const user = await storage.upsertUser({
        email: email.toLowerCase(),
        firstName: firstName || null,
        lastName: lastName || null,
        role: isFirstUser ? 'administrator' : 'co_lead',
      });

      const sqliteStorage = storage as any;
      if (sqliteStorage.sqlite) {
        sqliteStorage.sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
      } else {
        const { sqlite } = await import('./sqlite');
        sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
      }

      const token = generateToken({ userId: user.id, email: user.email! });

      res.status(201).json({ 
        success: true, 
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }
      });
    } catch (error) {
      logger.error('Registration failed', error);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { sqlite } = await import('./sqlite');
      const row = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;

      if (!row) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!row.password_hash) {
        return res.status(401).json({ error: 'Account not set up for password login. Please contact administrator.' });
      }

      const isValid = await bcrypt.compare(password, row.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (row.role === 'sme') {
        return res.status(403).json({ error: 'SME users cannot log in. Please contact administrator.' });
      }

      const token = generateToken({ userId: row.id, email: row.email });

      res.json({
        token,
        user: {
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          role: row.role,
        }
      });
    } catch (error) {
      logger.error('Login failed', error);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      logger.error('Error fetching authenticated user', error);
      res.status(500).json({ message: 'Unable to load user information.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.user = {
    userId: payload.userId,
    email: payload.email,
    claims: { sub: payload.userId }
  };

  next();
};
