import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { logger } from './logger';
import { getOrganizationByToken, updateOrganizationToken, getAllOrganizations, createOrganization, deleteOrganization, getUserByEmail, updateUserPassword } from './pgStorage';

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
  app.get('/api/auth/validate-registration-token/:token', async (req, res) => {
    const { token } = req.params;
    const org = await getOrganizationByToken(token);
    res.json({ valid: !!org, organizationName: org?.name || null });
  });

  app.post('/api/auth/register/:registrationToken', async (req, res) => {
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

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
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

      res.status(201).json({ 
        success: true, 
        token,
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
      logger.error('Registration failed', error);
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

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Use PostgreSQL for user lookup
      const user = await getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ error: 'Account not set up for password login. Please contact administrator.' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.role === 'sme') {
        return res.status(403).json({ error: 'SME users cannot log in. Please contact administrator.' });
      }

      const token = generateToken({ userId: user.id, email: user.email! });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          isSuperAdmin: user.isSuperAdmin === 'true',
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
