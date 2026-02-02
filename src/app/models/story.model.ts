/**
 * Story data models for Plot-smithy
 */

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface StoryNode {
  id: string;
  title?: string;
  text: string;
  choices: Choice[];
  openQuestion?: OpenQuestion;
  media?: Media;
}

export interface Choice {
  id: string;
  text: string;
  nextNode: string;
  skillCheck?: SkillCheck;
}

export interface SkillCheck {
  diceType: DiceType;
  diceCount: number;
  difficulty: number;
  successNode: string;
  failureNode: string;
  modifier?: number;
  label?: string;
}

export interface PromptCard {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  colorClass?: string;
}

export interface OpenQuestion {
  prompt: string;
  cards?: PromptCard[];
  minCards?: number;
  maxCards?: number;
  requireText?: boolean;
}

export interface Media {
  type: 'image' | 'audio';
  url: string;
  alt?: string;
}

export interface StoryEvent {
  id: number;
  storyId: string;
  nodeId: string;
  choiceId?: string;
  choiceText?: string;
  answer?: string;
  selectedCardIds?: string[];
  diceRolls?: number[];
  diceTotal?: number;
  skillCheckSuccess?: boolean;
  timestamp: Date;
}

export interface Story {
  id: string;
  name: string;
  description?: string;
  startNode: string;
  createdAt: Date;
  updatedAt: Date;
}
