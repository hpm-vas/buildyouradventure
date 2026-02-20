"use strict";
/**
 * Dice rolling routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDiceRoutes = createDiceRoutes;
const express_1 = require("express");
function createDiceRoutes(storage) {
    const router = (0, express_1.Router)();
    // POST /api/dice/roll - Roll dice
    router.post('/roll', async (req, res) => {
        try {
            const request = req.body;
            if (!request.diceType) {
                return res.status(400).json({ error: 'Dice type is required' });
            }
            if (!request.diceCount || request.diceCount < 1) {
                return res.status(400).json({ error: 'Dice count must be at least 1' });
            }
            const result = storage.rollDice(request.diceType, request.diceCount, request.modifier || 0, request.successThreshold);
            res.json(result);
        }
        catch (error) {
            console.error('Error rolling dice:', error);
            res.status(500).json({ error: 'Failed to roll dice' });
        }
    });
    return router;
}
//# sourceMappingURL=dice.js.map