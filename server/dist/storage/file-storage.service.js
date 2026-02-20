"use strict";
/**
 * File-based storage service for Plot-smithy
 * Implements Obsidian-inspired directory structure with YAML frontmatter
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const uuid_1 = require("uuid");
class FileStorageService {
    dataDir;
    constructor(dataDir = path.join(process.cwd(), 'data')) {
        this.dataDir = dataDir;
        this.ensureDirectories();
    }
    ensureDirectories() {
        const dirs = [
            this.dataDir,
            path.join(this.dataDir, 'stories'),
            path.join(this.dataDir, 'card-decks'),
            path.join(this.dataDir, 'config'),
        ];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    // ========================
    // Stories
    // ========================
    getStoryDir(storyId) {
        return path.join(this.dataDir, 'stories', storyId);
    }
    getStoryMetaPath(storyId) {
        return path.join(this.getStoryDir(storyId), '_story.json');
    }
    async getAllStories() {
        const storiesDir = path.join(this.dataDir, 'stories');
        if (!fs.existsSync(storiesDir))
            return [];
        const storyIds = fs.readdirSync(storiesDir).filter(name => {
            const storyPath = path.join(storiesDir, name);
            return fs.statSync(storyPath).isDirectory();
        });
        const stories = [];
        for (const id of storyIds) {
            const story = await this.getStory(id);
            if (story)
                stories.push(story);
        }
        return stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    async getStory(storyId) {
        const metaPath = this.getStoryMetaPath(storyId);
        if (!fs.existsSync(metaPath))
            return null;
        const content = fs.readFileSync(metaPath, 'utf-8');
        return JSON.parse(content);
    }
    async createStory(request) {
        const storyId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const story = {
            id: storyId,
            name: request.name,
            description: request.description,
            ownerId: 'gamemaster', // Default owner
            isPublished: false,
            createdAt: now,
            updatedAt: now,
        };
        // Create story directory structure
        const storyDir = this.getStoryDir(storyId);
        fs.mkdirSync(storyDir, { recursive: true });
        fs.mkdirSync(path.join(storyDir, 'nodes'), { recursive: true });
        fs.mkdirSync(path.join(storyDir, 'events'), { recursive: true });
        // Save story metadata
        fs.writeFileSync(this.getStoryMetaPath(storyId), JSON.stringify(story, null, 2));
        // Create the start node
        const startNode = {
            id: (0, uuid_1.v4)(),
            storyId: storyId,
            nodeKey: 'start',
            title: request.startNode.title,
            text: request.startNode.text,
            interactionType: request.startNode.interactionType,
            choices: (request.startNode.choices || []).map(c => ({
                ...c,
                id: (0, uuid_1.v4)(),
            })),
            cardDeckId: request.startNode.cardDeckId,
            diceConfig: request.startNode.diceConfig,
            media: request.startNode.media,
            isStart: true,
        };
        await this.saveNode(startNode);
        // Auto-create placeholder nodes for choices
        for (const choice of startNode.choices) {
            if (choice.nextNode && choice.nextNode !== 'start') {
                const existingNode = await this.getNodeByKey(storyId, choice.nextNode);
                if (!existingNode) {
                    await this.createPlaceholderNode(storyId, choice.nextNode);
                }
            }
        }
        return story;
    }
    async updateStory(storyId, updates) {
        const story = await this.getStory(storyId);
        if (!story)
            return null;
        const updated = {
            ...story,
            ...updates,
            id: storyId, // Prevent ID change
            updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(this.getStoryMetaPath(storyId), JSON.stringify(updated, null, 2));
        return updated;
    }
    async deleteStory(storyId) {
        const storyDir = this.getStoryDir(storyId);
        if (!fs.existsSync(storyDir))
            return false;
        // Check if story has only the start node
        const nodes = await this.getAllNodes(storyId);
        if (nodes.length > 1) {
            throw new Error('Cannot delete story with multiple nodes');
        }
        fs.rmSync(storyDir, { recursive: true, force: true });
        return true;
    }
    // ========================
    // Story Nodes
    // ========================
    getNodePath(storyId, nodeKey) {
        return path.join(this.getStoryDir(storyId), 'nodes', `${nodeKey}.md`);
    }
    async getAllNodes(storyId) {
        const nodesDir = path.join(this.getStoryDir(storyId), 'nodes');
        if (!fs.existsSync(nodesDir))
            return [];
        const files = fs.readdirSync(nodesDir).filter(f => f.endsWith('.md'));
        const nodes = [];
        for (const file of files) {
            const nodeKey = file.replace('.md', '');
            const node = await this.getNodeByKey(storyId, nodeKey);
            if (node)
                nodes.push(node);
        }
        return nodes;
    }
    async getNodeByKey(storyId, nodeKey) {
        const nodePath = this.getNodePath(storyId, nodeKey);
        if (!fs.existsSync(nodePath))
            return null;
        const content = fs.readFileSync(nodePath, 'utf-8');
        const { data, content: markdownContent } = (0, gray_matter_1.default)(content);
        return {
            id: data.id,
            storyId: storyId,
            nodeKey: data.nodeKey,
            title: data.title,
            text: markdownContent.trim(),
            interactionType: data.interactionType,
            choices: data.choices || [],
            cardDeckId: data.cardDeckId,
            diceConfig: data.diceConfig,
            media: data.media,
            isStart: data.isStart || false,
        };
    }
    async getNodeById(nodeId) {
        // Search all stories for the node
        const stories = await this.getAllStories();
        for (const story of stories) {
            const nodes = await this.getAllNodes(story.id);
            const node = nodes.find(n => n.id === nodeId);
            if (node)
                return node;
        }
        return null;
    }
    async getStartNode(storyId) {
        return this.getNodeByKey(storyId, 'start');
    }
    async saveNode(node) {
        const nodePath = this.getNodePath(node.storyId, node.nodeKey);
        const frontmatter = {
            id: node.id,
            nodeKey: node.nodeKey,
            title: node.title,
            isStart: node.isStart,
            interactionType: node.interactionType,
            cardDeckId: node.cardDeckId,
            diceConfig: node.diceConfig,
            media: node.media,
            choices: node.choices,
        };
        const content = gray_matter_1.default.stringify(node.text, frontmatter);
        fs.writeFileSync(nodePath, content);
    }
    async createNode(storyId, request) {
        const node = {
            id: (0, uuid_1.v4)(),
            storyId,
            nodeKey: request.nodeKey,
            title: request.title,
            text: request.text,
            interactionType: request.interactionType,
            choices: (request.choices || []).map(c => ({
                ...c,
                id: (0, uuid_1.v4)(),
            })),
            cardDeckId: request.cardDeckId,
            diceConfig: request.diceConfig,
            media: request.media,
            isStart: false,
        };
        await this.saveNode(node);
        // Auto-create placeholder nodes for choices
        for (const choice of node.choices) {
            if (choice.nextNode) {
                const existingNode = await this.getNodeByKey(storyId, choice.nextNode);
                if (!existingNode) {
                    await this.createPlaceholderNode(storyId, choice.nextNode);
                }
            }
        }
        // Update story timestamp
        await this.updateStory(storyId, {});
        return node;
    }
    async createPlaceholderNode(storyId, nodeKey) {
        const placeholder = {
            id: (0, uuid_1.v4)(),
            storyId,
            nodeKey,
            text: `[Placeholder for "${nodeKey}" - add content here]`,
            choices: [],
            isStart: false,
        };
        await this.saveNode(placeholder);
        return placeholder;
    }
    async updateNode(nodeId, updates) {
        const existing = await this.getNodeById(nodeId);
        if (!existing)
            return null;
        // If nodeKey is changing and it's the start node, prevent it
        if (existing.isStart && updates.nodeKey && updates.nodeKey !== 'start') {
            throw new Error('Cannot change the key of the start node');
        }
        // Delete old file if nodeKey changed
        if (updates.nodeKey && updates.nodeKey !== existing.nodeKey) {
            const oldPath = this.getNodePath(existing.storyId, existing.nodeKey);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        const updated = {
            ...existing,
            ...updates,
            id: nodeId, // Prevent ID change
            storyId: existing.storyId, // Prevent story change
            isStart: existing.isStart, // Prevent start flag change via update
        };
        await this.saveNode(updated);
        // Auto-create placeholder nodes for new choices
        for (const choice of updated.choices) {
            if (choice.nextNode) {
                const targetNode = await this.getNodeByKey(existing.storyId, choice.nextNode);
                if (!targetNode) {
                    await this.createPlaceholderNode(existing.storyId, choice.nextNode);
                }
            }
        }
        // Update story timestamp
        await this.updateStory(existing.storyId, {});
        return updated;
    }
    async deleteNode(nodeId) {
        const node = await this.getNodeById(nodeId);
        if (!node)
            return false;
        if (node.isStart) {
            throw new Error('Cannot delete the start node');
        }
        const nodePath = this.getNodePath(node.storyId, node.nodeKey);
        if (fs.existsSync(nodePath)) {
            fs.unlinkSync(nodePath);
        }
        // Update story timestamp
        await this.updateStory(node.storyId, {});
        return true;
    }
    async setStartNode(nodeId) {
        const node = await this.getNodeById(nodeId);
        if (!node)
            return null;
        // Clear existing start node
        const nodes = await this.getAllNodes(node.storyId);
        for (const n of nodes) {
            if (n.isStart && n.id !== nodeId) {
                n.isStart = false;
                await this.saveNode(n);
            }
        }
        // Set new start node
        node.isStart = true;
        node.nodeKey = 'start'; // Start node always has key 'start'
        await this.saveNode(node);
        return node;
    }
    // ========================
    // Choices
    // ========================
    async getChoicesForNode(nodeId) {
        const node = await this.getNodeById(nodeId);
        return node?.choices || [];
    }
    async getChoicesForStory(storyId) {
        const nodes = await this.getAllNodes(storyId);
        return nodes.flatMap(n => n.choices);
    }
    async createChoice(nodeId, request) {
        const node = await this.getNodeById(nodeId);
        if (!node)
            throw new Error('Node not found');
        const choice = {
            id: (0, uuid_1.v4)(),
            text: request.text,
            nextNode: request.nextNode,
            type: request.type,
            placeholder: request.placeholder,
            diceConfig: request.diceConfig,
            emotionalHint: request.emotionalHint,
        };
        node.choices.push(choice);
        await this.saveNode(node);
        // Auto-create placeholder for target node
        if (request.nextNode) {
            const targetNode = await this.getNodeByKey(node.storyId, request.nextNode);
            if (!targetNode) {
                await this.createPlaceholderNode(node.storyId, request.nextNode);
            }
        }
        return choice;
    }
    async updateChoice(choiceId, updates) {
        // Find the node containing this choice
        const stories = await this.getAllStories();
        for (const story of stories) {
            const nodes = await this.getAllNodes(story.id);
            for (const node of nodes) {
                const choiceIndex = node.choices.findIndex(c => c.id === choiceId);
                if (choiceIndex !== -1) {
                    const updated = { ...node.choices[choiceIndex], ...updates, id: choiceId };
                    node.choices[choiceIndex] = updated;
                    await this.saveNode(node);
                    // Auto-create placeholder for new target node
                    if (updates.nextNode) {
                        const targetNode = await this.getNodeByKey(story.id, updates.nextNode);
                        if (!targetNode) {
                            await this.createPlaceholderNode(story.id, updates.nextNode);
                        }
                    }
                    return updated;
                }
            }
        }
        return null;
    }
    async deleteChoice(choiceId) {
        const stories = await this.getAllStories();
        for (const story of stories) {
            const nodes = await this.getAllNodes(story.id);
            for (const node of nodes) {
                const choiceIndex = node.choices.findIndex(c => c.id === choiceId);
                if (choiceIndex !== -1) {
                    node.choices.splice(choiceIndex, 1);
                    await this.saveNode(node);
                    return true;
                }
            }
        }
        return false;
    }
    // ========================
    // Story Events
    // ========================
    getEventPath(storyId, eventId, timestamp) {
        const ts = timestamp.replace(/[:.]/g, '-');
        return path.join(this.getStoryDir(storyId), 'events', `${ts}-${eventId}.json`);
    }
    async getAllEvents(storyId) {
        const eventsDir = path.join(this.getStoryDir(storyId), 'events');
        if (!fs.existsSync(eventsDir))
            return [];
        const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json'));
        const events = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(eventsDir, file), 'utf-8');
            events.push(JSON.parse(content));
        }
        return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async getLastEvent(storyId) {
        const events = await this.getAllEvents(storyId);
        return events.length > 0 ? events[events.length - 1] : null;
    }
    async createEvent(storyId, userId, request) {
        const eventId = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        const event = {
            id: eventId,
            storyId,
            userId,
            nodeKey: request.nodeKey,
            choiceId: request.choiceId,
            choiceText: request.choiceText,
            selectedCards: request.selectedCards,
            freeText: request.freeText,
            diceResult: request.diceResult,
            timestamp,
        };
        const eventPath = this.getEventPath(storyId, eventId, timestamp);
        fs.writeFileSync(eventPath, JSON.stringify(event, null, 2));
        return event;
    }
    async clearEvents(storyId) {
        const eventsDir = path.join(this.getStoryDir(storyId), 'events');
        if (fs.existsSync(eventsDir)) {
            fs.rmSync(eventsDir, { recursive: true, force: true });
            fs.mkdirSync(eventsDir, { recursive: true });
        }
    }
    // ========================
    // Card Decks
    // ========================
    async getAllCardDecks(storyId) {
        const decksDir = path.join(this.dataDir, 'card-decks');
        if (!fs.existsSync(decksDir))
            return [];
        const files = fs.readdirSync(decksDir).filter(f => f.endsWith('.json'));
        const decks = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(decksDir, file), 'utf-8');
            const deck = JSON.parse(content);
            // Include global decks and story-specific decks
            if (deck.isGlobal || deck.storyId === storyId) {
                decks.push(deck);
            }
        }
        return decks;
    }
    async getCardDeck(deckId) {
        const deckPath = path.join(this.dataDir, 'card-decks', `${deckId}.json`);
        if (!fs.existsSync(deckPath))
            return null;
        const content = fs.readFileSync(deckPath, 'utf-8');
        return JSON.parse(content);
    }
    async createCardDeck(deck) {
        const deckId = (0, uuid_1.v4)();
        const newDeck = {
            ...deck,
            id: deckId,
            cards: deck.cards.map(c => ({ ...c, id: (0, uuid_1.v4)(), deckId })),
        };
        const deckPath = path.join(this.dataDir, 'card-decks', `${deckId}.json`);
        fs.writeFileSync(deckPath, JSON.stringify(newDeck, null, 2));
        return newDeck;
    }
    // ========================
    // Dice Rolling
    // ========================
    rollDice(diceType, count, modifier = 0, successThreshold) {
        const maxValue = parseInt(diceType.replace('d', ''), 10);
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * maxValue) + 1);
        }
        const total = rolls.reduce((sum, r) => sum + r, 0);
        const finalTotal = total + modifier;
        const success = successThreshold !== undefined ? finalTotal >= successThreshold : undefined;
        return {
            rolls,
            total,
            modifier,
            finalTotal,
            isManual: false,
            success,
        };
    }
    // ========================
    // Data Seeding
    // ========================
    async seedDefaultData() {
        // Check if default deck exists
        const decks = await this.getAllCardDecks();
        const hasGlobalDeck = decks.some(d => d.isGlobal);
        if (!hasGlobalDeck) {
            // Create default emotion deck
            const defaultDeck = {
                name: 'Default Emotions',
                description: 'Basic emotion cards for creative input',
                isGlobal: true,
                cards: [
                    { id: '', deckId: '', label: 'Happy', description: 'Joyful, content', icon: '😊', color: '#FFD700', sortOrder: 1 },
                    { id: '', deckId: '', label: 'Sad', description: 'Melancholic, sorrowful', icon: '😢', color: '#4169E1', sortOrder: 2 },
                    { id: '', deckId: '', label: 'Angry', description: 'Frustrated, furious', icon: '😠', color: '#DC143C', sortOrder: 3 },
                    { id: '', deckId: '', label: 'Scared', description: 'Fearful, anxious', icon: '😨', color: '#800080', sortOrder: 4 },
                    { id: '', deckId: '', label: 'Surprised', description: 'Astonished, amazed', icon: '😲', color: '#FF8C00', sortOrder: 5 },
                    { id: '', deckId: '', label: 'Curious', description: 'Inquisitive, interested', icon: '🤔', color: '#32CD32', sortOrder: 6 },
                ],
            };
            await this.createCardDeck(defaultDeck);
            console.log('Seeded default emotion deck');
        }
    }
}
exports.FileStorageService = FileStorageService;
//# sourceMappingURL=file-storage.service.js.map