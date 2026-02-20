/**
 * Node routes - CRUD operations for story nodes
 */

import { Router, Request, Response } from 'express';
import { FileStorageService } from '../storage/file-storage.service';

export function createNodeRoutes(storage: FileStorageService): Router {
  const router = Router();

  // GET /api/nodes/:id - Get a node by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const node = await storage.getNodeById(req.params.id);
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.json(node);
    } catch (error) {
      console.error('Error fetching node:', error);
      res.status(500).json({ error: 'Failed to fetch node' });
    }
  });

  // PATCH /api/nodes/:id - Update a node
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const node = await storage.updateNode(req.params.id, req.body);
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.json(node);
    } catch (error: any) {
      console.error('Error updating node:', error);
      if (error.message?.includes('start node')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update node' });
    }
  });

  // DELETE /api/nodes/:id - Delete a node
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteNode(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting node:', error);
      if (error.message?.includes('start node')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete node' });
    }
  });

  // PATCH /api/nodes/:id/set-start - Set node as start
  router.patch('/:id/set-start', async (req: Request, res: Response) => {
    try {
      const node = await storage.setStartNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.json(node);
    } catch (error) {
      console.error('Error setting start node:', error);
      res.status(500).json({ error: 'Failed to set start node' });
    }
  });

  // GET /api/nodes/:nodeId/choices - Get choices for a node
  router.get('/:nodeId/choices', async (req: Request, res: Response) => {
    try {
      const choices = await storage.getChoicesForNode(req.params.nodeId);
      res.json(choices);
    } catch (error) {
      console.error('Error fetching choices:', error);
      res.status(500).json({ error: 'Failed to fetch choices' });
    }
  });

  // POST /api/nodes/:nodeId/choices - Add a choice to a node
  router.post('/:nodeId/choices', async (req: Request, res: Response) => {
    try {
      if (!req.body.text) {
        return res.status(400).json({ error: 'Choice text is required' });
      }
      if (!req.body.nextNode) {
        return res.status(400).json({ error: 'Next node is required' });
      }

      const choice = await storage.createChoice(req.params.nodeId, req.body);
      res.status(201).json(choice);
    } catch (error: any) {
      console.error('Error creating choice:', error);
      if (error.message?.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create choice' });
    }
  });

  return router;
}
