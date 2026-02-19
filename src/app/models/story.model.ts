/**
 * Story data models for Plot-smithy
 * Supports multi-story, emotion cards, dice rolls, and free-text interactions
 */

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

/**
 * Interaction types available for story nodes
 * As per spec: Choice, Card+Choice, Card+Textfield combinations with optional dice
 */
export type InteractionType = 
  | 'choice'           // Choice only
  | 'choice_text'      // Choice + Textfield
  | 'choice_roll'      // Choice + Dice Roll
  | 'choice_roll_text' // Choice + Dice Roll + Textfield
  | 'card_choice'      // Card + Choice
  | 'card_choice_text' // Card + Choice + Textfield
  | 'card_choice_roll' // Card + Choice + Roll
  | 'card_choice_roll_text' // Card + Choice + Roll + Textfield
  | 'card_text'        // Card + Textfield (mandatory when no choices)
  | 'text';            // Textfield only

/**
 * A story containing multiple story nodes
 */
export interface Story {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isPublished: boolean;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Configuration for dice rolls on a story node
 */
export interface DiceConfig {
  diceType: DiceType;
  diceCount: number;
  modifier?: number;
  label?: string;
  // Optional skill check thresholds
  successThreshold?: number;
  successNode?: string;
  failureNode?: string;
}

/**
 * Result of a dice roll
 */
export interface DiceResult {
  rolls: number[];
  total: number;
  modifier: number;
  finalTotal: number;
  isManual: boolean;
  success?: boolean;
}

/**
 * A single story node (chapter/block)
 */
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

/**
 * Type of choice - button (default) or freetext input
 */
export type ChoiceType = 'button' | 'freetext';

/**
 * A choice leading to another node
 */
export interface Choice {
  id: string;
  text: string;
  nextNode: string;
  // Type of choice: 'button' (default) or 'freetext'
  type?: ChoiceType;
  // Placeholder text for freetext choices
  placeholder?: string;
  // Optional per-choice dice configuration (overrides node config)
  diceConfig?: DiceConfig;
}

/**
 * Emotion/Prompt card for creative input
 */
export interface EmotionCard {
  id: string;
  deckId: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}

/**
 * A deck of emotion cards
 */
export interface CardDeck {
  id: string;
  name: string;
  description?: string;
  storyId?: string;  // null = global deck
  isGlobal: boolean;
  cards: EmotionCard[];
}

/**
 * Media attachment for a story node
 */
export interface Media {
  type: 'image' | 'audio';
  url: string;
  alt?: string;
}

/**
 * Record of a player interaction with a story node
 */
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
  timestamp: Date;
}

/**
 * Player's current state in a story
 */
export interface StoryState {
  id: string;
  userId: string;
  storyId: string;
  currentNodeKey: string;
}
