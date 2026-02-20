/**
 * Story routes - CRUD operations for stories
 */

import { Router, Request, Response } from 'express';
import { FileStorageService } from '../storage/file-storage.service';
import { CreateStoryRequest } from '../models';

export function createStoryRoutes(storage: FileStorageService): Router {
  const router = Router();

  // GET /api/stories - List all stories
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const stories = await storage.getAllStories();
      res.json(stories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      res.status(500).json({ error: 'Failed to fetch stories' });
    }
  });

  // GET /api/stories/:id - Get a single story
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const story = await storage.getStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(story);
    } catch (error) {
      console.error('Error fetching story:', error);
      res.status(500).json({ error: 'Failed to fetch story' });
    }
  });

  // POST /api/stories - Create a new story with start node
  router.post('/', async (req: Request, res: Response) => {
    try {
      const request = req.body as CreateStoryRequest;
      
      if (!request.name) {
        return res.status(400).json({ error: 'Story name is required' });
      }
      if (!request.startNode?.text) {
        return res.status(400).json({ error: 'Start node text is required' });
      }

      const story = await storage.createStory(request);
      res.status(201).json(story);
    } catch (error) {
      console.error('Error creating story:', error);
      res.status(500).json({ error: 'Failed to create story' });
    }
  });

  // PATCH /api/stories/:id - Update a story
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const story = await storage.updateStory(req.params.id, req.body);
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(story);
    } catch (error) {
      console.error('Error updating story:', error);
      res.status(500).json({ error: 'Failed to update story' });
    }
  });

  // DELETE /api/stories/:id - Delete a story
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteStory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting story:', error);
      if (error.message?.includes('multiple nodes')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete story' });
    }
  });

  // GET /api/stories/:storyId/nodes - List all nodes in a story
  router.get('/:storyId/nodes', async (req: Request, res: Response) => {
    try {
      const nodes = await storage.getAllNodes(req.params.storyId);
      res.json(nodes);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      res.status(500).json({ error: 'Failed to fetch nodes' });
    }
  });

  // GET /api/stories/:storyId/nodes/start - Get start node
  router.get('/:storyId/nodes/start', async (req: Request, res: Response) => {
    try {
      const node = await storage.getStartNode(req.params.storyId);
      if (!node) {
        return res.status(404).json({ error: 'Start node not found' });
      }
      res.json(node);
    } catch (error) {
      console.error('Error fetching start node:', error);
      res.status(500).json({ error: 'Failed to fetch start node' });
    }
  });

  // GET /api/stories/:storyId/nodes/by-key/:nodeKey - Get node by key
  router.get('/:storyId/nodes/by-key/:nodeKey', async (req: Request, res: Response) => {
    try {
      const node = await storage.getNodeByKey(req.params.storyId, req.params.nodeKey);
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.json(node);
    } catch (error) {
      console.error('Error fetching node:', error);
      res.status(500).json({ error: 'Failed to fetch node' });
    }
  });

  // POST /api/stories/:storyId/nodes - Create a node
  router.post('/:storyId/nodes', async (req: Request, res: Response) => {
    try {
      if (!req.body.nodeKey) {
        return res.status(400).json({ error: 'Node key is required' });
      }
      if (!req.body.text) {
        return res.status(400).json({ error: 'Node text is required' });
      }

      const node = await storage.createNode(req.params.storyId, req.body);
      res.status(201).json(node);
    } catch (error) {
      console.error('Error creating node:', error);
      res.status(500).json({ error: 'Failed to create node' });
    }
  });

  // GET /api/stories/:storyId/choices - Get all choices in a story
  router.get('/:storyId/choices', async (req: Request, res: Response) => {
    try {
      const choices = await storage.getChoicesForStory(req.params.storyId);
      res.json(choices);
    } catch (error) {
      console.error('Error fetching choices:', error);
      res.status(500).json({ error: 'Failed to fetch choices' });
    }
  });

  // GET /api/stories/:storyId/events - Get all events for a story
  router.get('/:storyId/events', async (req: Request, res: Response) => {
    try {
      const events = await storage.getAllEvents(req.params.storyId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // GET /api/stories/:storyId/events/last - Get last event
  router.get('/:storyId/events/last', async (req: Request, res: Response) => {
    try {
      const event = await storage.getLastEvent(req.params.storyId);
      if (!event) {
        return res.status(404).json({ error: 'No events found' });
      }
      res.json(event);
    } catch (error) {
      console.error('Error fetching last event:', error);
      res.status(500).json({ error: 'Failed to fetch last event' });
    }
  });

  // POST /api/stories/:storyId/events - Create an event
  router.post('/:storyId/events', async (req: Request, res: Response) => {
    try {
      if (!req.body.nodeKey) {
        return res.status(400).json({ error: 'Node key is required' });
      }

      const userId = req.body.userId || 'player'; // Default user
      const event = await storage.createEvent(req.params.storyId, userId, req.body);
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // DELETE /api/stories/:storyId/events - Clear all events
  router.delete('/:storyId/events', async (req: Request, res: Response) => {
    try {
      await storage.clearEvents(req.params.storyId);
      res.status(204).send();
    } catch (error) {
      console.error('Error clearing events:', error);
      res.status(500).json({ error: 'Failed to clear events' });
    }
  });

  return router;
}
