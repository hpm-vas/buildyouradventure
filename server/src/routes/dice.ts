/**
 * Dice rolling routes
 */

import { Router, Request, Response } from 'express';
import { FileStorageService } from '../storage/file-storage.service';
import { DiceRollRequest } from '../models';

export function createDiceRoutes(storage: FileStorageService): Router {
  const router = Router();

  // POST /api/dice/roll - Roll dice
  router.post('/roll', async (req: Request, res: Response) => {
    try {
      const request = req.body as DiceRollRequest;

      if (!request.diceType) {
        return res.status(400).json({ error: 'Dice type is required' });
      }
      if (!request.diceCount || request.diceCount < 1) {
        return res.status(400).json({ error: 'Dice count must be at least 1' });
      }

      const result = storage.rollDice(
        request.diceType,
        request.diceCount,
        request.modifier || 0,
        request.successThreshold
      );

      res.json(result);
    } catch (error) {
      console.error('Error rolling dice:', error);
      res.status(500).json({ error: 'Failed to roll dice' });
    }
  });

  return router;
}
