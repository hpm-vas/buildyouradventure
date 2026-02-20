"use strict";
/**
 * Choice routes - CRUD operations for choices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChoiceRoutes = createChoiceRoutes;
const express_1 = require("express");
function createChoiceRoutes(storage) {
    const router = (0, express_1.Router)();
    // PATCH /api/choices/:id - Update a choice
    router.patch('/:id', async (req, res) => {
        try {
            const choice = await storage.updateChoice(req.params.id, req.body);
            if (!choice) {
                return res.status(404).json({ error: 'Choice not found' });
            }
            res.json(choice);
        }
        catch (error) {
            console.error('Error updating choice:', error);
            res.status(500).json({ error: 'Failed to update choice' });
        }
    });
    // DELETE /api/choices/:id - Delete a choice
    router.delete('/:id', async (req, res) => {
        try {
            const deleted = await storage.deleteChoice(req.params.id);
            if (!deleted) {
                return res.status(404).json({ error: 'Choice not found' });
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting choice:', error);
            res.status(500).json({ error: 'Failed to delete choice' });
        }
    });
    return router;
}
//# sourceMappingURL=choices.js.map