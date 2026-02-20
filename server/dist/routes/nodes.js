"use strict";
/**
 * Node routes - CRUD operations for story nodes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeRoutes = createNodeRoutes;
const express_1 = require("express");
function createNodeRoutes(storage) {
    const router = (0, express_1.Router)();
    // GET /api/nodes/:id - Get a node by ID
    router.get('/:id', async (req, res) => {
        try {
            const node = await storage.getNodeById(req.params.id);
            if (!node) {
                return res.status(404).json({ error: 'Node not found' });
            }
            res.json(node);
        }
        catch (error) {
            console.error('Error fetching node:', error);
            res.status(500).json({ error: 'Failed to fetch node' });
        }
    });
    // PATCH /api/nodes/:id - Update a node
    router.patch('/:id', async (req, res) => {
        try {
            const node = await storage.updateNode(req.params.id, req.body);
            if (!node) {
                return res.status(404).json({ error: 'Node not found' });
            }
            res.json(node);
        }
        catch (error) {
            console.error('Error updating node:', error);
            if (error.message?.includes('start node')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to update node' });
        }
    });
    // DELETE /api/nodes/:id - Delete a node
    router.delete('/:id', async (req, res) => {
        try {
            const deleted = await storage.deleteNode(req.params.id);
            if (!deleted) {
                return res.status(404).json({ error: 'Node not found' });
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting node:', error);
            if (error.message?.includes('start node')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to delete node' });
        }
    });
    // PATCH /api/nodes/:id/set-start - Set node as start
    router.patch('/:id/set-start', async (req, res) => {
        try {
            const node = await storage.setStartNode(req.params.id);
            if (!node) {
                return res.status(404).json({ error: 'Node not found' });
            }
            res.json(node);
        }
        catch (error) {
            console.error('Error setting start node:', error);
            res.status(500).json({ error: 'Failed to set start node' });
        }
    });
    // GET /api/nodes/:nodeId/choices - Get choices for a node
    router.get('/:nodeId/choices', async (req, res) => {
        try {
            const choices = await storage.getChoicesForNode(req.params.nodeId);
            res.json(choices);
        }
        catch (error) {
            console.error('Error fetching choices:', error);
            res.status(500).json({ error: 'Failed to fetch choices' });
        }
    });
    // POST /api/nodes/:nodeId/choices - Add a choice to a node
    router.post('/:nodeId/choices', async (req, res) => {
        try {
            if (!req.body.text) {
                return res.status(400).json({ error: 'Choice text is required' });
            }
            if (!req.body.nextNode) {
                return res.status(400).json({ error: 'Next node is required' });
            }
            const choice = await storage.createChoice(req.params.nodeId, req.body);
            res.status(201).json(choice);
        }
        catch (error) {
            console.error('Error creating choice:', error);
            if (error.message?.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to create choice' });
        }
    });
    return router;
}
//# sourceMappingURL=nodes.js.map