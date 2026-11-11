import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, config.jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Please log in' });
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }
    if (role && req.user.role !== role) return res.status(403).json({ error: 'Not allowed for this account' });
    next();
  };
}

/** Error with an HTTP status, thrown from route handlers. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wrap async handlers so thrown errors reach the error middleware. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
