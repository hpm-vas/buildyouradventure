import { Component, input, output, signal, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-free-text-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="free-text-input">
      @if (label()) {
        <label [for]="inputId" class="input-label">{{ label() }}</label>
      }
      
      <textarea
        [id]="inputId"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [rows]="rows()"
        [maxLength]="maxLength()"
        [(ngModel)]="value"
        (ngModelChange)="onValueChange($event)"
        class="text-area"
      ></textarea>

      @if (showCharCount()) {
        <div class="char-count" [class.near-limit]="isNearLimit()">
          {{ value().length }} / {{ maxLength() }}
        </div>
      }

      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [`
    .free-text-input {
      margin: 1rem 0;
    }

    .input-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--text-primary, #333);
    }

    .text-area {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid var(--border-color, #ddd);
      border-radius: 8px;
      font-family: inherit;
      font-size: 1rem;
      line-height: 1.5;
      resize: vertical;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .text-area:focus {
      outline: none;
      border-color: var(--primary-color, #4a6fa5);
    }

    .text-area:disabled {
      background: var(--disabled-bg, #f5f5f5);
      cursor: not-allowed;
    }

    .char-count {
      text-align: right;
      font-size: 0.8rem;
      color: var(--text-muted, #888);
      margin-top: 0.25rem;
    }

    .char-count.near-limit {
      color: var(--warning-color, #e67e22);
    }

    .hint {
      margin: 0.5rem 0 0 0;
      font-size: 0.85rem;
      color: var(--text-muted, #888);
    }
  `]
})
export class FreeTextInputComponent {
  // Inputs
  value = model<string>('');
  label = input<string>();
  placeholder = input('Enter your response...');
  hint = input<string>();
  disabled = input(false);
  rows = input(4);
  maxLength = input(10000);
  showCharCount = input(true);

  // Output
  valueChange = output<string>();

  // Generate unique ID for accessibility
  inputId = `free-text-${Math.random().toString(36).substring(2, 9)}`;

  isNearLimit(): boolean {
    const max = this.maxLength();
    const current = this.value().length;
    return current >= max * 0.9;
  }

  onValueChange(text: string): void {
    this.valueChange.emit(text);
  }
}
