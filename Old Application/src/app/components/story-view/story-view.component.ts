import { Component, inject, signal, computed, ElementRef, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoryService } from '../../services/story.service';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';
import { InventoryComponent } from '../inventory/inventory.component';
import { AdminComponent } from '../admin/admin.component';
import { StoryOverviewComponent } from '../story-overview/story-overview.component';
import { MistRevealComponent } from '../mist-reveal/mist-reveal.component';
import { DiceRollComponent } from '../dice-roll/dice-roll.component';
import { PromptCardComponent } from '../prompt-card/prompt-card.component';
import { Choice, OpenQuestion, DiceResult, PromptCard } from '../../models/story.model';

@Component({
  selector: 'app-story-view',
  standalone: true,
  imports: [CommonModule, FormsModule, AudioPlayerComponent, InventoryComponent, AdminComponent, StoryOverviewComponent, MistRevealComponent, DiceRollComponent, PromptCardComponent],
  templateUrl: './story-view.component.html',
  styleUrl: './story-view.component.scss'
})
export class StoryViewComponent implements AfterViewInit, OnDestroy {
  private storyService = inject(StoryService);
  private observer: IntersectionObserver | null = null;
  private keyBuffer = '';
  private keyListener = this.onKeyDown.bind(this);

  @ViewChildren('historyChapter') historyChapters!: QueryList<ElementRef>;

  readonly currentNode = this.storyService.currentNode;
  readonly isLoading = this.storyService.isLoading;
  readonly error = this.storyService.error;
  readonly storyHistory = this.storyService.storyHistory;
  readonly isReaderMode = this.storyService.isReaderMode;
  readonly isCurrentNodeAnswered = this.storyService.isCurrentNodeAnswered;
  readonly isDebugMode = this.storyService.isDebugMode;
  readonly allNodes = this.storyService.allNodes;
  readonly availablePath = this.storyService.availablePath;
  readonly explorationStatus = this.storyService.explorationStatus;
  readonly hasPendingReturn = this.storyService.hasPendingReturn;
  readonly canGoBack = this.storyService.canGoBack;

  // Reader-specific
  readonly isCaughtUp = this.storyService.isCaughtUp;
  readonly readerProgress = this.storyService.readerProgress;
  readonly isAdmin = this.storyService.isAdmin;

  readonly exploredCount = computed(() => {
    const status = this.explorationStatus();
    if (!status) return 0;
    return status.exploredList.filter(i => i.explored).length;
  });

  isChoosing = signal<boolean>(false);
  showHistory = signal<boolean>(false);
  openAnswer = signal<string>('');
  activeChapterIndex = signal<number>(0);
  showAdminPanel = signal<boolean>(false);
  showStoryOverview = signal<boolean>(false);

  // Dice roll state
  pendingSkillCheck = signal<Choice | null>(null);

  // Prompt card state
  selectedCardIds = signal<Set<string>>(new Set());

  readonly imagePosition = computed(() => this.currentNode()?.media?.imagePosition ?? 'top');

  // Check if minimum cards requirement is met
  readonly canSubmitAnswer = computed(() => {
    const node = this.currentNode();
    if (!node?.openQuestion) return false;

    const cards = node.openQuestion.cards || [];
    const minCards = node.openQuestion.minCards ?? 0;
    const requireText = node.openQuestion.requireText !== false; // default true

    const hasEnoughCards = cards.length === 0 || this.selectedCardIds().size >= minCards;
    const hasText = !requireText || this.openAnswer().trim().length > 0;

    return hasEnoughCards && hasText;
  });

  readonly paragraphsBeforeImage = computed(() => {
    const node = this.currentNode();
    if (!node) return [];
    const paragraphs = node.text.split('\n\n');
    const pos = this.imagePosition();
    if (pos === 'top') return [];
    if (pos === 'bottom') return paragraphs;
    // middle: first half
    return paragraphs.slice(0, Math.ceil(paragraphs.length / 2));
  });

  readonly paragraphsAfterImage = computed(() => {
    const node = this.currentNode();
    if (!node) return [];
    const paragraphs = node.text.split('\n\n');
    const pos = this.imagePosition();
    if (pos === 'top') return paragraphs;
    if (pos === 'bottom') return [];
    // middle: second half
    return paragraphs.slice(Math.ceil(paragraphs.length / 2));
  });

  async onChoiceClick(choice: Choice): Promise<void> {
    // Check if this choice has a skill check
    if (choice.skillCheck && !this.isReaderMode()) {
      // Show dice roll overlay
      this.pendingSkillCheck.set(choice);
      return;
    }

    this.isChoosing.set(true);
    await this.storyService.makeChoice(choice);
    this.openAnswer.set(''); // Clear any leftover open answer
    this.isChoosing.set(false);
    // Use setTimeout to ensure scroll happens after Angular's change detection completes
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  }

