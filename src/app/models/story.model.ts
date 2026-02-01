// Dice types supported by the skill check system
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

// Skill check configuration for a choice
export interface SkillCheck {
  diceType: DiceType;
  diceCount: number;       // Number of dice to roll (e.g., 2 for 2d6)
  difficulty: number;      // Target number to meet or exceed
  successNode: string;     // Node ID on success
  failureNode: string;     // Node ID on failure
  modifier?: number;       // Bonus/penalty to add to roll
  label?: string;          // Display label (e.g., "Strength", "Perception")
}

// Result of a dice roll
export interface DiceResult {
  rolls: number[];         // Individual die results
  total: number;           // Sum of rolls + modifier
  success: boolean;        // Whether total >= difficulty
  manualOverride: boolean; // Whether GM manually set the values
}

export interface Choice {
  id: string;
  text: string;
  nextNode: string;
  grantsItems?: string[];  // Item IDs granted when selecting this choice
  returnsTo?: string;  // After visiting nextNode, return to this node (for exploration hubs)
  skillCheck?: SkillCheck; // Optional skill check with dice roll
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  image?: string;
}

export interface Media {
  image: string | null;
  imagePosition?: 'top' | 'middle' | 'bottom';
  audio: string | null;
}

export interface OpenQuestion {
  prompt: string;
}

export interface ExplorationHub {
  requiredNodes: string[];  // Node IDs that must be visited before proceeding
  summaryNodeId: string;    // Node ID to navigate to when all required nodes visited
}

export interface StoryNode {
  id: string;
  title?: string;
  text: string;
  media?: Media;
  choices: Choice[];
  openQuestion?: OpenQuestion;
  pending?: boolean;
  teaser?: string; // Preview sentence shown on pending page, e.g. "Odo entschliesst sich weiter zu gehen..."
  grantsItems?: string[];  // Item IDs granted when visiting this node
  explorationHub?: ExplorationHub;  // If set, this node is an exploration hub
  mistRevealText?: string;  // Elvish text to show with mist reveal animation
  // Hierarchy fields
  akt?: number;     // Act number (e.g., 1)
  teil?: string;    // Part name (e.g., "Prolog")
  kapitel?: number; // Chapter number within the part (e.g., 1, 2, 3)
}

export interface Story {
  currentNode: string;
  nodes: Record<string, StoryNode>;
  items?: Record<string, InventoryItem>;  // Catalog of all collectible items
}

// Database types (from Supabase)
export interface User {
  id: string;
  role: 'player' | 'reader' | 'admin';
  name?: string;
  currentStoryId?: string;
  lastActive?: string;
  pin?: string;  // Only visible in admin context
}

export interface StoryEvent {
  id: number;
  storyId: string;
  nodeId: string;
  choiceId?: string;
  choiceText?: string;
  answer?: string;
  collectedItems?: string[];
  createdAt: string;
  createdBy?: string;
  // Dice roll fields
  diceRolls?: number[];       // Individual die results
  diceTotal?: number;         // Sum including modifier
  skillCheckSuccess?: boolean; // Whether the check passed
  diceManualOverride?: boolean; // Whether GM manually set the values
}

export interface StoryState {
  storyId: string;
  currentNodeId: string;
  collectedItems: string[];
  updatedAt: string;
}

export interface StoryMeta {
  id: string;
  title: string;
  slug: string;
}
