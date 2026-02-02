import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-pin-gate',
  standalone: true,
  imports: [],
  templateUrl: './pin-gate.component.html',
  styleUrl: './pin-gate.component.scss'
})
export class PinGateComponent {
  pin = signal('');
  
  enterDigit(digit: string) {
    if (this.pin().length < 6) {
      this.pin.update(p => p + digit);
    }
  }

  clear() {
    this.pin.set('');
  }

  submit() {
    console.log('PIN submitted:', this.pin());
    // TODO: Implement authentication
  }
}
