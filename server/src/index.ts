/**
 * Plot-smithy Backend Server
 * Express server with file-based storage (Obsidian-inspired)
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { FileStorageService } from './storage/file-storage.service';
import { createStoryRoutes } from './routes/stories';
import { createNodeRoutes } from './routes/nodes';
import { createChoiceRoutes } from './routes/choices';
import { createCardDeckRoutes } from './routes/card-decks';
import { createDiceRoutes } from './routes/dice';
import { createSessionRoutes } from './routes/session';

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory - can be configured via environment variable
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Initialize storage service
const storage = new FileStorageService(dataDir);

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/stories', createStoryRoutes(storage));
app.use('/api/nodes', createNodeRoutes(storage));
app.use('/api/choices', createChoiceRoutes(storage));
app.use('/api/card-decks', createCardDeckRoutes(storage));
app.use('/api/dice', createDiceRoutes(storage));
app.use('/api/session', createSessionRoutes());

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export/Import endpoints
app.get('/api/export', async (_req: Request, res: Response) => {
  try {
    const stories = await storage.getAllStories();
    const decks = await storage.getAllCardDecks();
    
    const exportData: any = { stories: [], cardDecks: decks };
    
    for (const story of stories) {
      const nodes = await storage.getAllNodes(story.id);
      const events = await storage.getAllEvents(story.id);
      exportData.stories.push({ ...story, nodes, events });
    }
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  try {
    // Seed default data (emotion deck)
    await storage.seedDefaultData();

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                  Plot-smithy Server                       ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}               ║
║  Data directory:    ${dataDir}
║                                                           ║
║  API Endpoints:                                           ║
║    GET  /api/health          - Health check               ║
║    GET  /api/stories         - List stories               ║
║    POST /api/stories         - Create story               ║
║    GET  /api/card-decks      - List card decks            ║
║    POST /api/dice/roll       - Roll dice                  ║
║    GET  /api/session         - Get session                ║
║    POST /api/session         - Set role                   ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
