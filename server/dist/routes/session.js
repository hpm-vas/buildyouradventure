"use strict";
/**
 * Session routes - Simple role selection (no auth)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionRoutes = createSessionRoutes;
const express_1 = require("express");
// In-memory session store (for simplicity - role is primarily stored client-side)
const sessions = new Map();
function createSessionRoutes() {
    const router = (0, express_1.Router)();
    // POST /api/session - Set role
    router.post('/', async (req, res) => {
        try {
            const { role } = req.body;
            if (!role || !['gamemaster', 'player'].includes(role)) {
                return res.status(400).json({ error: 'Valid role (gamemaster or player) is required' });
            }
            // Use a simple session ID from header or generate one
            const sessionId = req.headers['x-session-id'] || 'default';
            sessions.set(sessionId, { role });
            const response = { role };
            res.json(response);
        }
        catch (error) {
            console.error('Error setting role:', error);
            res.status(500).json({ error: 'Failed to set role' });
        }
    });
    // GET /api/session - Get current role
    router.get('/', async (req, res) => {
        try {
            const sessionId = req.headers['x-session-id'] || 'default';
            const session = sessions.get(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'No session found' });
            }
            const response = { role: session.role };
            res.json(response);
        }
        catch (error) {
            console.error('Error getting session:', error);
            res.status(500).json({ error: 'Failed to get session' });
        }
    });
    // DELETE /api/session - Clear session
    router.delete('/', async (req, res) => {
        try {
            const sessionId = req.headers['x-session-id'] || 'default';
            sessions.delete(sessionId);
            res.status(204).send();
        }
        catch (error) {
            console.error('Error clearing session:', error);
            res.status(500).json({ error: 'Failed to clear session' });
        }
    });
    return router;
}
//# sourceMappingURL=session.js.map