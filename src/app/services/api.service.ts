/**
 * API Service - HTTP client for backend communication
 * Replaces localStorage-based persistence with server calls
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Story,
  StoryNode,
  Choice,
  CardDeck,
  StoryEvent,
  DiceResult,
  DiceConfig,
  InteractionType,
  Media,
} from '../models/story.model';

// Request types
export interface CreateStoryRequest {
  name: string;
  description?: string;
  startNode: {
    nodeKey?: string;
    title?: string;
    text: string;
    interactionType?: InteractionType;
    choices?: Omit<Choice, 'id'>[];
    cardDeckId?: string;
    diceConfig?: DiceConfig;
    media?: Media;
  };
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
  type?: 'button' | 'freetext';
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
  userId?: string;
}

export interface DiceRollRequest {
  diceType: string;
  diceCount: number;
  modifier?: number;
  successThreshold?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // ========================
  // Stories
  // ========================

  getStories(): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.baseUrl}/stories`).pipe(
      map(stories => stories.map(s => this.parseStoryDates(s))),
      catchError(this.handleError)
    );
  }

  getStory(id: string): Observable<Story> {
    return this.http.get<Story>(`${this.baseUrl}/stories/${id}`).pipe(
      map(s => this.parseStoryDates(s)),
      catchError(this.handleError)
    );
  }

  createStory(request: CreateStoryRequest): Observable<Story> {
    return this.http.post<Story>(`${this.baseUrl}/stories`, request).pipe(
      map(s => this.parseStoryDates(s)),
      catchError(this.handleError)
    );
  }

  updateStory(id: string, updates: Partial<Story>): Observable<Story> {
    return this.http.patch<Story>(`${this.baseUrl}/stories/${id}`, updates).pipe(
      map(s => this.parseStoryDates(s)),
      catchError(this.handleError)
    );
  }

  deleteStory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/stories/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Nodes
  // ========================

  getNodes(storyId: string): Observable<StoryNode[]> {
    return this.http.get<StoryNode[]>(`${this.baseUrl}/stories/${storyId}/nodes`).pipe(
      catchError(this.handleError)
    );
  }

  getStartNode(storyId: string): Observable<StoryNode> {
    return this.http.get<StoryNode>(`${this.baseUrl}/stories/${storyId}/nodes/start`).pipe(
      catchError(this.handleError)
    );
  }

  getNodeByKey(storyId: string, nodeKey: string): Observable<StoryNode> {
    return this.http.get<StoryNode>(`${this.baseUrl}/stories/${storyId}/nodes/by-key/${nodeKey}`).pipe(
      catchError(this.handleError)
    );
  }

  getNode(nodeId: string): Observable<StoryNode> {
    return this.http.get<StoryNode>(`${this.baseUrl}/nodes/${nodeId}`).pipe(
      catchError(this.handleError)
    );
  }

  createNode(storyId: string, request: CreateNodeRequest): Observable<StoryNode> {
    return this.http.post<StoryNode>(`${this.baseUrl}/stories/${storyId}/nodes`, request).pipe(
      catchError(this.handleError)
    );
  }

  updateNode(nodeId: string, updates: Partial<StoryNode>): Observable<StoryNode> {
    return this.http.patch<StoryNode>(`${this.baseUrl}/nodes/${nodeId}`, updates).pipe(
      catchError(this.handleError)
    );
  }

  deleteNode(nodeId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/nodes/${nodeId}`).pipe(
      catchError(this.handleError)
    );
  }

  setStartNode(nodeId: string): Observable<StoryNode> {
    return this.http.patch<StoryNode>(`${this.baseUrl}/nodes/${nodeId}/set-start`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Choices
  // ========================

  getChoices(nodeId: string): Observable<Choice[]> {
    return this.http.get<Choice[]>(`${this.baseUrl}/nodes/${nodeId}/choices`).pipe(
      catchError(this.handleError)
    );
  }

  getStoryChoices(storyId: string): Observable<Choice[]> {
    return this.http.get<Choice[]>(`${this.baseUrl}/stories/${storyId}/choices`).pipe(
      catchError(this.handleError)
    );
  }

  createChoice(nodeId: string, request: CreateChoiceRequest): Observable<Choice> {
    return this.http.post<Choice>(`${this.baseUrl}/nodes/${nodeId}/choices`, request).pipe(
      catchError(this.handleError)
    );
  }

  updateChoice(choiceId: string, updates: Partial<Choice>): Observable<Choice> {
    return this.http.patch<Choice>(`${this.baseUrl}/choices/${choiceId}`, updates).pipe(
      catchError(this.handleError)
    );
  }

  deleteChoice(choiceId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/choices/${choiceId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Events
  // ========================

  getEvents(storyId: string): Observable<StoryEvent[]> {
    return this.http.get<StoryEvent[]>(`${this.baseUrl}/stories/${storyId}/events`).pipe(
      map(events => events.map(e => this.parseEventDates(e))),
      catchError(this.handleError)
    );
  }

  getLastEvent(storyId: string): Observable<StoryEvent | null> {
    return this.http.get<StoryEvent>(`${this.baseUrl}/stories/${storyId}/events/last`).pipe(
      map(e => this.parseEventDates(e)),
      catchError(err => {
        if (err.status === 404) return [null as any];
        return throwError(() => err);
      })
    );
  }

  createEvent(storyId: string, request: CreateEventRequest): Observable<StoryEvent> {
    return this.http.post<StoryEvent>(`${this.baseUrl}/stories/${storyId}/events`, request).pipe(
      map(e => this.parseEventDates(e)),
      catchError(this.handleError)
    );
  }

  clearEvents(storyId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/stories/${storyId}/events`).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Card Decks
  // ========================

  getCardDecks(storyId?: string): Observable<CardDeck[]> {
    const url = storyId 
      ? `${this.baseUrl}/card-decks?storyId=${storyId}`
      : `${this.baseUrl}/card-decks`;
    return this.http.get<CardDeck[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getCardDeck(deckId: string): Observable<CardDeck> {
    return this.http.get<CardDeck>(`${this.baseUrl}/card-decks/${deckId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Dice
  // ========================

  rollDice(request: DiceRollRequest): Observable<DiceResult> {
    return this.http.post<DiceResult>(`${this.baseUrl}/dice/roll`, request).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Session
  // ========================

  setRole(role: 'gamemaster' | 'player'): Observable<{ role: string }> {
    return this.http.post<{ role: string }>(`${this.baseUrl}/session`, { role }).pipe(
      catchError(this.handleError)
    );
  }

  getRole(): Observable<{ role: string } | null> {
    return this.http.get<{ role: string }>(`${this.baseUrl}/session`).pipe(
      catchError(err => {
        if (err.status === 404) return [null as any];
        return throwError(() => err);
      })
    );
  }

  // ========================
  // Health
  // ========================

  healthCheck(): Observable<{ status: string; timestamp: string }> {
    return this.http.get<{ status: string; timestamp: string }>(`${this.baseUrl}/health`).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Export
  // ========================

  exportData(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/export`).pipe(
      catchError(this.handleError)
    );
  }

  // ========================
  // Helpers
  // ========================

  private parseStoryDates(story: Story): Story {
    return {
      ...story,
      createdAt: new Date(story.createdAt),
      updatedAt: new Date(story.updatedAt),
    };
  }

  private parseEventDates(event: StoryEvent): StoryEvent {
    return {
      ...event,
      timestamp: new Date(event.timestamp),
    };
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      message = error.error.message;
    } else {
      // Server-side error
      message = error.error?.error || error.message || `Error ${error.status}`;
    }
    
    console.error('API Error:', message, error);
    return throwError(() => new Error(message));
  }
}
