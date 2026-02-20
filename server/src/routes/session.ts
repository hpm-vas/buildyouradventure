/**
 * Session routes - Simple role selection (no auth)
 */

import { Router, Request, Response } from 'express';
import { SessionRequest, SessionResponse } from '../models';

// In-memory session store (for simplicity - role is primarily stored client-side)
const sessions: Map<string, { role: 'gamemaster' | 'player' }> = new Map();

export function createSessionRoutes(): Router {
  const router = Router();

  // POST /api/session - Set role
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { role } = req.body as SessionRequest;

      if (!role || !['gamemaster', 'player'].includes(role)) {
        return res.status(400).json({ error: 'Valid role (gamemaster or player) is required' });
      }

      // Use a simple session ID from header or generate one
      const sessionId = req.headers['x-session-id'] as string || 'default';
      sessions.set(sessionId, { role });

      const response: SessionResponse = { role };
      res.json(response);
    } catch (error) {
      console.error('Error setting role:', error);
      res.status(500).json({ error: 'Failed to set role' });
    }
  });

  // GET /api/session - Get current role
  router.get('/', async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'No session found' });
      }

      const response: SessionResponse = { role: session.role };
      res.json(response);
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  });

  // DELETE /api/session - Clear session
  router.delete('/', async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      sessions.delete(sessionId);
      res.status(204).send();
    } catch (error) {
      console.error('Error clearing session:', error);
      res.status(500).json({ error: 'Failed to clear session' });
    }
  });

  return router;
}
