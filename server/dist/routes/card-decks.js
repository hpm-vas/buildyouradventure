"use strict";
/**
 * Card deck routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCardDeckRoutes = createCardDeckRoutes;
const express_1 = require("express");
function createCardDeckRoutes(storage) {
    const router = (0, express_1.Router)();
    // GET /api/card-decks - List all card decks
    router.get('/', async (req, res) => {
        try {
            const storyId = req.query.storyId;
            const decks = await storage.getAllCardDecks(storyId);
            res.json(decks);
        }
        catch (error) {
            console.error('Error fetching card decks:', error);
            res.status(500).json({ error: 'Failed to fetch card decks' });
        }
    });
    // GET /api/card-decks/:id - Get a card deck
    router.get('/:id', async (req, res) => {
        try {
            const deck = await storage.getCardDeck(req.params.id);
            if (!deck) {
                return res.status(404).json({ error: 'Card deck not found' });
            }
            res.json(deck);
        }
        catch (error) {
            console.error('Error fetching card deck:', error);
            res.status(500).json({ error: 'Failed to fetch card deck' });
        }
    });
    // GET /api/card-decks/:id/cards - Get cards in a deck
    router.get('/:id/cards', async (req, res) => {
        try {
            const deck = await storage.getCardDeck(req.params.id);
            if (!deck) {
                return res.status(404).json({ error: 'Card deck not found' });
            }
            res.json(deck.cards);
        }
        catch (error) {
            console.error('Error fetching cards:', error);
            res.status(500).json({ error: 'Failed to fetch cards' });
        }
    });
    // POST /api/card-decks - Create a card deck
    router.post('/', async (req, res) => {
        try {
            if (!req.body.name) {
                return res.status(400).json({ error: 'Deck name is required' });
            }
            const deck = await storage.createCardDeck(req.body);
            res.status(201).json(deck);
        }
        catch (error) {
            console.error('Error creating card deck:', error);
            res.status(500).json({ error: 'Failed to create card deck' });
        }
    });
    return router;
}
//# sourceMappingURL=card-decks.js.map