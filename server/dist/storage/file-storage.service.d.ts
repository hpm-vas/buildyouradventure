/**
 * File-based storage service for Plot-smithy
 * Implements Obsidian-inspired directory structure with YAML frontmatter
 */
import { Story, StoryNode, Choice, CardDeck, StoryEvent, CreateStoryRequest, CreateNodeRequest, CreateChoiceRequest, CreateEventRequest } from '../models';
export declare class FileStorageService {
    private dataDir;
    constructor(dataDir?: string);
    private ensureDirectories;
    private getStoryDir;
    private getStoryMetaPath;
    getAllStories(): Promise<Story[]>;
    getStory(storyId: string): Promise<Story | null>;
    createStory(request: CreateStoryRequest): Promise<Story>;
    updateStory(storyId: string, updates: Partial<Story>): Promise<Story | null>;
    deleteStory(storyId: string): Promise<boolean>;
    private getNodePath;
    getAllNodes(storyId: string): Promise<StoryNode[]>;
    getNodeByKey(storyId: string, nodeKey: string): Promise<StoryNode | null>;
    getNodeById(nodeId: string): Promise<StoryNode | null>;
    getStartNode(storyId: string): Promise<StoryNode | null>;
    private saveNode;
    createNode(storyId: string, request: CreateNodeRequest): Promise<StoryNode>;
    private createPlaceholderNode;
    updateNode(nodeId: string, updates: Partial<StoryNode>): Promise<StoryNode | null>;
    deleteNode(nodeId: string): Promise<boolean>;
    setStartNode(nodeId: string): Promise<StoryNode | null>;
    getChoicesForNode(nodeId: string): Promise<Choice[]>;
    getChoicesForStory(storyId: string): Promise<Choice[]>;
    createChoice(nodeId: string, request: CreateChoiceRequest): Promise<Choice>;
    updateChoice(choiceId: string, updates: Partial<Choice>): Promise<Choice | null>;
    deleteChoice(choiceId: string): Promise<boolean>;
    private getEventPath;
    getAllEvents(storyId: string): Promise<StoryEvent[]>;
    getLastEvent(storyId: string): Promise<StoryEvent | null>;
    createEvent(storyId: string, userId: string, request: CreateEventRequest): Promise<StoryEvent>;
    clearEvents(storyId: string): Promise<void>;
    getAllCardDecks(storyId?: string): Promise<CardDeck[]>;
    getCardDeck(deckId: string): Promise<CardDeck | null>;
    createCardDeck(deck: Omit<CardDeck, 'id'>): Promise<CardDeck>;
    rollDice(diceType: string, count: number, modifier?: number, successThreshold?: number): {
        rolls: number[];
        total: number;
        modifier: number;
        finalTotal: number;
        isManual: boolean;
        success?: boolean;
    };
    seedDefaultData(): Promise<void>;
}
//# sourceMappingURL=file-storage.service.d.ts.map