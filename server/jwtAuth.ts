import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Express, RequestHandler, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { storage } from './storage';
import { logger } from './logger';
import { getOrganization, getOrganizationByToken, updateOrganizationToken, getAllOrganizations, createOrganization, deleteOrganization, getUserByEmail, updateUserPassword, createPasswordResetToken, getPasswordResetToken, markPasswordResetTokenUsed } from './pgStorage';
import { sendPasswordResetEmail } from './email';
import crypto from 'crypto';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`[SECURITY] Rate limit exceeded for auth endpoint from IP ${req.ip}`);
    res.status(429).json(options.message);
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`[SECURITY] Rate limit exceeded for password reset from IP ${req.ip}`);
    res.status(429).json(options.message);
  },
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}
const SECRET = JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'auth_token';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function validatePasswordComplexity(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)' };
  }
  return { valid: true };
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

function setCsrfCookie(res: Response, csrfToken: string) {
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

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
  app.get('/api/auth/validate-registration-token/:token', async (req, res) => {
    const { token } = req.params;
    const org = await getOrganizationByToken(token);
    res.json({ valid: !!org, organizationName: org?.name || null });
  });

  app.post('/api/auth/register/:registrationToken', authLimiter, async (req, res) => {
    try {
      const { registrationToken } = req.params;
      const { email, password, firstName, lastName } = req.body;

      const org = await getOrganizationByToken(registrationToken);
      if (!org) {
        return res.status(403).json({ error: 'Invalid or expired registration link. Please contact your administrator for a new link.' });
      }

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      const passwordValidation = validatePasswordComplexity(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }

      const existingUsers = await storage.getAllUsers();
      if (existingUsers.some((u: any) => u.email?.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Check if this is the first user in this organization
      const orgUsers = existingUsers.filter((u: any) => u.organizationId === org.id);
      const isFirstUserInOrg = orgUsers.length === 0;
      
      // Check if this is the very first user (Super Admin)
      const isFirstUserEver = existingUsers.length === 0;

      const user = await storage.upsertUser({
        email: email.toLowerCase(),
        firstName: firstName || null,
        lastName: lastName || null,
        role: isFirstUserInOrg ? 'administrator' : 'co_lead',
        organizationId: org.id,
        isSuperAdmin: isFirstUserEver ? 'true' : 'false',
      });

      // Store password hash in PostgreSQL
      await updateUserPassword(user.id, passwordHash);

      const token = generateToken({ userId: user.id, email: user.email! });
      const csrfToken = generateCsrfToken();
      setAuthCookie(res, token);
      setCsrfCookie(res, csrfToken);

      logger.info(`[SECURITY] New user registration: user ${user.id} (${user.email}) in org ${org.id}, role: ${user.role}`);

      res.status(201).json({ 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: org.id,
          organizationName: org.name,
        }
      });
    } catch (error) {
      logger.error('[SECURITY] Registration failed', error);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  // Get registration token for current user's organization
  app.get('/api/admin/registration-token', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ error: 'Only administrators can view the registration token' });
      }

      if (!user.organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      const orgs = await getAllOrganizations();
      const org = orgs.find(o => o.id === user.organizationId);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json({ token: org.registrationToken, organizationName: org.name });
    } catch (error) {
      logger.error('Error fetching registration token', error);
      res.status(500).json({ error: 'Failed to fetch registration token' });
    }
  });

  // Rotate registration token for current user's organization
  app.post('/api/admin/registration-token/rotate', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ error: 'Only administrators can rotate the registration token' });
      }

      if (!user.organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      const updatedOrg = await updateOrganizationToken(user.organizationId);
      logger.info(`Registration token rotated for org ${user.organizationId} by user ${req.user.userId}`);
      res.json({ token: updatedOrg?.registrationToken, message: 'Registration token rotated successfully' });
    } catch (error) {
      logger.error('Error rotating registration token', error);
      res.status(500).json({ error: 'Failed to rotate registration token' });
    }
  });

  // Super Admin: Get all organizations
  app.get('/api/super-admin/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.isSuperAdmin !== 'true') {
        return res.status(403).json({ error: 'Only super administrators can view all organizations' });
      }

      const orgs = await getAllOrganizations();
      res.json(orgs);
    } catch (error) {
      logger.error('Error fetching organizations', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // Super Admin: Create new organization
  app.post('/api/super-admin/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.isSuperAdmin !== 'true') {
        return res.status(403).json({ error: 'Only super administrators can create organizations' });
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      const org = await createOrganization(name.trim());
      logger.info(`Organization ${org.name} created by super admin ${req.user.userId}`);
      res.status(201).json(org);
    } catch (error) {
      logger.error('Error creating organization', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  // Super Admin: Delete organization
  app.delete('/api/super-admin/organizations/:orgId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.isSuperAdmin !== 'true') {
        return res.status(403).json({ error: 'Only super administrators can delete organizations' });
      }

      const { orgId } = req.params;
      await deleteOrganization(orgId);
      logger.info(`Organization ${orgId} deleted by super admin ${req.user.userId}`);
      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      logger.error('Error deleting organization', error);
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  });

  // Super Admin: Rotate token for any organization
  app.post('/api/super-admin/organizations/:orgId/rotate-token', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.isSuperAdmin !== 'true') {
        return res.status(403).json({ error: 'Only super administrators can rotate organization tokens' });
      }

      const { orgId } = req.params;
      const updatedOrg = await updateOrganizationToken(orgId);
      logger.info(`Registration token for org ${orgId} rotated by super admin ${req.user.userId}`);
      res.json({ token: updatedOrg?.registrationToken, message: 'Registration token rotated successfully' });
    } catch (error) {
      logger.error('Error rotating organization token', error);
      res.status(500).json({ error: 'Failed to rotate organization token' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Use PostgreSQL for user lookup
      const user = await getUserByEmail(email);

      if (!user) {
        logger.warn(`[SECURITY] Failed login attempt: user not found for email ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.passwordHash) {
        logger.warn(`[SECURITY] Failed login attempt: no password hash for user ${user.id} (${email})`);
        return res.status(401).json({ error: 'Account not set up for password login. Please contact administrator.' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        logger.warn(`[SECURITY] Failed login attempt: invalid password for user ${user.id} (${email})`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.role === 'sme') {
        logger.warn(`[SECURITY] Blocked SME user login attempt: user ${user.id} (${email})`);
        return res.status(403).json({ error: 'SME users cannot log in. Please contact administrator.' });
      }

      const token = generateToken({ userId: user.id, email: user.email! });
      const csrfToken = generateCsrfToken();
      setAuthCookie(res, token);
      setCsrfCookie(res, csrfToken);

      // Fetch organization name if user has an organization
      let organizationName: string | null = null;
      if (user.organizationId) {
        const organization = await getOrganization(user.organizationId);
        organizationName = organization?.name || null;
      }

      logger.info(`[SECURITY] Successful login: user ${user.id} (${user.email})`);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          isSuperAdmin: user.isSuperAdmin === 'true',
          organizationName,
        }
      });
    } catch (error) {
      logger.error('[SECURITY] Login error', error);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  });

  // Password Reset: Request a reset link
  app.post('/api/auth/request-password-reset', passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await getUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      // But only send email if user exists
      if (user && user.role !== 'sme') {
        // Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Token expires in 30 minutes
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        await createPasswordResetToken(user.id, tokenHash, expiresAt);
        
        // Send the email with the plain token (we store the hash)
        const emailSent = await sendPasswordResetEmail(user.email!, resetToken, user.firstName);
        
        if (!emailSent) {
          logger.error(`Failed to send password reset email to ${email}`);
        } else {
          logger.info(`Password reset email sent to ${email}`);
        }
      } else {
        logger.info(`Password reset requested for non-existent or SME user: ${email}`);
      }

      // Always return success to prevent email enumeration
      res.json({ 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset link shortly.' 
      });
    } catch (error) {
      logger.error('Password reset request failed', error);
      res.status(500).json({ error: 'Unable to process password reset request. Please try again.' });
    }
  });

  // Password Reset: Reset password with token
  app.post('/api/auth/reset-password', passwordResetLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      const passwordValidation = validatePasswordComplexity(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }

      // Hash the provided token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const resetToken = await getPasswordResetToken(tokenHash);
      
      if (!resetToken) {
        logger.warn(`[SECURITY] Password reset failed: invalid token hash`);
        return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        logger.warn(`[SECURITY] Password reset failed: expired token for user ${resetToken.userId}`);
        return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      }

      // Check if token was already used
      if (resetToken.usedAt) {
        logger.warn(`[SECURITY] Password reset failed: already used token for user ${resetToken.userId}`);
        return res.status(400).json({ error: 'This reset link has already been used. Please request a new one.' });
      }

      // Update the user's password
      const passwordHash = await bcrypt.hash(password, 10);
      await updateUserPassword(resetToken.userId, passwordHash);
      
      // Mark token as used
      await markPasswordResetTokenUsed(resetToken.id);

      logger.info(`[SECURITY] Password reset successful for user ${resetToken.userId}`);

      res.json({ 
        success: true, 
        message: 'Password has been reset successfully. You can now log in with your new password.' 
      });
    } catch (error) {
      logger.error('Password reset failed', error);
      res.status(500).json({ error: 'Unable to reset password. Please try again.' });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Fetch organization name if user has an organization
      let organizationName: string | null = null;
      if (user.organizationId) {
        const organization = await getOrganization(user.organizationId);
        organizationName = organization?.name || null;
      }
      
      res.json({
        ...user,
        organizationName
      });
    } catch (error) {
      logger.error('Error fetching authenticated user', error);
      res.status(500).json({ message: 'Unable to load user information.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // First try to get token from HTTP-only cookie (preferred)
  let token = req.cookies?.[COOKIE_NAME];
  
  // Fallback to Authorization header for backward compatibility during migration
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

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

export const validateCsrf: RequestHandler = (req: any, res, next) => {
  const method = req.method.toUpperCase();
  
  // Only validate CSRF for state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }
  
  // Skip CSRF for auth endpoints (login, register, password reset) as they don't have tokens yet
  // Use originalUrl to get the full path since middleware may be mounted at a sub-path
  const fullPath = req.originalUrl || req.path;
  if (fullPath.startsWith('/api/auth/')) {
    return next();
  }
  
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.headers[CSRF_HEADER_NAME];
  
  if (!csrfCookie || !csrfHeader) {
    logger.warn(`[SECURITY] CSRF validation failed: missing token for ${method} ${fullPath}`);
    return res.status(403).json({ message: 'CSRF token missing' });
  }
  
  if (csrfCookie !== csrfHeader) {
    logger.warn(`[SECURITY] CSRF validation failed: token mismatch for ${method} ${fullPath}`);
    return res.status(403).json({ message: 'CSRF token invalid' });
  }
  
  next();
};
