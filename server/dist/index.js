"use strict";
/**
 * Plot-smithy Backend Server
 * Express server with file-based storage (Obsidian-inspired)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const file_storage_service_1 = require("./storage/file-storage.service");
const stories_1 = require("./routes/stories");
const nodes_1 = require("./routes/nodes");
const choices_1 = require("./routes/choices");
const card_decks_1 = require("./routes/card-decks");
const dice_1 = require("./routes/dice");
const session_1 = require("./routes/session");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Data directory - can be configured via environment variable
const dataDir = process.env.DATA_DIR || path_1.default.join(process.cwd(), 'data');
// Initialize storage service
const storage = new file_storage_service_1.FileStorageService(dataDir);
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    credentials: true,
}));
app.use(express_1.default.json());
// Request logging
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});
// API Routes
app.use('/api/stories', (0, stories_1.createStoryRoutes)(storage));
app.use('/api/nodes', (0, nodes_1.createNodeRoutes)(storage));
app.use('/api/choices', (0, choices_1.createChoiceRoutes)(storage));
app.use('/api/card-decks', (0, card_decks_1.createCardDeckRoutes)(storage));
app.use('/api/dice', (0, dice_1.createDiceRoutes)(storage));
app.use('/api/session', (0, session_1.createSessionRoutes)());
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Export/Import endpoints
app.get('/api/export', async (_req, res) => {
    try {
        const stories = await storage.getAllStories();
        const decks = await storage.getAllCardDecks();
        const exportData = { stories: [], cardDecks: decks };
        for (const story of stories) {
            const nodes = await storage.getAllNodes(story.id);
            const events = await storage.getAllEvents(story.id);
            exportData.stories.push({ ...story, nodes, events });
        }
        res.json(exportData);
    }
    catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});
// Error handling
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
app.use((_req, res) => {
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
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map