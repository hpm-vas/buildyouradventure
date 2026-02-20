/**
 * Card deck routes
 */

import { Router, Request, Response } from 'express';
import { FileStorageService } from '../storage/file-storage.service';

export function createCardDeckRoutes(storage: FileStorageService): Router {
  const router = Router();

  // GET /api/card-decks - List all card decks
  router.get('/', async (req: Request, res: Response) => {
    try {
      const storyId = req.query.storyId as string | undefined;
      const decks = await storage.getAllCardDecks(storyId);
      res.json(decks);
    } catch (error) {
      console.error('Error fetching card decks:', error);
      res.status(500).json({ error: 'Failed to fetch card decks' });
    }
  });

  // GET /api/card-decks/:id - Get a card deck
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const deck = await storage.getCardDeck(req.params.id);
      if (!deck) {
        return res.status(404).json({ error: 'Card deck not found' });
      }
      res.json(deck);
    } catch (error) {
      console.error('Error fetching card deck:', error);
      res.status(500).json({ error: 'Failed to fetch card deck' });
    }
  });

  // GET /api/card-decks/:id/cards - Get cards in a deck
  router.get('/:id/cards', async (req: Request, res: Response) => {
    try {
      const deck = await storage.getCardDeck(req.params.id);
      if (!deck) {
        return res.status(404).json({ error: 'Card deck not found' });
      }
      res.json(deck.cards);
    } catch (error) {
      console.error('Error fetching cards:', error);
      res.status(500).json({ error: 'Failed to fetch cards' });
    }
  });

  // POST /api/card-decks - Create a card deck
  router.post('/', async (req: Request, res: Response) => {
    try {
      if (!req.body.name) {
        return res.status(400).json({ error: 'Deck name is required' });
      }

      const deck = await storage.createCardDeck(req.body);
      res.status(201).json(deck);
    } catch (error) {
      console.error('Error creating card deck:', error);
      res.status(500).json({ error: 'Failed to create card deck' });
    }
  });

  return router;
}