  async onDiceRollComplete(result: DiceResult): Promise<void> {
    const choice = this.pendingSkillCheck();
    if (!choice || !choice.skillCheck) return;

    this.pendingSkillCheck.set(null);
    this.isChoosing.set(true);

    // Make choice with dice result - the service will use success/failure node
    await this.storyService.makeChoiceWithDiceRoll(choice, result);

    this.openAnswer.set('');
    this.isChoosing.set(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  }

  onDiceRollCancelled(): void {
    this.pendingSkillCheck.set(null);
  }

  onRestart(): void {
    this.storyService.resetAdventure();
    this.showHistory.set(false);
    this.openAnswer.set('');
  }

  onGoBack(): void {
    this.storyService.goBack();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  }

  onDebugNavigate(nodeId: string): void {
    this.storyService.navigateToNode(nodeId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  onDebugReset(): void {
    this.storyService.debugReset();
  }

  toggleHistory(): void {
    this.showHistory.set(!this.showHistory());
  }

  onReturnToHub(): void {
    this.storyService.returnToHub();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  }

  onProceedToSummary(): void {
    this.storyService.proceedToSummary();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  }

  isNodeExplored(nodeId: string): boolean {
    return this.storyService.isNodeExplored(nodeId);
  }

  // Reader navigation
  onReaderAdvance(): void {
    this.storyService.readerAdvance();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  }

  onReaderGoBack(): void {
    this.storyService.readerGoBack();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
  }

  async onRefresh(): Promise<void> {
    await this.storyService.refreshState();
  }

  onLogout(): void {
    this.storyService.logout();
  }

  onOpenAdmin(): void {
    this.showAdminPanel.set(true);
  }

  onCloseAdmin(): void {
    this.showAdminPanel.set(false);
  }

  async onOpenAnswerSubmit(question: OpenQuestion): Promise<void> {
    const answer = this.openAnswer().trim();
    const requireText = question.requireText !== false;

    // Validate: if text required, must have answer
    if (requireText && !answer) return;

    this.isChoosing.set(true);
    const selectedCards = [...this.selectedCardIds()];
    await this.storyService.submitOpenAnswer(question, answer, selectedCards);
    this.openAnswer.set('');
    this.selectedCardIds.set(new Set()); // Clear selected cards
    this.isChoosing.set(false);
  }

  onCardToggle(card: PromptCard): void {
    const current = this.selectedCardIds();
    const newSet = new Set(current);
    const node = this.currentNode();
    const maxCards = node?.openQuestion?.maxCards ?? 99;

    if (newSet.has(card.id)) {
      // Deselect
      newSet.delete(card.id);
    } else {
      // Select (if under max)
      if (newSet.size < maxCards) {
        newSet.add(card.id);
      }
    }

    this.selectedCardIds.set(newSet);
  }

  isCardSelected(cardId: string): boolean {
    return this.selectedCardIds().has(cardId);
  }

  isCardSelectionDisabled(cardId: string): boolean {
    const node = this.currentNode();
    const maxCards = node?.openQuestion?.maxCards ?? 99;
    const selected = this.selectedCardIds();

    // Disabled if at max and this card isn't selected
    return selected.size >= maxCards && !selected.has(cardId);
  }

  getCardLabel(cards: PromptCard[] | undefined, cardId: string): string | null {
    return cards?.find(c => c.id === cardId)?.label ?? null;
  }

  onOpenStoryOverview(): void {
    this.showStoryOverview.set(true);
  }

  onCloseStoryOverview(): void {
    this.showStoryOverview.set(false);
  }

  ngAfterViewInit(): void {
    this.historyChapters.changes.subscribe(() => {
      this.setupIntersectionObserver();
    });
    window.addEventListener('keydown', this.keyListener);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    window.removeEventListener('keydown', this.keyListener);
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Handle Enter key for single "Weiter" choice
    if (event.key === 'Enter') {
      const node = this.currentNode();
      if (node && node.choices.length === 1 && !this.isChoosing() && !this.isReaderMode()) {
        event.preventDefault();
        this.onChoiceClick(node.choices[0]);
      }
      return;
    }

    // Debug code: 31337 toggles admin/debug mode
    this.keyBuffer += event.key;
    if (this.keyBuffer.length > 5) {
      this.keyBuffer = this.keyBuffer.slice(-5);
    }
    if (this.keyBuffer === '31337') {
      this.keyBuffer = '';
      this.storyService.toggleDebugMode();
    }
  }

  private setupIntersectionObserver(): void {
    this.observer?.disconnect();

    if (this.historyChapters.length === 0) return;

    // Set initial active chapter
    this.activeChapterIndex.set(0);

    this.observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible chapter
        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Get the one closest to the top of the viewport
          const topEntry = visibleEntries.reduce((prev, curr) =>
            curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev
          );
          const index = parseInt(topEntry.target.getAttribute('data-index') || '0', 10);
          this.activeChapterIndex.set(index);
        }
      },
      { threshold: 0.1, rootMargin: '-10% 0px -70% 0px' }
    );

    this.historyChapters.forEach((chapter) => {
      this.observer?.observe(chapter.nativeElement);
    });
  }

  scrollToChapter(index: number): void {
    const chapters = this.historyChapters.toArray();
    if (chapters[index]) {
      chapters[index].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
