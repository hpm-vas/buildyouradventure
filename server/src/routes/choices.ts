/**
 * Choice routes - CRUD operations for choices
 */

import { Router, Request, Response } from 'express';
import { FileStorageService } from '../storage/file-storage.service';

export function createChoiceRoutes(storage: FileStorageService): Router {
  const router = Router();

  // PATCH /api/choices/:id - Update a choice
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const choice = await storage.updateChoice(req.params.id, req.body);
      if (!choice) {
        return res.status(404).json({ error: 'Choice not found' });
      }
      res.json(choice);
    } catch (error) {
      console.error('Error updating choice:', error);
      res.status(500).json({ error: 'Failed to update choice' });
    }
  });

  // DELETE /api/choices/:id - Delete a choice
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteChoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Choice not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting choice:', error);
      res.status(500).json({ error: 'Failed to delete choice' });
    }
  });

  return router;
}
