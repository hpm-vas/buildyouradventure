/**
 * Shared data models between frontend and backend
 * These mirror the Angular models in src/app/models/story.model.ts
 */
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
export type InteractionType = 'choice' | 'choice_text' | 'choice_roll' | 'choice_roll_text' | 'card_choice' | 'card_choice_text' | 'card_choice_roll' | 'card_choice_roll_text' | 'card_text' | 'text';
export interface Story {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    isPublished: boolean;
    coverImage?: string;
    createdAt: string;
    updatedAt: string;
}
export interface DiceConfig {
    diceType: DiceType;
    diceCount: number;
    modifier?: number;
    label?: string;
    successThreshold?: number;
    successNode?: string;
    failureNode?: string;
}
export interface DiceResult {
    rolls: number[];
    total: number;
    modifier: number;
    finalTotal: number;
    isManual: boolean;
    success?: boolean;
}
export type ChoiceType = 'button' | 'freetext';
export interface Choice {
    id: string;
    text: string;
    nextNode: string;
    type?: ChoiceType;
    placeholder?: string;
    diceConfig?: DiceConfig;
    emotionalHint?: string;
}
export interface StoryNode {
    id: string;
    storyId: string;
    nodeKey: string;
    title?: string;
    text: string;
    interactionType?: InteractionType;
    choices: Choice[];
    cardDeckId?: string;
    diceConfig?: DiceConfig;
    media?: Media;
    isStart: boolean;
}
export interface EmotionCard {
    id: string;
    deckId: string;
    label: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder: number;
}
export interface CardDeck {
    id: string;
    name: string;
    description?: string;
    storyId?: string;
    isGlobal: boolean;
    cards: EmotionCard[];
}
export interface Media {
    type: 'image' | 'audio';
    url: string;
    alt?: string;
}
export interface StoryEvent {
    id: string;
    storyId: string;
    userId: string;
    nodeKey: string;
    choiceId?: string;
    choiceText?: string;
    selectedCards?: string[];
    freeText?: string;
    diceResult?: DiceResult;
    timestamp: string;
}
export interface CreateStoryRequest {
    name: string;
    description?: string;
    startNode: Omit<StoryNode, 'id' | 'storyId' | 'isStart'>;
}
export interface CreateNodeRequest {
    nodeKey: string;
    title?: string;
    text: string;
    interactionType?: InteractionType;
    choices?: Omit<Choice, 'id'>[];
    cardDeckId?: string;
    diceConfig?: DiceConfig;
    media?: Media;
}
export interface CreateChoiceRequest {
    text: string;
    nextNode: string;
    type?: ChoiceType;
    placeholder?: string;
    diceConfig?: DiceConfig;
    emotionalHint?: string;
}
export interface CreateEventRequest {
    nodeKey: string;
    choiceId?: string;
    choiceText?: string;
    selectedCards?: string[];
    freeText?: string;
    diceResult?: DiceResult;
}
export interface DiceRollRequest {
    diceType: DiceType;
    diceCount: number;
    modifier?: number;
    successThreshold?: number;
}
export interface SessionRequest {
    role: 'gamemaster' | 'player';
}
export interface SessionResponse {
    role: 'gamemaster' | 'player';
}
//# sourceMappingURL=models.d.ts.map