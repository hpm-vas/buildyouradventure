/**
 * Data Mapper Service - Converts between API and LocalStorage data shapes
 * Handles field name differences (createdAt/created, etc.) between backend and frontend
 */

import { Injectable } from '@angular/core';
import {
  Story, StoryNode, Choice, StoryEvent, CardDeck, EmotionCard,
  InteractionType, DiceConfig, Media, DiceResult
} from '../models/story.model';
import {
  StoredStory, StoredStoryNode, StoredChoice, StoredStoryEvent,
  StoredCardDeck, StoredEmotionCard
} from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class DataMapperService {

  // ========================
  // Stories
  // ========================

  /** API Story -> StoredStory (localStorage format) */
  apiStoryToStored(api: Story): StoredStory {
    return {
      id: api.id,
      name: api.name,
      description: api.description ?? '',
      isPublished: api.isPublished,
      coverImage: api.coverImage ?? '',
      created: api.createdAt instanceof Date ? api.createdAt.toISOString() : String(api.createdAt),
      updated: api.updatedAt instanceof Date ? api.updatedAt.toISOString() : String(api.updatedAt),
    };
  }

  /** StoredStory -> API Story format */
  storedStoryToApi(stored: StoredStory): Story {
    return {
      id: stored.id,
      name: stored.name,
      description: stored.description || undefined,
      ownerId: 'local', // LocalStorage doesn't track owner
      isPublished: stored.isPublished,
      coverImage: stored.coverImage || undefined,
      createdAt: new Date(stored.created),
      updatedAt: new Date(stored.updated),
    };
  }

  // ========================
  // Nodes
  // ========================

  /** API StoryNode -> StoredStoryNode */
  apiNodeToStored(api: StoryNode): StoredStoryNode {
    return {
      id: api.id,
      storyId: api.storyId,
      nodeKey: api.nodeKey,
      title: api.title ?? '',
      text: api.text,
      media: api.media ?? null,
      isStart: api.isStart,
      interactionType: api.interactionType ?? null,
      diceConfig: api.diceConfig ?? null,
      cardDeckId: api.cardDeckId ?? null,
      created: new Date().toISOString(), // API doesn't return these
      updated: new Date().toISOString(),
    };
  }

  /** StoredStoryNode + Choices -> StoryNode */
  storedNodeToApi(stored: StoredStoryNode, choices: StoredChoice[]): StoryNode {
    return {
      id: stored.id,
      storyId: stored.storyId,
      nodeKey: stored.nodeKey,
      title: stored.title || undefined,
      text: stored.text,
      media: stored.media ?? undefined,
      isStart: stored.isStart,
      interactionType: stored.interactionType ?? undefined,
      diceConfig: stored.diceConfig ?? undefined,
      cardDeckId: stored.cardDeckId ?? undefined,
      choices: choices.map(c => this.storedChoiceToApi(c)),
    };
  }

  // ========================
  // Choices
  // ========================

  /** API Choice -> StoredChoice */
  apiChoiceToStored(api: Choice, nodeId: string): StoredChoice {
    return {
      id: api.id,
      nodeId: nodeId,
      text: api.text,
      nextNode: api.nextNode,
      type: api.type,
      placeholder: api.placeholder,
      diceConfig: api.diceConfig,
      emotionalHint: api.emotionalHint,
      created: new Date().toISOString(),
    };
  }

  /** StoredChoice -> API Choice */
  storedChoiceToApi(stored: StoredChoice): Choice {
    return {
      id: stored.id,
      text: stored.text,
      nextNode: stored.nextNode,
      type: stored.type as 'button' | 'freetext' | undefined,
      placeholder: stored.placeholder,
      diceConfig: stored.diceConfig,
      emotionalHint: stored.emotionalHint,
    };
  }

  // ========================
  // Events
  // ========================

  /** API StoryEvent -> StoredStoryEvent */
  apiEventToStored(api: StoryEvent): StoredStoryEvent {
    return {
      id: api.id,
      storyId: api.storyId,
      nodeKey: api.nodeKey,
      choiceId: api.choiceId ?? null,
      choiceText: api.choiceText ?? null,
      selectedCards: api.selectedCards ?? null,
      freeText: api.freeText ?? null,
      diceResult: api.diceResult ? {
        rolls: api.diceResult.rolls,
        total: api.diceResult.total,
        modifier: api.diceResult.modifier,
        finalTotal: api.diceResult.finalTotal,
        isManual: api.diceResult.isManual,
        success: api.diceResult.success,
      } : null,
      created: api.timestamp instanceof Date ? api.timestamp.toISOString() : String(api.timestamp),
    };
  }

  /** StoredStoryEvent -> API StoryEvent */
  storedEventToApi(stored: StoredStoryEvent, userId: string = 'player'): StoryEvent {
    return {
      id: stored.id,
      storyId: stored.storyId,
      userId: userId,
      nodeKey: stored.nodeKey,
      choiceId: stored.choiceId ?? undefined,
      choiceText: stored.choiceText ?? undefined,
      selectedCards: stored.selectedCards ?? undefined,
      freeText: stored.freeText ?? undefined,
      diceResult: stored.diceResult ?? undefined,
      timestamp: new Date(stored.created),
    };
  }

  // ========================
  // Card Decks
  // ========================

  /** API CardDeck -> StoredCardDeck + StoredEmotionCard[] */
  apiDeckToStored(api: CardDeck): { deck: StoredCardDeck; cards: StoredEmotionCard[] } {
    const deck: StoredCardDeck = {
      id: api.id,
      name: api.name,
      description: api.description ?? '',
      storyId: api.storyId ?? null,
      isGlobal: api.isGlobal,
      created: new Date().toISOString(),
    };

    const cards: StoredEmotionCard[] = api.cards.map(c => ({
      id: c.id,
      deckId: api.id,
      label: c.label,
      description: c.description ?? '',
      icon: c.icon ?? '',
      color: c.color ?? '',
      sortOrder: c.sortOrder,
    }));

    return { deck, cards };
  }

  /** StoredCardDeck + StoredEmotionCard[] -> API CardDeck */
  storedDeckToApi(deck: StoredCardDeck, cards: StoredEmotionCard[]): CardDeck {
    return {
      id: deck.id,
      name: deck.name,
      description: deck.description || undefined,
      storyId: deck.storyId ?? undefined,
      isGlobal: deck.isGlobal,
      cards: cards.map(c => ({
        id: c.id,
        deckId: c.deckId,
        label: c.label,
        description: c.description || undefined,
        icon: c.icon || undefined,
        color: c.color || undefined,
        sortOrder: c.sortOrder,
      })),
    };
  }
}
