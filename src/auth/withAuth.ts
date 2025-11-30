import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const withAuth: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};
