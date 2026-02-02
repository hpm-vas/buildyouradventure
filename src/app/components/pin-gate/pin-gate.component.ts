import { Component, signal, output, input } from '@angular/core';

@Component({
  selector: 'app-pin-gate',
  standalone: true,
  imports: [],
  templateUrl: './pin-gate.component.html',
  styleUrl: './pin-gate.component.scss'
})
export class PinGateComponent {
  private readonly PIN_LENGTH = 6;

  // Inputs
  isLoading = input(false);
  errorMessage = input<string | null>(null);

  // Outputs
  pinSubmit = output<string>();

  // Local state
  pin = signal('');
  shake = signal(false);

  enterDigit(digit: string): void {
    if (this.isLoading()) return;
    
    if (this.pin().length < this.PIN_LENGTH) {
      this.pin.update(p => p + digit);
    }

    // Auto-submit when PIN is complete
    if (this.pin().length === this.PIN_LENGTH) {
      this.submit();
    }
  }

  backspace(): void {
    if (this.isLoading()) return;
    this.pin.update(p => p.slice(0, -1));
  }

  clear(): void {
    if (this.isLoading()) return;
    this.pin.set('');
  }

  submit(): void {
    if (this.isLoading()) return;
    
    const currentPin = this.pin();
    if (currentPin.length === this.PIN_LENGTH) {
      this.pinSubmit.emit(currentPin);
    }
  }

  /**
   * Trigger shake animation (called from parent on error)
   */
  triggerShake(): void {
    this.shake.set(true);
    this.pin.set('');
    setTimeout(() => this.shake.set(false), 500);
  }
}
