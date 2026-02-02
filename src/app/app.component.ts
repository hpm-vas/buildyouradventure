import { Component, inject, viewChild } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './services/auth.service';
import { PinGateComponent } from './components/pin-gate/pin-gate.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, PinGateComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Plot-smithy';
  
  private readonly auth = inject(AuthService);
  private readonly pinGate = viewChild<PinGateComponent>('pinGate');

  // Expose auth state to template
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isLoading = this.auth.loading;
  readonly authError = this.auth.error;
  readonly user = this.auth.user;

  async onPinSubmit(pin: string): Promise<void> {
    const success = await this.auth.loginWithPin(pin);
    
    if (!success) {
      // Trigger shake animation on error
      this.pinGate()?.triggerShake();
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
